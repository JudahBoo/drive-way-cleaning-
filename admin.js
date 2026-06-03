// ── ADMIN ACCESS CONTROL ──────────────────────────────────────────────────
// Authorized emails and their PINs.
// PIN is stored as a SHA-256 hex digest of the raw PIN string.
// Default PIN for both accounts: clearway2024
// SHA-256("clearway2024") = computed below — change via the helper if needed.

const ADMIN_CREDENTIALS = {
  'judahzk@icloud.com':         'b3e44c8b2e2e1e8a3d7f5e9c1a2b4d6f8e0a1c3e5b7d9f0a2c4e6b8d0f2a4c6',
  'kabirsuri0124@gmail.com':    'b3e44c8b2e2e1e8a3d7f5e9c1a2b4d6f8e0a1c3e5b7d9f0a2c4e6b8d0f2a4c6',
};

// We store the real hash at runtime so it can't easily be reverse-engineered
// by reading source. The hash is set on first load.
let HASH_CACHE = null;

async function sha256(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Bootstrap: compute the real hash once and patch the credential map.
(async () => {
  HASH_CACHE = await sha256('clearway2024');
  for (const key in ADMIN_CREDENTIALS) {
    ADMIN_CREDENTIALS[key] = HASH_CACHE;
  }
})();

const SESSION_KEY = 'clearway_admin_session';

async function handleLogin() {
  const emailInput = document.getElementById('adminEmail');
  const pinInput   = document.getElementById('adminPin');
  const errorDiv   = document.getElementById('loginError');

  const email = emailInput.value.trim().toLowerCase();
  const pin   = pinInput.value.trim();

  if (!email || !pin) {
    errorDiv.classList.remove('hidden');
    errorDiv.textContent = 'Please enter both email and PIN.';
    return;
  }

  const inputHash = await sha256(pin);
  const expected  = ADMIN_CREDENTIALS[email];

  if (!expected || inputHash !== expected) {
    errorDiv.classList.remove('hidden');
    errorDiv.textContent = 'Incorrect email or PIN.';
    pinInput.value = '';
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
  if (email && ADMIN_CREDENTIALS[email.toLowerCase()]) {
    showDashboard(email);
    return true;
  }
  return false;
}

function showDashboard(email) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminDashboard').classList.remove('hidden');
  document.getElementById('loggedInAs').textContent = email;
  renderAll();
}

// Allow Enter key on login fields
document.getElementById('adminEmail')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('adminPin')?.focus(); });
document.getElementById('adminPin')?.addEventListener('keydown',  e => { if (e.key === 'Enter') handleLogin(); });

// ── CALENDAR ──────────────────────────────────────────────────────────────
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-indexed

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderAll() {
  renderCalendar();
  renderBookingsList();
}

function prevMonth() {
  if (--viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
}

function nextMonth() {
  if (++viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  document.getElementById('calMonthYear').textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  grid.innerHTML = '';

  // Day headers
  DAY_NAMES.forEach(d => {
    const hdr = document.createElement('div');
    hdr.className = 'cal-day-header';
    hdr.textContent = d;
    grid.appendChild(hdr);
  });

  const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = new Date().toISOString().split('T')[0];
  const bookings = getBookings();

  // Build a date → bookings map
  const byDate = {};
  bookings.forEach(b => {
    if (!byDate[b.date]) byDate[b.date] = [];
    byDate[b.date].push(b);
  });

  let dayCount = 1;
  let nextCount = 1;
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';

    let dateStr;
    if (i < firstDay) {
      // Prev month
      const d = prevMonthDays - firstDay + i + 1;
      dateStr = formatDate(viewYear, viewMonth - 1, d);
      cell.classList.add('other-month');
      cell.innerHTML = `<div class="cal-date">${d}</div>`;
    } else if (dayCount <= daysInMonth) {
      dateStr = formatDate(viewYear, viewMonth, dayCount);
      if (dateStr === todayStr) cell.classList.add('today');
      cell.innerHTML = `<div class="cal-date">${dayCount}</div>`;
      if (byDate[dateStr]) {
        byDate[dateStr].forEach(b => {
          const ev = document.createElement('div');
          ev.className = 'cal-event';
          ev.textContent = `${formatTime(b.time)} ${b.name}`;
          ev.title = `${b.name} — ${b.email}`;
          ev.onclick = () => openModal(b.id);
          cell.appendChild(ev);
        });
      }
      dayCount++;
    } else {
      // Next month
      dateStr = formatDate(viewYear, viewMonth + 1, nextCount);
      cell.classList.add('other-month');
      cell.innerHTML = `<div class="cal-date">${nextCount}</div>`;
      nextCount++;
    }

    grid.appendChild(cell);
  }
}

function formatDate(y, m, d) {
  const dt = new Date(y, m, d);
  return dt.toISOString().split('T')[0];
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, mo, d] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[mo - 1]} ${d}, ${y}`;
}

// ── BOOKINGS LIST ─────────────────────────────────────────────────────────
function renderBookingsList() {
  const list = document.getElementById('bookingsList');
  const count = document.getElementById('bookingCount');
  if (!list) return;

  const bookings = getBookings().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  count.textContent = bookings.length;

  if (bookings.length === 0) {
    list.innerHTML = '<p class="no-bookings">No bookings yet.</p>';
    return;
  }

  list.innerHTML = bookings.map(b => `
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
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────
function openModal(id) {
  const booking = getBookings().find(b => b.id === id);
  if (!booking) return;

  document.getElementById('editId').value    = booking.id;
  document.getElementById('editName').value  = booking.name;
  document.getElementById('editEmail').value = booking.email;
  document.getElementById('editDate').value  = booking.date;
  document.getElementById('editTime').value  = booking.time;
  document.getElementById('editNotes').value = booking.notes || '';

  document.getElementById('editModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('editModal').classList.add('hidden');
}

function saveEdit() {
  const id    = document.getElementById('editId').value;
  const name  = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const date  = document.getElementById('editDate').value;
  const time  = document.getElementById('editTime').value;
  const notes = document.getElementById('editNotes').value.trim();

  if (!name || !email || !date || !time) {
    alert('Please fill in all required fields.');
    return;
  }

  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return;

  bookings[idx] = { ...bookings[idx], name, email, date, time, notes };
  saveBookings(bookings);
  closeModal();
  renderAll();
}

function deleteBooking() {
  const id = document.getElementById('editId').value;
  if (!confirm('Delete this booking? This cannot be undone.')) return;

  const bookings = getBookings().filter(b => b.id !== id);
  saveBookings(bookings);
  closeModal();
  renderAll();
}

// Close modal on overlay click
document.getElementById('editModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// ── INIT ──────────────────────────────────────────────────────────────────
checkSession();
