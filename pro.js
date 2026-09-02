(() => {
  const KEY = 'deanti_bakery_v2';
  const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const normDate = value => {
    if (!value) return '';
    const s = String(value);
    const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[0];
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? s.slice(0,10) : d.toISOString().slice(0,10);
  };
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)||'{}'); } catch (_) { return {products:[],transactions:[],cashflows:[]}; } };
  const daysAgo = n => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };

  function addCss(){
    if(document.getElementById('deantiProCss')) return;
    const s=document.createElement('style'); s.id='deantiProCss';
    s.textContent=`
      .pro-badge{display:inline-flex;align-items:center;gap:5px;margin-left:7px;padding:3px 7px;border-radius:999px;background:#d79250;color:#fff;font-size:9px;font-weight:900;letter-spacing:.5px;vertical-align:middle}
      .pro-insights{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
      .pro-tile{padding:15px 16px;border:1px solid var(--line);border-radius:15px;background:linear-gradient(135deg,#fff,#fcf7f2);box-shadow:var(--shadow)}
      .pro-tile span{display:block;font-size:11px;color:var(--muted);font-weight:700}.pro-tile strong{display:block;font-size:19px;margin-top:6px}.pro-tile small{display:block;margin-top:5px;color:#9a8e84}
      .pro-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin-bottom:18px}.pro-card{background:#fff;border:1px solid var(--line);border-radius:17px;padding:17px;box-shadow:var(--shadow)}
      .pro-card h3{margin:0 0 12px;font-size:14px}.pro-table{width:100%;border-collapse:collapse;font-size:12px}.pro-table td{padding:9px 0;border-bottom:1px dashed var(--line)}.pro-table td:last-child{text-align:right;font-weight:800}.pro-alert{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:11px;background:#fff7e8;margin-bottom:7px}.pro-alert b{color:#9a5d20}.pro-empty{color:var(--muted);font-size:12px}
      @media(max-width:1000px){.pro-insights{grid-template-columns:repeat(2,1fr)}.pro-grid{grid-template-columns:1fr}}
      @media(max-width:680px){.pro-insights{gap:8px}.pro-tile{padding:12px}.pro-tile strong{font-size:16px}.pro-grid{gap:10px}}
    `; document.head.appendChild(s);
  }

  function calc(){
    const db=read(); const today=daysAgo(0), month=today.slice(0,7);
    const tx=Array.isArray(db.transactions)?db.transactions:[]; const cash=Array.isArray(db.cashflows)?db.cashflows:[];
    const todayTx=tx.filter(t=>normDate(t.date)===today);
    const monthTx=tx.filter(t=>normDate(t.date).slice(0,7)===month);
    const salesMonth=monthTx.reduce((a,t)=>a+ (Array.isArray(t.items)?t.items.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0):Number(t.total||0))-Number(t.discount||0),0);
    const profitMonth=monthTx.reduce((a,t)=>a+(Array.isArray(t.items)?t.items.reduce((s,i)=>s+(Number(i.price||0)-Number(i.cost||0))*Number(i.qty||0),0):0)-Number(t.discount||0),0);
    const income=cash.filter(x=>normDate(x.date).slice(0,7)===month && x.type==='income').reduce((a,x)=>a+Number(x.amount||0),0);
    const expense=cash.filter(x=>normDate(x.date).slice(0,7)===month && x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0);
    const low=(db.products||[]).filter(p=>Number(p.stock||0)<=5).sort((a,b)=>Number(a.stock||0)-Number(b.stock||0));
    const methods={}; todayTx.forEach(t=>methods[t.method]=(methods[t.method]||0)+1);
    return {todayTx,monthTx,salesMonth,profitMonth,income,expense,low,methods,products:db.products||[]};
  }

  function render(){
    const dash=document.getElementById('page-dashboard'); if(!dash || !dash.classList.contains('active')) return;
    if(document.getElementById('proInsights')) document.getElementById('proInsights').remove();
    const d=calc(), wrap=document.createElement('div'); wrap.id='proInsights'; wrap.className='pro-insights';
    const saldo=d.income-d.expense;
    wrap.innerHTML=`<div class="pro-tile"><span>Omzet Bulan Ini</span><strong>${money(d.salesMonth)}</strong><small>${d.monthTx.length} transaksi</small></div><div class="pro-tile"><span>Laba Kotor Bulan Ini</span><strong>${money(d.profitMonth)}</strong><small>Setelah diskon</small></div><div class="pro-tile"><span>Saldo Kas Bulan Ini</span><strong>${money(saldo)}</strong><small>Masuk − keluar</small></div><div class="pro-tile"><span>Stok Menipis</span><strong>${d.low.length}</strong><small>≤ 5 unit</small></div>`;
    const stats=dash.querySelector('.stats-grid'); if(stats) stats.insertAdjacentElement('afterend',wrap); else dash.prepend(wrap);

    if(document.getElementById('proGrid')) document.getElementById('proGrid').remove();
    const grid=document.createElement('div'); grid.id='proGrid'; grid.className='pro-grid';
    const methodRows=Object.entries(d.methods).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${k}</td><td>${v} trx</td></tr>`).join('');
    const lowRows=d.low.slice(0,6).map(p=>`<div class="pro-alert"><span>${String(p.name||'')}</span><b>${Number(p.stock||0)} unit</b></div>`).join('');
    grid.innerHTML=`<div class="pro-card"><h3>Metode Pembayaran Hari Ini</h3><table class="pro-table">${methodRows||'<tr><td colspan="2" class="pro-empty">Belum ada transaksi hari ini.</td></tr>'}</table></div><div class="pro-card"><h3>Peringatan Stok</h3>${lowRows||'<div class="pro-empty">Semua stok masih aman.</div>'}</div>`;
    const recent=dash.querySelector('.panel:last-child'); if(recent) recent.insertAdjacentElement('beforebegin',grid); else dash.appendChild(grid);
  }

  function badge(){const brand=document.querySelector('.brand strong'); if(brand && !brand.querySelector('.pro-badge')) brand.insertAdjacentHTML('beforeend','<span class="pro-badge">PRO</span>');}
  document.addEventListener('DOMContentLoaded',()=>{addCss(); badge(); render(); const s=document.getElementById('syncBtn'); if(s) s.addEventListener('click',()=>setTimeout(render,900)); document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{badge();render()},30)));});
})();
