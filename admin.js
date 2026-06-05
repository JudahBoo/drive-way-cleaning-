// ── ADMIN ACCESS CONTROL ──────────────────────────────────────────────────
const ADMIN_CREDENTIALS = {
  'judahzk@icloud.com':      'clearway2024',
  'kabirsuri0124@gmail.com': 'clearway2024',
};

const SESSION_KEY = 'clearway_admin_session';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Build hashed credential map on load
const HASHED = {};
(async () => {
  for (const [email, pin] of Object.entries(ADMIN_CREDENTIALS)) {
    HASHED[email] = await sha256(pin);
  }
})();

async function handleLogin() {
  const email = document.getElementById('adminEmail').value.trim().toLowerCase();
  const pin   = document.getElementById('adminPin').value.trim();
  const err   = document.getElementById('loginError');

  if (!email || !pin) {
    err.classList.remove('hidden');
    err.textContent = 'Please enter both email and PIN.';
    return;
  }

  const inputHash = await sha256(pin);
  if (!HASHED[email] || inputHash !== HASHED[email]) {
    err.classList.remove('hidden');
    err.textContent = 'Incorrect email or PIN.';
    document.getElementById('adminPin').value = '';
    return;
  }

  sessionStorage.setItem(SESSION_KEY, email);
  showDashboard(email);
}

function handleLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  document.getElementById('adminDashboard').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('adminPin').value = '';
}

function checkSession() {
  const email = sessionStorage.getItem(SESSION_KEY);
  if (email && HASHED[email] !== undefined) {
    showDashboard(email);
  }
}

function showDashboard(email) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminDashboard').classList.remove('hidden');
  document.getElementById('loggedInAs').textContent = email;
  renderAll();
}

document.getElementById('adminEmail')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('adminPin')?.focus(); });
document.getElementById('adminPin')?.addEventListener('keydown',  e => { if (e.key === 'Enter') handleLogin(); });

// ── GOOGLE SHEETS DATA ────────────────────────────────────────────────────
let bookingsCache = [];

async function fetchBookings() {
  const list = document.getElementById('bookingsList');
  if (list) list.innerHTML = '<p class="no-bookings">Loading…</p>';
  try {
    const res  = await fetch(`${SCRIPT_URL}?action=getAll`);
    const data = await res.json();
    bookingsCache = Array.isArray(data) ? data.map(normalizeBooking) : [];
  } catch (e) {
    bookingsCache = [];
    if (list) list.innerHTML = '<p class="no-bookings">Could not load bookings. Check your Script URL in config.js.</p>';
  }
}

// Normalize a booking so date is always YYYY-MM-DD and time is always HH:MM
function normalizeBooking(b) {
  return { ...b, date: normalizeDate(b.date), time: normalizeTime(b.time) };
}

function normalizeDate(val) {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const dt = new Date(val);
  if (!isNaN(dt)) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return val;
}

function normalizeTime(val) {
  if (!val) return '';
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  const match = val.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${String(parseInt(match[1])).padStart(2,'0')}:${match[2]}`;
  return val;
}

// ── CALENDAR ──────────────────────────────────────────────────────────────
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

async function renderAll() {
  await fetchBookings();
  renderCalendar();
  renderBookingsList();
}

function prevMonth() { if (--viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(); }
function nextMonth() { if (++viewMonth > 11) { viewMonth = 0;  viewYear++; } renderCalendar(); }

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  document.getElementById('calMonthYear').textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  grid.innerHTML = '';

  DAY_NAMES.forEach(d => {
    const hdr = document.createElement('div');
    hdr.className = 'cal-day-header';
    hdr.textContent = d;
    grid.appendChild(hdr);
  });

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays    = new Date(viewYear, viewMonth, 0).getDate();
  const todayStr    = new Date().toISOString().split('T')[0];

  const byDate = {};
  bookingsCache.forEach(b => {
    if (!byDate[b.date]) byDate[b.date] = [];
    byDate[b.date].push(b);
  });

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  let dayCount = 1, nextCount = 1;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';

    if (i < firstDay) {
      cell.classList.add('other-month');
      cell.innerHTML = `<div class="cal-date">${prevDays - firstDay + i + 1}</div>`;
    } else if (dayCount <= daysInMonth) {
      const dateStr = formatDate(viewYear, viewMonth, dayCount);
      if (dateStr === todayStr) cell.classList.add('today');
      cell.innerHTML = `<div class="cal-date">${dayCount}</div>`;
      (byDate[dateStr] || []).forEach(b => {
        const ev = document.createElement('div');
        ev.className = 'cal-event';
        ev.textContent = `${formatTime(b.time)} ${b.name}`;
        ev.title = `${b.name} — ${b.email}`;
        ev.onclick = () => openModal(b.id);
        cell.appendChild(ev);
      });
      dayCount++;
    } else {
      cell.classList.add('other-month');
      cell.innerHTML = `<div class="cal-date">${nextCount++}</div>`;
    }

    grid.appendChild(cell);
  }
}

function formatDate(y, m, d) { return new Date(y, m, d).toISOString().split('T')[0]; }

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, mo, d] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[mo - 1]} ${d}, ${y}`;
}

// ── BOOKINGS LIST ─────────────────────────────────────────────────────────
function renderBookingsList() {
  const list  = document.getElementById('bookingsList');
  const count = document.getElementById('bookingCount');
  if (!list) return;

  const sorted = [...bookingsCache].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  count.textContent = sorted.length;

  if (sorted.length === 0) {
    list.innerHTML = '<p class="no-bookings">No bookings yet.</p>';
    return;
  }

  list.innerHTML = sorted.map(b => `
    <div class="booking-item">
      <div>
        <div class="booking-name">${escHtml(b.name)}</div>
        <div class="booking-email">${escHtml(b.email)}</div>
        ${b.notes ? `<div class="booking-notes">${escHtml(b.notes)}</div>` : ''}
      </div>
      <div>
        <div class="booking-datetime">${formatDisplayDate(b.date)}</div>
        <div class="booking-datetime">${formatTime(b.time)}</div>
      </div>
      <button class="btn-edit" onclick="openModal('${b.id}')">Edit</button>
    </div>
  `).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────
function openModal(id) {
  const b = bookingsCache.find(x => x.id === id);
  if (!b) return;
  document.getElementById('editId').value    = b.id;
  document.getElementById('editName').value  = b.name;
  document.getElementById('editEmail').value = b.email;
  document.getElementById('editDate').value  = b.date;
  document.getElementById('editTime').value  = b.time;
  document.getElementById('editNotes').value = b.notes || '';
  document.getElementById('editModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('editModal').classList.add('hidden');
}

async function saveEdit() {
  const id    = document.getElementById('editId').value;
  const name  = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const date  = document.getElementById('editDate').value;
  const time  = document.getElementById('editTime').value;
  const notes = document.getElementById('editNotes').value.trim();

  if (!name || !email || !date || !time) { alert('Please fill in all required fields.'); return; }

  const btn = document.querySelector('.btn-save');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  try {
    const url = `${SCRIPT_URL}?action=update` +
      `&id=${encodeURIComponent(id)}` +
      `&name=${encodeURIComponent(name)}` +
      `&email=${encodeURIComponent(email)}` +
      `&date=${encodeURIComponent(date)}` +
      `&time=${encodeURIComponent(time)}` +
      `&notes=${encodeURIComponent(notes)}`;
    await fetch(url);
    closeModal();
    await renderAll();
  } catch (e) {
    alert('Failed to save. Please try again.');
  } finally {
    btn.textContent = 'Save Changes';
    btn.disabled = false;
  }
}

async function deleteBooking() {
  const id = document.getElementById('editId').value;
  if (!confirm('Delete this booking? This cannot be undone.')) return;

  try {
    await fetch(`${SCRIPT_URL}?action=delete&id=${encodeURIComponent(id)}`);
    closeModal();
    await renderAll();
  } catch (e) {
    alert('Failed to delete. Please try again.');
  }
}

document.getElementById('editModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// ── INIT ──────────────────────────────────────────────────────────────────
checkSession();
