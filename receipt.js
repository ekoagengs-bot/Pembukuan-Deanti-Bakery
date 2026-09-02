(() => {
  const LAST_RECEIPT_KEY = 'deanti_bakery_last_receipt';
  const API_KEY = 'deanti_bakery_api_url';
  let lastKnownTransactionId = null;

  const money = n => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Number(n) || 0);

  const esc = value => String(value ?? '').replace(/[&<>\'\"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));

  const apiUrl = () => localStorage.getItem(API_KEY) || '';

  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2400);
  }

  function calculateReceipt(transaction, paid) {
    const items = Array.isArray(transaction?.items) ? transaction.items : [];
    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    const discount = Math.max(0, Number(transaction.discount || 0));
    const total = Math.max(0, subtotal - discount);
    const paidValue = Number(paid || 0);
    return {
      id: String(transaction.id || ''), no: String(transaction.no || ''),
      date: String(transaction.date || ''), time: String(transaction.time || ''),
      method: String(transaction.method || 'Cash'),
      items: items.map(item => ({name: String(item.name || ''), qty: Number(item.qty || 0), price: Number(item.price || 0)})),
      subtotal, discount, total,
      paid: Math.max(total, paidValue), change: Math.max(0, paidValue - total)
    };
  }

  function saveReceipt(receipt) { localStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(receipt)); }
  function loadReceipt() { try { return JSON.parse(localStorage.getItem(LAST_RECEIPT_KEY) || 'null'); } catch (_) { return null; } }

  async function getLatestTransaction() {
    const url = apiUrl();
    if (!url) return null;
    try {
      const response = await fetch(url + '?action=bootstrap&_=' + Date.now(), {cache:'no-store'});
      const payload = await response.json();
      if (!payload.ok || !payload.data) return null;
      const transactions = Array.isArray(payload.data.transactions) ? payload.data.transactions : [];
      return transactions.length ? transactions[transactions.length - 1] : null;
    } catch (_) { return null; }
  }

  async function initializeKnownTransaction() {
    const latest = await getLatestTransaction();
    lastKnownTransactionId = latest ? String(latest.id || '') : null;
  }

  function receiptHtml(receipt) {
    const rows = receipt.items.map(item => `<tr><td>${esc(item.name)}</td><td class="center">${item.qty}</td><td class="right">${money(item.price * item.qty)}</td></tr>`).join('');
    const cashSection = receipt.method.toLowerCase() === 'cash' ? `<div class="line"><span>Bayar</span><b>${money(receipt.paid)}</b></div><div class="line"><span>Kembalian</span><b>${money(receipt.change)}</b></div>` : '';
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(receipt.no || 'Struk')} - Deanti Bakery</title><style>
@page{size:80mm auto;margin:3mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;font-size:12px}.receipt{width:72mm;margin:0 auto}h1{margin:0;text-align:center;font-size:21px}.subtitle{text-align:center;font-size:10px;margin:3px 0 10px}.meta{border-top:1px dashed #888;border-bottom:1px dashed #888;padding:7px 0;margin-bottom:7px}.meta div,.line{display:flex;justify-content:space-between;gap:8px;margin:4px 0}.meta span:first-child{color:#555}table{width:100%;border-collapse:collapse}th,td{padding:5px 0;border-bottom:1px dashed #bbb;vertical-align:top}th{font-size:9px;text-transform:uppercase}.center{text-align:center}.right{text-align:right;white-space:nowrap}.total{border-top:1px solid #111;margin-top:8px;padding-top:7px;font-size:15px;font-weight:700}.footer{text-align:center;margin-top:14px;font-size:10px}.print-btn{width:100%;border:0;padding:10px;margin-top:14px;border-radius:7px;background:#b36a2c;color:#fff;font-weight:700}@media print{.print-btn{display:none}}
</style></head><body><div class="receipt"><h1>Deanti Bakery</h1><div class="subtitle">Kasir & Pembukuan</div><div class="meta"><div><span>No. Transaksi</span><b>${esc(receipt.no)}</b></div><div><span>Tanggal</span><span>${esc(receipt.date)} ${esc(receipt.time)}</span></div><div><span>Pembayaran</span><span>${esc(receipt.method)}</span></div></div><table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Jumlah</th></tr></thead><tbody>${rows}</tbody></table><div class="line"><span>Subtotal</span><b>${money(receipt.subtotal)}</b></div><div class="line"><span>Diskon</span><b>${money(receipt.discount)}</b></div><div class="line total"><span>Total</span><b>${money(receipt.total)}</b></div>${cashSection}<div class="footer">Terima kasih telah berbelanja di Deanti Bakery.</div><button class="print-btn" onclick="window.print()">🖨 Cetak Struk</button></div></body></html>`;
  }

  function printReceipt(receipt, existingWindow = null) {
    if (!receipt) { toast('Belum ada transaksi yang bisa dicetak'); return; }
    const popup = existingWindow && !existingWindow.closed ? existingWindow : window.open('', '_blank', 'width=420,height=720');
    if (!popup) { alert('Jendela cetak diblokir browser. Izinkan pop-up untuk aplikasi Deanti Bakery.'); return; }
    popup.document.open(); popup.document.write(receiptHtml(receipt)); popup.document.close(); popup.focus();
    setTimeout(() => popup.print(), 350);
  }

  window.printLastReceipt = () => printReceipt(loadReceipt());

  function ensureButton() {
    const payment = document.querySelector('.cart-panel .payment, .payment');
    if (!payment) return;
    let button = document.getElementById('printReceiptBtn');
    if (!button) { button = document.createElement('button'); button.id='printReceiptBtn'; button.type='button'; button.className='ghost full'; button.style.marginTop='8px'; payment.appendChild(button); }
    button.textContent = '🖨️ Cetak Struk Terakhir';
    button.onclick = () => window.printLastReceipt();
  }

  async function watchForCompletedCheckout(popup, paid) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const latest = await getLatestTransaction();
      if (latest && String(latest.id || '') !== String(lastKnownTransactionId || '')) {
        const receipt = calculateReceipt(latest, paid);
        saveReceipt(receipt);
        lastKnownTransactionId = String(latest.id || '');
        ensureButton(); showReceiptNotice(receipt); printReceipt(receipt, popup); return;
      }
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    if (popup && !popup.closed) popup.close();
    toast('Transaksi belum terdeteksi. Coba Cetak Struk Terakhir.');
  }

  function watchCheckout() {
    const checkoutButton = document.getElementById('checkoutBtn');
    if (!checkoutButton || checkoutButton.dataset.receiptWatch === '1') return;
    checkoutButton.dataset.receiptWatch = '1';
    checkoutButton.addEventListener('click', () => {
      const paid = Number(document.getElementById('paidAmount')?.value || 0);
      const popup = window.open('', '_blank', 'width=420,height=720');
      if (popup) {
        popup.document.write('<html><body style="font-family:Arial;text-align:center;padding:30px">Menyiapkan struk...<br><small>Mohon tunggu.</small></body></html>');
        popup.document.close();
      } else { toast('Popup cetak diblokir. Izinkan pop-up browser.'); }
      watchForCompletedCheckout(popup, paid);
    }, false);
  }

  function showReceiptNotice(receipt) {
    const old = document.getElementById('receiptNotice'); if (old) old.remove();
    const payment = document.querySelector('.cart-panel .payment, .payment'); if (!payment) return;
    const box = document.createElement('div'); box.id='receiptNotice';
    box.style.cssText='margin-top:8px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;';
    box.innerHTML = `<span>✅ ${esc(receipt.no)} siap dicetak.</span>`;
    const btn = document.createElement('button'); btn.type='button'; btn.textContent='Cetak Lagi'; btn.style.cssText='border:0;background:#b36a2c;color:#fff;padding:7px 11px;border-radius:8px;font-weight:700;cursor:pointer;'; btn.onclick=()=>printReceipt(receipt); box.appendChild(btn); payment.appendChild(box);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    ensureButton(); watchCheckout(); await initializeKnownTransaction(); ensureButton(); watchCheckout();
  });
})();
