import {
  ClassFeeConfig,
  FeeHeadDefinition,
  Installment,
  PaymentAllocation,
  PaymentTransaction,
  Student,
  StudentFeeStructure,
} from '../types';
import { getKolkataToday } from './dateUtils';

const asString = (value: unknown): string => String(value ?? '').trim();
const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const asBoolean = (value: unknown): boolean => value === true || value === 1 || String(value).toLowerCase() === 'true';

export const normalizeDateOnlyValue = (value: unknown): string => {
  const raw = asString(value);
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : getKolkataToday(parsed);
};

export const normalizeDateTimeValue = (value: unknown): string => {
  const raw = asString(value);
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) return raw.slice(0, 16);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
};

export const normalizeStudents = (rows: any[]): Student[] => (Array.isArray(rows) ? rows : []).map((row) => ({
  ...row,
  id: asString(row.id), rollNo: asString(row.rollNo), name: asString(row.name),
  classId: asString(row.classId), className: asString(row.className), section: asString(row.section),
  parentName: asString(row.parentName), phone: asString(row.phone), altPhone: asString(row.altPhone),
  address: asString(row.address), admissionDate: normalizeDateOnlyValue(row.admissionDate),
  isActive: row.isActive !== false && String(row.isActive).toLowerCase() !== 'false',
  notes: asString(row.notes), permissionExpiresAt: normalizeDateOnlyValue(row.permissionExpiresAt),
  permissionReason: asString(row.permissionReason), manualCategoryOverride: asString(row.manualCategoryOverride) || undefined,
  createdAt: asString(row.createdAt), updatedAt: asString(row.updatedAt),
}));

export const normalizeStructures = (rows: any[]): StudentFeeStructure[] => (Array.isArray(rows) ? rows : []).map((row) => ({
  ...row,
  id: asString(row.id), studentId: asString(row.studentId), headName: asString(row.headName) || 'Miscellaneous Fee',
  actualFee: asNumber(row.actualFee), committedFee: asNumber(row.committedFee), concession: asNumber(row.concession),
  concessionReason: asString(row.concessionReason), commitmentReceiptNo: asString(row.commitmentReceiptNo),
  commitmentDate: normalizeDateOnlyValue(row.commitmentDate), installmentsCount: asNumber(row.installmentsCount),
  isSpotFee: asBoolean(row.isSpotFee), remarks: asString(row.remarks),
}));

export const normalizeInstallments = (rows: any[]): Installment[] => (Array.isArray(rows) ? rows : []).map((row) => ({
  ...row,
  id: asString(row.id), feeStructureId: asString(row.feeStructureId), studentId: asString(row.studentId),
  headName: asString(row.headName) || 'Miscellaneous Fee', installmentNumber: asNumber(row.installmentNumber),
  totalInstallments: asNumber(row.totalInstallments), amount: asNumber(row.amount),
  dueDate: normalizeDateOnlyValue(row.dueDate), paidAmount: asNumber(row.paidAmount),
  balanceAmount: asNumber(row.balanceAmount), status: asString(row.status).toLowerCase() as Installment['status'],
}));

const normalizeAllocation = (row: any): PaymentAllocation => ({
  installmentId: asString(row.installmentId), headName: asString(row.headName) || 'Miscellaneous Fee',
  installmentNumber: asNumber(row.installmentNumber), dueDate: normalizeDateOnlyValue(row.dueDate),
  allocatedAmount: asNumber(row.allocatedAmount),
});

export const normalizeTransactions = (rows: any[]): PaymentTransaction[] => (Array.isArray(rows) ? rows : []).map((row) => ({
  ...row,
  id: asString(row.id), receiptNo: asString(row.receiptNo), studentId: asString(row.studentId),
  studentName: asString(row.studentName), studentRollNo: asString(row.studentRollNo), studentClass: asString(row.studentClass),
  date: normalizeDateTimeValue(row.date), amount: asNumber(row.amount), paymentMode: asString(row.paymentMode) as PaymentTransaction['paymentMode'],
  referenceNo: asString(row.referenceNo), remarks: asString(row.remarks),
  allocations: (Array.isArray(row.allocations) ? row.allocations : []).map(normalizeAllocation),
  isCancelled: asBoolean(row.isCancelled), cancellationReason: asString(row.cancellationReason),
  cancelledAt: normalizeDateTimeValue(row.cancelledAt), collectedBy: asString(row.collectedBy),
  permissionDate: normalizeDateOnlyValue(row.permissionDate), slipGiven: asBoolean(row.slipGiven),
  permissionUpdated: asBoolean(row.permissionUpdated),
}));

export const normalizeClassConfigs = (rows: any[]): ClassFeeConfig[] => (Array.isArray(rows) ? rows : []).map((row) => ({
  ...row,
  id: asString(row.id), className: asString(row.className), actualFee: asNumber(row.actualFee),
  defaultInstallments: asNumber(row.defaultInstallments), defaultDueDayOfMonth: asNumber(row.defaultDueDayOfMonth),
  startMonth: asNumber(row.startMonth),
}));

export const normalizeFeeHeads = (rows: any[]): FeeHeadDefinition[] => (Array.isArray(rows) ? rows : []).map((row) => ({
  ...row,
  id: asString(row.id), headName: asString(row.headName) || 'Miscellaneous Fee',
  isMandatory: asBoolean(row.isMandatory), isSpotFee: asBoolean(row.isSpotFee), description: asString(row.description),
}));
