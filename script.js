// ---------- Identity (per-device, no login) ----------
function getOrCreateUserId() {
  let id = localStorage.getItem('adtally_uid');
  if (!id) {
    id = Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem('adtally_uid', id);
  }
  return id;
}

// ---------- Data ----------
function loadData() {
  const raw = localStorage.getItem('adtally_data');
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  return { total: 0, byDate: {}, lastWatched: null, lastStreakDate: null, streak: 0 };
}

function saveData(data) {
  localStorage.setItem('adtally_data', JSON.stringify(data));
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isYesterday(dateKey) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return dateKey === y;
}

function recordAdWatch(data) {
  const key = todayKey();
  data.total += 1;
  data.byDate[key] = (data.byDate[key] || 0) + 1;
  data.lastWatched = new Date().toISOString();

  // streak logic: consecutive days with at least 1 ad watched
  if (data.lastStreakDate !== key) {
    if (data.lastStreakDate && isYesterday(data.lastStreakDate)) {
      data.streak += 1;
    } else {
      data.streak = 1;
    }
    data.lastStreakDate = key;
  }
  saveData(data);
  return data;
}

// ---------- UI: odometer ----------
function renderOdometer(total) {
  const digitsEl = document.querySelectorAll('#odometer .digit');
  const str = String(total).padStart(digitsEl.length, '0');
  digitsEl.forEach((el, i) => {
    if (el.textContent !== str[i]) {
      el.textContent = str[i];
      el.classList.add('flip');
      setTimeout(() => el.classList.remove('flip'), 250);
    }
  });
}

function formatLast(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString()} ${time}`;
}

function renderDashboard(data) {
  renderOdometer(data.total);
  document.getElementById('statTotal').textContent = data.total;
  document.getElementById('statToday').textContent = data.byDate[todayKey()] || 0;
  document.getElementById('statStreak').textContent = data.streak || 0;
  document.getElementById('statLast').textContent = formatLast(data.lastWatched);
}

// ---------- Toast ----------
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- Ad flow ----------
function startAdFlow(data) {
  document.getElementById('adSection').hidden = false;
  document.getElementById('adSection').scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Popunder network fires on its own via the click that triggered this.
  // No wait time needed — award the point immediately, unlimited repeats.
  data = recordAdWatch(data);
  renderDashboard(data);
  document.getElementById('doneMsg').textContent = `+1 point — ${data.total} total`;
  showToast('Point added — no limit, watch another anytime');
}

// ---------- Share ----------
function copyShareLink() {
  const url = window.location.origin + window.location.pathname;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied — share it with anyone');
  }).catch(() => {
    showToast(url);
  });
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  const uid = getOrCreateUserId();
  document.getElementById('userId').textContent = uid;

  let data = loadData();
  renderDashboard(data);

  document.getElementById('watchBtn').addEventListener('click', () => startAdFlow(data));
  document.getElementById('nextBtn').addEventListener('click', () => startAdFlow(data));
  document.getElementById('shareBtn').addEventListener('click', copyShareLink);
});
