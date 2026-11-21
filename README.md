# StudyTrack

StudyTrack is a small web app that helps college students keep track of assignments and deadlines. Students add courses and assignments, set due dates and in-app reminders, mark work complete, and see their progress per course. It is a course project for an IT Project Management class at Trine University.

- Plain HTML, CSS and JavaScript. No Node.js, no npm, no frameworks, no build step, no server, no database, no accounts.
- Records are kept in the browser's `localStorage` (one key, `studytrack.v1`, with a schema version). Nothing leaves the browser.
- Reminders work only while the page is open. Students should always rely on official course deadlines.
- Supported browsers: current Chrome (laptop and phone-width layouts). Edge has not been tested.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `styles.css` | Layout and graphite look (responsive from about 360 px) |
| `app.js` | All behavior |
| `tests/tests.html` | In-browser checks (PASS or FAIL for each) |
| `docs/DESIGN.md` | Palette, contrast ratios, accessibility notes |
| `docs/TEST-REPORT.md` | Test results and the manual checks still to do |
| `docs/USER-GUIDE.md` | Guide for students |
| `docs/PILOT-CHECKLIST.md` | Script and score sheet for the ten-student pilot |
| `PLAN.md` | Build plan |

## Open the app (Visual Studio Code and Live Server)

1. Install [Visual Studio Code](https://code.visualstudio.com) and the **Live Server** extension by Ritwick Dey.
2. In VS Code choose **File → Open Folder** and pick the StudyTrack folder (for example `C:\StudyTrack`).
3. Right-click `index.html` and choose **Open with Live Server**, or click **Go Live** at the bottom right.
4. Chrome opens the app. Keep using that same address so your records stay in one place.

Fallback if Live Server cannot be used: open a terminal in the folder and run `python -m http.server`, then visit `http://localhost:8000`.

To get the latest version from GitHub, open a terminal in the folder and run `git pull`, then reload the page (Ctrl+F5).

## Run the tests

1. Open the folder in VS Code as above.
2. Right-click `tests/tests.html` and choose **Open with Live Server**.
3. The box at the top reports the result, for example "49 of 49 checks passed - ALL PASS". Each check is listed with PASS or FAIL, and failures show the reason.

The checks use their own storage keys (`studytrack.test.v1` and `studytrack.test.ui`) and never touch your real records. They run the real page in a hidden frame for the screen-level checks.

See `docs/TEST-REPORT.md` for recorded results and the manual checks that still need a person.

## Known limits

- Data lives only in the browser on one device. Clearing browser data deletes it.
- No background or push notifications, no sync, no login.
