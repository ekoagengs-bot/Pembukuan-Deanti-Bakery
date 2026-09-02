const LOCAL_KEY='deanti_bakery_v2';
const API_KEY='deanti_bakery_api_url';

const today=()=>{
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};

const normalizeDate=v=>{
  if(!v)return '';
  const s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const match=s.match(/(?:^|\s)(\w{3})\s+(\w{3})\s+(\d{1,2})\s+(\d{4})/i);
  if(match){
    const months={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
    const mon=months[match[2].slice(0,1).toUpperCase()+match[2].slice(1,3).toLowerCase()];
    if(mon)return `${match[4]}-${mon}-${String(match[3]).padStart(2,'0')}`;
  }
  const d=new Date(s);
  if(!Number.isNaN(d.getTime())){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  return s;
};

const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const apiUrl=()=>localStorage.getItem(API_KEY)||'';

const seed={products:[],transactions:[],cashflows:[]};
let db=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null')||seed;
let cart=[];
let chart=null;

function normalizeDb(data){
  const d=data||{};
  return {
    products:Array.isArray(d.products)?d.products.map(p=>({...p,price:Number(p.price||0),cost:Number(p.cost||0),stock:Number(p.stock||0),photoUrl:String(p.photoUrl||'')})):[],
    transactions:Array.isArray(d.transactions)?d.transactions.map(t=>({...t,date:normalizeDate(t.date),time:normalizeTime(t.time),discount:Number(t.discount||0),total:Number(t.total||0),items:Array.isArray(t.items)?t.items.map(i=>({...i,price:Number(i.price||0),cost:Number(i.cost||0),qty:Number(i.qty||0)})):[]})):[],
    cashflows:Array.isArray(d.cashflows)?d.cashflows.map(x=>({...x,date:normalizeDate(x.date),time:normalizeTime(x.time),amount:Number(x.amount||0)})):[]
  };
}

function normalizeTime(v){
  if(!v)return '';
  const s=String(v).trim();
  const m=s.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  return m?`${String(m[1]).padStart(2,'0')}.${m[2]}`:s;
}

function setStatus(online){
  const dot=document.getElementById('statusDot');
  const status=document.getElementById('storageStatus');
  if(dot)dot.style.background=online?'#49b47b':'#d18a3d';
  if(status)status.textContent=online?'Google Sheets Terhubung':'Mode Lokal';
}

function toast(msg){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2200);
}

function esc(s){return String(s??'').replace(/[&<>\'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));}
function txTotal(t){return (t.items||[]).reduce((a,i)=>a+Number(i.price||0)*Number(i.qty||0),0)-Number(t.discount||0);}
function todayTx(){return db.transactions.filter(t=>normalizeDate(t.date)===today());}

function localSave(){localStorage.setItem(LOCAL_KEY,JSON.stringify(db));renderAll();}

async function apiGet(action){
  const u=apiUrl();
  if(!u)throw Error('URL API belum diisi');
  const r=await fetch(u+'?action='+encodeURIComponent(action)+'&_='+Date.now(),{cache:'no-store'});
  const j=await r.json();
  if(!j.ok)throw Error(j.error||'API error');
  return j.data;
}

async function apiPost(action,data={}){
  const u=apiUrl();
  if(!u)throw Error('URL API belum diisi');
  const r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...data})});
  const j=await r.json();
  if(!j.ok)throw Error(j.error||'API error');
  return j.data;
}

async function syncFromSheets(){
  if(!apiUrl()){setStatus(false);return;}
  try{
    db=normalizeDb(await apiGet('bootstrap'));
    localStorage.setItem(LOCAL_KEY,JSON.stringify(db));
    setStatus(true);
    renderAll();
  }catch(e){
    setStatus(false);
    toast('Gagal sinkron: '+e.message);
  }
}

function nav(page){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  const target=document.getElementById('page-'+page);
  if(target)target.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
  const n={
    dashboard:['Dashboard','Ringkasan usaha hari ini'],
    kasir:['Kasir','Penjualan dan pembayaran'],
    produk:['Produk & Stok','Kelola produk dan persediaan'],
    transaksi:['Transaksi','Riwayat penjualan'],
    keuangan:['Keuangan','Pemasukan dan pengeluaran'],
    laporan:['Laporan','Rekap usaha'],
    pengaturan:['Pengaturan','Koneksi database Google Sheets']
  };
  if(n[page]){
    document.getElementById('pageTitle').textContent=n[page][0];
    document.getElementById('pageSub').textContent=n[page][1];
  }
  renderAll();
}

function renderDashboard(){
  const tx=todayTx();
  const sales=tx.reduce((a,t)=>a+txTotal(t),0);
  const profit=tx.reduce((a,t)=>a+(t.items||[]).reduce((x,i)=>x+(Number(i.price||0)-Number(i.cost||0))*Number(i.qty||0),0)-Number(t.discount||0),0);
  const expense=db.cashflows.filter(x=>normalizeDate(x.date)===today()&&x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0);
  const stock=db.products.reduce((a,p)=>a+Number(p.price||0)*Number(p.stock||0),0);

  document.getElementById('statSales').textContent=rupiah(sales);
  document.getElementById('statSalesCount').textContent=`${tx.length} transaksi`;
  document.getElementById('statProfit').textContent=rupiah(profit);
  document.getElementById('statExpense').textContent=rupiah(expense);
  document.getElementById('statStock').textContent=rupiah(stock);
  document.getElementById('statStockCount').textContent=`${db.products.length} produk`;

  const counter={};
  tx.flatMap(t=>t.items||[]).forEach(i=>counter[i.name]=(counter[i.name]||0)+Number(i.qty||0));
  const best=Object.entries(counter).sort((a,b)=>b[1]-a[1]).slice(0,5);
  document.getElementById('bestSellerList').innerHTML=best.length
    ?best.map((x,i)=>`<div class="list-item"><span>${i+1}. ${esc(x[0])}</span><strong>${x[1]} terjual</strong></div>`).join('')
    :'<p style="color:var(--muted)">Belum ada transaksi hari ini.</p>';

  document.getElementById('recentTransactions').innerHTML=tableTx(db.transactions.slice().reverse().slice(0,7));
  drawChart();
}

function drawChart(){
  const canvas=document.getElementById('salesChart');
  if(!canvas||typeof Chart==='undefined')return;
  const vals=[],labels=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    labels.push(d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}));
    vals.push(db.transactions.filter(t=>normalizeDate(t.date)===ds).reduce((a,t)=>a+txTotal(t),0));
  }
  if(chart)chart.destroy();
  chart=new Chart(canvas,{type:'line',data:{labels,datasets:[{label:'Omzet',data:vals,tension:.35,fill:true}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>rupiah(v)}}}}});
}

function tableTx(rows){
  if(!rows.length)return '<p style="color:var(--muted)">Belum ada data transaksi.</p>';
  return `<table><thead><tr><th>No. Transaksi</th><th>Waktu</th><th>Total</th><th>Metode</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${esc(t.no)}</td><td>${esc(normalizeDate(t.date))} ${esc(normalizeTime(t.time))}</td><td class="money">${rupiah(txTotal(t))}</td><td><span class="badge">${esc(t.method)}</span></td></tr>`).join('')}</tbody></table>`;
}

function productImage(p){
  if(p?.photoUrl){
    return `<div class="kasir-photo-wrap" style="width:100%;height:145px;margin:-14px -14px 12px;width:calc(100% + 28px);background:#f7f2ed;display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="${esc(p.photoUrl)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=&quot;font-size:48px;opacity:.5&quot;>🍞</div>'"></div>`;
  }
  return `<div style="width:100%;height:90px;margin:-14px -14px 12px;width:calc(100% + 28px);background:#f7f2ed;display:flex;align-items:center;justify-content:center;font-size:44px;opacity:.45">🍞</div>`;
}

function renderPOS(){
  const q=(document.getElementById('productSearch')?.value||'').toLowerCase();
  const ps=db.products.filter(p=>String(p.name||'').toLowerCase().includes(q)||String(p.category||'').toLowerCase().includes(q));
  document.getElementById('posProducts').innerHTML=ps.map(p=>`
    <div class="product-card ${Number(p.stock)<=0?'disabled':''}" onclick="addCart('${p.id}')">
      ${productImage(p)}
      <span class="cat">${esc(p.category)}</span>
      <strong>${esc(p.name)}</strong>
      <div class="price">${rupiah(p.price)}</div>
      <div class="stock">Stok ${p.stock}</div>
    </div>`).join('')||'<p style="color:var(--muted)">Produk tidak ditemukan.</p>';

  document.getElementById('cartItems').innerHTML=cart.length?cart.map(i=>`<div class="cart-row"><div><h4>${esc(i.name)}</h4><small>${rupiah(i.price)} × ${i.qty}</small></div><div class="qty-controls"><button onclick="changeQty('${i.id}',-1)">−</button><b>${i.qty}</b><button onclick="changeQty('${i.id}',1)">＋</button></div></div>`).join(''):'<p style="color:var(--muted);padding:15px 0">Keranjang masih kosong.</p>';
  const sub=cart.reduce((a,i)=>a+Number(i.price)*Number(i.qty),0);
  const disc=Math.max(0,Number(document.getElementById('discount')?.value||0));
  const total=Math.max(0,sub-disc);
  const paid=Number(document.getElementById('paidAmount')?.value||0);
  document.getElementById('cartSubtotal').textContent=rupiah(sub);
  document.getElementById('cartTotal').textContent=rupiah(total);
  document.getElementById('changeAmount').textContent=rupiah(Math.max(0,paid-total));
}

function addCart(pid){
  const p=db.products.find(x=>String(x.id)===String(pid));
  if(!p||Number(p.stock)<=0)return toast('Stok produk habis');
  const i=cart.find(x=>String(x.id)===String(pid));
  if(i){if(i.qty>=Number(p.stock))return toast('Stok tidak cukup');i.qty++;}
  else cart.push({...p,qty:1});
  renderPOS();
}

function changeQty(pid,delta){
  const i=cart.find(x=>String(x.id)===String(pid));
  if(!i)return;
  i.qty+=delta;
  if(i.qty<=0)cart=cart.filter(x=>String(x.id)!==String(pid));
  else{i.qty=Math.min(i.qty,Number(db.products.find(p=>String(p.id)===String(pid))?.stock||0));}
  renderPOS();
}

async function checkout(){
  if(!cart.length)return toast('Keranjang kosong');
  const sub=cart.reduce((a,i)=>a+Number(i.price)*Number(i.qty),0);
  const discount=Math.max(0,Number(document.getElementById('discount').value||0));
  if(discount>sub)return toast('Diskon tidak boleh melebihi subtotal');
  const total=sub-discount;
  const paid=Number(document.getElementById('paidAmount').value||0);
  if(paid<total)return toast('Nominal bayar kurang');
  const now=new Date();
  const t={
    id:uid(),
    no:'INV-'+now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+String(now.getHours()).padStart(2,'0')+String(now.getMinutes()).padStart(2,'0')+String(now.getSeconds()).padStart(2,'0'),
    date:today(),
    time:now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),
    method:document.getElementById('paymentMethod').value,
    discount,
    items:cart.map(i=>({id:i.id,name:i.name,price:Number(i.price),cost:Number(i.cost||0),qty:Number(i.qty)}))
  };
  try{
    if(apiUrl())db=normalizeDb(await apiPost('checkout',{transaction:t}));
    else{
      cart.forEach(i=>{const p=db.products.find(p=>String(p.id)===String(i.id));if(p)p.stock-=i.qty;});
      db.transactions.push(t);
      db.cashflows.push({id:uid(),date:t.date,time:t.time,type:'income',category:'Penjualan',description:t.no,amount:total});
      localSave();
    }
    localStorage.setItem(LOCAL_KEY,JSON.stringify(db));
    setStatus(!!apiUrl());
    cart=[];
    document.getElementById('paidAmount').value='';
    document.getElementById('discount').value=0;
    renderAll();
    localStorage.setItem('deanti_bakery_last_receipt',JSON.stringify({id:t.id,no:t.no,date:t.date,time:t.time,method:t.method,discount,items:t.items,subtotal:sub,total,paid,change:Math.max(0,paid-total)}));
    toast('Transaksi berhasil disimpan');
  }catch(e){toast('Transaksi gagal: '+e.message);}
}

function renderProducts(){
  document.getElementById('productsTable').innerHTML=`<table><thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>HPP</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>${db.products.map(p=>`<tr><td>${p.photoUrl?`<img src="${esc(p.photoUrl)}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:8px">`:''}<strong>${esc(p.name)}</strong></td><td>${esc(p.category)}</td><td>${rupiah(p.price)}</td><td>${rupiah(p.cost)}</td><td><span class="badge ${Number(p.stock)<=5?'red':'green'}">${p.stock}</span></td><td><button class="text-btn" onclick="editProduct('${p.id}')">Edit</button> <button class="text-btn danger" onclick="deleteProduct('${p.id}')">Hapus</button></td></tr>`).join('')}</tbody></table>`;
}

function openProduct(p=null){
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent=p?'Edit Produk':'Tambah Produk';
  document.getElementById('productId').value=p?.id||'';
  document.getElementById('productName').value=p?.name||'';
  document.getElementById('productCategory').value=p?.category||'';
  document.getElementById('productPrice').value=p?.price||'';
  document.getElementById('productCost').value=p?.cost||'';
  document.getElementById('productStock').value=p?.stock??'';
}
function editProduct(pid){openProduct(db.products.find(p=>String(p.id)===String(pid)));}
async function deleteProduct(pid){
  if(!confirm('Hapus produk ini?'))return;
  try{
    if(apiUrl())db=normalizeDb(await apiPost('deleteProduct',{id:pid}));
    else{db.products=db.products.filter(p=>String(p.id)!==String(pid));localSave();}
    renderAll();toast('Produk dihapus');
  }catch(e){toast('Gagal menghapus: '+e.message);}
}

function renderTransactions(){
  const q=(document.getElementById('transactionSearch')?.value||'').toLowerCase();
  const m=document.getElementById('transactionMethod')?.value||'';
  let rows=db.transactions.slice().reverse();
  if(q)rows=rows.filter(t=>String(t.no||'').toLowerCase().includes(q));
  if(m)rows=rows.filter(t=>String(t.method||'')===m);
  document.getElementById('transactionsTable').innerHTML=tableTx(rows);
}

function renderCashflow(){
  const rows=db.cashflows.slice().reverse().slice(0,100);
  document.getElementById('cashflowTable').innerHTML=rows.length?`<table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(normalizeDate(x.date))}</td><td><span class="badge ${x.type==='income'?'green':'red'}">${x.type==='income'?'Masuk':'Keluar'}</span></td><td>${esc(x.category)}</td><td>${esc(x.description)}</td><td class="money">${rupiah(x.amount)}</td></tr>`).join('')}</tbody></table>`:'<p style="color:var(--muted)">Belum ada arus kas.</p>';
}

function renderReports(){
  const s=db.transactions.reduce((a,t)=>a+txTotal(t),0);
  const e=db.cashflows.filter(x=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0);
  const p=db.transactions.reduce((a,t)=>a+(t.items||[]).reduce((x,i)=>x+(Number(i.price||0)-Number(i.cost||0))*Number(i.qty||0),0)-Number(t.discount||0),0);
  document.getElementById('reportSales').textContent=rupiah(s);
  document.getElementById('reportExpense').textContent=rupiah(e);
  document.getElementById('reportProfit').textContent=rupiah(p);
  document.getElementById('reportCount').textContent=db.transactions.length;
  const map={};
  db.transactions.flatMap(t=>t.items||[]).forEach(i=>{if(!map[i.id])map[i.id]={name:i.name,qty:0,sales:0,hpp:0};map[i.id].qty+=Number(i.qty||0);map[i.id].sales+=Number(i.price||0)*Number(i.qty||0);map[i.id].hpp+=Number(i.cost||0)*Number(i.qty||0);});
  const rows=Object.values(map).sort((a,b)=>b.sales-a.sales);
  document.getElementById('reportProducts').innerHTML=rows.length?`<table><thead><tr><th>Produk</th><th>Terjual</th><th>Penjualan</th><th>HPP</th><th>Margin</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.qty}</td><td>${rupiah(x.sales)}</td><td>${rupiah(x.hpp)}</td><td class="money">${rupiah(x.sales-x.hpp)}</td></tr>`).join('')}</tbody></table>`:'<p style="color:var(--muted)">Belum ada penjualan.</p>';
}

function renderAll(){
  renderDashboard();
  renderPOS();
  renderProducts();
  renderTransactions();
  renderCashflow();
  renderReports();
  const api=document.getElementById('apiUrl');if(api)api.value=apiUrl();
}

document.addEventListener('DOMContentLoaded',()=>{
  try{db=normalizeDb(db);}catch(_){db={products:[],transactions:[],cashflows:[]};}
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.page)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.goto)));
  document.getElementById('productSearch').addEventListener('input',renderPOS);
  document.getElementById('discount').addEventListener('input',renderPOS);
  document.getElementById('paidAmount').addEventListener('input',renderPOS);
  document.getElementById('checkoutBtn').addEventListener('click',checkout);
  document.getElementById('clearCart').addEventListener('click',()=>{cart=[];renderPOS();});
  document.getElementById('transactionSearch').addEventListener('input',renderTransactions);
  document.getElementById('transactionMethod').addEventListener('change',renderTransactions);
  document.getElementById('addProductBtn').addEventListener('click',()=>openProduct());
  document.getElementById('closeModal').addEventListener('click',()=>document.getElementById('modal').classList.add('hidden'));
  document.getElementById('incomeForm').addEventListener('submit',async e=>{e.preventDefault();await saveFlow('income','incomeDesc','incomeAmount');e.target.reset();});
  document.getElementById('expenseForm').addEventListener('submit',async e=>{e.preventDefault();await saveFlow('expense','expenseDesc','expenseAmount');e.target.reset();});
  document.getElementById('saveApiBtn').addEventListener('click',async()=>{
    const u=document.getElementById('apiUrl').value.trim().replace(/\/$/,'');
    if(!u)return toast('Masukkan URL Web App');
    localStorage.setItem(API_KEY,u);
    document.getElementById('connectionResult').textContent='Menguji koneksi...';
    try{db=normalizeDb(await apiGet('bootstrap'));localStorage.setItem(LOCAL_KEY,JSON.stringify(db));setStatus(true);document.getElementById('connectionResult').textContent='✅ Terhubung ke Google Sheets';renderAll();toast('Koneksi berhasil');}
    catch(e){setStatus(false);document.getElementById('connectionResult').textContent='❌ '+e.message;toast('Koneksi gagal');}
  });
  document.getElementById('clearApiBtn').addEventListener('click',()=>{localStorage.removeItem(API_KEY);setStatus(false);document.getElementById('apiUrl').value='';document.getElementById('connectionResult').textContent='Mode lokal aktif';toast('Koneksi dihapus');});
  document.getElementById('syncBtn').addEventListener('click',syncFromSheets);
  document.getElementById('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`deanti-bakery-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);});
  document.getElementById('reportDate').value=today();
  setStatus(!!apiUrl());
  renderAll();
  if(apiUrl())syncFromSheets();
});

async function saveFlow(type,descId,amountId){
  const item={id:uid(),date:today(),time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),type,category:type==='income'?'Lainnya':'Operasional',description:document.getElementById(descId).value.trim(),amount:Number(document.getElementById(amountId).value||0)};
  if(item.amount<=0)return toast('Nominal harus lebih dari 0');
  try{
    if(apiUrl())db=normalizeDb(await apiPost('saveCashflow',{item}));
    else{db.cashflows.push(item);localSave();}
    renderAll();
    toast(type==='income'?'Pemasukan disimpan':'Pengeluaran disimpan');
  }catch(err){toast('Gagal menyimpan: '+err.message);}
}
