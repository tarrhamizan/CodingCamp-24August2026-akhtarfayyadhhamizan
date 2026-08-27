# Technical Design Document

## To-Do List Life Dashboard

---

## Overview

The To-Do List Life Dashboard is a self-contained, client-side single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript — no frameworks, no build step, no backend. It opens as a standalone HTML file or browser extension entry point and persists all user data in the browser's `localStorage` API.

The application renders four widgets in a single viewport:

1. **Greeting Widget** — current time (HH:MM, updating every second), full date, and a time-of-day greeting phrase.
2. **Focus Timer** — a 25-minute (1500-second) countdown with Start, Stop, and Reset controls and an audible alert on completion.
3. **Task Manager** — a to-do list supporting add, edit, complete/uncomplete, and delete operations with per-operation Local Storage persistence.
4. **Quick Links Panel** — user-defined labeled shortcut buttons that open validated URLs in new browser tabs.

### Design Goals

- **Zero dependencies** — ships as three files: `index.html`, `css/style.css`, `js/app.js`.
- **Resilience** — every Local Storage operation is wrapped in try/catch; corrupt data is silently discarded.
- **Accessibility** — semantic HTML elements, `aria-*` attributes for dynamic state, and keyboard support throughout.
- **Cross-browser** — targets Chrome, Firefox, Edge, and Safari current stable releases using standard Web APIs only.

---

## Architecture

### File Structure

```
index.html          ← single entry point; declares DOM skeleton and widget containers
css/
  style.css         ← all visual styling, responsive grid, widget themes
js/
  app.js            ← all application behaviour (four modules + bootstrap)
```

### Module Organization (inside `app.js`)

The single JavaScript file is structured as an Immediately Invoked Function Expression (IIFE) to avoid polluting the global scope, with five internal modules separated by comment headers:

```
app.js
├── StorageManager    — read/write localStorage with error handling
├── GreetingWidget    — clock interval, greeting logic
├── FocusTimer        — countdown state machine, audio alert
├── TaskManager       — task CRUD, edit mode, completion toggle
├── QuickLinksPanel   — link CRUD, URL validation, tab navigation
└── Bootstrap         — DOMContentLoaded wiring
```

Each module exposes only an `init()` function to the Bootstrap section; all internal state is held in module-scoped `let` / `const` variables within the IIFE closure.

### Data Flow

```
User Interaction
      │
      ▼
Widget Module (DOM event handler)
      │  mutates in-memory state
      ▼
StorageManager.save(key, data)
      │  JSON.stringify → localStorage.setItem
      ▼
UI re-render (direct DOM mutation — no virtual DOM)
```

On page load the flow reverses:

```
DOMContentLoaded
      │
      ▼
StorageManager.load(key) → JSON.parse → validate schema
      │
      ▼
Widget Module.init(data) → render to DOM
```

### State Model

Each widget owns its state independently. There is no shared application state object. Widgets communicate only through the StorageManager (write) and bootstrap (initial load).

---

## Components and Interfaces

### StorageManager

Responsible for all `localStorage` interactions. It is the only module that calls `localStorage.setItem` or `localStorage.getItem`.

```js
StorageManager = {
  KEYS: {
    TASKS:  'tld_tasks',       // distinct key for task data
    LINKS:  'tld_links',       // distinct key for quick links data
  },

  // Returns parsed value or null on any failure (missing key, JSON error, quota)
  load(key): any | null,

  // Returns true on success, false on failure (quota exceeded, API unavailable)
  // Caller is responsible for surfacing error UI on false return
  save(key, value): boolean,
}
```

**Key design decisions:**
- Keys are prefixed with `tld_` to avoid collisions with other page scripts.
- `load()` never throws; parse errors return `null` (corrupt data treated as empty).
- `save()` returns a boolean so callers can show a storage-failure banner without knowing the reason.

---

### GreetingWidget

Manages the time/date/greeting display in the DOM.

```js
GreetingWidget = {
  // Starts the 1-second setInterval; renders immediately on call
  init(): void,

  // Returns greeting string for a given hour (0–23)
  // Pure function — no side effects
  getGreeting(hour: number): string,

  // Formats a Date to "DayOfWeek, Month DD, YYYY"
  formatDate(date: Date): string,

  // Formats a Date to "HH:MM"
  formatTime(date: Date): string,

  // Called by interval; updates DOM safely (try/catch around Date())
  _tick(): void,
}
```

**Greeting hour ranges:**

| Range (hour) | Greeting |
|---|---|
| 05–11 | Good Morning |
| 12–17 | Good Afternoon |
| 18–20 | Good Evening |
| 21–23, 00–04 | Good Night |

**Interval:** A single `setInterval(tick, 1000)` is started once during `init()`. It is never cleared (page lifetime = widget lifetime).

---

### FocusTimer

Implements a countdown state machine with three states: `IDLE`, `RUNNING`, `PAUSED`.

```js
FocusTimer = {
  // Timer state constants
  STATE: { IDLE: 'IDLE', RUNNING: 'RUNNING', PAUSED: 'PAUSED' },

  // Initializes DOM references, sets remaining to 1500, renders 25:00, wires buttons
  init(): void,

  // Transitions: IDLE/PAUSED → RUNNING; starts setInterval if needed
  start(): void,

  // Transitions: RUNNING → PAUSED; clears interval, retains remaining
  stop(): void,

  // Transitions: any → IDLE; clears interval, sets remaining = 1500, re-renders
  reset(): void,

  // Called each second while RUNNING; decrements remaining, checks for completion
  _tick(): void,

  // Plays Web Audio API beep or shows fallback visual if audio unsupported
  _alert(): void,

  // Updates button disabled states based on current state + remaining
  _syncControls(): void,

  // Formats seconds to MM:SS string
  _formatDisplay(seconds: number): string,
}
```

**State machine transitions:**

```
         start()           stop()
  IDLE ──────────► RUNNING ────────► PAUSED
   ▲                  │                 │
   │    reset()       │ remaining==0    │ start()
   └──────────────────┘                 │
   ◄─────────────────────────────────── ┘
           reset()
```

**Control disable rules (Requirement 2.10–2.12):**

| State | Remaining | Start | Stop |
|---|---|---|---|
| RUNNING | > 0 | disabled | enabled |
| PAUSED | > 0 | enabled | disabled |
| IDLE | = 1500 | enabled | disabled |
| IDLE | = 0 | disabled | disabled |

**Audio alert:** Uses the Web Audio API (`AudioContext`, `OscillatorNode`) to synthesize a beep of at least 1 second. If `AudioContext` is not available, a CSS class `timer--session-end` is applied to the display element as a visual fallback (pulsing animation).

---

### TaskManager

Manages an ordered array of `Task` objects. Enforces a single-edit-mode invariant.

```js
TaskManager = {
  // Loads tasks from StorageManager, renders list, wires add-form events
  init(): void,

  // Creates a new task, appends to list, persists, re-renders
  // Returns false if description is invalid (empty/whitespace/too long)
  addTask(description: string): boolean,

  // Replaces description of task at id; validates; persists; re-renders
  // Returns false if new description is invalid
  saveEdit(id: string, newDescription: string): boolean,

  // Cancels any open edit; toggles completion state; persists; re-renders
  toggleComplete(id: string): void,

  // Removes task by id; persists; re-renders
  deleteTask(id: string): void,

  // Opens edit mode for taskId; if another task is in edit mode, closes it
  // without saving (restores original description per Req 4.6)
  openEdit(id: string): void,

  // Cancels edit mode without saving; re-renders original description
  cancelEdit(id: string): void,

  // Writes current tasks array to StorageManager; shows banner on failure
  _persist(): void,

  // Rebuilds the task list DOM from internal tasks array
  _render(): void,
}
```

**Task object shape:**

```js
{
  id:          string,   // crypto.randomUUID() or Date.now().toString() fallback
  description: string,   // 1–500 characters
  completed:   boolean,
  createdAt:   number,   // Date.now() timestamp; preserves insertion order
}
```

**Single edit mode:** `TaskManager` holds an `_editingId` variable (`null` when no edit is open). `openEdit()` checks this; if non-null it calls `cancelEdit(_editingId)` before opening the new one.

---

### QuickLinksPanel

Manages an ordered array of `QuickLink` objects.

```js
QuickLinksPanel = {
  // Loads links from StorageManager, renders panel, wires add-form events
  init(): void,

  // Validates label + URL; appends new link; persists; re-renders
  // Returns false on validation failure (shows inline error)
  addLink(label: string, url: string): boolean,

  // Removes link by id; persists; re-renders
  deleteLink(id: string): void,

  // Returns true if URL starts with 'http://' or 'https://'
  validateURL(url: string): boolean,

  // Opens url in new tab; if URL is invalid shows error (no navigation)
  navigateTo(url: string): void,

  // Writes current links array to StorageManager; shows banner on failure
  _persist(): void,

  // Rebuilds the links DOM from internal links array
  _render(): void,
}
```

**QuickLink object shape:**

```js
{
  id:    string,   // crypto.randomUUID() or Date.now().toString() fallback
  label: string,   // 1–50 characters
  url:   string,   // must start with 'http://' or 'https://'; max 2048 chars
}
```

---

### Bootstrap

The entry point at the bottom of `app.js`, executed on `DOMContentLoaded`:

```js
document.addEventListener('DOMContentLoaded', () => {
  StorageManager;           // no init needed — pure functions
  GreetingWidget.init();
  FocusTimer.init();
  TaskManager.init();
  QuickLinksPanel.init();
});
```

---

## Data Models

### Persisted Schema

#### Tasks (`localStorage['tld_tasks']`)

```json
[
  {
    "id": "1720000000000",
    "description": "Review pull request for auth module",
    "completed": false,
    "createdAt": 1720000000000
  },
  {
    "id": "1720000001234",
    "description": "Write unit tests for timer",
    "completed": true,
    "createdAt": 1720000001234
  }
]
```

#### Quick Links (`localStorage['tld_links']`)

```json
[
  {
    "id": "1720000005000",
    "label": "GitHub",
    "url": "https://github.com"
  },
  {
    "id": "1720000006000",
    "label": "Docs",
    "url": "https://developer.mozilla.org"
  }
]
```

### Schema Validation on Load

When `StorageManager.load()` returns a value, each widget validates it before use:

- The root value must be an `Array`.
- Each element must be a plain `Object` with all required keys present.
- `description` / `label` must be non-empty strings.
- `completed` must be a boolean (Tasks).
- `url` must be a string (Quick Links; URL validity is enforced only on navigation and add, not on load — a previously valid link stored before a policy change is still displayed).

If validation fails at the array level, the widget treats it as an empty dataset. If a single item fails, that item is silently skipped and the rest are loaded.

### Validation Rules Summary

| Field | Rule |
|---|---|
| Task description | Non-empty after trim; ≤ 500 characters |
| Task id | Non-empty string |
| Task completed | Boolean |
| Quick Link label | Non-empty after trim; ≤ 50 characters |
| Quick Link url | Starts with `http://` or `https://`; ≤ 2048 characters; non-empty after trim |
| Timer duration | Exactly 1500 seconds on init/reset |

### DOM ↔ Data Binding

The application uses a **render-on-mutation** pattern: every state change calls a private `_render()` method that rebuilds the affected widget's DOM subtree from the current in-memory array. There is no two-way binding or reactive framework. `data-id` attributes on DOM elements bridge events back to array indices:

```html
<li class="task-item" data-id="1720000000000">
  <input type="checkbox" class="task-toggle" aria-label="Mark complete">
  <span class="task-description">Review pull request</span>
  <button class="task-edit-btn" aria-label="Edit task">Edit</button>
  <button class="task-delete-btn" aria-label="Delete task">Delete</button>
</li>
```

Event delegation is used on the list container element to handle clicks from dynamically created children.

---

## Responsive Layout

The grid is driven entirely by CSS using a single media query breakpoint:

```css
/* ≥ 768px — 2-column grid */
@media (min-width: 768px) {
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
}

/* < 768px — single column (default, mobile-first) */
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

Widget order in the HTML determines visual order in both layouts:
1. Greeting Widget (top-left / top)
2. Focus Timer (top-right / second)
3. Task Manager (bottom-left / third)
4. Quick Links Panel (bottom-right / bottom)

---

