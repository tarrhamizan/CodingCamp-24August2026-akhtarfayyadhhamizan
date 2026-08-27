# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a zero-dependency, client-side SPA delivered as three files (`index.html`, `css/style.css`, `js/app.js`). The JavaScript file uses an IIFE with five internal modules: `StorageManager`, `GreetingWidget`, `FocusTimer`, `TaskManager`, and `QuickLinksPanel`. All state is persisted to `localStorage` under the keys `tld_tasks` and `tld_links`. The build is incremental: scaffold → StorageManager → GreetingWidget → FocusTimer → TaskManager → QuickLinksPanel → layout polish → wiring checkpoint.

---

## Tasks

- [x] 1. Scaffold project files and HTML skeleton
  - [x] 1.1 Create `index.html` with the full DOM skeleton
    - Declare `<!DOCTYPE html>`, `lang` attribute, `<meta charset>`, `<meta name="viewport">`, and `<title>`.
    - Link `css/style.css` in `<head>` and `js/app.js` before `</body>`.
    - Add a `.dashboard-grid` wrapper containing four `<section>` elements: `#greeting-widget`, `#focus-timer`, `#task-manager`, `#quick-links-panel`.
    - Include all static interactive controls (timer buttons `#btn-start`, `#btn-stop`, `#btn-reset`; task add form `#task-form`; quick-link add form `#link-form`).
    - Add `aria-live="polite"` regions for dynamic content areas (task list, links panel, storage error banner).
    - _Requirements: 10.1, 11.1, 11.4_

  - [x] 1.2 Create `css/style.css` with base reset and CSS custom properties
    - Apply a minimal CSS reset (`box-sizing`, margin/padding zero).
    - Define CSS custom properties (`--color-bg`, `--color-surface`, `--color-accent`, `--color-text`, `--radius`, `--gap`) for consistent theming.
    - Style widget card surfaces with background, border-radius, and padding.
    - _Requirements: 10.2, 10.3_

  - [x] 1.3 Create `js/app.js` as a top-level IIFE with five empty module stubs and the `DOMContentLoaded` bootstrap
    - Wrap all code in `(function () { /* ... */ })();`.
    - Declare five const objects: `StorageManager`, `GreetingWidget`, `FocusTimer`, `TaskManager`, `QuickLinksPanel` — each with an `init()` stub.
    - Add the `DOMContentLoaded` listener that calls each module's `init()` in order.
    - _Requirements: 10.4, 11.1_

- [x] 2. Implement StorageManager
  - [x] 2.1 Implement `StorageManager.load()` and `StorageManager.save()`
    - Define `KEYS: { TASKS: 'tld_tasks', LINKS: 'tld_links' }`.
    - `load(key)`: wrap `localStorage.getItem` + `JSON.parse` in try/catch; return parsed value or `null` on any failure.
    - `save(key, value)`: wrap `localStorage.setItem(key, JSON.stringify(value))` in try/catch; return `true` on success, `false` on failure (quota exceeded or API unavailable).
    - _Requirements: 6.1, 6.2, 6.5, 9.1, 9.2, 9.5, 11.2_

  - [x] 2.2 Implement the storage-unavailable detection and error banner
    - On `DOMContentLoaded` (inside Bootstrap), probe `localStorage` with a test write/read/delete; if it throws, show a persistent `#storage-error-banner` informing the user storage is unavailable.
    - `StorageManager.save()` returning `false` must trigger a transient `#storage-save-banner` ("Data could not be saved").
    - _Requirements: 6.6, 9.6, 11.5_

  - [ ]* 2.3 Write unit tests for StorageManager
    - Test `load()` returns `null` for missing key, malformed JSON, and localStorage throwing.
    - Test `save()` returns `true` on success and `false` when `setItem` throws a `QuotaExceededError`.
    - Test that `KEYS.TASKS !== KEYS.LINKS` (distinct key requirement).
    - _Requirements: 6.5, 6.7, 9.5_

- [x] 3. Implement GreetingWidget
  - [x] 3.1 Implement `GreetingWidget.getGreeting()`, `formatDate()`, and `formatTime()`
    - `getGreeting(hour)`: return "Good Morning" for 5–11, "Good Afternoon" for 12–17, "Good Evening" for 18–20, "Good Night" for 21–23 and 0–4.
    - `formatDate(date)`: return `"DayOfWeek, Month DD, YYYY"` (e.g., `"Monday, July 14, 2025"`) using `toLocaleDateString` or manual arrays.
    - `formatTime(date)`: return `"HH:MM"` with zero-padded hours and minutes.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Implement `GreetingWidget.init()` and `_tick()`
    - `init()`: grab DOM references (`#greeting-time`, `#greeting-date`, `#greeting-message`), call `_tick()` immediately, then start `setInterval(_tick, 1000)`.
    - `_tick()`: wrap `new Date()` in try/catch; on success update all three DOM elements; on failure set time to `"--:--"` and leave date/greeting unchanged.
    - _Requirements: 1.1, 1.7, 1.8_

  - [ ]* 3.3 Write unit tests for GreetingWidget pure functions
    - Test `getGreeting` for each boundary hour (0, 4, 5, 11, 12, 17, 18, 20, 21, 23).
    - Test `formatDate` and `formatTime` for expected output shapes (regex matching `HH:MM` and day/month/year pattern).
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [x] 4. Checkpoint — storage and greeting
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement FocusTimer
  - [x] 5.1 Implement the FocusTimer state machine and display logic
    - Declare module-scoped state: `state = 'IDLE'`, `remaining = 1500`, `_intervalId = null`.
    - `_formatDisplay(seconds)`: return zero-padded `"MM:SS"`.
    - `_syncControls()`: apply disabled state to `#btn-start` and `#btn-stop` per the state/remaining matrix in the design (Requirements 2.10–2.12).
    - `init()`: set `remaining = 1500`, render `"25:00"`, wire click handlers for Start/Stop/Reset buttons, call `_syncControls()`.
    - _Requirements: 2.1, 2.10, 2.11, 2.12_

  - [x] 5.2 Implement `start()`, `stop()`, `reset()`, and `_tick()`
    - `start()`: transition `IDLE/PAUSED → RUNNING`; start `setInterval(_tick, 1000)`.
    - `stop()`: transition `RUNNING → PAUSED`; clear interval; retain `remaining`.
    - `reset()`: clear interval; set `state = 'IDLE'`, `remaining = 1500`; re-render `"25:00"`; call `_syncControls()`.
    - `_tick()`: decrement `remaining`; update display; when `remaining === 0` call `stop()`, render `"00:00"`, call `_alert()`, call `_syncControls()`.
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 5.3 Implement `_alert()` with Web Audio API and CSS fallback
    - Try to create `AudioContext`, connect an `OscillatorNode` (sine wave, 440 Hz), start for ≥1 second, then stop and close.
    - If `AudioContext` construction throws or is undefined, add CSS class `timer--session-end` to the display element (pulsing animation defined in `style.css`).
    - _Requirements: 2.8, 2.9_

  - [ ]* 5.4 Write unit tests for FocusTimer logic
    - Test `_formatDisplay` for `0 → "00:00"`, `1500 → "25:00"`, `65 → "01:05"`.
    - Test state transitions: `start()` from IDLE/PAUSED sets state to RUNNING; `stop()` from RUNNING sets state to PAUSED; `reset()` from any state sets IDLE and remaining to 1500.
    - Test `_syncControls` produces correct disabled combinations for each state/remaining combination.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.10, 2.11, 2.12_

- [x] 6. Implement TaskManager
  - [x] 6.1 Implement the Task data model, schema validation, and `_persist()`
    - Define task shape: `{ id, description, completed, createdAt }`.
    - Write a `_validateTask(item)` helper: id is non-empty string, description is non-empty string ≤500 chars, completed is boolean, createdAt is a number.
    - `_persist()`: call `StorageManager.save(KEYS.TASKS, tasks)`; if it returns `false`, trigger the save-failure banner.
    - On `init()`: load from storage, filter each element through `_validateTask`, treat array-level failure as empty dataset.
    - _Requirements: 6.2, 6.3, 6.4, 6.7_

  - [x] 6.2 Implement `addTask()` and the add-form wiring
    - `addTask(description)`: trim input; reject if empty or >500 chars (show inline error); generate id via `crypto.randomUUID()` falling back to `Date.now().toString()`; push to `tasks` array; `_persist()`; `_render()`; return `true`/`false`.
    - Wire `#task-form` submit event and Enter keydown on the input to call `addTask`.
    - Clear input and remove error state on successful add.
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 6.3 Implement `_render()` with event delegation
    - `_render()`: clear the task list container; iterate `tasks` array and build each `<li class="task-item" data-id="...">` with checkbox, description `<span>`, Edit button, and Delete button.
    - Apply `completed` class (strikethrough) when `task.completed === true`; set checkbox `checked` state accordingly.
    - Attach a single delegated click listener on the list container (not per-item) that routes to `toggleComplete`, `openEdit`, or `deleteTask` based on the clicked element's class.
    - Add `aria-label` to each interactive element; set `aria-checked` on checkbox.
    - _Requirements: 3.4, 3.5, 5.1, 5.2, 5.3, 5.6, 10.2_

  - [x] 6.4 Implement `toggleComplete()` and `deleteTask()`
    - `toggleComplete(id)`: cancel any open edit first; flip `completed` boolean; `_persist()`; `_render()`.
    - `deleteTask(id)`: remove task from array by id; `_persist()`; `_render()`.
    - _Requirements: 5.2, 5.3, 5.5, 5.6_

  - [x] 6.5 Implement `openEdit()`, `saveEdit()`, and `cancelEdit()`
    - `openEdit(id)`: if `_editingId !== null`, call `cancelEdit(_editingId)` first; replace the description span with a text input pre-filled with the current description, cursor at end; add Save and Cancel controls; set `_editingId = id`.
    - `saveEdit(id, newDescription)`: trim; reject if empty (show inline error, keep input open); update `tasks` entry; `_persist()`; `_render()`; clear `_editingId`.
    - `cancelEdit(id)`: discard; `_render()`; clear `_editingId`.
    - Wire Enter key on the edit input to `saveEdit`; Escape key to `cancelEdit`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 6.6 Write unit tests for TaskManager logic
    - Test `addTask`: rejects empty string, rejects >500-char string, adds valid task with correct shape (id, description, completed=false, createdAt number).
    - Test `saveEdit`: rejects empty/whitespace; updates description; leaves other fields unchanged.
    - Test `toggleComplete`: flips completed; does not affect other fields.
    - Test `deleteTask`: removes correct item; leaves others intact.
    - Test single-edit-mode invariant: `openEdit` on a second task while first is open closes the first without saving.
    - _Requirements: 3.2, 3.3, 3.6, 4.3, 4.4, 4.6, 5.2, 5.3, 5.5_

- [x] 7. Checkpoint — task manager
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement QuickLinksPanel
  - [x] 8.1 Implement the QuickLink data model, schema validation, `validateURL()`, and `_persist()`
    - Define link shape: `{ id, label, url }`.
    - `validateURL(url)`: return `true` if url starts with `'http://'` or `'https://'`.
    - Write `_validateLink(item)` helper: id non-empty string, label non-empty string ≤50 chars, url non-empty string ≤2048 chars.
    - `_persist()`: call `StorageManager.save(KEYS.LINKS, links)`; show save-failure banner on `false`.
    - On `init()`: load from storage, filter through `_validateLink`, treat array-level failure as empty dataset.
    - _Requirements: 7.2, 7.3, 8.2, 8.3, 9.2, 9.3, 9.4_

  - [x] 8.2 Implement `addLink()` and the add-form wiring
    - `addLink(label, url)`: trim both fields; validate label non-empty and ≤50 chars, url non-empty, `validateURL(url)` true, url ≤2048 chars; show specific inline errors per failing condition; generate id; push; `_persist()`; `_render()`; return `true`/`false`.
    - Wire `#link-form` submit event to `addLink`.
    - Clear inputs and errors on successful add.
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.3 Implement `_render()`, `navigateTo()`, and `deleteLink()` with event delegation
    - `_render()`: clear panel container; build each link as a `<div class="link-item" data-id="...">` containing a `<button class="link-btn">` (label text) and a `<button class="link-delete-btn">` (Delete).
    - `navigateTo(url)`: if `validateURL(url)` is true, call `window.open(url, '_blank', 'noopener')`; otherwise display inline error on the affected button row.
    - `deleteLink(id)`: remove from array; `_persist()`; `_render()`.
    - Attach a single delegated click listener on the panel container routing to `navigateTo` or `deleteLink`.
    - Add `aria-label` to link and delete buttons.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.4, 8.5_

  - [ ]* 8.4 Write unit tests for QuickLinksPanel logic
    - Test `validateURL`: accepts `http://` and `https://` prefixes; rejects `ftp://`, empty string, `javascript:`, bare domain.
    - Test `addLink`: rejects empty label, empty url, invalid url; adds valid link with correct shape.
    - Test `deleteLink`: removes correct item; leaves others.
    - _Requirements: 7.2, 7.3, 8.2, 8.3, 8.5_

- [x] 9. Implement responsive layout and visual polish in `style.css`
  - [x] 9.1 Implement the responsive CSS Grid layout
    - Default (mobile-first): `.dashboard-grid` uses `display: flex; flex-direction: column; gap: 1rem;`.
    - `@media (min-width: 768px)`: switch to `display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;`.
    - Ensure widget source order in HTML matches the visual order: Greeting → Timer → Tasks → Links.
    - _Requirements: 10.5, 10.6_

  - [x] 9.2 Implement widget typography, control styling, and interactive states
    - Style widget `<h2>` titles distinctly from body text (size, weight, color using custom properties).
    - Style buttons with visible focus rings (`outline` not removed, or custom `box-shadow` focus indicator).
    - Style the completed task strikethrough (`text-decoration: line-through`), disabled button opacity, and edit-mode input.
    - Style error message elements (inline `<span class="error-msg">` and the `#storage-save-banner`).
    - Add `timer--session-end` keyframe animation (pulsing) for the audio fallback state.
    - _Requirements: 10.2, 11.1_

  - [ ]* 9.3 Write visual regression / smoke tests for layout breakpoints
    - Using jsdom or a similar headless DOM environment, assert that the grid container has the expected class names and that the four widget sections are present in correct order.
    - _Requirements: 10.1, 10.5, 10.6_

- [~] 10. Keyboard accessibility and ARIA wiring
  - [~] 10.1 Audit and complete keyboard accessibility across all widgets
    - Confirm all interactive controls are reachable via Tab and have visible focus indicators.
    - Ensure timer buttons update `aria-disabled` attribute (not just the HTML `disabled` property) so screen readers announce state.
    - Ensure task checkbox uses `role="checkbox"` with `aria-checked`; edit input is associated with a `<label>` or `aria-label`.
    - Ensure link buttons carry meaningful `aria-label` (include the link's label text).
    - _Requirements: 10.2, 11.1_

  - [~] 10.2 Verify `aria-live` regions fire correctly for dynamic content
    - Confirm the storage error banner and save-failure banner are inside the `aria-live="polite"` region so assistive technologies announce them.
    - Confirm the task list container is updated without removing the `aria-live` wrapper on re-render.
    - _Requirements: 6.6, 9.6, 11.5_

- [~] 11. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery.
- All implementation uses only HTML, CSS, and Vanilla JavaScript — no build tools, no external libraries.
- Tests (optional subtasks) can be run using any test harness that works with ES module or IIFE code (e.g., Vitest with jsdom, or plain Node assert scripts).
- Each task references specific requirements for traceability; the requirement numbers map directly to the requirements document.
- Checkpoints (tasks 4, 7, 11) are natural integration gates where the partially-built app should be opened in a browser and smoke-tested manually.
- The `crypto.randomUUID()` fallback to `Date.now().toString()` is intentional for Safari compatibility.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["3.3", "5.2", "6.1"] },
    { "id": 5, "tasks": ["5.3", "6.2", "6.3"] },
    { "id": 6, "tasks": ["5.4", "6.4", "6.5"] },
    { "id": 7, "tasks": ["6.6", "8.1"] },
    { "id": 8, "tasks": ["8.2", "8.3"] },
    { "id": 9, "tasks": ["8.4", "9.1"] },
    { "id": 10, "tasks": ["9.2", "10.1"] },
    { "id": 11, "tasks": ["9.3", "10.2"] }
  ]
}
```
