// ── Clear Way Power Washing — Google Apps Script Backend ──────────────────
// Paste this entire file into your Google Apps Script editor.
// Deploy as a Web App: Execute as "Me", Access "Anyone".

const SHEET_NAME = 'Bookings';

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'getAll';
  try {
    switch (action) {
      case 'getAll':  return getAllBookings();
      case 'add':     return addBooking(e.parameter);
      case 'update':  return updateBooking(e.parameter);
      case 'delete':  return deleteBooking(e.parameter.id);
      default:        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── Sheet helper ───────────────────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id', 'name', 'email', 'date', 'time', 'notes', 'createdAt']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Get all bookings ───────────────────────────────────────────────────────
function getAllBookings() {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse([]);

  const headers  = data[0];
  const bookings = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = String(row[i]); });
    return obj;
  });
  return jsonResponse(bookings);
}

// ── Add booking ────────────────────────────────────────────────────────────
function addBooking(p) {
  const sheet = getSheet();
  const id    = Date.now().toString();
  sheet.appendRow([
    id,
    p.name    || '',
    p.email   || '',
    p.date    || '',
    p.time    || '',
    p.notes   || '',
    new Date().toISOString()
  ]);
  return jsonResponse({ success: true, id: id });
}

// ── Update booking ─────────────────────────────────────────────────────────
function updateBooking(p) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      sheet.getRange(i + 1, 2, 1, 5).setValues([[
        p.name  || data[i][1],
        p.email || data[i][2],
        p.date  || data[i][3],
        p.time  || data[i][4],
        p.notes !== undefined ? p.notes : data[i][5]
      ]]);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ error: 'Booking not found' });
}

// ── Delete booking ─────────────────────────────────────────────────────────
function deleteBooking(id) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ error: 'Booking not found' });
}

// ── JSON helper ────────────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
