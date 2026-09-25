/**
 * Pre-written Google Apps Script code (Code.gs) for deployment into Google Sheets Web App.
 * Production-ready backend supporting multi-tab relational storage, script locking,
 * idempotency checks, payment verification, audit logging, and chunked migration.
 */
export const TARGET_GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Fx7CUTJCHT-m3FPfG_u3_VfYNN1RRWf87-0pIbUwA4M/edit?gid=0#gid=0';
export const TARGET_SPREADSHEET_ID = '1Fx7CUTJCHT-m3FPfG_u3_VfYNN1RRWf87-0pIbUwA4M';
export const DEFAULT_SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxEpTfsmaRlXXounO_BriJ2reWgJwiaXLOG-OB98Y688i6pSxROprHBWEtmGUdcc05F/exec';

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * SMART SCHOOL FEE COLLECTION SYSTEM - PRODUCTION BACKEND SCRIPT (Code.gs)
 * =========================================================================
 *
 * Instructions for Deployment:
 * 1. Open your Google Sheet -> Extensions -> Apps Script.
 * 2. Delete all existing code in Code.gs, paste this entire file, and click Save (Ctrl+S / Cmd+S).
 * 3. Click 'Deploy' -> 'New deployment' -> Select type: 'Web app'.
 *    - Description: "School Fee Backend v4"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 4. Click 'Deploy', authorize permissions, and copy the Web App URL (ends with /exec).
 * 5. Paste the Web App URL in your Fee Management Software under Settings / Sheets Sync.
 * =========================================================================
 */

var TAB_NAMES = {
  STUDENTS: 'Students',
  FEE_STRUCTURES: 'FeeStructures',
  INSTALLMENTS: 'Installments',
  TRANSACTIONS: 'Transactions',
  PAYMENT_ALLOCATIONS: 'PaymentAllocations',
  CLASS_CONFIGS: 'ClassConfigs',
  FEE_HEADS: 'FeeHeads',
  SETTINGS: 'Settings',
  DAY_CLOSE_RECORDS: 'DayCloseRecords',
  RECEIPT_COUNTER: 'ReceiptCounter',
  AUDIT_LOG: 'AuditLog',
  MIGRATION_REPORT: 'MigrationReport'
};

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getBootstrapData';
  if (action === 'healthCheck') {
    return createJsonResponse({ success: true, message: 'Google Sheets Apps Script API is operational.', serverTime: new Date().toISOString() });
  }
  return handleAction(action, e ? e.parameter : {});
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return createJsonResponse({ success: false, error: 'Server busy. Could not acquire write lock. Please retry.', serverTime: new Date().toISOString() });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'No POST body provided.', serverTime: new Date().toISOString() });
    }

    var payload = {};
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, error: 'Invalid JSON payload.', serverTime: new Date().toISOString() });
    }

    var action = payload.action || 'getBootstrapData';
    return handleAction(action, payload);
  } catch (globalErr) {
    return createJsonResponse({ success: false, error: globalErr.toString(), serverTime: new Date().toISOString() });
  } finally {
    try { lock.releaseLock(); } catch(e){}
  }
}

function handleAction(action, payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTabsExist(ss);

  switch (action) {
    case 'healthCheck':
      return createJsonResponse({ success: true, message: 'OK', serverTime: new Date().toISOString() });

    case 'getBootstrapData':
      return getBootstrapData(ss);

    case 'getChanges':
      return getBootstrapData(ss); // Full snapshot for simple client sync

    case 'addStudent':
      return addStudentHandler(ss, payload);

    case 'updateStudent':
      return updateStudentHandler(ss, payload);

    case 'setStudentActive':
      return setStudentActiveHandler(ss, payload);

    case 'savePermission':
      return savePermissionHandler(ss, payload);

    case 'bulkAddStudents':
      return bulkAddStudentsHandler(ss, payload);

    case 'saveFeeStructure':
      return saveFeeStructureHandler(ss, payload);

    case 'recordPayment':
      return recordPaymentHandler(ss, payload);

    case 'cancelPayment':
      return cancelPaymentHandler(ss, payload);

    case 'updateTransactionSlip':
      return updateTransactionSlipHandler(ss, payload);

    case 'saveClassConfig':
      return saveClassConfigHandler(ss, payload);

    case 'saveFeeHead':
      return saveFeeHeadHandler(ss, payload);

    case 'saveSettings':
      return saveSettingsHandler(ss, payload);

    case 'saveDailyTarget':
      return saveDailyTargetHandler(ss, payload);

    case 'closeDay':
      return closeDayHandler(ss, payload);

    case 'reopenDay':
      return reopenDayHandler(ss, payload);

    case 'importChunk':
      return importChunkHandler(ss, payload);

    case 'verifyMigration':
      return verifyMigrationHandler(ss);

    default:
      return createJsonResponse({ success: false, error: 'Unknown action: ' + action, serverTime: new Date().toISOString() });
  }
}

// -------------------------------------------------------------------------
// Tab Setup & Helpers
// -------------------------------------------------------------------------
function ensureTabsExist(ss) {
  var schema = {};
  schema[TAB_NAMES.STUDENTS] = ['id', 'rollNo', 'name', 'classId', 'className', 'section', 'parentName', 'phone', 'altPhone', 'address', 'admissionDate', 'isActive', 'notes', 'permissionExpiresAt', 'permissionReason', 'manualCategoryOverride', 'createdAt', 'updatedAt'];
  schema[TAB_NAMES.FEE_STRUCTURES] = ['id', 'studentId', 'headName', 'actualFee', 'committedFee', 'concession', 'concessionReason', 'commitmentReceiptNo', 'commitmentDate', 'installmentsCount', 'isSpotFee', 'remarks'];
  schema[TAB_NAMES.INSTALLMENTS] = ['id', 'feeStructureId', 'studentId', 'headName', 'installmentNumber', 'totalInstallments', 'amount', 'dueDate', 'paidAmount', 'balanceAmount', 'status'];
  schema[TAB_NAMES.TRANSACTIONS] = ['id', 'receiptNo', 'studentId', 'studentName', 'studentRollNo', 'studentClass', 'date', 'amount', 'paymentMode', 'referenceNo', 'remarks', 'isCancelled', 'cancellationReason', 'cancelledAt', 'collectedBy', 'permissionDate', 'slipGiven', 'permissionUpdated', 'status', 'idempotencyKey'];
  schema[TAB_NAMES.PAYMENT_ALLOCATIONS] = ['id', 'transactionId', 'installmentId', 'studentId', 'headName', 'allocatedAmount', 'createdAt'];
  schema[TAB_NAMES.CLASS_CONFIGS] = ['id', 'className', 'actualFee', 'defaultInstallments', 'defaultDueDayOfMonth', 'startMonth'];
  schema[TAB_NAMES.FEE_HEADS] = ['id', 'headName', 'isMandatory', 'isSpotFee', 'description'];
  schema[TAB_NAMES.SETTINGS] = ['id', 'schoolProfileJson', 'toleranceJson', 'dailyTarget'];
  schema[TAB_NAMES.DAY_CLOSE_RECORDS] = ['id', 'date', 'closedAt', 'closedBy', 'target', 'totalAchieved', 'achievedPercent', 'cashTotal', 'upiTotal', 'otherTotal', 'totalReceiptsCount', 'notes'];
  schema[TAB_NAMES.RECEIPT_COUNTER] = ['id', 'nextReceiptSequence', 'lastReceiptNo', 'updatedAt'];
  schema[TAB_NAMES.AUDIT_LOG] = ['eventId', 'timestamp', 'action', 'entityType', 'entityId', 'studentId', 'receiptNo', 'operator', 'deviceId', 'beforeSummary', 'afterSummary', 'success', 'errorMessage'];
  schema[TAB_NAMES.MIGRATION_REPORT] = ['id', 'timestamp', 'chunkIndex', 'recordsProcessed', 'summaryJson', 'verified'];

  for (var tabName in schema) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(schema[tabName]);
      sheet.getRange(1, 1, 1, schema[tabName].length).setFontWeight('bold').setBackground('#f1f5f9');
      sheet.setFrozenRows(1);
    }
  }
}

function escapeFormula(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean' || typeof val === 'number') return val;
  var str = String(val);
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function parseRowValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' && val.indexOf("'") === 0) {
    return val.substring(1);
  }
  return val;
}

function getSheetDataAsJson(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var result = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[0] && row[0] !== 0) continue; // Skip empty rows
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      var rawVal = parseRowValue(row[c]);
      if (rawVal === 'true') rawVal = true;
      if (rawVal === 'false') rawVal = false;
      obj[key] = rawVal;
    }
    result.push(obj);
  }
  return result;
}

function upsertRows(sheet, idColumnIndex, rows) {
  if (!rows || rows.length === 0) return;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idToRowIndex = {};

  for (var r = 1; r < data.length; r++) {
    var idVal = String(parseRowValue(data[r][idColumnIndex - 1])).trim();
    if (idVal) {
      idToRowIndex[idVal] = r + 1; // 1-based row index in sheet
    }
  }

  for (var i = 0; i < rows.length; i++) {
    var item = rows[i];
    var rowId = String(item[headers[idColumnIndex - 1]] || item.id || item.eventId || '').trim();
    var rowArray = [];
    for (var h = 0; h < headers.length; h++) {
      var key = headers[h];
      rowArray.push(escapeFormula(item[key]));
    }

    if (rowId && idToRowIndex[rowId]) {
      var targetRow = idToRowIndex[rowId];
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowArray]);
    } else {
      sheet.appendRow(rowArray);
      if (rowId) {
        idToRowIndex[rowId] = sheet.getLastRow();
      }
    }
  }
}

function logAudit(ss, entry) {
  try {
    var sheet = ss.getSheetByName(TAB_NAMES.AUDIT_LOG);
    if (!sheet) return;
    var row = [
      escapeFormula(entry.eventId || 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
      escapeFormula(entry.timestamp || new Date().toISOString()),
      escapeFormula(entry.action || ''),
      escapeFormula(entry.entityType || ''),
      escapeFormula(entry.entityId || ''),
      escapeFormula(entry.studentId || ''),
      escapeFormula(entry.receiptNo || ''),
      escapeFormula(entry.operator || 'SYSTEM'),
      escapeFormula(entry.deviceId || 'WEB'),
      escapeFormula(entry.beforeSummary || ''),
      escapeFormula(entry.afterSummary || ''),
      entry.success !== false,
      escapeFormula(entry.errorMessage || '')
    ];
    sheet.appendRow(row);
  } catch (e) {}
}

// -------------------------------------------------------------------------
// Action Handlers
// -------------------------------------------------------------------------
function getBootstrapData(ss) {
  var students = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.STUDENTS));
  var structures = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.FEE_STRUCTURES));
  var installments = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.INSTALLMENTS));
  var transactions = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.TRANSACTIONS));
  var rawAllocations = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.PAYMENT_ALLOCATIONS));
  var classConfigs = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.CLASS_CONFIGS));
  var feeHeads = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.FEE_HEADS));
  var settingsList = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.SETTINGS));
  var dayClosesList = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.DAY_CLOSE_RECORDS));
  var counterList = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.RECEIPT_COUNTER));

  // Map Allocations back to Transactions
  var allocMap = {};
  for (var a = 0; a < rawAllocations.length; a++) {
    var alc = rawAllocations[a];
    if (!allocMap[alc.transactionId]) allocMap[alc.transactionId] = [];
    allocMap[alc.transactionId].push({
      installmentId: alc.installmentId,
      headName: alc.headName,
      installmentNumber: Number(alc.installmentNumber || 1),
      dueDate: alc.dueDate || '',
      allocatedAmount: Number(alc.allocatedAmount || 0)
    });
  }

  for (var t = 0; t < transactions.length; t++) {
    var txn = transactions[t];
    txn.amount = Number(txn.amount || 0);
    txn.isCancelled = (txn.isCancelled === true || txn.isCancelled === 'true');
    txn.allocations = allocMap[txn.id] || [];
  }

  for (var i = 0; i < installments.length; i++) {
    var inst = installments[i];
    inst.amount = Number(inst.amount || 0);
    inst.paidAmount = Number(inst.paidAmount || 0);
    inst.balanceAmount = Number(inst.balanceAmount || 0);
    inst.installmentNumber = Number(inst.installmentNumber || 1);
    inst.totalInstallments = Number(inst.totalInstallments || 1);
  }

  for (var s = 0; s < structures.length; s++) {
    var st = structures[s];
    st.actualFee = Number(st.actualFee || 0);
    st.committedFee = Number(st.committedFee || 0);
    st.concession = Number(st.concession || 0);
    st.installmentsCount = Number(st.installmentsCount || 1);
    st.isSpotFee = (st.isSpotFee === true || st.isSpotFee === 'true');
  }

  for (var stU = 0; stU < students.length; stU++) {
    var stu = students[stU];
    stu.isActive = (stu.isActive !== false && stu.isActive !== 'false');
  }

  var dayCloseRecords = {};
  for (var d = 0; d < dayClosesList.length; d++) {
    var dc = dayClosesList[d];
    dayCloseRecords[dc.date || dc.id] = dc;
  }

  var schoolProfile = null;
  var tolerance = null;
  var dailyTarget = 20000;

  if (settingsList.length > 0) {
    var cfg = settingsList[0];
    if (cfg.schoolProfileJson) {
      try { schoolProfile = JSON.parse(cfg.schoolProfileJson); } catch (e) {}
    }
    if (cfg.toleranceJson) {
      try { tolerance = JSON.parse(cfg.toleranceJson); } catch (e) {}
    }
    if (cfg.dailyTarget) dailyTarget = Number(cfg.dailyTarget);
  }

  var nextReceiptSequence = 1029;
  if (counterList.length > 0 && counterList[0].nextReceiptSequence) {
    nextReceiptSequence = Number(counterList[0].nextReceiptSequence);
  }

  if (schoolProfile && typeof schoolProfile === 'object') {
    schoolProfile.nextReceiptSequence = nextReceiptSequence;
  }

  return createJsonResponse({
    success: true,
    data: {
      students: students,
      structures: structures,
      installments: installments,
      transactions: transactions,
      classConfigs: classConfigs,
      feeHeads: feeHeads,
      schoolProfile: schoolProfile,
      tolerance: tolerance,
      dailyTarget: dailyTarget,
      dayCloseRecords: dayCloseRecords,
      nextReceiptSequence: nextReceiptSequence,
      syncedAt: new Date().toISOString()
    },
    message: 'Bootstrap data loaded from Google Sheets successfully.',
    serverTime: new Date().toISOString()
  });
}

function addStudentHandler(ss, payload) {
  var student = payload.student;
  var structures = payload.structures || [];
  var installments = payload.installments || [];

  if (!student || !student.id) {
    return createJsonResponse({ success: false, error: 'Student data and student.id are required.', serverTime: new Date().toISOString() });
  }

  var studentsSheet = ss.getSheetByName(TAB_NAMES.STUDENTS);
  var existingStudents = getSheetDataAsJson(studentsSheet);

  for (var i = 0; i < existingStudents.length; i++) {
    if (existingStudents[i].id === student.id) {
      return createJsonResponse({ success: false, error: 'Student ID ' + student.id + ' already exists.', serverTime: new Date().toISOString() });
    }
    if (student.rollNo && String(existingStudents[i].rollNo).trim().toLowerCase() === String(student.rollNo).trim().toLowerCase()) {
      return createJsonResponse({ success: false, error: 'Admission / Roll No. ' + student.rollNo + ' is already assigned to another student.', serverTime: new Date().toISOString() });
    }
  }

  student.createdAt = student.createdAt || new Date().toISOString();
  student.updatedAt = new Date().toISOString();

  upsertRows(studentsSheet, 1, [student]);
  if (structures.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.FEE_STRUCTURES), 1, structures);
  if (installments.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.INSTALLMENTS), 1, installments);

  logAudit(ss, {
    eventId: 'evt_add_stu_' + Date.now(),
    action: 'ADD_STUDENT',
    entityType: 'STUDENT',
    entityId: student.id,
    studentId: student.id,
    afterSummary: student.name + ' (' + student.className + ' - ' + student.rollNo + ')',
    success: true
  });

  return createJsonResponse({
    success: true,
    data: { student: student, structures: structures, installments: installments },
    message: 'Student ' + student.name + ' added successfully to Google Sheets.',
    serverTime: new Date().toISOString()
  });
}

function recordPaymentHandler(ss, payload) {
  var txn = payload.transaction;
  var idempotencyKey = payload.idempotencyKey || (txn ? txn.idempotencyKey : null) || (txn ? txn.id : null);

  if (!txn || !txn.studentId || !txn.amount || txn.amount <= 0) {
    return createJsonResponse({ success: false, error: 'Valid payment transaction with amount > 0 is required.', serverTime: new Date().toISOString() });
  }

  var txnsSheet = ss.getSheetByName(TAB_NAMES.TRANSACTIONS);
  var existingTxns = getSheetDataAsJson(txnsSheet);

  // 1. Idempotency Check
  if (idempotencyKey) {
    for (var i = 0; i < existingTxns.length; i++) {
      if (existingTxns[i].idempotencyKey === idempotencyKey || existingTxns[i].id === idempotencyKey) {
        return createJsonResponse({
          success: true,
          data: { transaction: existingTxns[i], duplicateDetected: true },
          message: 'Payment already recorded (idempotency match).',
          serverTime: new Date().toISOString()
        });
      }
    }
  }

  // 2. Load & Validate Installments
  var instSheet = ss.getSheetByName(TAB_NAMES.INSTALLMENTS);
  var allInstallments = getSheetDataAsJson(instSheet);
  var instMap = {};
  for (var k = 0; k < allInstallments.length; k++) {
    instMap[allInstallments[k].id] = allInstallments[k];
  }

  var allocations = txn.allocations || [];
  if (!allocations || allocations.length === 0) {
    return createJsonResponse({ success: false, error: 'Payment must allocate amount to at least one installment.', serverTime: new Date().toISOString() });
  }

  var seenInstIds = {};
  var sumAllocated = 0;
  var updatedInstallmentRows = [];

  for (var a = 0; a < allocations.length; a++) {
    var alc = allocations[a];
    if (seenInstIds[alc.installmentId]) {
      return createJsonResponse({ success: false, error: 'Duplicate installment allocation detected for ID: ' + alc.installmentId, serverTime: new Date().toISOString() });
    }
    seenInstIds[alc.installmentId] = true;

    var inst = instMap[alc.installmentId];
    if (!inst) {
      return createJsonResponse({ success: false, error: 'Installment not found: ' + alc.installmentId, serverTime: new Date().toISOString() });
    }
    if (inst.studentId !== txn.studentId) {
      return createJsonResponse({ success: false, error: 'Installment ' + alc.installmentId + ' does not belong to student ' + txn.studentId, serverTime: new Date().toISOString() });
    }

    var currentBalance = Number(inst.balanceAmount !== undefined ? inst.balanceAmount : (inst.amount - (inst.paidAmount || 0)));
    var alcAmt = Number(alc.allocatedAmount || 0);

    if (alcAmt > currentBalance + 0.01) {
      return createJsonResponse({ success: false, error: 'Allocated amount ₹' + alcAmt + ' exceeds installment balance ₹' + currentBalance, serverTime: new Date().toISOString() });
    }

    sumAllocated += alcAmt;

    // Apply update to installment object
    var newPaid = Number(inst.paidAmount || 0) + alcAmt;
    var newBalance = Math.max(0, Number(inst.amount || 0) - newPaid);
    var newStatus = newBalance <= 0.01 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

    inst.paidAmount = newPaid;
    inst.balanceAmount = newBalance;
    inst.status = newStatus;

    updatedInstallmentRows.push(inst);
  }

  if (Math.abs(sumAllocated - Number(txn.amount)) > 0.01) {
    return createJsonResponse({ success: false, error: 'Total allocated amount (₹' + sumAllocated + ') does not equal payment amount (₹' + txn.amount + ').', serverTime: new Date().toISOString() });
  }

  // 3. Increment Receipt Counter
  var counterSheet = ss.getSheetByName(TAB_NAMES.RECEIPT_COUNTER);
  var counterRows = getSheetDataAsJson(counterSheet);
  var nextSeq = 1029;
  if (counterRows.length > 0 && counterRows[0].nextReceiptSequence) {
    nextSeq = Number(counterRows[0].nextReceiptSequence);
  }

  var prefix = 'KSB-' + new Date().getFullYear() + '-';
  var receiptNo = txn.receiptNo;
  if (!receiptNo || receiptNo.indexOf('PENDING') >= 0 || receiptNo.indexOf('DRAFT') >= 0) {
    receiptNo = prefix + String(nextSeq).padStart(5, '0');
  }

  txn.receiptNo = receiptNo;
  txn.status = 'COMMITTED';
  txn.idempotencyKey = idempotencyKey || txn.id;
  txn.isCancelled = false;

  // Update counter tab
  upsertRows(counterSheet, 1, [{
    id: 'main_counter',
    nextReceiptSequence: nextSeq + 1,
    lastReceiptNo: receiptNo,
    updatedAt: new Date().toISOString()
  }]);

  // Update Settings tab receipt sequence if profile exists
  var settingsSheet = ss.getSheetByName(TAB_NAMES.SETTINGS);
  var settingsRows = getSheetDataAsJson(settingsSheet);
  if (settingsRows.length > 0 && settingsRows[0].schoolProfileJson) {
    try {
      var prof = JSON.parse(settingsRows[0].schoolProfileJson);
      prof.nextReceiptSequence = nextSeq + 1;
      settingsRows[0].schoolProfileJson = JSON.stringify(prof);
      upsertRows(settingsSheet, 1, [settingsRows[0]]);
    } catch(e){}
  }

  // 4. Save Transaction & Allocations
  upsertRows(txnsSheet, 1, [txn]);

  var allocSheet = ss.getSheetByName(TAB_NAMES.PAYMENT_ALLOCATIONS);
  var allocRowsToSave = [];
  for (var j = 0; j < allocations.length; j++) {
    var aObj = allocations[j];
    allocRowsToSave.push({
      id: 'alc_' + txn.id + '_' + aObj.installmentId,
      transactionId: txn.id,
      installmentId: aObj.installmentId,
      studentId: txn.studentId,
      headName: aObj.headName || '',
      allocatedAmount: aObj.allocatedAmount,
      createdAt: txn.date || new Date().toISOString()
    });
  }
  upsertRows(allocSheet, 1, allocRowsToSave);

  // 5. Save Updated Installments
  upsertRows(instSheet, 1, updatedInstallmentRows);

  logAudit(ss, {
    eventId: 'evt_pay_' + txn.id,
    action: 'RECORD_PAYMENT',
    entityType: 'TRANSACTION',
    entityId: txn.id,
    studentId: txn.studentId,
    receiptNo: receiptNo,
    afterSummary: 'Recorded payment ₹' + txn.amount + ' via ' + txn.paymentMode,
    success: true
  });

  return createJsonResponse({
    success: true,
    data: { transaction: txn, nextReceiptSequence: nextSeq + 1 },
    message: 'Payment recorded successfully with Receipt No. ' + receiptNo,
    serverTime: new Date().toISOString()
  });
}

function cancelPaymentHandler(ss, payload) {
  var transactionId = payload.transactionId;
  var reason = payload.reason || 'Cancelled by admin';

  if (!transactionId) {
    return createJsonResponse({ success: false, error: 'transactionId is required.', serverTime: new Date().toISOString() });
  }

  var txnsSheet = ss.getSheetByName(TAB_NAMES.TRANSACTIONS);
  var txns = getSheetDataAsJson(txnsSheet);
  var targetTxn = null;

  for (var i = 0; i < txns.length; i++) {
    if (txns[i].id === transactionId) {
      targetTxn = txns[i];
      break;
    }
  }

  if (!targetTxn) {
    return createJsonResponse({ success: false, error: 'Transaction not found: ' + transactionId, serverTime: new Date().toISOString() });
  }

  if (targetTxn.isCancelled) {
    return createJsonResponse({ success: false, error: 'Transaction is already cancelled.', serverTime: new Date().toISOString() });
  }

  // Restore installment balances
  var allocSheet = ss.getSheetByName(TAB_NAMES.PAYMENT_ALLOCATIONS);
  var allAllocations = getSheetDataAsJson(allocSheet);
  var txnAllocations = [];
  for (var a = 0; a < allAllocations.length; a++) {
    if (allAllocations[a].transactionId === transactionId) {
      txnAllocations.push(allAllocations[a]);
    }
  }

  var instSheet = ss.getSheetByName(TAB_NAMES.INSTALLMENTS);
  var allInstallments = getSheetDataAsJson(instSheet);
  var instMap = {};
  for (var k = 0; k < allInstallments.length; k++) {
    instMap[allInstallments[k].id] = allInstallments[k];
  }

  var updatedInsts = [];
  for (var j = 0; j < txnAllocations.length; j++) {
    var alc = txnAllocations[j];
    var inst = instMap[alc.installmentId];
    if (inst) {
      var alcAmt = Number(alc.allocatedAmount || 0);
      var newPaid = Math.max(0, Number(inst.paidAmount || 0) - alcAmt);
      var newBal = Math.max(0, Number(inst.amount || 0) - newPaid);
      inst.paidAmount = newPaid;
      inst.balanceAmount = newBal;
      inst.status = newBal <= 0.01 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');
      updatedInsts.push(inst);
    }
  }

  targetTxn.isCancelled = true;
  targetTxn.cancellationReason = reason;
  targetTxn.cancelledAt = new Date().toISOString();
  targetTxn.status = 'CANCELLED';

  upsertRows(txnsSheet, 1, [targetTxn]);
  if (updatedInsts.length > 0) upsertRows(instSheet, 1, updatedInsts);

  logAudit(ss, {
    eventId: 'evt_cancel_' + transactionId,
    action: 'CANCEL_PAYMENT',
    entityType: 'TRANSACTION',
    entityId: transactionId,
    studentId: targetTxn.studentId,
    receiptNo: targetTxn.receiptNo,
    afterSummary: 'Cancelled receipt ' + targetTxn.receiptNo + ' (Reason: ' + reason + ')',
    success: true
  });

  return createJsonResponse({
    success: true,
    data: { transaction: targetTxn },
    message: 'Receipt ' + targetTxn.receiptNo + ' cancelled and installment balances restored.',
    serverTime: new Date().toISOString()
  });
}

function updateStudentHandler(ss, payload) {
  var student = payload.student;
  if (!student || !student.id) {
    return createJsonResponse({ success: false, error: 'Student data and student.id required.', serverTime: new Date().toISOString() });
  }
  student.updatedAt = new Date().toISOString();
  upsertRows(ss.getSheetByName(TAB_NAMES.STUDENTS), 1, [student]);
  return createJsonResponse({ success: true, data: { student: student }, message: 'Student updated.', serverTime: new Date().toISOString() });
}

function setStudentActiveHandler(ss, payload) {
  var studentId = payload.studentId;
  var isActive = payload.isActive;
  var studentsSheet = ss.getSheetByName(TAB_NAMES.STUDENTS);
  var students = getSheetDataAsJson(studentsSheet);

  for (var i = 0; i < students.length; i++) {
    if (students[i].id === studentId) {
      students[i].isActive = isActive;
      students[i].updatedAt = new Date().toISOString();
      upsertRows(studentsSheet, 1, [students[i]]);
      return createJsonResponse({ success: true, data: { student: students[i] }, message: 'Student active status set to ' + isActive, serverTime: new Date().toISOString() });
    }
  }
  return createJsonResponse({ success: false, error: 'Student not found.', serverTime: new Date().toISOString() });
}

function savePermissionHandler(ss, payload) {
  var studentId = payload.studentId;
  var permissionExpiresAt = payload.permissionExpiresAt;
  var permissionReason = payload.permissionReason;
  var studentsSheet = ss.getSheetByName(TAB_NAMES.STUDENTS);
  var students = getSheetDataAsJson(studentsSheet);

  for (var i = 0; i < students.length; i++) {
    if (students[i].id === studentId) {
      students[i].permissionExpiresAt = permissionExpiresAt;
      students[i].permissionReason = permissionReason;
      students[i].updatedAt = new Date().toISOString();
      upsertRows(studentsSheet, 1, [students[i]]);
      return createJsonResponse({ success: true, data: { student: students[i] }, message: 'Permission updated until ' + permissionExpiresAt, serverTime: new Date().toISOString() });
    }
  }
  return createJsonResponse({ success: false, error: 'Student not found.', serverTime: new Date().toISOString() });
}

function bulkAddStudentsHandler(ss, payload) {
  var students = payload.students || [];
  var structures = payload.structures || [];
  var installments = payload.installments || [];

  if (students.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.STUDENTS), 1, students);
  if (structures.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.FEE_STRUCTURES), 1, structures);
  if (installments.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.INSTALLMENTS), 1, installments);

  return createJsonResponse({
    success: true,
    data: { count: students.length },
    message: 'Bulk added ' + students.length + ' students to Google Sheets.',
    serverTime: new Date().toISOString()
  });
}

function saveFeeStructureHandler(ss, payload) {
  var structures = payload.structures || (payload.structure ? [payload.structure] : []);
  var installments = payload.installments || [];
  if (structures.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.FEE_STRUCTURES), 1, structures);
  if (installments.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.INSTALLMENTS), 1, installments);
  return createJsonResponse({ success: true, message: 'Fee structures & installments saved.', serverTime: new Date().toISOString() });
}

function updateTransactionSlipHandler(ss, payload) {
  var transactionId = payload.transactionId;
  var slipGiven = payload.slipGiven;
  var txnsSheet = ss.getSheetByName(TAB_NAMES.TRANSACTIONS);
  var txns = getSheetDataAsJson(txnsSheet);

  for (var i = 0; i < txns.length; i++) {
    if (txns[i].id === transactionId) {
      txns[i].slipGiven = slipGiven;
      txns[i].permissionUpdated = true;
      upsertRows(txnsSheet, 1, [txns[i]]);
      return createJsonResponse({ success: true, data: { transaction: txns[i] }, message: 'Transaction slip updated.', serverTime: new Date().toISOString() });
    }
  }
  return createJsonResponse({ success: false, error: 'Transaction not found.', serverTime: new Date().toISOString() });
}

function saveClassConfigHandler(ss, payload) {
  var classConfigs = payload.classConfigs || (payload.classConfig ? [payload.classConfig] : []);
  if (classConfigs.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.CLASS_CONFIGS), 1, classConfigs);
  return createJsonResponse({ success: true, message: 'Class fee configs saved.', serverTime: new Date().toISOString() });
}

function saveFeeHeadHandler(ss, payload) {
  var feeHeads = payload.feeHeads || (payload.feeHead ? [payload.feeHead] : []);
  if (feeHeads.length > 0) upsertRows(ss.getSheetByName(TAB_NAMES.FEE_HEADS), 1, feeHeads);
  return createJsonResponse({ success: true, message: 'Fee heads saved.', serverTime: new Date().toISOString() });
}

function saveSettingsHandler(ss, payload) {
  var schoolProfile = payload.schoolProfile;
  var tolerance = payload.tolerance;
  var dailyTarget = payload.dailyTarget || 20000;

  var settingsSheet = ss.getSheetByName(TAB_NAMES.SETTINGS);
  var rowObj = {
    id: 'main_settings',
    schoolProfileJson: schoolProfile ? JSON.stringify(schoolProfile) : '',
    toleranceJson: tolerance ? JSON.stringify(tolerance) : '',
    dailyTarget: dailyTarget
  };
  upsertRows(settingsSheet, 1, [rowObj]);

  if (schoolProfile && schoolProfile.nextReceiptSequence) {
    upsertRows(ss.getSheetByName(TAB_NAMES.RECEIPT_COUNTER), 1, [{
      id: 'main_counter',
      nextReceiptSequence: Number(schoolProfile.nextReceiptSequence),
      updatedAt: new Date().toISOString()
    }]);
  }

  return createJsonResponse({ success: true, message: 'Settings saved to Google Sheets.', serverTime: new Date().toISOString() });
}

function saveDailyTargetHandler(ss, payload) {
  var dailyTarget = payload.dailyTarget;
  var settingsSheet = ss.getSheetByName(TAB_NAMES.SETTINGS);
  var rows = getSheetDataAsJson(settingsSheet);
  var settingsObj = rows.length > 0 ? rows[0] : { id: 'main_settings' };
  settingsObj.dailyTarget = dailyTarget;
  upsertRows(settingsSheet, 1, [settingsObj]);
  return createJsonResponse({ success: true, message: 'Daily target updated.', serverTime: new Date().toISOString() });
}

function closeDayHandler(ss, payload) {
  var record = payload.record;
  if (!record || !record.date) {
    return createJsonResponse({ success: false, error: 'Day close record with date is required.', serverTime: new Date().toISOString() });
  }
  record.id = record.date;
  upsertRows(ss.getSheetByName(TAB_NAMES.DAY_CLOSE_RECORDS), 1, [record]);
  return createJsonResponse({ success: true, message: 'Day closed for date ' + record.date, serverTime: new Date().toISOString() });
}

function reopenDayHandler(ss, payload) {
  var date = payload.date;
  var sheet = ss.getSheetByName(TAB_NAMES.DAY_CLOSE_RECORDS);
  var data = sheet.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === date || String(data[r][1]) === date) {
      sheet.deleteRow(r + 1);
      return createJsonResponse({ success: true, message: 'Day close reopened for date ' + date, serverTime: new Date().toISOString() });
    }
  }
  return createJsonResponse({ success: true, message: 'Day was not closed.', serverTime: new Date().toISOString() });
}

function importChunkHandler(ss, payload) {
  var chunkIndex = payload.chunkIndex || 0;
  var data = payload.data || {};
  var recordsProcessed = 0;

  if (data.students && data.students.length > 0) {
    upsertRows(ss.getSheetByName(TAB_NAMES.STUDENTS), 1, data.students);
    recordsProcessed += data.students.length;
  }
  if (data.structures && data.structures.length > 0) {
    upsertRows(ss.getSheetByName(TAB_NAMES.FEE_STRUCTURES), 1, data.structures);
    recordsProcessed += data.structures.length;
  }
  if (data.installments && data.installments.length > 0) {
    upsertRows(ss.getSheetByName(TAB_NAMES.INSTALLMENTS), 1, data.installments);
    recordsProcessed += data.installments.length;
  }
  if (data.transactions && data.transactions.length > 0) {
    upsertRows(ss.getSheetByName(TAB_NAMES.TRANSACTIONS), 1, data.transactions);
    recordsProcessed += data.transactions.length;

    // Flatten Allocations
    var flatAllocations = [];
    for (var t = 0; t < data.transactions.length; t++) {
      var txn = data.transactions[t];
      var allocs = txn.allocations || [];
      for (var a = 0; a < allocs.length; a++) {
        var alc = allocs[a];
        flatAllocations.push({
          id: 'alc_' + txn.id + '_' + alc.installmentId,
          transactionId: txn.id,
          installmentId: alc.installmentId,
          studentId: txn.studentId,
          headName: alc.headName || '',
          allocatedAmount: alc.allocatedAmount,
          createdAt: txn.date || new Date().toISOString()
        });
      }
    }
    if (flatAllocations.length > 0) {
      upsertRows(ss.getSheetByName(TAB_NAMES.PAYMENT_ALLOCATIONS), 1, flatAllocations);
    }
  }
  if (data.classConfigs && data.classConfigs.length > 0) {
    upsertRows(ss.getSheetByName(TAB_NAMES.CLASS_CONFIGS), 1, data.classConfigs);
    recordsProcessed += data.classConfigs.length;
  }
  if (data.feeHeads && data.feeHeads.length > 0) {
    upsertRows(ss.getSheetByName(TAB_NAMES.FEE_HEADS), 1, data.feeHeads);
    recordsProcessed += data.feeHeads.length;
  }
  if (data.dayCloseRecords) {
    var dcList = Array.isArray(data.dayCloseRecords) ? data.dayCloseRecords : Object.values(data.dayCloseRecords);
    if (dcList.length > 0) {
      upsertRows(ss.getSheetByName(TAB_NAMES.DAY_CLOSE_RECORDS), 1, dcList);
      recordsProcessed += dcList.length;
    }
  }
  if (data.schoolProfile || data.tolerance || data.dailyTarget) {
    upsertRows(ss.getSheetByName(TAB_NAMES.SETTINGS), 1, [{
      id: 'main_settings',
      schoolProfileJson: data.schoolProfile ? JSON.stringify(data.schoolProfile) : '',
      toleranceJson: data.tolerance ? JSON.stringify(data.tolerance) : '',
      dailyTarget: data.dailyTarget || 20000
    }]);
    if (data.schoolProfile && data.schoolProfile.nextReceiptSequence) {
      upsertRows(ss.getSheetByName(TAB_NAMES.RECEIPT_COUNTER), 1, [{
        id: 'main_counter',
        nextReceiptSequence: Number(data.schoolProfile.nextReceiptSequence),
        updatedAt: new Date().toISOString()
      }]);
    }
  }

  // Log to MigrationReport
  upsertRows(ss.getSheetByName(TAB_NAMES.MIGRATION_REPORT), 1, [{
    id: 'rep_chunk_' + chunkIndex + '_' + Date.now(),
    timestamp: new Date().toISOString(),
    chunkIndex: chunkIndex,
    recordsProcessed: recordsProcessed,
    summaryJson: JSON.stringify({ chunkIndex: chunkIndex, recordsProcessed: recordsProcessed }),
    verified: true
  }]);

  return createJsonResponse({
    success: true,
    data: { chunkIndex: chunkIndex, recordsProcessed: recordsProcessed },
    message: 'Chunk ' + chunkIndex + ' imported successfully (' + recordsProcessed + ' records).',
    serverTime: new Date().toISOString()
  });
}

function verifyMigrationHandler(ss) {
  var students = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.STUDENTS));
  var structures = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.FEE_STRUCTURES));
  var installments = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.INSTALLMENTS));
  var transactions = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.TRANSACTIONS));
  var allocations = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.PAYMENT_ALLOCATIONS));
  var counters = getSheetDataAsJson(ss.getSheetByName(TAB_NAMES.RECEIPT_COUNTER));

  var studentIds = {};
  var duplicateIds = [];
  for (var s = 0; s < students.length; s++) {
    if (studentIds[students[s].id]) duplicateIds.push(students[s].id);
    studentIds[students[s].id] = true;
  }

  var receiptNos = {};
  var duplicateReceiptNumbers = [];
  var highestSeq = 0;
  for (var t = 0; t < transactions.length; t++) {
    var rNo = transactions[t].receiptNo;
    if (rNo) {
      if (receiptNos[rNo]) duplicateReceiptNumbers.push(rNo);
      receiptNos[rNo] = true;

      var match = rNo.match(/(\\d+)/);
      if (match) {
        var seq = parseInt(match[1], 10);
        if (seq > highestSeq) highestSeq = seq;
      }
    }
  }

  var instIds = {};
  for (var i = 0; i < installments.length; i++) {
    instIds[installments[i].id] = true;
  }

  var orphanInstallments = [];
  for (var i2 = 0; i2 < installments.length; i2++) {
    if (!studentIds[installments[i2].studentId]) {
      orphanInstallments.push(installments[i2].id);
    }
  }

  var orphanTransactions = [];
  for (var t2 = 0; t2 < transactions.length; t2++) {
    if (!studentIds[transactions[t2].studentId]) {
      orphanTransactions.push(transactions[t2].id);
    }
  }

  var missingAllocationInstIds = [];
  for (var a = 0; a < allocations.length; a++) {
    if (!instIds[allocations[a].installmentId]) {
      missingAllocationInstIds.push(allocations[a].installmentId);
    }
  }

  var nextReceiptSeq = 1029;
  if (counters.length > 0 && counters[0].nextReceiptSequence) {
    nextReceiptSeq = Number(counters[0].nextReceiptSequence);
  }

  var errors = [];
  if (students.length < 229) errors.push('Student count (' + students.length + ') is below minimum required 229.');
  if (installments.length < 2345) errors.push('Installment count (' + installments.length + ') is below minimum required 2345.');
  if (transactions.length < 415) errors.push('Transaction count (' + transactions.length + ') is below minimum required 415.');
  if (duplicateIds.length > 0) errors.push('Found ' + duplicateIds.length + ' duplicate student IDs.');
  if (duplicateReceiptNumbers.length > 0) errors.push('Found ' + duplicateReceiptNumbers.length + ' duplicate receipt numbers.');

  var report = {
    studentCount: students.length,
    feeStructureCount: structures.length,
    installmentCount: installments.length,
    transactionCount: transactions.length,
    allocationCount: allocations.length,
    duplicateIds: duplicateIds,
    duplicateReceiptNumbers: duplicateReceiptNumbers,
    orphanInstallments: orphanInstallments,
    orphanTransactions: orphanTransactions,
    missingAllocationInstallmentIds: missingAllocationInstIds,
    highestReceiptNumber: 'KSB-' + new Date().getFullYear() + '-' + String(highestSeq).padStart(5, '0'),
    nextReceiptSequence: Math.max(nextReceiptSeq, highestSeq + 1),
    isValid: errors.length === 0,
    errors: errors
  };

  return createJsonResponse({
    success: true,
    data: report,
    message: report.isValid ? 'Migration verification passed successfully.' : 'Migration verification completed with warnings/errors.',
    serverTime: new Date().toISOString()
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
