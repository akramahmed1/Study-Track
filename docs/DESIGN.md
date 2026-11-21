# StudyTrack – Design and Accessibility Notes

Target: WCAG 2.2 AA. Look: monochrome graphite-sketch, from the Week 3 design plan.

## Palette

| Name | Value | Used for |
|---|---|---|
| Paper | `#FFFFFF` | Page and control background |
| Graphite | `#1F1F1F` | Main text, headings, focus ring, strong buttons, selected filter, progress fill |
| Secondary grey | `#5E5E5E` | Secondary text, borders, controls |
| Hover tint | `#F2F2F2` | Hover background on buttons and assignment rows |
| Black | `#000000` | Hover state of a strong (dark) button |
| Pencil | `#9A9A9A` | **Decoration only**: the sketch-style underline under page titles. Never text, borders or controls. |

The dialog backdrop is `rgba(31,31,31,0.6)` over the page. It is not a control or text.

## Contrast ratios (calculated with the WCAG relative-luminance formula)

Text needs at least 4.5:1. Borders, controls and the focus ring need at least 3:1.

| Foreground | Background | Ratio | Required | Where it appears | Result |
|---|---|---|---|---|---|
| `#1F1F1F` | `#FFFFFF` | 16.48:1 | 4.5 (text) | Body text, headings, buttons, form text | Pass |
| `#5E5E5E` | `#FFFFFF` | 6.48:1 | 4.5 (text) | Secondary text, hints, meta lines | Pass |
| `#1F1F1F` | `#F2F2F2` | 14.72:1 | 4.5 (text) | Text on hovered buttons and rows | Pass |
| `#5E5E5E` | `#F2F2F2` | 5.79:1 | 4.5 (text) | Meta text on a hovered assignment row | Pass |
| `#FFFFFF` | `#1F1F1F` | 16.48:1 | 4.5 (text) | Text on strong buttons and the selected filter | Pass |
| `#FFFFFF` | `#000000` | 21.00:1 | 4.5 (text) | Text on a hovered strong button | Pass |
| `#5E5E5E` | `#FFFFFF` | 6.48:1 | 3 (non-text) | Borders of inputs, buttons, tiles, course cards, progress bar | Pass |
| `#5E5E5E` | `#F2F2F2` | 5.79:1 | 3 (non-text) | Borders of a hovered row or button | Pass |
| `#1F1F1F` | `#FFFFFF` | 16.48:1 | 3 (non-text) | 3 px keyboard focus ring; invalid-field border; dialog border | Pass |
| `#9A9A9A` | `#FFFFFF` | 2.81:1 | n/a | Decorative underline only | **Below 3:1 on purpose: carries no information and is never used for text, borders or controls** |

## Statuses are never shown by colour alone

The design is monochrome, so no status relies on colour. Each status has a text label plus a shape cue:

- **Overdue**: the word "Overdue", a warning symbol, and a thicker border.
- **Completed**: the word "Completed" and a check mark.
- **Upcoming**: the word "Upcoming".
- **Selected filter**: a check mark, bold text and a dark fill (also exposed as `aria-pressed`).
- **Field errors**: text beginning "Error:" beside the field, a thicker field border, and `aria-invalid`.
- **Progress**: the text "1 of 3 completed (33%)" as well as the bar.

## Typography

- Headings and section labels: `"Segoe Print", "Comic Sans MS", cursive`.
- Body, forms and buttons: `"Segoe UI", system-ui, sans-serif`.
- Body text is 17 px (1.0625rem). The smallest text (hints, meta lines, status labels) is 0.95rem, about 15 to 16 px. Headings are larger.
- Note: the handwriting and Segoe fonts exist on Windows. On other systems the fallback fonts are used.

## Keyboard and screen reader support

- A "Skip to main content" link is the first Tab stop.
- Everything is reachable and usable by keyboard. Tab order follows the visual order.
- A 3 px graphite focus ring shows on every control, including the calendar button inside the date fields.
- Every form field has a visible `<label>`. Hints and errors are linked with `aria-describedby`.
- Buttons for a specific item have unambiguous names (for example "Delete course Biology 101").
- The delete and clear-data confirmation uses a native `<dialog>`: focus starts on Cancel, stays inside the dialog, and Escape cancels.
- Messages ("saved", "deleted", errors, reminders, storage warnings) are announced through `role="status"` or `role="alert"` regions.
- Touch targets are at least 44 px tall.

## Responsive layout

- Single column from about 360 px (phone) upward, with no horizontal scrolling.
- From 60rem (laptop) the assignment list sits on the left and the courses on the right.

## Automated accessibility audit (development check, not part of the app)

An axe-core audit (WCAG 2.0, 2.1 and 2.2 A/AA rules) was run in headless Chrome at 360 px and 1280 px on the dashboard, details view, form with errors, settings, confirmation dialog, reminder banner, and the corrupt-data warning. Result: 0 violations in every state. A script also tabbed through each screen and confirmed that every focus stop shows a visible focus ring. Results are recorded in `docs/TEST-REPORT.md`.

This is an automated check. It does not replace the manual checks listed for Akram (keyboard-only use, real phone, and a visual check on Windows with the real fonts).
