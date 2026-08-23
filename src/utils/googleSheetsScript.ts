/**
 * Pre-written Google Apps Script code (Code.gs) for deployment into Google Sheets Web App.
 * Supports bi-directional sync (GET full database, POST bulk sync or single payment/student operations).
 * Works directly with your Google Sheet: https://docs.google.com/spreadsheets/d/1q4vf-EUsfGGTwD5N3idQnBnXkk91X3_gJ9bj8CwqXmk/edit
 */
export const TARGET_GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Fx7CUTJCHT-m3FPfG_u3_VfYNN1RRWf87-0pIbUwA4M/edit?gid=0#gid=0';
export const TARGET_SPREADSHEET_ID = '1Fx7CUTJCHT-m3FPfG_u3_VfYNN1RRWf87-0pIbUwA4M';
export const DEFAULT_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxEpTfsmaRlXXounO_BriJ2reWgJwiaXLOG-OB98Y688i6pSxROprHBWEtmGUdcc05F/exec';

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * SMART SCHOOL FEE COLLECTION & LEDGER SYSTEM - BACKEND SCRIPT (Code.gs)
 * =========================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet: Extensions -> Apps Script
 * 2. Delete all existing code in Code.gs, paste this entire file, and click 'Save' (Ctrl+S / Cmd+S).
 * 3. Click 'Deploy' (top right blue button) -> 'Manage deployments' -> Edit (pencil icon) -> Version: 'New version' -> 'Deploy'.
 *    (Or 'Deploy' -> 'New deployment' -> Web app -> Execute as: 'Me' -> Who has access: 'Anyone' -> Deploy).
 * =========================================================================
 */

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureTabsExist(ss);

    var students = getSheetDataAsJson(ss.getSheetByName('Students'));
    var structures = getSheetDataAsJson(ss.getSheetByName('FeeStructures'));
    var installments = getSheetDataAsJson(ss.getSheetByName('Installments'));
    var transactions = getSheetDataAsJson(ss.getSheetByName('Payments'));
    var classConfigs = getSheetDataAsJson(ss.getSheetByName('ClassConfigs'));
    var schoolProfileData = getSheetDataAsJson(ss.getSheetByName('SchoolProfile'));
    var toleranceData = getSheetDataAsJson(ss.getSheetByName('Tolerance'));

    var schoolProfile = schoolProfileData.length > 0 ? schoolProfileData[0] : null;
    var tolerance = toleranceData.length > 0 ? toleranceData[0] : null;

    var data = {
      students: students,
      structures: structures,
      feeStructures: structures,
      installments: installments,
      transactions: transactions,
      payments: transactions,
      classConfigs: classConfigs,
      schoolProfile: schoolProfile,
      tolerance: tolerance,
      syncedAt: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(25000);
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No POST payload provided' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureTabsExist(ss);

    var data = payload.data || payload;

    // 1. Full Database Sync
    if (payload.action === 'FULL_SYNC' || payload.action === 'syncAllData' || data.students) {
      if (data.students) writeJsonToSheet(ss.getSheetByName('Students'), data.students);
      if (data.structures || data.feeStructures) writeJsonToSheet(ss.getSheetByName('FeeStructures'), data.structures || data.feeStructures);
      if (data.installments) writeJsonToSheet(ss.getSheetByName('Installments'), data.installments);
      if (data.transactions || data.payments) writeJsonToSheet(ss.getSheetByName('Payments'), data.transactions || data.payments);
      if (data.classConfigs) writeJsonToSheet(ss.getSheetByName('ClassConfigs'), data.classConfigs);
      if (data.schoolProfile) writeJsonToSheet(ss.getSheetByName('SchoolProfile'), [data.schoolProfile]);
      if (data.tolerance) writeJsonToSheet(ss.getSheetByName('Tolerance'), [data.tolerance]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Full database synced successfully to Google Sheets (' + (data.students ? data.students.length : 0) + ' students)',
        syncedAt: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Real-time Payment Logging
    if (payload.action === 'RECORD_PAYMENT') {
      var txn = payload.transaction || payload;
      var paymentsSheet = ss.getSheetByName('Payments');
      if (paymentsSheet && txn) {
        appendJsonToSheet(paymentsSheet, [txn]);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Payment recorded in Google Sheet'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unrecognized action: ' + payload.action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function ensureTabsExist(ss) {
  var requiredSheets = ['Students', 'FeeStructures', 'Installments', 'Payments', 'ClassConfigs', 'SchoolProfile', 'Tolerance'];
  requiredSheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
  });
}

function getSheetDataAsJson(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var isEmpty = true;
    for (var k = 0; k < row.length; k++) {
      if (row[k] !== '' && row[k] !== null) {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var header = String(headers[j]).trim();
      if (!header) continue;
      var val = row[j];

      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          val = JSON.parse(val);
        } catch (e) {}
      } else if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      obj[header] = val;
    }
    rows.push(obj);
  }
  return rows;
}

function writeJsonToSheet(sheet, items) {
  if (!sheet) return;
  sheet.clearContents();
  if (!items || items.length === 0) return;

  var headers = Object.keys(items[0]);
  var rows = [headers];

  items.forEach(function(item) {
    var row = [];
    headers.forEach(function(header) {
      var val = item[header];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      row.push(val !== undefined && val !== null ? val : '');
    });
    rows.push(row);
  });

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2E8F0');
  sheet.setFrozenRows(1);
}

function appendJsonToSheet(sheet, items) {
  if (!sheet || !items || items.length === 0) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    writeJsonToSheet(sheet, items);
    return;
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows = [];

  items.forEach(function(item) {
    var row = [];
    headers.forEach(function(header) {
      var val = item[header];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      row.push(val !== undefined && val !== null ? val : '');
    });
    rows.push(row);
  });

  sheet.getRange(lastRow + 1, 1, rows.length, headers.length).setValues(rows);
}
`;

