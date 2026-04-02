/* ═══════════════════════════════════════════
   TASKFLOW — APP LOGIC
   Full CRUD + LocalStorage + Filters + Search
   ═══════════════════════════════════════════ */

// ─── STATE ───────────────────────────────────
let tasks = [];
let currentFilter = 'all';
let currentCatFilter = 'all';
let editingId = null;

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  renderTasks();
  bindEvents();
});

// ─── BIND EVENTS ─────────────────────────────
function bindEvents() {
  // Enter key to add task
  const input = document.getElementById('taskInput');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  // Char counter
  input.addEventListener('input', () => {
    const len = input.value.length;
    document.getElementById('charCount').textContent = `${len} / 120`;
    document.getElementById('charCount').style.color =
      len > 100 ? '#ff5c5c' : 'var(--text-muted)';
  });

  // Modal: ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ─── STORAGE ─────────────────────────────────
function saveToStorage() {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

function loadFromStorage() {
  const data = localStorage.getItem('taskflow_tasks');
  tasks = data ? JSON.parse(data) : [];
}

// ─── ADD TASK ─────────────────────────────────
function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();

  if (!text) {
    shakeElement(input);
    showToast('⚠️ Please enter a task!');
    return;
  }

  const task = {
    id: Date.now().toString(),
    text,
    completed: false,
    category: document.getElementById('categorySelect').value,
    priority: document.getElementById('prioritySelect').value,
    dueDate: document.getElementById('dueDateInput').value,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);
  saveToStorage();
  renderTasks();

  // Reset
  input.value = '';
  document.getElementById('charCount').textContent = '0 / 120';
  document.getElementById('dueDateInput').value = '';
  input.focus();

  showToast('✦ Task added!');
}

// ─── TOGGLE COMPLETE ──────────────────────────
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveToStorage();
  renderTasks();
  showToast(task.completed ? '✅ Task completed!' : '↩ Task reopened');
}

// ─── DELETE TASK ──────────────────────────────
function deleteTask(id) {
  const el = document.getElementById(`task-${id}`);
  if (el) {
    el.style.animation = 'popOut 0.25s ease forwards';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveToStorage();
      renderTasks();
    }, 220);
  }
  showToast('🗑 Task deleted');
}

// ─── EDIT TASK (open modal) ────────────────────
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingId = id;

  document.getElementById('editInput').value = task.text;
  document.getElementById('editCategory').value = task.category;
  document.getElementById('editPriority').value = task.priority;
  document.getElementById('editDueDate').value = task.dueDate || '';

  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('editInput').focus(), 100);
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
}

function saveEdit() {
  if (!editingId) return;
  const task = tasks.find(t => t.id === editingId);
  if (!task) return;

  const newText = document.getElementById('editInput').value.trim();
  if (!newText) {
    shakeElement(document.getElementById('editInput'));
    return;
  }

  task.text = newText;
  task.category = document.getElementById('editCategory').value;
  task.priority = document.getElementById('editPriority').value;
  task.dueDate = document.getElementById('editDueDate').value;

  saveToStorage();
  renderTasks();

  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
  showToast('✏️ Task updated!');
}

// ─── FILTERS ──────────────────────────────────
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function setCatFilter(cat, btn) {
  currentCatFilter = cat;
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

// ─── CLEAR ────────────────────────────────────
function clearCompleted() {
  const count = tasks.filter(t => t.completed).length;
  if (count === 0) { showToast('No completed tasks!'); return; }
  tasks = tasks.filter(t => !t.completed);
  saveToStorage();
  renderTasks();
  showToast(`🧹 Cleared ${count} completed task${count > 1 ? 's' : ''}`);
}

function clearAll() {
  if (!tasks.length) { showToast('No tasks to clear!'); return; }
  if (confirm('Delete ALL tasks? This cannot be undone.')) {
    tasks = [];
    saveToStorage();
    renderTasks();
    showToast('🗑 All tasks cleared');
  }
}

// ─── RENDER ───────────────────────────────────
function renderTasks() {
  const list = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const searchVal = document.getElementById('searchInput').value.toLowerCase();

  // Filter
  let filtered = tasks.filter(t => {
    const matchStatus =
      currentFilter === 'all' ? true :
      currentFilter === 'active' ? !t.completed :
      t.completed;

    const matchCat =
      currentCatFilter === 'all' ? true :
      t.category === currentCatFilter;

    const matchSearch =
      !searchVal || t.text.toLowerCase().includes(searchVal);

    return matchStatus && matchCat && matchSearch;
  });

  // Render
  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    filtered.forEach((task, i) => {
      const el = createTaskElement(task, i);
      list.appendChild(el);
    });
  }

  updateStats();
  updateProgress();
}

// ─── CREATE TASK ELEMENT ──────────────────────
function createTaskElement(task, index) {
  const div = document.createElement('div');
  div.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
  div.id = `task-${task.id}`;
  div.style.animationDelay = `${index * 0.04}s`;

  // Due date formatting
  let dueBadge = '';
  if (task.dueDate) {
    const due = new Date(task.dueDate + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const isOverdue = !task.completed && due < today;
    const label = formatDate(due);
    dueBadge = `<span class="task-due ${isOverdue ? 'overdue' : ''}">
      ${isOverdue ? '⚠ ' : '📅 '}${label}
    </span>`;
  }

  div.innerHTML = `
    <div class="task-check ${task.completed ? 'checked' : ''}"
         onclick="toggleTask('${task.id}')" role="button" tabindex="0"
         aria-label="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
      ${task.completed ? '✓' : ''}
    </div>
    <div class="task-content">
      <div class="task-text">${escapeHTML(task.text)}</div>
      <div class="task-meta">
        <span class="task-cat-badge">${getCatLabel(task.category)}</span>
        <span class="task-priority-badge ${task.priority}">${getPriLabel(task.priority)}</span>
        ${dueBadge}
      </div>
    </div>
    <div class="task-actions">
      <button class="action-btn edit" onclick="openEditModal('${task.id}')"
              title="Edit task" aria-label="Edit task">✏</button>
      <button class="action-btn delete" onclick="deleteTask('${task.id}')"
              title="Delete task" aria-label="Delete task">✕</button>
    </div>
  `;

  // Keyboard support for checkbox
  const check = div.querySelector('.task-check');
  check.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTask(task.id); }
  });

  return div;
}

// ─── UPDATE STATS & PROGRESS ──────────────────
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  document.getElementById('completedCount').textContent = completed;
  document.getElementById('pendingCount').textContent = pending;
}

function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct + '%';
}

// ─── HELPERS ──────────────────────────────────
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCatLabel(cat) {
  const map = {
    work: '💼 Work', personal: '🏠 Personal',
    health: '💪 Health', learning: '📚 Learning', other: '⚡ Other'
  };
  return map[cat] || cat;
}

function getPriLabel(pri) {
  const map = { high: '▲ High', medium: '● Medium', low: '▼ Low' };
  return map[pri] || pri;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = '';
  el.style.borderColor = 'var(--red)';
  setTimeout(() => el.style.borderColor = '', 1000);
}

// ─── TOAST ────────────────────────────────────
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}