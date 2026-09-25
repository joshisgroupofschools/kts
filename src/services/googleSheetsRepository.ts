import {
  Student,
  StudentFeeStructure,
  Installment,
  PaymentTransaction,
  ClassFeeConfig,
  FeeHeadDefinition,
  ToleranceConfig,
  SchoolProfile,
  DayCloseRecord,
  GoogleSheetsResponse,
  MigrationVerificationReport
} from '../types';

export async function callAppsScriptAction<T = any>(
  scriptUrl: string,
  action: string,
  payload: any = {}
): Promise<GoogleSheetsResponse<T>> {
  if (!scriptUrl) {
    return {
      success: false,
      error: 'Google Sheets Apps Script URL is not configured.'
    };
  }

  const fullPayload = {
    action,
    ...payload,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(fullPayload),
      redirect: 'follow'
    });

    const text = await response.text();
    let json: GoogleSheetsResponse<T>;
    try {
      json = JSON.parse(text);
    } catch {
      if (response.ok) {
        return {
          success: true,
          message: 'Action executed successfully.',
          serverTime: new Date().toISOString()
        };
      }
      return {
        success: false,
        error: `Server returned non-JSON response (${response.status}): ${text.substring(0, 150)}`
      };
    }

    return json;
  } catch (err: any) {
    console.error(`Google Sheets API call failed [${action}]:`, err);
    return {
      success: false,
      error: err.message || 'Network error connecting to Google Sheets API.'
    };
  }
}

export async function getBootstrapDataRepo(scriptUrl: string): Promise<GoogleSheetsResponse> {
  // Use GET or POST with getBootstrapData
  try {
    const fetchUrl = scriptUrl.includes('?')
      ? `${scriptUrl}&action=getBootstrapData`
      : `${scriptUrl}?action=getBootstrapData`;
    const res = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return callAppsScriptAction(scriptUrl, 'getBootstrapData');
  }
}

export async function recordPaymentRepo(
  scriptUrl: string,
  transaction: PaymentTransaction,
  idempotencyKey?: string
): Promise<GoogleSheetsResponse<{ transaction: PaymentTransaction; nextReceiptSequence: number }>> {
  return callAppsScriptAction(scriptUrl, 'recordPayment', {
    transaction,
    idempotencyKey: idempotencyKey || transaction.id
  });
}

export async function cancelPaymentRepo(
  scriptUrl: string,
  transactionId: string,
  reason?: string
): Promise<GoogleSheetsResponse<{ transaction: PaymentTransaction }>> {
  return callAppsScriptAction(scriptUrl, 'cancelPayment', {
    transactionId,
    reason
  });
}

export async function addStudentRepo(
  scriptUrl: string,
  student: Student,
  structures: StudentFeeStructure[] = [],
  installments: Installment[] = []
): Promise<GoogleSheetsResponse<{ student: Student }>> {
  return callAppsScriptAction(scriptUrl, 'addStudent', {
    student,
    structures,
    installments
  });
}

export async function updateStudentRepo(
  scriptUrl: string,
  student: Student
): Promise<GoogleSheetsResponse<{ student: Student }>> {
  return callAppsScriptAction(scriptUrl, 'updateStudent', { student });
}

export async function setStudentActiveRepo(
  scriptUrl: string,
  studentId: string,
  isActive: boolean
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'setStudentActive', { studentId, isActive });
}

export async function savePermissionRepo(
  scriptUrl: string,
  studentId: string,
  permissionExpiresAt: string,
  permissionReason?: string
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'savePermission', {
    studentId,
    permissionExpiresAt,
    permissionReason
  });
}

export async function bulkAddStudentsRepo(
  scriptUrl: string,
  students: Student[],
  structures: StudentFeeStructure[],
  installments: Installment[]
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'bulkAddStudents', {
    students,
    structures,
    installments
  });
}

export async function saveFeeStructureRepo(
  scriptUrl: string,
  structures: StudentFeeStructure[],
  installments: Installment[]
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'saveFeeStructure', { structures, installments });
}

export async function updateTransactionSlipRepo(
  scriptUrl: string,
  transactionId: string,
  slipGiven: boolean
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'updateTransactionSlip', { transactionId, slipGiven });
}

export async function saveClassConfigRepo(
  scriptUrl: string,
  classConfigs: ClassFeeConfig[]
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'saveClassConfig', { classConfigs });
}

export async function saveFeeHeadRepo(
  scriptUrl: string,
  feeHeads: FeeHeadDefinition[]
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'saveFeeHead', { feeHeads });
}

export async function saveSettingsRepo(
  scriptUrl: string,
  schoolProfile: SchoolProfile,
  tolerance: ToleranceConfig,
  dailyTarget: number
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'saveSettings', {
    schoolProfile,
    tolerance,
    dailyTarget
  });
}

export async function closeDayRepo(
  scriptUrl: string,
  record: DayCloseRecord
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'closeDay', { record });
}

export async function reopenDayRepo(
  scriptUrl: string,
  date: string
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'reopenDay', { date });
}

export async function importChunkRepo(
  scriptUrl: string,
  chunkIndex: number,
  data: any
): Promise<GoogleSheetsResponse> {
  return callAppsScriptAction(scriptUrl, 'importChunk', { chunkIndex, data });
}

export async function verifyMigrationRepo(
  scriptUrl: string
): Promise<GoogleSheetsResponse<MigrationVerificationReport>> {
  return callAppsScriptAction(scriptUrl, 'verifyMigration');
}
