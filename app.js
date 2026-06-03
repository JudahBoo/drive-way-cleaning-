// ── BOOKING FORM (index.html) ──────────────────────────────────────────────
const bookingForm = document.getElementById('bookingForm');

if (bookingForm) {
  const prefDate = document.getElementById('prefDate');
  if (prefDate) {
    prefDate.min = new Date().toISOString().split('T')[0];
  }

  bookingForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const submitBtn = bookingForm.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking…';

    const name  = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const date  = document.getElementById('prefDate').value;
    const time  = document.getElementById('prefTime').value;
    const notes = document.getElementById('notes').value.trim();

    try {
      const url = `${SCRIPT_URL}?action=add` +
        `&name=${encodeURIComponent(name)}` +
        `&email=${encodeURIComponent(email)}` +
        `&date=${encodeURIComponent(date)}` +
        `&time=${encodeURIComponent(time)}` +
        `&notes=${encodeURIComponent(notes)}`;

      const res  = await fetch(url);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      bookingForm.classList.add('hidden');
      document.getElementById('form-success').classList.remove('hidden');
      document.getElementById('form-success').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Book My Cleaning';
      alert('Something went wrong. Please try again.');
      console.error(err);
    }
  });
}

function validateForm() {
  let valid = true;

  const name  = document.getElementById('name');
  const email = document.getElementById('email');
  const date  = document.getElementById('prefDate');
  const time  = document.getElementById('prefTime');

  ['nameError','emailError','dateError','timeError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  if (!name.value.trim()) {
    document.getElementById('nameError').textContent = 'Please enter your name.';
    valid = false;
  }

  const ev = email.value.trim();
  if (!ev || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ev)) {
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

// Navbar active highlight on scroll
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  const y = window.scrollY + 80;
  sections.forEach(sec => {
    const link = document.querySelector(`.nav-links a[href="#${sec.id}"]`);
    if (!link) return;
    link.style.color = (sec.offsetTop <= y && sec.offsetTop + sec.offsetHeight > y) ? '#fff' : '';
  });
});
