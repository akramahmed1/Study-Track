# StudyTrack – Build Plan

Plain HTML/CSS/JS. No Node, npm, frameworks, build step, CDN, server or database.
Runs from VS Code Live Server ("Go Live") on the laptop. Chrome is the test browser (Edge skipped by owner decision).

## File structure
```
index.html          structure (header, dashboard, forms, dialogs, banner)
styles.css          graphite look, responsive 360px -> laptop
app.js              all behavior (storage, state, render, reminders)
tests/tests.html    in-browser checks (PASS/FAIL), own localStorage key
docs/DESIGN.md      palette + contrast ratios
docs/TEST-REPORT.md real results + "Manual checks for Akram"
docs/USER-GUIDE.md  student guide
docs/PILOT-CHECKLIST.md  10-student pilot script
README.md           what it is, open with Live Server, run tests
PLAN.md             this file
```
Exactly three app files; `app.js` exposes a `StudyTrack` object (pure logic separate from DOM code) so `tests/tests.html` can load it and call it with a test storage key.

## Data model (key `studytrack.v1`, one JSON object)
- `schemaVersion`: 1
- `settings`: { displayName }
- `courses`: [{ id, name }]
- `assignments`: [{ id, title, courseId, dueAt (ISO), reminderAt (ISO|null), notes, completed, completedAt, createdAt, updatedAt }]
- `reminderShown` is kept in memory only (ids already announced), not saved.

Status: Completed if completed; Overdue if not completed and dueAt < now; else Upcoming.
Progress per course = completed / total assignments in that course (calculated, never stored).

## Key behaviors
- Storage: every read/write in try/catch. Write failure -> banner "Changes could not be saved" and all later writes halted. Unreadable data -> message + "Clear it" button (no crash).
- Validation: title, course, due date required; reminder must be <= due date; errors shown next to fields; nothing invalid saved.
- Course delete blocked with message if it has assignments. Rename and add validated (non-empty, no duplicate names).
- Every delete (assignment, course, clear-all) asks for confirmation (native `<dialog>`).
- Reminders: `setInterval` every 30 s; dismissible banner when reminderAt <= now and not completed; edit updates; complete/delete cancels. Note: "Rely on official course deadlines." Overdue labels work independently.
- Security: user text only via `textContent`/DOM methods, never `innerHTML`.
- Settings: name label ("Hi, Alex"), storage note, Load sample assignments, Clear all data (confirm).

## Design
White #FFFFFF, graphite #1F1F1F text, grey #5E5E5E secondary text/borders/controls, pencil #9A9A9A decorative only (never text/borders/controls). Handwriting font for headings/labels only; Segoe UI for body/forms/buttons. Body 16-18px. Visible focus, keyboard operable, labels on all fields, Overdue shown as text + icon, not color alone. All ratios computed and listed in `docs/DESIGN.md`.

## Build order (commit after each, wait for "continue")
1. Skeleton, Git, storage with error handling, empty dashboard
2. Courses add/rename/delete (blocked when in use)
3. Assignment form + validation + details view
4. Complete/reopen/delete with confirm; counts, sort, filters, progress
5. Reminders
6. Settings (name, storage note, sample data, clear all)
7. Design + accessibility pass; script-injection check
8. Docs + `tests/tests.html` results + test report

## Testing
Checks in `tests/tests.html` cover the list in the brief. I will run them in headless Chrome here (served by `python -m http.server`, only with owner's OK, already given for tests) and record real results only. Phone, keyboard-only, reminder-while-open, and reopen-browser checks are listed as "Not yet tested" for Akram.
