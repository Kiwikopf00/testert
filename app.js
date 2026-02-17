/* ═══════════════════════════════════════════════
   HabitFlow – Core Application Logic
   localStorage based, offline-first
   ═══════════════════════════════════════════════ */

// ── Date Helpers ──
const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const CATEGORY_LABELS = {
  health: '🍏 Gesundheit', fitness: '💪 Fitness', mindfulness: '🧘 Achtsamkeit',
  productivity: '⚡ Produktivität', social: '👥 Soziales', learning: '📚 Lernen', other: '📌 Sonstiges'
};
const FREQ_LABELS = { daily: 'Täglich', weekdays: 'Mo–Fr', '3x': '3x/Woche', weekly: '1x/Woche' };

function dateKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}
function today() { return dateKey(new Date()); }
function parseDate(str) { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); }

function getWeekStart(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt;
}

function formatDateDe(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return DAYS_DE[dt.getDay()] + ', ' + dt.getDate() + '. ' + MONTHS_DE[dt.getMonth()] + ' ' + dt.getFullYear();
}

function isSameDay(d1, d2) { return dateKey(d1) === dateKey(d2); }

// ── Data Store ──
const STORE_KEY = 'habitflow_data';

function getDefaultData() {
  return {
    habits: [],
    completions: {},
    moods: {},
    goals: [],
    score: 0,
    settings: { theme: 'dark' }
  };
}

let data = getDefaultData();

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = Object.assign({}, getDefaultData(), parsed);
    }
  } catch (e) {
    console.error('Load error:', e);
    data = getDefaultData();
  }
}

function saveData() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Save error:', e);
  }
}

// ── UUID ──
function uuid() {
  return 'xxxx-xxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); });
}

// ── Page Navigation ──
var currentPage = 'dashboard';

function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.page-section').forEach(function (s) { s.classList.remove('active'); });
  var el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.toggle('active', n.dataset.page === page);
  });
  document.querySelectorAll('.mobile-nav-item').forEach(function (n) {
    n.classList.toggle('active', n.dataset.page === page);
  });

  document.getElementById('sidebar').classList.remove('open');
  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'weekly': renderWeekly(); break;
    case 'monthly': renderMonthly(); break;
    case 'habits': renderHabitManager(); break;
    case 'goals': renderGoals(); break;
    case 'stats': renderStats(); break;
    case 'settings': renderSettings(); break;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Theme ──
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  data.settings.theme = next;
  saveData();
  updateThemeUI();
}

function updateThemeUI() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  var icon = document.getElementById('themeIcon');
  var label = document.getElementById('themeLabel');
  var settingsBtn = document.getElementById('settingsThemeBtn');
  if (icon) icon.textContent = isDark ? '🌙' : '☀️';
  if (label) label.textContent = isDark ? 'Dark Mode' : 'Light Mode';
  if (settingsBtn) settingsBtn.textContent = isDark ? 'Dark Mode' : 'Light Mode';
}

// ── Toast Notifications ──
function showToast(msg, type) {
  type = type || 'info';
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  var icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span><span>' + msg + '</span>';
  container.appendChild(toast);
  setTimeout(function () {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(function () { toast.remove(); }, 300);
  }, 3000);
}

// ── Confetti ──
function fireConfetti() {
  var container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  var colors = ['#7f5af0', '#2cb67d', '#e16162', '#ff8906', '#3da9fc', '#e853a0'];
  for (var i = 0; i < 40; i++) {
    var piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = (1 + Math.random()) + 's';
    container.appendChild(piece);
  }
  setTimeout(function () { container.remove(); }, 2500);
}

// ═══════════════════════════════════════
// HABITS
// ═══════════════════════════════════════

function getActiveHabits() {
  return data.habits.filter(function (h) { return !h.archived; });
}

function getTodayHabits() {
  var now = new Date();
  var dayOfWeek = now.getDay();
  return getActiveHabits().filter(function (h) {
    switch (h.frequency) {
      case 'daily': return true;
      case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5;
      case '3x': return true;
      case 'weekly': return true;
      default: return true;
    }
  });
}

function isCompleted(habitId, day) {
  return !!(data.completions[day] && data.completions[day][habitId]);
}

function toggleCompletion(habitId, day) {
  if (!day) day = today();
  if (!data.completions[day]) data.completions[day] = {};
  var wasCompleted = data.completions[day][habitId];
  data.completions[day][habitId] = !wasCompleted;

  if (!wasCompleted) {
    data.score += 10;
    // Check all done today
    var todayHabits = getTodayHabits();
    var allDone = todayHabits.every(function (h) { return isCompleted(h.id, day); });
    if (allDone && todayHabits.length > 0) {
      data.score += 25;
      fireConfetti();
      showToast('Alle Habits für heute erledigt! 🎉 +25 Bonus!', 'success');
    }
    // Check weekly target reached
    var habit = data.habits.find(function (h) { return h.id === habitId; });
    if (habit && (habit.frequency === '3x' || habit.frequency === 'weekly')) {
      var weeklyDone = getWeeklyCompletions(habitId);
      var weeklyTarget = getWeeklyTarget(habit.frequency);
      if (weeklyDone === weeklyTarget) {
        showToast('🎯 Wochenziel für "' + habit.name + '" erreicht! (' + weeklyDone + '/' + weeklyTarget + ')', 'success');
      }
    }
  } else {
    data.score = Math.max(0, data.score - 10);
  }

  saveData();
  renderPage(currentPage);
}

// Streak Calculation
function getStreak(habitId) {
  var streak = 0;
  var d = new Date();
  if (!isCompleted(habitId, dateKey(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (true) {
    var key = dateKey(d);
    if (isCompleted(habitId, key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getBestStreak(habitId) {
  var best = 0, current = 0;
  var d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  for (var i = 0; i < 366; i++) {
    var key = dateKey(d);
    if (isCompleted(habitId, key)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
    d.setDate(d.getDate() + 1);
  }
  return best;
}

// ═══════════════════════════════════════
// HELPER
// ═══════════════════════════════════════

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Weekly frequency progress
function getWeeklyTarget(frequency) {
  switch (frequency) {
    case 'daily': return 7;
    case 'weekdays': return 5;
    case '3x': return 3;
    case 'weekly': return 1;
    default: return 7;
  }
}

function getWeeklyCompletions(habitId) {
  var ws = getWeekStart(new Date());
  var count = 0;
  for (var i = 0; i < 7; i++) {
    var d = new Date(ws);
    d.setDate(d.getDate() + i);
    if (d > new Date()) break;
    if (isCompleted(habitId, dateKey(d))) count++;
  }
  return count;
}

// Check if a habit counts as "fulfilled" for today:
// - daily/weekday habits: must be completed today
// - 3x/weekly habits: fulfilled if weekly target is already met OR completed today
function isHabitFulfilled(habit) {
  if (isCompleted(habit.id, today())) return true;
  if (habit.frequency === '3x' || habit.frequency === 'weekly') {
    return getWeeklyCompletions(habit.id) >= getWeeklyTarget(habit.frequency);
  }
  return false;
}

// ═══════════════════════════════════════
// DASHBOARD RENDER
// ═══════════════════════════════════════

function renderDashboard() {
  document.getElementById('dateDisplay').textContent = formatDateDe(new Date());

  var todayHabits = getTodayHabits();
  var doneToday = todayHabits.filter(function (h) { return isHabitFulfilled(h); }).length;
  document.getElementById('statToday').textContent = doneToday + '/' + todayHabits.length;

  var allStreaks = getActiveHabits().map(function (h) { return getStreak(h.id); });
  var maxStreak = allStreaks.length ? Math.max.apply(null, allStreaks) : 0;
  document.getElementById('statStreak').textContent = maxStreak + ' 🔥';

  var weekStart = getWeekStart(new Date());
  var weekTotal = 0, weekDone = 0;
  for (var i = 0; i < 7; i++) {
    var d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    var key = dateKey(d);
    if (d > new Date()) break;
    var dayHabits = getActiveHabits();
    weekTotal += dayHabits.length;
    weekDone += dayHabits.filter(function (h) { return isCompleted(h.id, key); }).length;
  }
  var weekPct = weekTotal ? Math.round(weekDone / weekTotal * 100) : 0;
  document.getElementById('statWeek').textContent = weekPct + '%';
  document.getElementById('statScore').textContent = data.score;

  // Progress Ring
  var dailyPct = todayHabits.length ? Math.round(doneToday / todayHabits.length * 100) : 0;
  var circumference = 2 * Math.PI * 58; // r=58
  var ringEl = document.getElementById('progressRingFill');
  if (ringEl) {
    var offset = circumference - (dailyPct / 100) * circumference;
    ringEl.setAttribute('stroke-dasharray', circumference.toFixed(1));
    ringEl.setAttribute('stroke-dashoffset', offset.toFixed(1));
  }
  var ringPctEl = document.getElementById('ringPct');
  if (ringPctEl) ringPctEl.textContent = dailyPct + '%';

  // Progress Details
  var detailsEl = document.getElementById('progressDetails');
  if (detailsEl) {
    var dhtml = '';
    dhtml += '<div class="progress-detail-row"><div class="dot" style="background:#2cb67d;"></div><strong>' + doneToday + '</strong>&nbsp;erledigt</div>';
    dhtml += '<div class="progress-detail-row"><div class="dot" style="background:#e16162;"></div><strong>' + (todayHabits.length - doneToday) + '</strong>&nbsp;offen</div>';
    dhtml += '<div class="progress-detail-row"><div class="dot" style="background:#7f5af0;"></div><strong>' + todayHabits.length + '</strong>&nbsp;gesamt</div>';
    dhtml += '<div class="progress-detail-row"><div class="dot" style="background:#ff8906;"></div><strong>' + maxStreak + '</strong>&nbsp;Tage Streak</div>';
    detailsEl.innerHTML = dhtml;
  }

  // Category Bars
  var catBarsEl = document.getElementById('categoryBars');
  if (catBarsEl && todayHabits.length > 0) {
    var catCounts = {};
    var catDone = {};
    var catColors = {
      health: '#2cb67d', fitness: '#3da9fc', mindfulness: '#7f5af0',
      productivity: '#ff8906', social: '#e853a0', learning: '#e16162', other: '#6b6d80'
    };
    for (var i = 0; i < todayHabits.length; i++) {
      var cat = todayHabits[i].category;
      catCounts[cat] = (catCounts[cat] || 0) + 1;
      if (isHabitFulfilled(todayHabits[i])) catDone[cat] = (catDone[cat] || 0) + 1;
    }
    var cbhtml = '';
    var cats = Object.keys(catCounts);
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      var done = catDone[c] || 0;
      var total = catCounts[c];
      var pct = Math.round(done / total * 100);
      cbhtml += '<div class="category-bar-row">';
      cbhtml += '<div class="category-bar-label">' + (CATEGORY_LABELS[c] || c) + '</div>';
      cbhtml += '<div class="category-bar-track"><div class="category-bar-fill" style="width:' + pct + '%;background:' + (catColors[c] || '#6b6d80') + ';"></div></div>';
      cbhtml += '<div class="category-bar-value">' + done + '/' + total + '</div>';
      cbhtml += '</div>';
    }
    catBarsEl.innerHTML = cbhtml;
  }

  // Habit count label
  var countLabel = document.getElementById('habitCountLabel');
  if (countLabel) countLabel.textContent = doneToday + ' von ' + todayHabits.length + ' erledigt';

  // Today's habits list
  var list = document.getElementById('todayHabitList');
  if (todayHabits.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🌱</div><p>Noch keine Habits erstellt. Klicke auf "+ Neues Habit" um zu starten!</p></div>';
  } else {
    var html = '';
    for (var i = 0; i < todayHabits.length; i++) {
      var h = todayHabits[i];
      var done = isCompleted(h.id, today());
      var streak = getStreak(h.id);
      var weeklyDone = getWeeklyCompletions(h.id);
      var weeklyTarget = getWeeklyTarget(h.frequency);
      var fulfilled = isHabitFulfilled(h);
      html += '<div class="habit-item' + (fulfilled ? ' completed' : '') + '" onclick="toggleCompletion(\'' + h.id + '\')">';
      html += '<button class="habit-check' + (fulfilled ? ' checked' : '') + '" onclick="event.stopPropagation();toggleCompletion(\'' + h.id + '\')">' + (fulfilled ? '✓' : '') + '</button>';
      html += '<span class="habit-category-dot category-' + h.category + '"></span>';
      html += '<div class="habit-info">';
      html += '<div class="habit-name">' + escHtml(h.name) + '</div>';
      // Weekly progress info for limited-frequency habits
      if (h.frequency !== 'daily') {
        var weeklyGoalMet = weeklyDone >= weeklyTarget;
        html += '<div class="habit-stack" style="color:' + (weeklyGoalMet ? 'var(--accent-secondary)' : 'var(--text-muted)') + ';">';
        html += (weeklyGoalMet ? '✅ ' : '📅 ') + weeklyDone + '/' + weeklyTarget + ' diese Woche';
        if (weeklyGoalMet && weeklyDone === weeklyTarget) html += ' – Ziel erreicht!';
        html += '</div>';
      }
      if (h.stack) html += '<div class="habit-stack">⛓️ ' + escHtml(h.stack) + '</div>';
      html += '</div>';
      if (streak > 0) html += '<div class="habit-streak">🔥 ' + streak + '</div>';
      html += '</div>';
    }
    list.innerHTML = html;
  }

  // Streaks panel
  var streakPanel = document.getElementById('streakSummary');
  var habitsWithStreaks = getActiveHabits().map(function (h) { return { name: h.name, streak: getStreak(h.id) }; })
    .filter(function (h) { return h.streak > 0; })
    .sort(function (a, b) { return b.streak - a.streak; })
    .slice(0, 5);

  if (habitsWithStreaks.length === 0) {
    streakPanel.innerHTML = '<div class="empty-state" style="padding:24px 0;"><p style="font-size:0.82rem;">Streaks erscheinen hier sobald du Habits abschließt</p></div>';
  } else {
    var shtml = '';
    for (var i = 0; i < habitsWithStreaks.length; i++) {
      var s = habitsWithStreaks[i];
      shtml += '<div class="streak-item">';
      shtml += '<span class="streak-flame">🔥</span>';
      shtml += '<span class="streak-count">' + s.streak + '</span>';
      shtml += '<span class="streak-habit-name">' + escHtml(s.name) + '</span>';
      shtml += '</div>';
    }
    streakPanel.innerHTML = shtml;
  }

  // Mood
  var todayMood = data.moods[today()];
  document.querySelectorAll('#moodPicker .mood-btn').forEach(function (btn) {
    btn.classList.toggle('selected', !!(todayMood && todayMood.mood === btn.dataset.mood));
  });
  var moodNote = document.getElementById('moodNote');
  if (moodNote) moodNote.value = todayMood ? (todayMood.note || '') : '';
}

function setMood(mood) {
  var key = today();
  if (!data.moods[key]) data.moods[key] = {};
  data.moods[key].mood = mood;
  saveData();
  renderDashboard();
  showToast('Stimmung gespeichert!', 'success');
}

function saveMoodNote() {
  var key = today();
  if (!data.moods[key]) data.moods[key] = {};
  data.moods[key].note = document.getElementById('moodNote').value;
  saveData();
}

// ═══════════════════════════════════════
// WEEKLY VIEW
// ═══════════════════════════════════════

var weekOffset = 0;

function changeWeek(dir) {
  if (dir === 0) weekOffset = 0;
  else weekOffset += dir;
  renderWeekly();
}

function renderWeekly() {
  var now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  var weekStart = getWeekStart(now);

  var weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  document.getElementById('weekLabel').textContent =
    weekStart.getDate() + '. ' + MONTHS_DE[weekStart.getMonth()] + ' – ' + weekEnd.getDate() + '. ' + MONTHS_DE[weekEnd.getMonth()] + ' ' + weekEnd.getFullYear();

  var habits = getActiveHabits();
  var todayDate = new Date();

  // Header
  var header = document.getElementById('weeklyHeader');
  var hhtml = '<th>Habit</th>';
  for (var i = 0; i < 7; i++) {
    var d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    var isToday = isSameDay(d, todayDate);
    hhtml += '<th' + (isToday ? ' style="color:var(--accent-primary);"' : '') + '>';
    hhtml += DAYS_DE[d.getDay()] + '<br><span style="font-size:0.9em;">' + d.getDate() + '</span></th>';
  }
  header.innerHTML = hhtml;

  // Body
  var body = document.getElementById('weeklyBody');
  if (habits.length === 0) {
    body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">Keine Habits vorhanden</td></tr>';
    return;
  }

  var bhtml = '';
  for (var hi = 0; hi < habits.length; hi++) {
    var h = habits[hi];
    var row = '<tr>';
    row += '<td><span class="habit-category-dot category-' + h.category + '" style="display:inline-block;margin-right:8px;vertical-align:middle;"></span>' + escHtml(h.name) + '</td>';
    for (var di = 0; di < 7; di++) {
      var d = new Date(weekStart);
      d.setDate(d.getDate() + di);
      var key = dateKey(d);
      var done = isCompleted(h.id, key);
      var future = d > todayDate;
      row += '<td>';
      if (future) {
        row += '<div class="weekly-cell future"></div>';
      } else {
        row += '<div class="weekly-cell' + (done ? ' checked' : '') + '" onclick="toggleCompletion(\'' + h.id + '\',\'' + key + '\')">' + (done ? '✓' : '') + '</div>';
      }
      row += '</td>';
    }
    row += '</tr>';
    bhtml += row;
  }
  body.innerHTML = bhtml;
}

// ═══════════════════════════════════════
// MONTHLY HEATMAP
// ═══════════════════════════════════════

var monthOffset = 0;

function changeMonth(dir) {
  if (dir === 0) monthOffset = 0;
  else monthOffset += dir;
  renderMonthly();
}

function renderMonthly() {
  var now = new Date();
  now.setMonth(now.getMonth() + monthOffset);
  var year = now.getFullYear();
  var month = now.getMonth();

  document.getElementById('monthLabel').textContent = MONTHS_DE[month] + ' ' + year;

  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var firstDay = new Date(year, month, 1).getDay();
  var habits = getActiveHabits();
  var totalHabits = habits.length || 1;

  var container = document.getElementById('heatmapContainer');

  var html = '<div class="heatmap-grid">';
  var dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  for (var i = 0; i < dayLabels.length; i++) {
    html += '<div class="heatmap-day-label">' + dayLabels[i] + '</div>';
  }

  var startOffset = firstDay === 0 ? 6 : firstDay - 1;
  for (var i = 0; i < startOffset; i++) {
    html += '<div></div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var key = dateKey(new Date(year, month, d));
    var completedCount = 0;
    for (var hi = 0; hi < habits.length; hi++) {
      if (isCompleted(habits[hi].id, key)) completedCount++;
    }
    var pct = completedCount / totalHabits;
    var level = 0;
    if (pct > 0 && pct < 0.25) level = 1;
    else if (pct >= 0.25 && pct < 0.5) level = 2;
    else if (pct >= 0.5 && pct < 0.75) level = 3;
    else if (pct >= 0.75) level = 4;

    html += '<div class="heatmap-cell" data-level="' + level + '">';
    html += '<div class="tooltip">' + d + '. ' + MONTHS_DE[month] + ': ' + completedCount + '/' + totalHabits + ' erledigt</div>';
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// ═══════════════════════════════════════
// HABIT MANAGER
// ═══════════════════════════════════════

function renderHabitManager() {
  var grid = document.getElementById('habitManagerGrid');
  var habits = getActiveHabits();

  if (habits.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>Erstelle dein erstes Habit, um loszulegen!</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < habits.length; i++) {
    var h = habits[i];
    var streak = getStreak(h.id);
    var best = getBestStreak(h.id);
    html += '<div class="habit-manager-card" style="border-top:3px solid ' + getCategoryColor(h.category) + ';">';
    html += '<div class="habit-title">' + escHtml(h.name) + '</div>';
    if (h.description) html += '<div class="habit-desc">' + escHtml(h.description) + '</div>';
    if (h.stack) html += '<div class="habit-desc">⛓️ ' + escHtml(h.stack) + '</div>';
    html += '<div class="habit-meta">';
    html += '<span class="habit-tag cat">' + (CATEGORY_LABELS[h.category] || h.category) + '</span>';
    html += '<span class="habit-tag freq">' + (FREQ_LABELS[h.frequency] || h.frequency) + '</span>';
    if (streak > 0) html += '<span class="habit-tag" style="color:var(--accent-warm);border-color:rgba(255,137,6,0.3);">🔥 ' + streak + ' Tage</span>';
    if (best > 0) html += '<span class="habit-tag">Best: ' + best + '</span>';
    html += '</div>';
    html += '<div class="habit-actions">';
    html += '<button class="btn btn-secondary btn-sm" onclick="editHabit(\'' + h.id + '\')">✏️ Bearbeiten</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deleteHabit(\'' + h.id + '\')">🗑 Löschen</button>';
    html += '</div>';
    html += '</div>';
  }
  grid.innerHTML = html;
}

function getCategoryColor(cat) {
  var colors = {
    health: '#2cb67d', fitness: '#3da9fc', mindfulness: '#7f5af0',
    productivity: '#ff8906', social: '#e853a0', learning: '#e16162', other: '#6b6d80'
  };
  return colors[cat] || '#6b6d80';
}

// Modal
function openHabitModal(id) {
  document.getElementById('habitModal').classList.add('active');
  document.getElementById('habitEditId').value = id || '';
  document.getElementById('habitModalTitle').textContent = id ? 'Habit bearbeiten' : 'Neues Habit erstellen';

  if (id) {
    var h = data.habits.find(function (x) { return x.id === id; });
    if (h) {
      document.getElementById('habitName').value = h.name;
      document.getElementById('habitDesc').value = h.description || '';
      document.getElementById('habitCategory').value = h.category;
      document.getElementById('habitFrequency').value = h.frequency;
      document.getElementById('habitStack').value = h.stack || '';
    }
  } else {
    document.getElementById('habitName').value = '';
    document.getElementById('habitDesc').value = '';
    document.getElementById('habitCategory').value = 'health';
    document.getElementById('habitFrequency').value = 'daily';
    document.getElementById('habitStack').value = '';
  }
}

function closeHabitModal() {
  document.getElementById('habitModal').classList.remove('active');
}

function saveHabit(e) {
  e.preventDefault();
  var editId = document.getElementById('habitEditId').value;
  var existingHabit = editId ? data.habits.find(function (h) { return h.id === editId; }) : null;
  var habit = {
    id: editId || uuid(),
    name: document.getElementById('habitName').value.trim(),
    description: document.getElementById('habitDesc').value.trim(),
    category: document.getElementById('habitCategory').value,
    frequency: document.getElementById('habitFrequency').value,
    stack: document.getElementById('habitStack').value.trim(),
    createdAt: existingHabit ? existingHabit.createdAt : today()
  };

  if (editId) {
    var idx = data.habits.findIndex(function (h) { return h.id === editId; });
    if (idx >= 0) data.habits[idx] = habit;
  } else {
    data.habits.push(habit);
    data.score += 5;
  }

  saveData();
  closeHabitModal();
  showToast(editId ? 'Habit aktualisiert!' : 'Neues Habit erstellt! 🌱', 'success');
  renderPage(currentPage);
}

function editHabit(id) {
  openHabitModal(id);
}

function deleteHabit(id) {
  if (!confirm('Dieses Habit wirklich löschen?')) return;
  data.habits = data.habits.filter(function (h) { return h.id !== id; });
  Object.keys(data.completions).forEach(function (day) {
    delete data.completions[day][id];
  });
  saveData();
  showToast('Habit gelöscht', 'info');
  renderPage(currentPage);
}

// ═══════════════════════════════════════
// GOALS
// ═══════════════════════════════════════

function renderGoals() {
  var container = document.getElementById('goalsContainer');
  if (!data.goals || data.goals.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div><p>Setze dir ein Ziel und verknüpfe es mit deinen Habits!</p></div>';
    return;
  }

  var html = '';
  for (var gi = 0; gi < data.goals.length; gi++) {
    var g = data.goals[gi];
    var linkedHabits = g.linkedHabits || [];
    var daysWithProgress = 0;
    var completionDays = Object.keys(data.completions);
    for (var di = 0; di < completionDays.length; di++) {
      var dayData = data.completions[completionDays[di]];
      for (var li = 0; li < linkedHabits.length; li++) {
        if (dayData[linkedHabits[li]]) { daysWithProgress++; break; }
      }
    }
    var target = g.targetDays || 30;
    var pct = Math.min(100, Math.round(daysWithProgress / target * 100));

    html += '<div class="goal-card">';
    html += '<div class="goal-header"><div>';
    html += '<div class="goal-title">' + escHtml(g.name) + '</div>';
    if (g.description) html += '<div class="goal-deadline">' + escHtml(g.description) + '</div>';
    html += '</div><div style="display:flex;gap:8px;align-items:center;">';
    if (g.deadline) html += '<span class="habit-tag">📅 ' + g.deadline + '</span>';
    html += '<button class="btn btn-secondary btn-sm" onclick="editGoal(\'' + g.id + '\')" title="Bearbeiten">✏️</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deleteGoal(\'' + g.id + '\')" title="Löschen">🗑</button>';
    html += '</div></div>';
    html += '<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="goal-progress-text">' + daysWithProgress + ' / ' + target + ' Tage (' + pct + '%)</div>';
    html += '<div class="goal-linked-habits">';
    for (var li = 0; li < linkedHabits.length; li++) {
      var lh = data.habits.find(function (x) { return x.id === linkedHabits[li]; });
      if (lh) html += '<span class="goal-habit-tag">' + escHtml(lh.name) + '</span>';
    }
    html += '</div></div>';
  }
  container.innerHTML = html;
}

function openGoalModal(id) {
  document.getElementById('goalModal').classList.add('active');
  document.getElementById('goalEditId').value = id || '';

  var existingGoal = null;
  if (id) {
    existingGoal = (data.goals || []).find(function (g) { return g.id === id; });
  }

  document.getElementById('goalModalTitle').textContent = existingGoal ? 'Ziel bearbeiten' : 'Neues Ziel erstellen';
  document.getElementById('goalName').value = existingGoal ? existingGoal.name : '';
  document.getElementById('goalDesc').value = existingGoal ? (existingGoal.description || '') : '';
  document.getElementById('goalDeadline').value = existingGoal ? (existingGoal.deadline || '') : '';
  document.getElementById('goalTarget').value = existingGoal ? (existingGoal.targetDays || 30) : '30';

  var linkedIds = existingGoal ? (existingGoal.linkedHabits || []) : [];

  var chkContainer = document.getElementById('goalHabitCheckboxes');
  var habits = getActiveHabits();
  var chtml = '';
  for (var i = 0; i < habits.length; i++) {
    var h = habits[i];
    var checked = linkedIds.indexOf(h.id) >= 0 ? ' checked' : '';
    chtml += '<label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;padding:4px 10px;background:var(--bg-glass);border-radius:var(--radius-sm);border:1px solid var(--border-color);">';
    chtml += '<input type="checkbox" value="' + h.id + '" class="goal-habit-cb"' + checked + '> ' + escHtml(h.name);
    chtml += '</label>';
  }
  chkContainer.innerHTML = chtml || '<span style="color:var(--text-muted);font-size:0.82rem;">Erstelle zuerst Habits</span>';
}

function editGoal(id) {
  openGoalModal(id);
}

function closeGoalModal() {
  document.getElementById('goalModal').classList.remove('active');
}

function saveGoal(e) {
  e.preventDefault();
  var editId = document.getElementById('goalEditId').value;
  var checked = document.querySelectorAll('.goal-habit-cb:checked');
  var linkedHabits = [];
  checked.forEach(function (cb) { linkedHabits.push(cb.value); });

  if (!data.goals) data.goals = [];

  if (editId) {
    // Update existing goal
    var idx = data.goals.findIndex(function (g) { return g.id === editId; });
    if (idx >= 0) {
      data.goals[idx].name = document.getElementById('goalName').value.trim();
      data.goals[idx].description = document.getElementById('goalDesc').value.trim();
      data.goals[idx].deadline = document.getElementById('goalDeadline').value;
      data.goals[idx].targetDays = parseInt(document.getElementById('goalTarget').value) || 30;
      data.goals[idx].linkedHabits = linkedHabits;
    }
    saveData();
    closeGoalModal();
    showToast('Ziel aktualisiert! ✏️', 'success');
  } else {
    // Create new goal
    var goal = {
      id: uuid(),
      name: document.getElementById('goalName').value.trim(),
      description: document.getElementById('goalDesc').value.trim(),
      deadline: document.getElementById('goalDeadline').value,
      targetDays: parseInt(document.getElementById('goalTarget').value) || 30,
      linkedHabits: linkedHabits,
      createdAt: today()
    };
    data.goals.push(goal);
    saveData();
    closeGoalModal();
    showToast('Ziel erstellt! 🎯', 'success');
  }
  renderPage('goals');
}

function deleteGoal(id) {
  if (!confirm('Dieses Ziel löschen?')) return;
  data.goals = data.goals.filter(function (g) { return g.id !== id; });
  saveData();
  showToast('Ziel gelöscht', 'info');
  renderGoals();
}

// ═══════════════════════════════════════
// STATS & BADGES
// ═══════════════════════════════════════

function checkBadge(id) {
  var habits, completionDays;
  switch (id) {
    case 'first': return data.habits.length >= 1;
    case 'streak3': return getActiveHabits().some(function (h) { return getStreak(h.id) >= 3; });
    case 'streak7': return getActiveHabits().some(function (h) { return getStreak(h.id) >= 7; });
    case 'streak14': return getActiveHabits().some(function (h) { return getStreak(h.id) >= 14; });
    case 'streak30': return getActiveHabits().some(function (h) { return getStreak(h.id) >= 30; });
    case 'habits5': return data.habits.length >= 5;
    case 'habits10': return data.habits.length >= 10;
    case 'score100': return data.score >= 100;
    case 'score500': return data.score >= 500;
    case 'goal1': return (data.goals || []).length >= 1;
    case 'mood7': return Object.keys(data.moods || {}).length >= 7;
    case 'allday':
      habits = getActiveHabits();
      if (!habits.length) return false;
      completionDays = Object.keys(data.completions);
      for (var i = 0; i < completionDays.length; i++) {
        var day = completionDays[i];
        var allDone = true;
        for (var j = 0; j < habits.length; j++) {
          if (!data.completions[day][habits[j].id]) { allDone = false; break; }
        }
        if (allDone) return true;
      }
      return false;
    default: return false;
  }
}

var BADGES = [
  { id: 'first', name: 'Erster Schritt', desc: 'Erstes Habit erstellt', icon: '🌱' },
  { id: 'streak3', name: '3-Tage-Streak', desc: '3 Tage in Folge', icon: '🔥' },
  { id: 'streak7', name: 'Wochenkrieger', desc: '7 Tage in Folge', icon: '⚔️' },
  { id: 'streak14', name: 'Zwei Wochen', desc: '14 Tage Streak', icon: '💎' },
  { id: 'streak30', name: 'Monatsheld', desc: '30 Tage Streak', icon: '👑' },
  { id: 'habits5', name: 'Habit-Sammler', desc: '5 Habits erstellt', icon: '📚' },
  { id: 'habits10', name: 'Habit-Meister', desc: '10 Habits erstellt', icon: '🏅' },
  { id: 'score100', name: 'Score: 100', desc: '100 Punkte erreicht', icon: '💯' },
  { id: 'score500', name: 'Score: 500', desc: '500 Punkte erreicht', icon: '🚀' },
  { id: 'goal1', name: 'Zielstrebig', desc: 'Erstes Ziel erstellt', icon: '🎯' },
  { id: 'mood7', name: 'Selbstreflexion', desc: '7 Tage Mood getracked', icon: '🪞' },
  { id: 'allday', name: 'Perfekter Tag', desc: 'Alle Habits an einem Tag erledigt', icon: '⭐' }
];

function renderStats() {
  var chart = document.getElementById('weeklyBarChart');
  var habits = getActiveHabits();
  var totalH = habits.length || 1;
  var bars = '';
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var key = dateKey(d);
    var done = 0;
    for (var j = 0; j < habits.length; j++) {
      if (isCompleted(habits[j].id, key)) done++;
    }
    var pct = Math.round(done / totalH * 100);
    bars += '<div class="bar-col">';
    bars += '<div class="bar-value">' + pct + '%</div>';
    bars += '<div class="bar" style="height:' + Math.max(4, pct) + '%;"></div>';
    bars += '<div class="bar-label">' + DAYS_DE[d.getDay()] + '</div>';
    bars += '</div>';
  }
  chart.innerHTML = bars;

  var grid = document.getElementById('badgesGrid');
  var bhtml = '';
  for (var i = 0; i < BADGES.length; i++) {
    var b = BADGES[i];
    var earned = checkBadge(b.id);
    bhtml += '<div class="badge-card ' + (earned ? 'earned' : 'locked') + '">';
    bhtml += '<div class="badge-icon">' + b.icon + '</div>';
    bhtml += '<div class="badge-name">' + b.name + '</div>';
    bhtml += '<div class="badge-desc">' + b.desc + '</div>';
    bhtml += '</div>';
  }
  grid.innerHTML = bhtml;
}

// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════

function renderSettings() {
  updateThemeUI();
}

function exportData() {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'habitflow-backup-' + today() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Daten exportiert! 📥', 'success');
}

function importData() {
  document.getElementById('importFileInput').click();
}

function handleImportFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (evt) {
    try {
      var imported = JSON.parse(evt.target.result);
      data = Object.assign({}, getDefaultData(), imported);
      saveData();
      showToast('Daten erfolgreich importiert! ✅', 'success');
      renderPage(currentPage);
    } catch (err) {
      showToast('Fehler beim Import: Ungültige Datei', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function clearAllData() {
  if (!confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden!')) return;
  if (!confirm('Bist du ganz sicher?')) return;
  data = getDefaultData();
  saveData();
  showToast('Alle Daten gelöscht', 'info');
  renderPage(currentPage);
}

// ═══════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// Keyboard
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(function (m) { m.classList.remove('active'); });
  }
});

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════

(function init() {
  loadData();
  document.documentElement.setAttribute('data-theme', data.settings.theme || 'dark');
  updateThemeUI();
  renderDashboard();
})();
