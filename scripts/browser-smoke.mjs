const port = process.argv[2] || '9333';
const targetUrl = process.argv[3] || 'https://joshisgroupofschools.github.io/kts/';

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' }).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserErrors = [];
let sequence = 0;

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    browserErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'Runtime exception');
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    if (!message.params.entry.text.includes('404')) browserErrors.push(message.params.entry.text);
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Evaluation failed');
  return result.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await pause(2500);

const loginVisible = await evaluate(`document.body.innerText.includes('Enter Security Passcode')`);
await evaluate(`sessionStorage.setItem('sfc_passcode_auth_2025', 'true'); localStorage.setItem('sfc_current_view', 'LEDGER'); location.reload();`);
await pause(12000);

const ledger = await evaluate(`({
  title: document.title,
  rootLength: document.getElementById('root')?.innerHTML.length || 0,
  textLength: document.body.innerText.length,
  hasLedger: document.body.innerText.includes('FEE STATUS:') && document.body.innerText.includes('Action Required'),
  hasLoadingBlocker: document.body.innerText.includes('Loading latest data from Google Sheets...'),
  bodyPreview: document.body.innerText.slice(0, 500)
})`);

const paymentModal = await evaluate(`(() => {
  const firstStudentRow = document.querySelector('tr[id^="row-student-"]');
  firstStudentRow?.click();
  return !!firstStudentRow;
})()`);
await pause(1000);
const payment = await evaluate(`({
  rowOpened: ${paymentModal},
  modalVisible: !!document.getElementById('modal-collect-fees'),
  amount: document.getElementById('input-payment-amount')?.value || '',
  tillDateText: Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Till Date:'))?.textContent?.trim() || ''
})`);

await evaluate(`localStorage.setItem('sfc_current_view', 'ANALYTICS'); sessionStorage.setItem('sfc_passcode_auth_2027', 'true'); location.reload();`);
await pause(12000);
const analytics = await evaluate(`({
  rootLength: document.getElementById('root')?.innerHTML.length || 0,
  textLength: document.body.innerText.length,
  hasAnalytics: document.body.innerText.toLowerCase().includes('head-wise outstanding student analysis'),
  hasRequestedTable: document.body.innerText.toLowerCase().includes('total amount to receive'),
  bodyPreview: document.body.innerText.slice(0, 500)
})`);

await evaluate(`localStorage.setItem('sfc_current_view', 'FLAGGED_RECEIPTS'); location.reload();`);
await pause(12000);
const flaggedReceipts = await evaluate(`({
  rootLength: document.getElementById('root')?.innerHTML.length || 0,
  textLength: document.body.innerText.length,
  hasFlaggedReceipts: document.body.innerText.includes('Flagged Historical Receipts'),
  hasTwentyOneOccurrences: document.body.innerText.includes('21'),
  bodyPreview: document.body.innerText.slice(0, 500)
})`);

console.log(JSON.stringify({ loginVisible, ledger, payment, analytics, flaggedReceipts, browserErrors }, null, 2));
socket.close();

if (!loginVisible || !ledger.hasLedger || ledger.hasLoadingBlocker || !payment.modalVisible || !payment.amount || !analytics.hasAnalytics || !analytics.hasRequestedTable || !flaggedReceipts.hasFlaggedReceipts || browserErrors.length) {
  process.exitCode = 1;
}
