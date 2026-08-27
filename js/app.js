(function () {
  'use strict';

  // ─── StorageManager ─────────────────────────────────────────────────────────
  const StorageManager = {
    KEYS: {
      TASKS: 'tld_tasks',
      LINKS: 'tld_links',
      THEME: 'tld_theme',
      TIMER_DURATION: 'tld_timer_duration',
      SORT_KEY: 'tld_task_sort',
    },

    load(key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (_e) {
        return null;
      }
    },

    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (_e) {
        return false;
      }
    },

    showSaveError() {
      const banner = document.getElementById('storage-save-banner');
      if (!banner) return;

      if (this._saveErrorTimer) {
        clearTimeout(this._saveErrorTimer);
        this._saveErrorTimer = null;
        banner.classList.remove('banner--hiding');
      }

      banner.removeAttribute('hidden');

      this._saveErrorTimer = setTimeout(() => {
        banner.classList.add('banner--hiding');
        const onTransitionEnd = () => {
          banner.setAttribute('hidden', '');
          banner.classList.remove('banner--hiding');
          banner.removeEventListener('transitionend', onTransitionEnd);
          this._saveErrorTimer = null;
        };
        banner.addEventListener('transitionend', onTransitionEnd);
      }, 3000);
    },

    _saveErrorTimer: null,
  };

  // ─── Challenge 1: ThemeManager ──────────────────────────────────────────────
  const ThemeManager = {
    init() {
      const btn = document.getElementById('theme-toggle');
      const savedTheme = StorageManager.load(StorageManager.KEYS.THEME);
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

      this.applyTheme(currentTheme);

      if (btn) {
        btn.addEventListener('click', () => {
          const active = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
          const newTheme = active === 'dark' ? 'light' : 'dark';
          this.applyTheme(newTheme);
          StorageManager.save(StorageManager.KEYS.THEME, newTheme);
        });
      }
    },

    applyTheme(theme) {
      const btn = document.getElementById('theme-toggle');
      if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (btn) {
          btn.setAttribute('aria-pressed', 'true');
          btn.textContent = '☀️ Light Mode';
          btn.setAttribute('aria-label', 'Switch to light mode');
        }
      } else {
        document.body.removeAttribute('data-theme');
        if (btn) {
          btn.setAttribute('aria-pressed', 'false');
          btn.textContent = '🌙 Dark Mode';
          btn.setAttribute('aria-label', 'Switch to dark mode');
        }
      }
    }
  };

  // ─── GreetingWidget ──────────────────────────────────────────────────────────
  const GreetingWidget = {
    _elTime: null,
    _elDate: null,
    _elMessage: null,

    init() {
      this._elTime    = document.getElementById('greeting-time');
      this._elDate    = document.getElementById('greeting-date');
      this._elMessage = document.getElementById('greeting-message');

      this._tick();
      setInterval(() => this._tick(), 1000);
    },

    getGreeting(hour) {
      if (hour >= 5 && hour <= 11) return 'Good Morning';
      if (hour >= 12 && hour <= 17) return 'Good Afternoon';
      if (hour >= 18 && hour <= 20) return 'Good Evening';
      return 'Good Night';
    },

    formatDate(date) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    },

    formatTime(date) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    },

    _tick() {
      try {
        const now = new Date();
        if (this._elTime)    this._elTime.textContent    = this.formatTime(now);
        if (this._elDate)    this._elDate.textContent    = this.formatDate(now);
        if (this._elMessage) this._elMessage.textContent = this.getGreeting(now.getHours());
      } catch (_e) {
        if (this._elTime) this._elTime.textContent = '--:--';
      }
    },
  };

  // ─── Challenge 2: FocusTimer with Changeable Duration ──────────────────────
  const FocusTimer = {
    STATE: { IDLE: 'IDLE', RUNNING: 'RUNNING', PAUSED: 'PAUSED' },

    _state: 'IDLE',
    _remaining: 1500,
    _initialDuration: 1500, // Default 25 min (in seconds)
    _intervalId: null,

    _elDisplay: null,
    _btnStart: null,
    _btnStop: null,
    _btnReset: null,

    _formatDisplay(seconds) {
      const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
      const ss = String(seconds % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    },

    _syncControls() {
      const startDisabled =
        this._state === this.STATE.RUNNING ||
        (this._state === this.STATE.IDLE && this._remaining === 0);

      const stopDisabled = this._state !== this.STATE.RUNNING;

      if (this._btnStart) {
        this._btnStart.disabled = startDisabled;
        this._btnStart.setAttribute('aria-disabled', String(startDisabled));
      }

      if (this._btnStop) {
        this._btnStop.disabled = stopDisabled;
        this._btnStop.setAttribute('aria-disabled', String(stopDisabled));
      }
    },

    init() {
      this._elDisplay = document.getElementById('timer-display');
      this._btnStart  = document.getElementById('btn-start');
      this._btnStop   = document.getElementById('btn-stop');
      this._btnReset  = document.getElementById('btn-reset');

      // Load saved duration if available
      const savedMinutes = StorageManager.load(StorageManager.KEYS.TIMER_DURATION);
      if (typeof savedMinutes === 'number' && savedMinutes > 0) {
        this._initialDuration = savedMinutes * 60;
      }

      this._state     = this.STATE.IDLE;
      this._remaining = this._initialDuration;
      this._intervalId = null;

      if (this._elDisplay) {
        this._elDisplay.textContent = this._formatDisplay(this._remaining);
      }

      if (this._btnStart) this._btnStart.addEventListener('click', () => this.start());
      if (this._btnStop)  this._btnStop.addEventListener('click',  () => this.stop());
      if (this._btnReset) this._btnReset.addEventListener('click', () => this.reset());

      // Wire duration preset buttons
      const presetContainer = document.querySelector('.timer-presets');
      if (presetContainer) {
        presetContainer.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn--preset');
          if (!btn) return;

          const minutes = parseInt(btn.getAttribute('data-minutes'), 10);
          if (minutes) this.setDuration(minutes);
        });
      }

      this._updatePresetButtons();
      this._syncControls();
    },

    setDuration(minutes) {
      this._initialDuration = minutes * 60;
      StorageManager.save(StorageManager.KEYS.TIMER_DURATION, minutes);
      this._updatePresetButtons();
      this.reset();
    },

    _updatePresetButtons() {
      const presetBtns = document.querySelectorAll('.btn--preset');
      const currentMinutes = Math.floor(this._initialDuration / 60);

      presetBtns.forEach((btn) => {
        const btnMinutes = parseInt(btn.getAttribute('data-minutes'), 10);
        const isActive = btnMinutes === currentMinutes;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
    },

    start() {
      if (this._state === this.STATE.RUNNING) return;
      if (this._remaining === 0) return;

      this._state = this.STATE.RUNNING;
      this._intervalId = setInterval(() => this._tick(), 1000);
      this._syncControls();
    },

    stop() {
      if (this._state !== this.STATE.RUNNING) return;

      this._state = this.STATE.PAUSED;
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._syncControls();
    },

    reset() {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._state     = this.STATE.IDLE;
      this._remaining = this._initialDuration;

      if (this._elDisplay) {
        this._elDisplay.classList.remove('timer--session-end');
        this._elDisplay.textContent = this._formatDisplay(this._remaining);
      }

      this._syncControls();
    },

    _tick() {
      this._remaining -= 1;

      if (this._elDisplay) {
        this._elDisplay.textContent = this._formatDisplay(this._remaining);
      }

      if (this._remaining === 0) {
        clearInterval(this._intervalId);
        this._intervalId = null;
        this._state = this.STATE.IDLE;

        if (this._elDisplay) {
          this._elDisplay.textContent = '00:00';
        }

        this._alert();
        this._syncControls();
      }
    },

    _alert() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) throw new Error('AudioContext not supported');

        const ctx  = new AudioCtx();
        const osc  = ctx.createOscillator();
        osc.type      = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);

        osc.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1);
        osc.addEventListener('ended', () => {
          ctx.close();
        });
      } catch (_e) {
        if (this._elDisplay) {
          this._elDisplay.classList.add('timer--session-end');
        }
      }
    },
  };

  // ─── Challenge 3: TaskManager with Sorting ──────────────────────────────────
  let _tasks = [];
  let _editingId = null;
  let _sortBy = 'newest';

  const TaskManager = {

    _validateTask(item) {
      return (
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' && item.id.length > 0 &&
        typeof item.description === 'string' &&
        item.description.length > 0 &&
        item.description.length <= 500 &&
        typeof item.completed === 'boolean' &&
        typeof item.createdAt === 'number'
      );
    },

    _persist() {
      const ok = StorageManager.save(StorageManager.KEYS.TASKS, _tasks);
      if (!ok) StorageManager.showSaveError();
    },

    _getSortedTasks() {
      const copy = [..._tasks];
      if (_sortBy === 'oldest') {
        return copy.sort((a, b) => a.createdAt - b.createdAt);
      }
      if (_sortBy === 'alphabetical') {
        return copy.sort((a, b) => a.description.localeCompare(b.description));
      }
      if (_sortBy === 'completed') {
        return copy.sort((a, b) => Number(a.completed) - Number(b.completed));
      }
      // Default: 'newest'
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    },

    _render() {
      const list = document.getElementById('task-list');
      if (!list) return;

      list.innerHTML = '';
      const sorted = this._getSortedTasks();

      sorted.forEach((task) => {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.completed ? ' completed' : '');
        li.setAttribute('data-id', task.id);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-toggle';
        checkbox.setAttribute('role', 'checkbox');
        checkbox.setAttribute('aria-checked', String(task.completed));
        checkbox.setAttribute('aria-label', `Mark task "${task.description}" as completed`);
        checkbox.checked = task.completed;

        if (_editingId === task.id) {
          const editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.className = 'task-edit-input add-form__input';
          editInput.setAttribute('aria-label', `Edit description for task "${task.description}"`);
          editInput.value = task.description;
          editInput.maxLength = 500;

          const editError = document.createElement('span');
          editError.className = 'error-msg task-edit-error';
          editError.setAttribute('role', 'alert');
          editError.setAttribute('aria-live', 'polite');
          editError.setAttribute('hidden', '');

          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn--primary task-save-btn';
          saveBtn.setAttribute('aria-label', `Save changes to task "${task.description}"`);
          saveBtn.textContent = 'Save';

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'btn btn--secondary task-cancel-btn';
          cancelBtn.setAttribute('aria-label', `Cancel editing task "${task.description}"`);
          cancelBtn.textContent = 'Cancel';

          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'task-actions';
          actionsDiv.appendChild(saveBtn);
          actionsDiv.appendChild(cancelBtn);

          li.appendChild(checkbox);
          li.appendChild(editInput);
          li.appendChild(editError);
          li.appendChild(actionsDiv);

          editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              this.saveEdit(task.id, editInput.value);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              this.cancelEdit(task.id);
            }
          });

          requestAnimationFrame(() => {
            editInput.focus();
            const len = editInput.value.length;
            editInput.setSelectionRange(len, len);
          });

        } else {
          const descSpan = document.createElement('span');
          descSpan.className = 'task-description';
          descSpan.textContent = task.description;

          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'btn btn--secondary task-edit-btn';
          editBtn.setAttribute('aria-label', `Edit task "${task.description}"`);
          editBtn.textContent = 'Edit';

          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'btn btn--secondary task-delete-btn';
          deleteBtn.setAttribute('aria-label', `Delete task "${task.description}"`);
          deleteBtn.textContent = 'Delete';

          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'task-actions';
          actionsDiv.appendChild(editBtn);
          actionsDiv.appendChild(deleteBtn);

          li.appendChild(checkbox);
          li.appendChild(descSpan);
          li.appendChild(actionsDiv);
        }

        list.appendChild(li);
      });
    },

    init() {
      const stored = StorageManager.load(StorageManager.KEYS.TASKS);
      if (Array.isArray(stored)) {
        _tasks = stored.filter((item) => this._validateTask(item));
      } else {
        _tasks = [];
      }

      // Load saved sort preference
      const savedSort = StorageManager.load(StorageManager.KEYS.SORT_KEY);
      if (savedSort) _sortBy = savedSort;

      const sortSelect = document.getElementById('task-sort-select');
      if (sortSelect) {
        sortSelect.value = _sortBy;
        sortSelect.addEventListener('change', (e) => {
          _sortBy = e.target.value;
          StorageManager.save(StorageManager.KEYS.SORT_KEY, _sortBy);
          this._render();
        });
      }

      this._render();

      const form = document.getElementById('task-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = document.getElementById('task-input');
          if (input) {
            this.addTask(input.value);
          }
        });
      }

      const list = document.getElementById('task-list');
      if (list) {
        list.addEventListener('click', (e) => {
          const target = e.target;
          const li = target.closest('li[data-id]');
          if (!li) return;
          const id = li.getAttribute('data-id');

          if (target.classList.contains('task-toggle')) {
            this.toggleComplete(id);
          } else if (target.classList.contains('task-edit-btn')) {
            this.openEdit(id);
          } else if (target.classList.contains('task-delete-btn')) {
            this.deleteTask(id);
          } else if (target.classList.contains('task-save-btn')) {
            const editInput = li.querySelector('.task-edit-input');
            if (editInput) this.saveEdit(id, editInput.value);
          } else if (target.classList.contains('task-cancel-btn')) {
            this.cancelEdit(id);
          }
        });
      }
    },

    addTask(description) {
      const input = document.getElementById('task-input');
      const errorEl = document.getElementById('task-input-error');

      const trimmed = (description || '').trim();

      const showError = (msg) => {
        if (errorEl) {
          errorEl.textContent = msg;
          errorEl.removeAttribute('hidden');
        }
        if (input) input.focus();
      };

      const clearError = () => {
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.setAttribute('hidden', '');
        }
      };

      if (trimmed.length === 0) {
        showError('Task description cannot be empty.');
        return false;
      }

      if (trimmed.length > 500) {
        showError('Task description cannot exceed 500 characters.');
        return false;
      }

      clearError();

      const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : Date.now().toString();

      const newTask = {
        id,
        description: trimmed,
        completed: false,
        createdAt: Date.now(),
      };

      _tasks.push(newTask);
      this._persist();
      this._render();

      if (input) {
        input.value = '';
        input.focus();
      }

      return true;
    },

    toggleComplete(id) {
      if (_editingId !== null) this.cancelEdit(_editingId);

      const task = _tasks.find((t) => t.id === id);
      if (!task) return;

      task.completed = !task.completed;
      this._persist();
      this._render();
    },

    deleteTask(id) {
      _tasks = _tasks.filter((t) => t.id !== id);
      if (_editingId === id) _editingId = null;

      this._persist();
      this._render();
    },

    openEdit(id) {
      if (_editingId !== null && _editingId !== id) {
        this.cancelEdit(_editingId);
      }
      _editingId = id;
      this._render();
    },

    saveEdit(id, newDescription) {
      const trimmed = (newDescription || '').trim();

      if (trimmed.length === 0) {
        const li = document.querySelector(`#task-list li[data-id="${id}"]`);
        if (li) {
          const errorEl = li.querySelector('.task-edit-error');
          if (errorEl) {
            errorEl.textContent = 'Task description cannot be empty.';
            errorEl.removeAttribute('hidden');
          }
          const editInput = li.querySelector('.task-edit-input');
          if (editInput) editInput.focus();
        }
        return false;
      }

      if (trimmed.length > 500) {
        const li = document.querySelector(`#task-list li[data-id="${id}"]`);
        if (li) {
          const errorEl = li.querySelector('.task-edit-error');
          if (errorEl) {
            errorEl.textContent = 'Task description cannot exceed 500 characters.';
            errorEl.removeAttribute('hidden');
          }
          const editInput = li.querySelector('.task-edit-input');
          if (editInput) editInput.focus();
        }
        return false;
      }

      const task = _tasks.find((t) => t.id === id);
      if (task) task.description = trimmed;

      _editingId = null;
      this._persist();
      this._render();
      return true;
    },

    cancelEdit(id) {
      if (_editingId === id) _editingId = null;
      this._render();
    },
  };

  // ─── QuickLinksPanel ─────────────────────────────────────────────────────────
  let _links = [];

  const QuickLinksPanel = {
    validateURL(url) {
      return (
        typeof url === 'string' &&
        (url.startsWith('http://') || url.startsWith('https://'))
      );
    },

    _validateLink(item) {
      return (
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' && item.id.length > 0 &&
        typeof item.label === 'string' &&
        item.label.length > 0 &&
        item.label.length <= 50 &&
        this.validateURL(item.url) &&
        item.url.length <= 2048 &&
        typeof item.createdAt === 'number'
      );
    },

    _persist() {
      const ok = StorageManager.save(StorageManager.KEYS.LINKS, _links);
      if (!ok) StorageManager.showSaveError();
    },

    _render() {
      const container = document.getElementById('links-container');
      if (!container) return;

      container.innerHTML = '';

      _links.forEach((link) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'quick-link-item';
        itemDiv.setAttribute('data-id', link.id);

        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'quick-link-btn';
        anchor.setAttribute('aria-label', `Open link "${link.label}" (opens in new tab)`);
        anchor.textContent = link.label;

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'link-delete-btn';
        deleteBtn.setAttribute('aria-label', `Delete quick link "${link.label}"`);
        deleteBtn.textContent = '✕';

        itemDiv.appendChild(anchor);
        itemDiv.appendChild(deleteBtn);
        container.appendChild(itemDiv);
      });
    },

    init() {
      const stored = StorageManager.load(StorageManager.KEYS.LINKS);
      if (Array.isArray(stored)) {
        _links = stored.filter((item) => this._validateLink(item));
      } else {
        _links = [];
      }

      this._render();

      const form = document.getElementById('link-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const labelInput = document.getElementById('link-label-input');
          const urlInput = document.getElementById('link-url-input');
          if (labelInput && urlInput) {
            this.addLink(labelInput.value, urlInput.value);
          }
        });
      }

      const container = document.getElementById('links-container');
      if (container) {
        container.addEventListener('click', (e) => {
          if (e.target.classList.contains('link-delete-btn')) {
            const itemDiv = e.target.closest('div[data-id]');
            if (itemDiv) {
              const id = itemDiv.getAttribute('data-id');
              this.deleteLink(id);
            }
          }
        });
      }
    },

    addLink(label, url) {
      const labelInput = document.getElementById('link-label-input');
      const urlInput = document.getElementById('link-url-input');
      const errorEl = document.getElementById('link-form-error');

      const trimmedLabel = (label || '').trim();
      const trimmedUrl = (url || '').trim();

      const showError = (msg) => {
        if (errorEl) {
          errorEl.textContent = msg;
          errorEl.removeAttribute('hidden');
        }
      };

      const clearError = () => {
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.setAttribute('hidden', '');
        }
      };

      if (trimmedLabel.length === 0) {
        showError('Link label cannot be empty.');
        if (labelInput) labelInput.focus();
        return false;
      }

      if (trimmedLabel.length > 50) {
        showError('Link label cannot exceed 50 characters.');
        if (labelInput) labelInput.focus();
        return false;
      }

      if (trimmedUrl.length === 0) {
        showError('Link URL cannot be empty.');
        if (urlInput) urlInput.focus();
        return false;
      }

      if (!this.validateURL(trimmedUrl)) {
        showError('URL must start with http:// or https://');
        if (urlInput) urlInput.focus();
        return false;
      }

      if (trimmedUrl.length > 2048) {
        showError('URL cannot exceed 2048 characters.');
        if (urlInput) urlInput.focus();
        return false;
      }

      clearError();

      const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : Date.now().toString();

      const newLink = {
        id,
        label: trimmedLabel,
        url: trimmedUrl,
        createdAt: Date.now(),
      };

      _links.push(newLink);
      this._persist();
      this._render();

      if (labelInput) labelInput.value = '';
      if (urlInput) urlInput.value = '';
      if (labelInput) labelInput.focus();

      return true;
    },

    deleteLink(id) {
      _links = _links.filter((l) => l.id !== id);
      this._persist();
      this._render();
    },
  };

  // ─── Application Bootstrap ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    GreetingWidget.init();
    FocusTimer.init();
    TaskManager.init();
    QuickLinksPanel.init();
  });

})();