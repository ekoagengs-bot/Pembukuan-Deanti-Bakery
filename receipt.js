(() => {
  const LAST_RECEIPT_KEY = 'deanti_bakery_last_receipt';
  const originalCheckout = window.checkout;

  if (typeof originalCheckout !== 'function') return;

  const rupiahReceipt = n => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(n) || 0);

  const escReceipt = s => String(s ?? '').replace(/[&<>'\"]/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[m]));

  function receiptData(transaction, paid) {
    const subtotal = (transaction.items || []).reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0
    );
    const discount = Number(transaction.discount || 0);
    const total = Math.max(0, subtotal - discount);
    return {
      ...transaction,
      subtotal,
      discount,
      total,
      paid: Number(paid || total),
      change: Math.max(0, Number(paid || total) - total)
    };
  }

  function rememberReceipt(receipt) {
    localStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(receipt));
  }

  function getLastReceipt() {
    try {
      return JSON.parse(localStorage.getItem(LAST_RECEIPT_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function printReceipt(receipt) {
    if (!receipt) {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Belum ada struk untuk dicetak';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2200);
      }
      return;
    }

    const win = window.open('', '_blank', 'width=420,height=700');
    if (!win) {
      alert('Popup cetak diblokir browser. Izinkan popup untuk aplikasi Deanti Bakery.');
      return;
    }

    const rows = (receipt.items || []).map(item => `
      <tr>
        <td>${escReceipt(item.name)}</td>
        <td class="center">${Number(item.qty || 0)}</td>
        <td class="right">${rupiahReceipt(Number(item.price || 0) * Number(item.qty || 0))}</td>
      </tr>
    `).join('');

    const paidText = receipt.method === 'Cash'
      ? `<div class="line"><span>Bayar</span><b>${rupiahReceipt(receipt.paid)}</b></div>
         <div class="line"><span>Kembalian</span><b>${rupiahReceipt(receipt.change)}</b></div>`
      : '';

    win.document.write(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${escReceipt(receipt.no || 'Struk')} - Deanti Bakery</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, sans-serif; color: #111; font-size: 12px; }
  .receipt { width: 72mm; margin: 0 auto; }
  h1 { margin: 0; text-align: center; font-size: 20px; }
  .sub { text-align: center; margin: 3px 0 10px; font-size: 11px; }
  .meta { margin: 6px 0 10px; }
  .meta div { display: flex; justify-content: space-between; gap: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 5px 0; border-bottom: 1px dashed #bbb; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; }
  .center { text-align: center; }
  .right { text-align: right; white-space: nowrap; }
  .line { display: flex; justify-content: space-between; margin: 6px 0; }
  .total { border-top: 1px solid #111; margin-top: 7px; padding-top: 7px; font-size: 15px; }
  .footer { text-align: center; margin-top: 14px; font-size: 11px; }
  .print { margin-top: 15px; width: 100%; padding: 10px; border: 0; background: #222; color: #fff; border-radius: 6px; }
  @media print { .print { display: none; } }
</style>
</head>
<body>
  <div class="receipt">
    <h1>Deanti Bakery</h1>
    <div class="sub">Kasir & Pembukuan</div>
    <div class="meta">
      <div><span>No. Transaksi</span><b>${escReceipt(receipt.no)}</b></div>
      <div><span>Tanggal</span><span>${escReceipt(receipt.date)} ${escReceipt(receipt.time)}</span></div>
      <div><span>Pembayaran</span><span>${escReceipt(receipt.method)}</span></div>
    </div>
    <table>
      <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Jumlah</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="line"><span>Subtotal</span><b>${rupiahReceipt(receipt.subtotal)}</b></div>
    <div class="line"><span>Diskon</span><b>${rupiahReceipt(receipt.discount)}</b></div>
    <div class="line total"><span>Total</span><b>${rupiahReceipt(receipt.total)}</b></div>
    ${paidText}
    <div class="footer">Terima kasih telah berbelanja di Deanti Bakery.</div>
    <button class="print" onclick="window.print()">🖨 Cetak</button>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  }

  window.printLastReceipt = () => printReceipt(getLastReceipt());

  function injectReceiptButton() {
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (!checkoutBtn || document.getElementById('printReceiptBtn')) return;
    const button = document.createElement('button');
    button.id = 'printReceiptBtn';
    button.type = 'button';
    button.className = 'ghost full';
    button.textContent = '🖨️ Cetak Struk Terakhir';
    button.style.marginTop = '8px';
    button.addEventListener('click', () => printReceipt(getLastReceipt()));
    checkoutBtn.insertAdjacentElement('afterend', button);
  }

  window.checkout = async function() {
    const beforeCount = Array.isArray(window.db) ? window.db.length : null;
    const paid = Number(document.getElementById('paidAmount')?.value || 0);

    let beforeTxCount = 0;
    try { beforeTxCount = Array.isArray(db.transactions) ? db.transactions.length : 0; } catch (_) {}

    await originalCheckout();

    setTimeout(() => {
      injectReceiptButton();
      let latest = null;
      try {
        const afterCount = Array.isArray(db.transactions) ? db.transactions.length : 0;
        if (afterCount > beforeTxCount && db.transactions.length) {
          latest = db.transactions[db.transactions.length - 1];
        }
      } catch (_) {}

      if (latest) {
        const receipt = receiptData(latest, paid);
        rememberReceipt(receipt);
        const btn = document.getElementById('printReceiptBtn');
        if (btn) btn.textContent = `🖨️ Cetak ${receipt.no}`;
        showReceiptNotice(receipt);
      }
    }, 350);
  };

  function showReceiptNotice(receipt) {
    const existing = document.getElementById('receiptNotice');
    if (existing) existing.remove();
    const container = document.querySelector('.cart-panel .payment') || document.querySelector('.payment');
    if (!container) return;
    const box = document.createElement('div');
    box.id = 'receiptNotice';
    box.style.cssText = 'margin-top:8px;padding:10px;border:1px solid #e7e9ee;border-radius:10px;background:#fafafa;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;';
    box.innerHTML = `<span>Transaksi ${escReceipt(receipt.no)} siap dicetak.</span><button type="button" style="border:0;background:#b06a2d;color:#fff;padding:7px 10px;border-radius:8px;font-weight:700;cursor:pointer;">Cetak</button>`;
    box.querySelector('button').addEventListener('click', () => printReceipt(receipt));
    container.appendChild(box);
  }

  document.addEventListener('DOMContentLoaded', injectReceiptButton);
  setTimeout(injectReceiptButton, 500);
})();
