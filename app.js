// Shared booking storage helpers
const BOOKINGS_KEY = 'clearway_bookings';

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

function addBooking(booking) {
  const bookings = getBookings();
  booking.id = Date.now().toString();
  booking.createdAt = new Date().toISOString();
  bookings.push(booking);
  saveBookings(bookings);
  return booking;
}

// ── BOOKING FORM (index.html) ──────────────────────────────────────────────
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  // Set min date to today
  const prefDate = document.getElementById('prefDate');
  if (prefDate) {
    const today = new Date();
    prefDate.min = today.toISOString().split('T')[0];
  }

  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const date     = document.getElementById('prefDate').value;
    const time     = document.getElementById('prefTime').value;
    const notes    = document.getElementById('notes').value.trim();

    addBooking({ name, email, date, time, notes });

    bookingForm.classList.add('hidden');
    document.getElementById('form-success').classList.remove('hidden');
    document.getElementById('form-success').scrollIntoView({ behavior: 'smooth' });
  });
}

function validateForm() {
  let valid = true;

  const name  = document.getElementById('name');
  const email = document.getElementById('email');
  const date  = document.getElementById('prefDate');
  const time  = document.getElementById('prefTime');

  document.getElementById('nameError').textContent  = '';
  document.getElementById('emailError').textContent = '';
  document.getElementById('dateError').textContent  = '';
  document.getElementById('timeError').textContent  = '';

  if (!name.value.trim()) {
    document.getElementById('nameError').textContent = 'Please enter your name.';
    valid = false;
  }

  const emailVal = email.value.trim();
  if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    document.getElementById('emailError').textContent = 'Please enter a valid email.';
    valid = false;
  }

  if (!date.value) {
    document.getElementById('dateError').textContent = 'Please pick a date.';
    valid = false;
  }

  if (!time.value) {
    document.getElementById('timeError').textContent = 'Please pick a time.';
    valid = false;
  }

  return valid;
}

// Smooth navbar link active state on scroll
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  const y = window.scrollY + 80;
  sections.forEach(sec => {
    const link = document.querySelector(`.nav-links a[href="#${sec.id}"]`);
    if (!link) return;
    if (sec.offsetTop <= y && sec.offsetTop + sec.offsetHeight > y) {
      link.style.color = '#ffffff';
    } else {
      link.style.color = '';
    }
  });
});
