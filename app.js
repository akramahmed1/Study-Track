/* StudyTrack - app.js
 * Plain JavaScript, no dependencies.
 * Part 1: logic (storage, status rules) - no DOM, so tests/tests.html can use it.
 * Part 2: DOM code, only runs when the page has #app (the test page does not).
 * RULE: user-entered text is only ever shown with textContent / DOM methods, never innerHTML.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var DEFAULT_KEY = 'studytrack.v1';

  /* ---------- Part 1: logic ---------- */

  function defaultData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      settings: { displayName: '' },
      courses: [],
      assignments: []
    };
  }

  function isValidData(d) {
    return !!d && typeof d === 'object' &&
      d.schemaVersion === SCHEMA_VERSION &&
      !!d.settings && typeof d.settings === 'object' &&
      Array.isArray(d.courses) && Array.isArray(d.assignments);
  }

  /* Storage module. Every read and write is wrapped in try/catch.
   * options.key      - localStorage key (tests use a separate one)
   * options.storage  - object with getItem/setItem/removeItem (tests can inject a failing one)
   * options.onSaveError(message) - called when a save fails
   * Load states: 'ok', 'corrupt' (unreadable data), 'unavailable' (browser blocks storage).
   * After any failed save, or when data is corrupt/unavailable, writes are halted so nothing
   * is silently lost or overwritten. clearAll() is the only way to lift a 'corrupt' halt. */
  function createStore(options) {
    options = options || {};
    var key = options.key || global.STUDYTRACK_KEY || DEFAULT_KEY;
    var data = defaultData();
    var halted = false;
    var loadState = 'ok';

    function getStorage() {
      return options.storage || global.localStorage; // accessing localStorage can itself throw
    }

    function load() {
      var raw;
      try {
        raw = getStorage().getItem(key);
      } catch (e) {
        data = defaultData();
        halted = true;
        loadState = 'unavailable';
        return { ok: false, reason: 'unavailable' };
      }
      if (raw === null || raw === undefined) {
        data = defaultData();
        halted = false;
        loadState = 'ok';
        return { ok: true, fresh: true };
      }
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = null;
      }
      if (!isValidData(parsed)) {
        data = defaultData();
        halted = true; // do not overwrite the unreadable data until the user chooses to clear it
        loadState = 'corrupt';
        return { ok: false, reason: 'corrupt' };
      }
      data = parsed;
      halted = false;
      loadState = 'ok';
      return { ok: true, fresh: false };
    }

    function save() {
      if (halted) { return { ok: false, halted: true }; }
      try {
        getStorage().setItem(key, JSON.stringify(data));
        return { ok: true };
      } catch (e) {
        halted = true;
        if (typeof options.onSaveError === 'function') {
          options.onSaveError('Changes could not be saved');
        }
        return { ok: false, halted: true };
      }
    }

    function clearAll() {
      try {
        getStorage().removeItem(key);
      } catch (e) {
        return { ok: false };
      }
      data = defaultData();
      halted = false;
      loadState = 'ok';
      return { ok: true };
    }

    return {
      load: load,
      save: save,
      clearAll: clearAll,
      getData: function () { return data; },
      isHalted: function () { return halted; },
      getLoadState: function () { return loadState; },
      key: key
    };
  }

  /* Status rules: Completed if completed; Overdue if not completed and due date passed;
   * otherwise Upcoming. */
  function statusOf(assignment, now) {
    if (assignment.completed) { return 'completed'; }
    var due = new Date(assignment.dueAt).getTime();
    var current = (now === undefined ? new Date() : new Date(now)).getTime();
    return due < current ? 'overdue' : 'upcoming';
  }

  function countByStatus(assignments, now) {
    var counts = { upcoming: 0, overdue: 0, completed: 0 };
    assignments.forEach(function (a) { counts[statusOf(a, now)] += 1; });
    return counts;
  }


  /* ---- Courses ---- */
  var COURSE_NAME_MAX = 60;

  function newId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* Returns an error message string, or '' when the name is acceptable. */
  function validateCourseName(data, name, ignoreId) {
    var n = (name || '').trim();
    if (!n) { return 'Enter a course name.'; }
    if (n.length > COURSE_NAME_MAX) { return 'Course names can be at most ' + COURSE_NAME_MAX + ' characters.'; }
    var lower = n.toLowerCase();
    var dup = data.courses.some(function (c) { return c.id !== ignoreId && c.name.trim().toLowerCase() === lower; });
    return dup ? 'A course with this name already exists.' : '';
  }

  function addCourse(data, name) {
    var error = validateCourseName(data, name);
    if (error) { return { ok: false, error: error }; }
    var course = { id: newId('c_'), name: name.trim() };
    data.courses.push(course);
    return { ok: true, course: course };
  }

  function renameCourse(data, id, name) {
    var course = data.courses.filter(function (c) { return c.id === id; })[0];
    if (!course) { return { ok: false, error: 'That course no longer exists.' }; }
    var error = validateCourseName(data, name, id);
    if (error) { return { ok: false, error: error }; }
    course.name = name.trim();
    return { ok: true, course: course };
  }

  function assignmentsInCourse(data, id) {
    return data.assignments.filter(function (a) { return a.courseId === id; }).length;
  }

  /* Deleting a course that still has assignments is blocked. */
  function deleteCourse(data, id) {
    var count = assignmentsInCourse(data, id);
    if (count > 0) { return { ok: false, reason: 'in-use', count: count }; }
    var before = data.courses.length;
    data.courses = data.courses.filter(function (c) { return c.id !== id; });
    return data.courses.length < before ? { ok: true } : { ok: false, reason: 'missing' };
  }

  /* ---- Assignments ---- */
  var TITLE_MAX = 120;
  var NOTES_MAX = 1000;

  function parseDateInput(value) {
    if (!value) { return null; }
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  /* Validates raw form input. Accepts datetime-local strings or ISO strings for dueAt/reminderAt.
   * Returns { ok, errors: {field: message}, clean: {...ready to save...} }. Nothing is saved here. */
  function validateAssignment(data, input) {
    input = input || {};
    var errors = {};
    var title = (input.title || '').trim();
    if (!title) { errors.title = 'Enter a title.'; }
    else if (title.length > TITLE_MAX) { errors.title = 'The title can be at most ' + TITLE_MAX + ' characters.'; }

    if (!input.courseId) { errors.courseId = 'Choose a course.'; }
    else if (!data.courses.some(function (c) { return c.id === input.courseId; })) {
      errors.courseId = 'That course no longer exists. Choose another course.';
    }

    var due = parseDateInput(input.dueAt);
    if (!input.dueAt) { errors.dueAt = 'Enter a due date and time.'; }
    else if (!due) { errors.dueAt = 'Enter a valid due date and time.'; }

    var reminder = null;
    if (input.reminderAt) {
      reminder = parseDateInput(input.reminderAt);
      if (!reminder) { errors.reminderAt = 'Enter a valid reminder date and time.'; }
      else if (due && reminder.getTime() > due.getTime()) {
        errors.reminderAt = 'The reminder must be at or before the due date and time.';
      }
    }

    var notes = input.notes || '';
    if (notes.length > NOTES_MAX) { errors.notes = 'Notes can be at most ' + NOTES_MAX + ' characters.'; }

    var ok = Object.keys(errors).length === 0;
    return {
      ok: ok,
      errors: errors,
      clean: ok ? {
        title: title,
        courseId: input.courseId,
        dueAt: due.toISOString(),
        reminderAt: reminder ? reminder.toISOString() : null,
        notes: notes.trim()
      } : null
    };
  }

  function getAssignment(data, id) {
    return data.assignments.filter(function (a) { return a.id === id; })[0] || null;
  }

  function createAssignment(data, input, now) {
    var v = validateAssignment(data, input);
    if (!v.ok) { return { ok: false, errors: v.errors }; }
    var stamp = (now === undefined ? new Date() : new Date(now)).toISOString();
    var a = {
      id: newId('a_'),
      title: v.clean.title,
      courseId: v.clean.courseId,
      dueAt: v.clean.dueAt,
      reminderAt: v.clean.reminderAt,
      notes: v.clean.notes,
      completed: false,
      completedAt: null,
      createdAt: stamp,
      updatedAt: stamp
    };
    data.assignments.push(a);
    return { ok: true, assignment: a };
  }

  function updateAssignment(data, id, input, now) {
    var a = getAssignment(data, id);
    if (!a) { return { ok: false, errors: { form: 'This assignment no longer exists.' } }; }
    var v = validateAssignment(data, input);
    if (!v.ok) { return { ok: false, errors: v.errors }; }
    a.title = v.clean.title;
    a.courseId = v.clean.courseId;
    a.dueAt = v.clean.dueAt;
    a.reminderAt = v.clean.reminderAt;
    a.notes = v.clean.notes;
    a.updatedAt = (now === undefined ? new Date() : new Date(now)).toISOString();
    return { ok: true, assignment: a };
  }

  /* Soonest due date first (ties broken by title). Returns a new array. */
  function sortByDue(assignments) {
    return assignments.slice().sort(function (x, y) {
      var d = new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime();
      return d !== 0 ? d : x.title.localeCompare(y.title);
    });
  }

  function courseName(data, id) {
    var c = data.courses.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : '(deleted course)';
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    DEFAULT_KEY: DEFAULT_KEY,
    defaultData: defaultData,
    isValidData: isValidData,
    createStore: createStore,
    statusOf: statusOf,
    countByStatus: countByStatus,
    validateCourseName: validateCourseName,
    addCourse: addCourse,
    renameCourse: renameCourse,
    deleteCourse: deleteCourse,
    assignmentsInCourse: assignmentsInCourse,
    validateAssignment: validateAssignment,
    createAssignment: createAssignment,
    updateAssignment: updateAssignment,
    getAssignment: getAssignment,
    sortByDue: sortByDue
  };
  global.StudyTrack = api;

  /* ---------- Part 2: DOM code ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function showBanner(title, message, actions) {
    var area = document.getElementById('banner-area');
    var wrap = el('div', 'banner-wrap');
    var box = el('div', 'banner');
    var text = el('div');
    text.appendChild(el('p', 'banner-title', title));
    text.appendChild(el('p', '', message));
    box.appendChild(text);
    (actions || []).forEach(function (a) {
      var b = el('button', 'btn', a.label);
      b.type = 'button';
      b.addEventListener('click', a.onClick);
      box.appendChild(b);
    });
    wrap.appendChild(box);
    area.appendChild(wrap);
    return wrap;
  }

  /* Reusable confirmation dialog. Returns a Promise that resolves true (confirmed) or false. */
  function confirmDialog(message, confirmLabel) {
    return new Promise(function (resolve) {
      var dialog = document.getElementById('confirm-dialog');
      document.getElementById('confirm-message').textContent = message;
      document.getElementById('confirm-ok').textContent = confirmLabel || 'Confirm';
      function onClose() {
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'ok');
      }
      dialog.returnValue = '';
      dialog.addEventListener('close', onClose);
      dialog.showModal();
      document.getElementById('confirm-cancel').focus();
    });
  }

  function renderGreeting(data) {
    var name = (data.settings.displayName || '').trim();
    document.getElementById('greeting').textContent = name ? 'Hi, ' + name : 'Hi there';
  }

  function renderDashboard(data) {
    var counts = countByStatus(data.assignments);
    document.getElementById('count-upcoming').textContent = String(counts.upcoming);
    document.getElementById('count-overdue').textContent = String(counts.overdue);
    document.getElementById('count-completed').textContent = String(counts.completed);
    document.getElementById('empty-message').hidden = data.assignments.length > 0;
    // The assignment list itself is built in increment 4.
  }


  /* ---- Courses UI ---- */
  function setFieldError(input, errorEl, message) {
    errorEl.textContent = message ? 'Error: ' + message : '';
    if (message) { input.setAttribute('aria-invalid', 'true'); } else { input.removeAttribute('aria-invalid'); }
  }

  function renderCourses(store, editingId, focusAfter) {
    var data = store.getData();
    var list = document.getElementById('course-list');
    list.textContent = '';
    document.getElementById('no-courses').hidden = data.courses.length > 0;

    data.courses.forEach(function (course) {
      var li = el('li', 'course-item');
      var count = assignmentsInCourse(data, course.id);

      if (course.id === editingId) {
        var form = el('form', 'inline-form course-edit');
        form.noValidate = true;
        var inputId = 'rename-' + course.id;
        var label = el('label', '', 'Course name');
        label.setAttribute('for', inputId);
        var row = el('div', 'field-row');
        var input = el('input');
        input.id = inputId; input.type = 'text'; input.maxLength = COURSE_NAME_MAX; input.value = course.name;
        input.autocomplete = 'off';
        var errId = 'rename-error-' + course.id;
        input.setAttribute('aria-describedby', errId);
        var save = el('button', 'btn btn-strong', 'Save');
        save.type = 'submit';
        var cancel = el('button', 'btn', 'Cancel');
        cancel.type = 'button';
        row.appendChild(input); row.appendChild(save); row.appendChild(cancel);
        var err = el('p', 'field-error'); err.id = errId; err.setAttribute('role', 'alert');
        form.appendChild(label); form.appendChild(row); form.appendChild(err);
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var result = renameCourse(data, course.id, input.value);
          if (!result.ok) { setFieldError(input, err, result.error); input.focus(); return; }
          store.save();
          renderCourses(store, null, { rename: course.id });
        });
        cancel.addEventListener('click', function () { renderCourses(store, null, { rename: course.id }); });
        li.appendChild(form);
        list.appendChild(li);
        input.focus(); input.select();
        return;
      }

      var info = el('div', 'course-info');
      info.appendChild(el('span', 'course-name', course.name));
      info.appendChild(el('span', 'course-count', count + (count === 1 ? ' assignment' : ' assignments')));
      var actions = el('div', 'course-actions');
      var rename = el('button', 'btn', 'Rename');
      rename.type = 'button';
      rename.setAttribute('aria-label', 'Rename course ' + course.name);
      rename.dataset.courseId = course.id;
      rename.addEventListener('click', function () {
        document.getElementById('course-message').textContent = '';
        renderCourses(store, course.id);
      });
      var del = el('button', 'btn', 'Delete');
      del.type = 'button';
      del.setAttribute('aria-label', 'Delete course ' + course.name);
      del.addEventListener('click', function () { onDeleteCourse(store, course); });
      actions.appendChild(rename); actions.appendChild(del);
      li.appendChild(info); li.appendChild(actions);
      list.appendChild(li);
    });

    if (focusAfter && focusAfter.rename) {
      var btn = list.querySelector('button[data-course-id="' + focusAfter.rename + '"]');
      if (btn) { btn.focus(); }
    }
    renderAssignmentList(store);
  }

  function onDeleteCourse(store, course) {
    var data = store.getData();
    var message = document.getElementById('course-message');
    var count = assignmentsInCourse(data, course.id);
    if (count > 0) {
      message.textContent = 'Error: "' + course.name + '" cannot be deleted because it still has ' + count +
        (count === 1 ? ' assignment' : ' assignments') + '. Delete or move those assignments first.';
      return;
    }
    message.textContent = '';
    confirmDialog('Delete the course "' + course.name + '"? This cannot be undone.', 'Delete course').then(function (ok) {
      if (!ok) { return; }
      if (deleteCourse(data, course.id).ok) { store.save(); }
      renderCourses(store);
      document.getElementById('course-name').focus();
    });
  }

  function initCourseForm(store) {
    var form = document.getElementById('course-form');
    var input = document.getElementById('course-name');
    var err = document.getElementById('course-error');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var result = addCourse(store.getData(), input.value);
      if (!result.ok) { setFieldError(input, err, result.error); input.focus(); return; }
      setFieldError(input, err, '');
      store.save();
      input.value = '';
      renderCourses(store);
      input.focus();
    });
  }

  /* ---- Assignments UI: list, form, details ---- */
  var STATUS_LABEL = { upcoming: 'Upcoming', overdue: 'Overdue', completed: 'Completed' };

  function formatDateTime(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ISO string -> value for <input type="datetime-local"> in local time */
  function toLocalInput(iso) {
    if (!iso) { return ''; }
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return ''; }
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  var ui = { view: 'dashboard', editingId: null, detailsId: null };

  function showView(name) {
    ['dashboard', 'form', 'details'].forEach(function (v) {
      document.getElementById('view-' + v).hidden = (v !== name);
    });
    ui.view = name;
    window.scrollTo(0, 0);
    var heading = { dashboard: 'dashboard-title', form: 'form-title', details: 'details-title' }[name];
    document.getElementById(heading).focus();
  }

  function refreshDashboard(store) {
    renderDashboard(store.getData());
    renderAssignmentList(store);
  }

  function statusBadge(status) {
    return el('span', 'status status-' + status, STATUS_LABEL[status]);
  }

  function renderAssignmentList(store) {
    var data = store.getData();
    var list = document.getElementById('assignment-list');
    list.textContent = '';
    sortByDue(data.assignments).forEach(function (a) {
      var li = el('li');
      var row = el('button', 'assignment-row');
      row.type = 'button';
      row.dataset.assignmentId = a.id;
      row.appendChild(el('span', 'assignment-title', a.title));
      row.appendChild(el('span', 'assignment-meta', courseName(data, a.courseId) + ' \u00B7 Due ' + formatDateTime(a.dueAt)));
      row.appendChild(statusBadge(statusOf(a)));
      row.addEventListener('click', function () { openDetails(store, a.id); });
      li.appendChild(row);
      list.appendChild(li);
    });
  }

  function dlRow(dl, term, valueNode) {
    dl.appendChild(el('dt', '', term));
    var dd = el('dd');
    dd.appendChild(valueNode);
    dl.appendChild(dd);
  }

  function openDetails(store, id, savedMessage) {
    var data = store.getData();
    var a = getAssignment(data, id);
    if (!a) { showView('dashboard'); return; }
    ui.detailsId = id;
    document.getElementById('details-title').textContent = a.title;
    document.getElementById('details-status-msg').textContent = savedMessage || '';
    var dl = document.getElementById('details-list');
    dl.textContent = '';
    dlRow(dl, 'Status', statusBadge(statusOf(a)));
    dlRow(dl, 'Course', document.createTextNode(courseName(data, a.courseId)));
    dlRow(dl, 'Due', document.createTextNode(formatDateTime(a.dueAt)));
    dlRow(dl, 'Reminder', document.createTextNode(a.reminderAt ? formatDateTime(a.reminderAt) : 'None'));
    var notes = el('span', 'notes-text', a.notes ? a.notes : 'None');
    dlRow(dl, 'Notes', notes);
    if (a.completed && a.completedAt) { dlRow(dl, 'Completed', document.createTextNode(formatDateTime(a.completedAt))); }
    dlRow(dl, 'Created', document.createTextNode(formatDateTime(a.createdAt)));
    dlRow(dl, 'Last changed', document.createTextNode(formatDateTime(a.updatedAt)));
    showView('details');
  }

  var FORM_FIELDS = [
    { key: 'title', input: 'f-title', error: 'err-title' },
    { key: 'courseId', input: 'f-course', error: 'err-course' },
    { key: 'dueAt', input: 'f-due', error: 'err-due' },
    { key: 'reminderAt', input: 'f-reminder', error: 'err-reminder' },
    { key: 'notes', input: 'f-notes', error: 'err-notes' }
  ];

  function clearFormErrors() {
    FORM_FIELDS.forEach(function (f) {
      setFieldError(document.getElementById(f.input), document.getElementById(f.error), '');
    });
    document.getElementById('form-error').textContent = '';
  }

  function openForm(store, id) {
    var data = store.getData();
    var a = id ? getAssignment(data, id) : null;
    ui.editingId = a ? a.id : null;
    clearFormErrors();
    document.getElementById('form-title').textContent = a ? 'Edit assignment' : 'New assignment';

    var select = document.getElementById('f-course');
    select.textContent = '';
    var placeholder = el('option', '', 'Choose a course');
    placeholder.value = '';
    select.appendChild(placeholder);
    data.courses.forEach(function (c) {
      var o = el('option', '', c.name);
      o.value = c.id;
      select.appendChild(o);
    });
    document.getElementById('help-course').textContent = data.courses.length
      ? '' : 'You have no courses yet. Cancel, add a course on the dashboard, then come back.';

    document.getElementById('f-title').value = a ? a.title : '';
    select.value = a ? a.courseId : '';
    document.getElementById('f-due').value = a ? toLocalInput(a.dueAt) : '';
    document.getElementById('f-reminder').value = a ? toLocalInput(a.reminderAt) : '';
    document.getElementById('f-notes').value = a ? a.notes : '';
    showView('form');
  }

  function initAssignmentUi(store) {
    document.getElementById('new-assignment').addEventListener('click', function () { openForm(store, null); });
    document.getElementById('details-back').addEventListener('click', function () { showView('dashboard'); });
    document.getElementById('details-edit').addEventListener('click', function () { openForm(store, ui.detailsId); });
    document.getElementById('form-cancel').addEventListener('click', function () {
      if (ui.editingId && getAssignment(store.getData(), ui.editingId)) { openDetails(store, ui.editingId); }
      else { showView('dashboard'); }
    });

    document.getElementById('assignment-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var data = store.getData();
      var input = {
        title: document.getElementById('f-title').value,
        courseId: document.getElementById('f-course').value,
        dueAt: document.getElementById('f-due').value,
        reminderAt: document.getElementById('f-reminder').value,
        notes: document.getElementById('f-notes').value
      };
      var result = ui.editingId ? updateAssignment(data, ui.editingId, input) : createAssignment(data, input);
      clearFormErrors();
      if (!result.ok) {
        var firstBad = null;
        FORM_FIELDS.forEach(function (f) {
          if (result.errors[f.key]) {
            var inputEl = document.getElementById(f.input);
            setFieldError(inputEl, document.getElementById(f.error), result.errors[f.key]);
            if (!firstBad) { firstBad = inputEl; }
          }
        });
        if (result.errors.form) { document.getElementById('form-error').textContent = 'Error: ' + result.errors.form; }
        if (firstBad) { firstBad.focus(); }
        return; // nothing invalid is saved
      }
      store.save();
      refreshDashboard(store);
      openDetails(store, result.assignment.id, 'Assignment saved.');
    });
  }

  function init() {
    var store = createStore({
      onSaveError: function (message) {
        showBanner(message, 'Please copy down anything important. StudyTrack has stopped saving to protect your existing records.');
      }
    });
    var result = store.load();

    if (!result.ok && result.reason === 'corrupt') {
      var warn = showBanner(
        'Your saved StudyTrack data could not be read.',
        'Nothing has been changed. You can clear the saved data and start fresh.',
        [{
          label: 'Clear saved data',
          onClick: function () {
            confirmDialog('This permanently deletes all StudyTrack data stored in this browser.', 'Clear data').then(function (ok) {
              if (!ok) { return; }
              if (store.clearAll().ok) {
                warn.remove();
                renderGreeting(store.getData());
                renderDashboard(store.getData());
                renderCourses(store);
              } else {
                showBanner('Changes could not be saved', 'The browser would not let StudyTrack clear its data.');
              }
            });
          }
        }]
      );
    } else if (!result.ok) {
      showBanner('Changes could not be saved', 'This browser is blocking storage for this page, so StudyTrack cannot keep your records.');
    }

    renderGreeting(store.getData());
    renderDashboard(store.getData());
    renderCourses(store);
    initCourseForm(store);
    initAssignmentUi(store);
    global.StudyTrackApp = { store: store, confirmDialog: confirmDialog };
  }

  if (typeof document !== 'undefined' && document.getElementById('app')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(window);
