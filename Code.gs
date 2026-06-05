const SHEET_NAME = 'Bookings';

function doGet(e) {
  var action = 'getAll';
  if (e && e.parameter && e.parameter.action) {
    action = e.parameter.action;
  }
  try {
    if (action === 'getAll') return getAllBookings();
    if (action === 'add') return addBooking(e.parameter);
    if (action === 'update') return updateBooking(e.parameter);
    if (action === 'delete') return deleteBooking(e.parameter.id);
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id', 'name', 'email', 'date', 'time', 'notes', 'createdAt']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAllBookings() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse([]);
  var headers = data[0];
  var bookings = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        if (headers[j] === 'date') {
          var y = val.getFullYear();
          var mo = String(val.getMonth() + 1); if (mo.length < 2) mo = '0' + mo;
          var dy = String(val.getDate()); if (dy.length < 2) dy = '0' + dy;
          obj[headers[j]] = y + '-' + mo + '-' + dy;
        } else if (headers[j] === 'time') {
          var h = String(val.getHours()); if (h.length < 2) h = '0' + h;
          var mn = String(val.getMinutes()); if (mn.length < 2) mn = '0' + mn;
          obj[headers[j]] = h + ':' + mn;
        } else {
          obj[headers[j]] = val.toISOString();
        }
      } else {
        obj[headers[j]] = String(val);
      }
    }
    bookings.push(obj);
  }
  return jsonResponse(bookings);
}

function addBooking(p) {
  var sheet = getSheet();
  var id = Date.now().toString();
  sheet.appendRow([
    id,
    p.name || '',
    p.email || '',
    p.date || '',
    p.time || '',
    p.notes || '',
    new Date().toISOString()
  ]);
  return jsonResponse({ success: true, id: id });
}

function updateBooking(p) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      sheet.getRange(i + 1, 2, 1, 5).setValues([[
        p.name || data[i][1],
        p.email || data[i][2],
        p.date || data[i][3],
        p.time || data[i][4],
        p.notes !== undefined ? p.notes : data[i][5]
      ]]);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ error: 'Not found' });
}

function deleteBooking(id) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ error: 'Not found' });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
