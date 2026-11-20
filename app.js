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
    assignmentsInCourse: assignmentsInCourse
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
