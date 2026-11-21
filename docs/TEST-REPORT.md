# StudyTrack – Test Report

Only real results are recorded here. Anything that has not been run is marked **Not yet tested**.

## 1. Automated checks (`tests/tests.html`)

- **Result: 49 of 49 checks passed - ALL PASS.**
- **Run date:** 2026-11-21
- **Browser:** Chromium 157.0.8103.78 (headless, Linux), the engine that Google Chrome and Microsoft Edge are built on. The page was served from a local web server (`python -m http.server`), the same way Live Server serves it.
- **Not run in:** Google Chrome on Windows, or Microsoft Edge. See section 4.
- **Safety:** logic checks use storage key `studytrack.test.v1` and page checks use `studytrack.test.ui`. After the run nothing had been written to the real key `studytrack.v1` and no test keys were left behind.
- **Evidence:** screenshot at `docs/screenshots/tests-page-chromium-157.png` (fallback fonts, because the handwriting font is not installed on the Linux test machine).
- **Do the checks catch real faults?** Yes. To confirm, a temporary copy of the app was broken on purpose (reminder rule reversed, titles inserted with `innerHTML`, writes not halted after a save failure). 18 of 49 checks failed, including the script-injection check. The broken copy was then discarded; the code in this repository was never broken.

| # | Check | Browser | Date run | Result |
|---|---|---|---|---|
| 1 | Create an assignment saves all fields with defaults | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 2 | Edit an assignment changes its fields and updated time | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 3 | Complete an assignment sets completed and completion time | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 4 | Reopen an assignment clears completed and completion time | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 5 | Delete an assignment removes only that assignment | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 6 | Records persist after a reload (saved, re-read from real localStorage, compared) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 7 | Everything is stored under one key with a schema version | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 8 | Status rules: Upcoming, Overdue, Completed | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 9 | Status boundary: due exactly now is still Upcoming; one second later is Overdue | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 10 | Dashboard counts: Upcoming, Overdue, Completed | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 11 | List is sorted by due date, soonest first (ties by title) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 12 | Filters: All, Upcoming, Overdue, Completed | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 13 | Filter by course, and course combined with status | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 14 | Course progress is calculated from saved records (0%, 33%, 100%, empty course) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 15 | Add course: trims, rejects empty and duplicate names (any capitalization) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 16 | Rename course works, but not to an existing name | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 17 | Delete course is blocked while it has assignments; allowed once empty | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 18 | A reminder set after the due date is rejected with a message | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 19 | A reminder exactly at the due time is accepted | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 20 | A reminder triggers when its time is reached, and only once | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 21 | Editing an assignment updates its reminder (old time no longer fires, new time does) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 22 | Removing the reminder by editing cancels it | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 23 | Completing an assignment cancels its reminder; reopening before the time brings it back | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 24 | Deleting an assignment cancels its reminder | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 25 | A reminder time that passed while the app was closed does not fire | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 26 | Invalid form data is rejected: missing or blank title | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 27 | Invalid form data is rejected: missing or unknown course | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 28 | Invalid form data is rejected: missing or invalid due date, invalid reminder | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 29 | Notes over the limit are rejected | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 30 | Nothing invalid is saved (create and edit leave data unchanged) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 31 | Display name: trimmed and limited to 30 characters | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 32 | Simulated save failure triggers the warning "Changes could not be saved" | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 33 | After a save failure all further writes are halted (no more attempts) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 34 | Unreadable stored data does not crash; writes halt; raw data is left untouched | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 35 | Stored data with the wrong shape or schema version is treated as unreadable | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 36 | Blocked or unavailable browser storage does not crash | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 37 | Clear-all lifts the halt for unreadable data but not after a save failure | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 38 | Sample data loads courses and assignments, and does not duplicate on a second load | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 39 | Text like <img src=x onerror=alert(1)> is stored exactly as typed (as plain text data) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 40 | Page: the real app used the test storage key, not the real one | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 41 | Page: <img src=x onerror=alert(1)> displays as plain text in the list, details and course list | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 42 | Page: create, complete, reopen and delete an assignment through the screens | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 43 | Page: an invalid form returns to the form with messages next to the fields and saves nothing | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 44 | Page: a reminder after the due date is rejected on the form | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 45 | Page: a reminder banner appears when its time is reached and can be dismissed | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 46 | Page: Overdue assignments show the text label "Overdue" (not colour alone) | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 47 | Page: a simulated storage failure shows the warning and halts further writes | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 48 | Page: unreadable stored data shows a message and offers to clear it, without crashing | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| 49 | Page: Settings shows the storage note; name label updates the header; Clear all asks for confirmation | Chromium 157.0.8103.78 | 2026-11-21 | PASS |

## 2. Additional development checks (run during the build)

These were run with throwaway scripts that are not part of the repository, so they cannot be repeated from it. They are recorded for completeness.

| Check | Browser | Date run | Result |
|---|---|---|---|
| axe-core accessibility audit (WCAG 2.0/2.1/2.2 A and AA rules) of the dashboard, details view, form with errors, settings, confirmation dialog, reminder banner and corrupt-data warning, at 360 px and 1280 px | Chromium 157.0.8103.78 | 2026-11-21 | 0 violations in every state |
| Keyboard sweep: every Tab stop on dashboard, details, form and settings shows a visible focus ring (360 px and 1280 px) | Chromium 157.0.8103.78 | 2026-11-21 | PASS (one fault found and fixed: the calendar button inside the date fields) |
| Skip link is the first Tab stop and moves focus to the main content; confirmation dialog starts on Cancel, keeps focus inside, and Escape cancels | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| No horizontal scrolling at 360 px and 1280 px | Chromium 157.0.8103.78 | 2026-11-21 | PASS |
| Reminders with a simulated clock: nothing before the time, banner at the time, fires once, dismiss, edit moves it, complete and delete cancel it, View opens details, Overdue labels update while the page is open | Chromium 157.0.8103.78 | 2026-11-21 | PASS (17 checks) |

Colour-contrast ratios are listed in `docs/DESIGN.md`.

## 3. Known limits of these results

- Automated checks cannot judge how the app looks or feels. The handwriting and Segoe fonts were not available on the test machine.
- Browsers slow down timers in background tabs, so a real reminder can appear later than 30 seconds if the tab is hidden. The automated reminder checks use a simulated clock.
- No known critical defects at the time of writing.

## 4. Manual checks for Akram

Try these on your own computer and phone, then change the status here.

| # | Manual check | How | Status |
|---|---|---|---|
| M1 | Run the automated checks on your laptop | In VS Code, right-click `tests/tests.html` and choose "Open with Live Server" (in Chrome). The top box should say "49 of 49 checks passed - ALL PASS". Write down your Chrome version (Chrome menu, Help, About Google Chrome). | Not yet tested |
| M2 | Every core workflow by hand in Chrome | Add a course, add an assignment, edit it, complete it, reopen it, delete it, use the filters, and check the progress percentage. | Not yet tested |
| M3 | Every core workflow by hand in Edge | Optional: you decided to use Chrome only, so Edge has not been tested. | Not yet tested |
| M4 | A reminder appearing while the app is open | Create an assignment with a reminder 2 to 3 minutes ahead and keep the tab visible. A banner should appear within about 30 seconds of that time. | Not yet tested |
| M5 | Records still present after closing and reopening the browser | Load the sample assignments, close Chrome completely, then reopen the page. | Not yet tested |
| M6 | Narrow window | Make the browser window about phone width. Nothing should scroll sideways and everything should be readable. | Not yet tested |
| M7 | A real phone | Open the app on a phone in Chrome. Check the date and time pickers and the buttons are easy to use. | Not yet tested |
| M8 | Keyboard-only use | Use only Tab, Shift+Tab, Enter, Space and Escape. Add a course, add an assignment, complete it and delete it. The focus outline should always be visible. | Not yet tested |
| M9 | Real fonts and overall look | Check the handwriting headings (Segoe Print) and the graphite look on Windows at normal size. | Not yet tested |
