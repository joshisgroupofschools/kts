import assert from 'node:assert/strict';
import { getKolkataToday } from '../src/utils/dateUtils';
import { formatWhatsAppReminderMessage, normalizePhoneNumber } from '../src/utils/installmentFormatter';

assert.equal(getKolkataToday(new Date('2026-09-25T20:00:00Z')), '2026-09-26');
assert.equal(normalizePhoneNumber('98765 43210'), '919876543210');
assert.equal(normalizePhoneNumber('12345'), '');

const result = formatWhatsAppReminderMessage(
  { name: 'CH. DATHA MANIKANTA', className: 'Class 6' },
  {
    installments: [
      { headName: 'School Tuition Fee', installmentNumber: 1, totalInstallments: 7, dueDate: '2026-07-10', balanceAmount: 3974, status: 'partial' },
      { headName: 'Transport / Bus Fee', installmentNumber: 2, totalInstallments: 10, dueDate: '2026-07-10', balanceAmount: 1900, status: 'unpaid' },
      { headName: 'Old Arrears', installmentNumber: 1, totalInstallments: 7, dueDate: '2026-09-10', balanceAmount: 2716, status: 'unpaid' },
      { headName: 'School Tuition Fee', installmentNumber: 4, totalInstallments: 7, dueDate: '2026-10-10', balanceAmount: 9999, status: 'unpaid' },
    ],
  },
  { schoolName: 'Kakatiya School Boduppal' },
  '2026-09-25',
);

assert.equal(result.totalSum, 8590);
assert(!result.message.includes('₹9,999'));
assert(result.message.includes('Kakatiya School, Boduppal'));
assert(result.message.includes('total due till 25/09/2026 is ₹8,590'));
assert(result.message.includes('School Fees – July Instalment 1/7'));
assert(result.message.includes('Transport – July Instalment 2/10'));
assert(result.message.includes('Old Fees – September Instalment 1/7'));

console.log('Core date and WhatsApp verification passed.');
