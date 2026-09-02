(() => {
  const LAST_RECEIPT_KEY = 'deanti_bakery_last_receipt';
  const API_KEY = 'deanti_bakery_api_url';
  const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const esc = v => String(v ?? '').replace(/[&<>\'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));
  const apiUrl = () => localStorage.getItem(API_KEY) || '';

  function calc(t, paid){
    const items = Array.isArray(t?.items) ? t.items : [];
    const subtotal = items.reduce((s,i)=>s + Number(i.price||0)*Number(i.qty||0),0);
    const discount = Math.max(0,Number(t.discount||0));
    const total = Math.max(0,subtotal-discount);
    const pay = Number(paid||0);
    return {
      id:String(t.id||''), no:String(t.no||''), date:String(t.date||''), time:String(t.time||''),
      method:String(t.method||'Cash'),
      items:items.map(i=>({name:String(i.name||''),qty:Number(i.qty||0),price:Number(i.price||0)})),
      subtotal, discount, total, paid:Math.max(pay,total), change:Math.max(0,pay-total)
    };
  }

  function save(r){ try{localStorage.setItem(LAST_RECEIPT_KEY,JSON.stringify(r));}catch(_){} }
  function load(){ try{return JSON.parse(localStorage.getItem(LAST_RECEIPT_KEY)||'null')}catch(_){return null} }

  function ensureStyles(){
    if(document.getElementById('receiptPrintStylesV2')) return;
    const style=document.createElement('style');
    style.id='receiptPrintStylesV2';
    style.textContent=`
      .receipt-overlay{position:fixed;inset:0;background:rgba(20,14,10,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99999}
      .receipt-dialog{width:min(430px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.28)}
      .receipt-dialog-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;font-weight:700}
      .receipt-preview{padding:18px;background:#f4f4f4}
      .receipt-paper{width:80mm;max-width:100%;margin:0 auto;background:#fff;padding:6mm 4mm;color:#111;font:12px Arial,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.08)}
      .receipt-paper h2{margin:0;text-align:center;font-size:20px}.receipt-paper .center{text-align:center}.receipt-paper .line{display:flex;justify-content:space-between;gap:10px;margin:5px 0}.receipt-paper .meta{border-top:1px dashed #888;border-bottom:1px dashed #888;padding:7px 0;margin:8px 0}.receipt-paper table{width:100%;border-collapse:collapse}.receipt-paper th,.receipt-paper td{padding:5px 0;border-bottom:1px dashed #bbb}.receipt-paper th{text-align:left;font-size:9px}.receipt-paper .right{text-align:right;white-space:nowrap}.receipt-paper .qty{text-align:center}.receipt-paper .total{border-top:1px solid #111;margin-top:8px;padding-top:8px;font-size:15px;font-weight:700}.receipt-paper .foot{text-align:center;margin-top:14px;font-size:10px}
      .receipt-actions{display:flex;gap:8px;padding:14px 16px;border-top:1px solid #eee}.receipt-actions button{flex:1;padding:11px 14px;border-radius:10px;border:1px solid #ddd;font-weight:700;cursor:pointer}.receipt-actions .print-main{border:0;background:#b36a2c;color:#fff}
      @media print{
        @page{size:80mm auto;margin:0}
        html,body{margin:0!important;padding:0!important;background:#fff!important}
        body > *:not(#receiptOverlay){visibility:hidden!important}
        #receiptOverlay,#receiptOverlay *{visibility:visible!important}
        #receiptOverlay{position:static!important;display:block!important;background:#fff!important;padding:0!important}
        .receipt-dialog{width:auto!important;max-height:none!important;box-shadow:none!important;border:0!important}
        .receipt-dialog-head,.receipt-actions{display:none!important}
        .receipt-preview{padding:0!important;background:#fff!important}
        .receipt-paper{width:80mm!important;max-width:none!important;box-shadow:none!important;padding:3mm!important;margin:0!important}
      }
    `;
    document.head.appendChild(style);
  }

  function receiptHtml(r){
    const rows = r.items.map(i=>`<tr><td>${esc(i.name)}</td><td class="qty">${i.qty}</td><td class="right">${money(i.price*i.qty)}</td></tr>`).join('');
    const cash = r.method.toLowerCase()==='cash'
      ? `<div class="line"><span>Bayar</span><b>${money(r.paid)}</b></div><div class="line"><span>Kembalian</span><b>${money(r.change)}</b></div>`
      : '';
    return `<div class="receipt-paper"><h2>Deanti Bakery</h2><div class="center">Kasir & Pembukuan</div><div class="meta"><div class="line"><span>No. Transaksi</span><b>${esc(r.no)}</b></div><div class="line"><span>Tanggal</span><span>${esc(r.date)} ${esc(r.time)}</span></div><div class="line"><span>Pembayaran</span><span>${esc(r.method)}</span></div></div><table><thead><tr><th>Item</th><th class="qty">Qty</th><th class="right">Jumlah</th></tr></thead><tbody>${rows}</tbody></table><div class="line"><span>Subtotal</span><b>${money(r.subtotal)}</b></div><div class="line"><span>Diskon</span><b>${money(r.discount)}</b></div><div class="line total"><span>Total</span><b>${money(r.total)}</b></div>${cash}<div class="foot">Terima kasih telah berbelanja di Deanti Bakery.</div></div>`;
  }

  function closePreview(){document.getElementById('receiptOverlay')?.remove()}

  function showPreview(r){
    ensureStyles(); closePreview();
    const overlay=document.createElement('div');
    overlay.id='receiptOverlay';
    overlay.className='receipt-overlay';
    overlay.innerHTML=`<div class="receipt-dialog"><div class="receipt-dialog-head"><span>Struk Transaksi</span><button id="receiptClose" type="button" style="border:0;background:transparent;font-size:20px;cursor:pointer">✕</button></div><div class="receipt-preview">${receiptHtml(r)}</div><div class="receipt-actions"><button id="receiptClose2" type="button">Tutup</button><button class="print-main" id="receiptPrint" type="button">🖨️ Cetak Struk</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('receiptClose').onclick=closePreview;
    document.getElementById('receiptClose2').onclick=closePreview;
    document.getElementById('receiptPrint').onclick=()=>window.print();
  }

  function captureCheckout(){
    if(window.__deantiReceiptFetchPatched) return;
    window.__deantiReceiptFetchPatched=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      let body=null;
      try{if(typeof init?.body==='string') body=JSON.parse(init.body)}catch(_){ }
      const response=await nativeFetch(input,init);
      if(body?.action==='checkout'){
        try{
          const payload=await response.clone().json();
          if(payload?.ok && payload?.data){
            const txs=Array.isArray(payload.data.transactions)?payload.data.transactions:[];
            const transaction=txs.find(t=>String(t.id)===String(body.transaction?.id)) || body.transaction;
            const paid=Number(document.getElementById('paidAmount')?.value||0);
            save(calc(transaction,paid));
          }
        }catch(_){ }
      }
      return response;
    };
  }

  function bindPrintButton(){
    const payment=document.querySelector('.cart-panel .payment,.payment');
    if(!payment) return;
    let b=document.getElementById('printReceiptBtn');
    if(!b){
      b=document.createElement('button');
      b.id='printReceiptBtn';
      b.type='button';
      b.className='ghost full';
      b.style.marginTop='8px';
      payment.appendChild(b);
    }
    b.textContent='🖨️ Cetak Struk Terakhir';
    b.onclick=()=>{const r=load(); if(r) showPreview(r); else toast('Belum ada transaksi yang bisa dicetak')};
  }

  function toast(m){const e=document.getElementById('toast');if(!e)return;e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}

  document.addEventListener('DOMContentLoaded',()=>{
    ensureStyles();
    captureCheckout();
    bindPrintButton();
    setTimeout(bindPrintButton,500);
  });
})();
