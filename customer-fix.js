(() => {
  const API_KEY = 'deanti_bakery_api_url';
  const CUSTOMER_NAME_KEY = 'deanti_bakery_customer_name';
  const CUSTOMER_PHONE_KEY = 'deanti_bakery_customer_phone';

  const apiUrl = () => localStorage.getItem(API_KEY) || '';
  const esc = v => String(v ?? '').replace(/[&<>\'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));

  function addCustomerFields() {
    const payment = document.querySelector('.cart-panel .payment,.payment');
    if (!payment || document.getElementById('customerName')) return;

    const box = document.createElement('div');
    box.className = 'customer-fields';
    box.innerHTML = `
      <div class="customer-title">👤 Data Pelanggan <span>Opsional</span></div>
      <label>Nama Pelanggan
        <input id="customerName" type="text" maxlength="80" placeholder="Nama pelanggan">
      </label>
      <label>No. HP
        <input id="customerPhone" type="tel" inputmode="tel" maxlength="20" placeholder="08xxxxxxxxxx">
      </label>
    `;

    const paymentMethod = payment.querySelector('label select#paymentMethod')?.closest('label');
    if (paymentMethod) payment.insertBefore(box, paymentMethod);
    else payment.insertBefore(box, payment.firstChild);

    const name = document.getElementById('customerName');
    const phone = document.getElementById('customerPhone');
    if (name) name.value = localStorage.getItem(CUSTOMER_NAME_KEY) || '';
    if (phone) phone.value = localStorage.getItem(CUSTOMER_PHONE_KEY) || '';
    name?.addEventListener('input', () => localStorage.setItem(CUSTOMER_NAME_KEY, name.value));
    phone?.addEventListener('input', () => localStorage.setItem(CUSTOMER_PHONE_KEY, phone.value));
  }

  function addStyles() {
    if (document.getElementById('customerFixStyles')) return;
    const style = document.createElement('style');
    style.id = 'customerFixStyles';
    style.textContent = `
      .customer-fields{margin:10px 0 12px;padding:12px;border:1px solid #eadfd6;border-radius:12px;background:#fbf8f5}
      .customer-title{font-weight:700;font-size:13px;margin-bottom:9px;color:#3b2a20;display:flex;justify-content:space-between;gap:8px}
      .customer-title span{font-size:10px;font-weight:600;color:#8c7566;background:#f0e7df;padding:3px 7px;border-radius:999px}
      .customer-fields label{display:block;font-size:11px;font-weight:600;color:#6d5b50;margin-top:8px}
      .customer-fields input{width:100%;box-sizing:border-box;margin-top:5px;padding:9px 10px;border:1px solid #ded4cc;border-radius:9px;background:#fff;font:inherit;color:inherit}
      .customer-fields input:focus{outline:none;border-color:#b36a2c;box-shadow:0 0 0 3px rgba(179,106,44,.1)}
    `;
    document.head.appendChild(style);
  }

  function patchFetch() {
    if (window.__deantiCustomerFetchPatched) return;
    window.__deantiCustomerFetchPatched = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function(input, init) {
      let body = null;
      try { if (typeof init?.body === 'string') body = JSON.parse(init.body); } catch (_) {}

      if (body?.action === 'checkout' && body.transaction) {
        const customerName = String(document.getElementById('customerName')?.value || '').trim();
        const customerPhone = String(document.getElementById('customerPhone')?.value || '').trim();
        body.transaction.customerName = customerName;
        body.transaction.customerPhone = customerPhone;
        init = {...init, body: JSON.stringify(body)};
      }

      const response = await nativeFetch(input, init);

      if (body?.action === 'checkout' && body.transaction) {
        try {
          const payload = await response.clone().json();
          if (payload?.ok) {
            const name = String(body.transaction.customerName || '').trim();
            const phone = String(body.transaction.customerPhone || '').trim();
            const receipt = JSON.parse(localStorage.getItem('deanti_bakery_last_receipt') || 'null');
            if (receipt) {
              receipt.customerName = name;
              receipt.customerPhone = phone;
              localStorage.setItem('deanti_bakery_last_receipt', JSON.stringify(receipt));
            }
            if (typeof toast === 'function' && (name || phone)) toast('Transaksi + data pelanggan tersimpan');
          }
        } catch (_) {}
      }
      return response;
    };
  }

  function init() {
    addStyles();
    addCustomerFields();
    patchFetch();
    setTimeout(addCustomerFields, 300);
    setTimeout(addCustomerFields, 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
