(() => {
  const LOCAL_KEY = 'deanti_bakery_v2';
  const PHONE = '087780943397';

  const money = n => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(n)||0);
  const esc = v => String(v ?? '').replace(/[&<>\'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));

  function loadDb(){
    try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'{"products":[],"transactions":[],"cashflows":[]}');}
    catch(_){return {products:[],transactions:[],cashflows:[]};}
  }

  function receiptData(t){
    const items = Array.isArray(t?.items) ? t.items : [];
    const subtotal = items.reduce((s,i)=>s + Number(i.price||0)*Number(i.qty||0),0);
    const discount = Math.max(0,Number(t.discount||0));
    return {
      no:String(t.no||t.id||''), date:String(t.date||''), time:String(t.time||''),
      method:String(t.method||'Cash'), customerName:String(t.customerName||''), customerPhone:String(t.customerPhone||''),
      items:items.map(i=>({name:String(i.name||''),qty:Number(i.qty||0),price:Number(i.price||0)})),
      subtotal, discount, total:Math.max(0,subtotal-discount)
    };
  }

  function receiptHtml(r){
    const rows=r.items.map(i=>`<tr><td class="item">${esc(i.name)}</td><td class="qty">${i.qty}</td><td class="amt">${money(i.price*i.qty)}</td></tr>`).join('');
    return `<div id="reprintCanvas" class="reprint-paper">
      <h2>Deanti Bakery</h2>
      <div class="sub">Kasir & Pembukuan</div>
      <div class="sub phone">${PHONE}</div>
      <div class="line-dashed"></div>
      <div class="meta"><div>No. Transaksi: <b>${esc(r.no)}</b></div><div>${esc(r.date)} ${esc(r.time)}</div><div>Pembayaran: ${esc(r.method)}</div>${r.customerName?`<div>Pelanggan: <b>${esc(r.customerName)}</b></div>`:''}${r.customerPhone?`<div>No. HP: ${esc(r.customerPhone)}</div>`:''}</div>
      <div class="line-dashed"></div>
      <table><thead><tr><th class="item">Item</th><th class="qty">Qty</th><th class="amt">Jumlah</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="line"><span>Subtotal</span><b>${money(r.subtotal)}</b></div>
      <div class="line"><span>Diskon</span><b>${money(r.discount)}</b></div>
      <div class="line total"><span>TOTAL</span><b>${money(r.total)}</b></div>
      <div class="line-dashed"></div>
      <div class="thanks">Terima kasih telah berbelanja di Deanti Bakery.</div>
      ${r.customerName?`<div class="thanks">Terima kasih, ${esc(r.customerName)}!</div>`:''}
      <div class="thanks">Semoga hari Anda menyenangkan 😊</div>
    </div>`;
  }

  function styles(){
    if(document.getElementById('reprintStyles'))return;
    const s=document.createElement('style');s.id='reprintStyles';s.textContent=`
      .reprint-paper{width:302px;box-sizing:border-box;background:#fff;color:#111;padding:20px 14px;font-family:Arial,sans-serif;font-size:13px;line-height:1.35}
      .reprint-paper h2{text-align:center;font-size:22px;margin:0 0 2px}.reprint-paper .sub{text-align:center}.reprint-paper .phone{font-weight:700;margin-top:2px}.reprint-paper .line-dashed{border-top:1px dashed #333;margin:10px 0}.reprint-paper .meta div{margin:3px 0}.reprint-paper table{width:100%;border-collapse:collapse}.reprint-paper th,.reprint-paper td{padding:5px 0;vertical-align:top}.reprint-paper th{font-size:11px;border-bottom:1px solid #333}.reprint-paper .item{width:58%;text-align:left;word-break:break-word}.reprint-paper .qty{width:12%;text-align:center}.reprint-paper .amt{width:30%;text-align:right;white-space:nowrap}.reprint-paper .line{display:flex;justify-content:space-between;gap:10px;margin:6px 0}.reprint-paper .total{font-size:17px;font-weight:800;border-top:1px solid #111;padding-top:8px;margin-top:8px}.reprint-paper .thanks{text-align:center;font-size:11px;margin-top:7px}.reprint-btn{padding:7px 10px!important;border:1px solid #d9c9bd!important;border-radius:8px!important;background:#fff7ef!important;color:#8f552c!important;font-weight:700!important;cursor:pointer}
    `;document.head.appendChild(s);
  }

  async function downloadJpeg(t){
    if(typeof html2canvas==='undefined')return alert('Modul JPEG belum siap. Silakan refresh aplikasi.');
    const r=receiptData(t);styles();
    const host=document.createElement('div');host.style.position='fixed';host.style.left='-10000px';host.style.top='0';host.style.background='#fff';host.innerHTML=receiptHtml(r);document.body.appendChild(host);
    try{
      const paper=host.querySelector('#reprintCanvas');
      const canvas=await html2canvas(paper,{backgroundColor:'#fff',scale:2,useCORS:true,logging:false});
      canvas.toBlob(blob=>{
        if(!blob)throw new Error('Gagal membuat JPEG');
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Struk-Deanti-Bakery-${(r.no||'transaksi').replace(/[^a-zA-Z0-9_-]/g,'_')}.jpg`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      },'image/jpeg',0.95);
    }catch(e){alert('Gagal membuat JPEG: '+(e.message||e));}
    finally{host.remove();}
  }

  function addButtons(){
    const box=document.getElementById('transactionsTable');if(!box)return;
    const db=loadDb();const trs=box.querySelectorAll('tbody tr');
    trs.forEach(row=>{
      if(row.querySelector('.reprint-btn'))return;
      const no=String(row.cells?.[0]?.textContent||'').trim();
      const t=db.transactions.find(x=>String(x.no||'')===no);
      if(!t)return;
      const td=document.createElement('td');td.innerHTML=`<button type="button" class="reprint-btn">🖼️ JPEG</button>`;
      td.querySelector('button').addEventListener('click',()=>downloadJpeg(t));row.appendChild(td);
    });
    const table=box.querySelector('table');
    if(table&&!table.querySelector('thead .reprint-head')){const th=document.createElement('th');th.className='reprint-head';th.textContent='Struk';table.tHead?.rows[0]?.appendChild(th);}
  }

  function init(){styles();addButtons();const box=document.getElementById('transactionsTable');if(box){const observer=new MutationObserver(()=>{observer.disconnect();addButtons();observer.observe(box,{childList:true,subtree:true});});observer.observe(box,{childList:true,subtree:true});}}
  window.deantiDownloadTransactionJpeg=downloadJpeg;
  document.addEventListener('DOMContentLoaded',init);
})();
