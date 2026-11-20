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

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    DEFAULT_KEY: DEFAULT_KEY,
    defaultData: defaultData,
    isValidData: isValidData,
    createStore: createStore,
    statusOf: statusOf,
    countByStatus: countByStatus
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
