(() => {
  const LOCAL_KEY='deanti_bakery_v2';
  const API_KEY='deanti_bakery_api_url';
  const apiUrl=()=>localStorage.getItem(API_KEY)||'';
  const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);

  function toast(m){const e=document.getElementById('toast');if(!e)return;e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
  function esc(v){return String(v??'').replace(/[&<>\'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]))}
  function localDb(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}')}catch(_){return {}}}
  function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}

  function ensureStyles(){
    if(document.getElementById('productPhotoStyles')) return;
    const s=document.createElement('style');s.id='productPhotoStyles';s.textContent=`
      .photo-upload-box{grid-column:1/-1;border:1px dashed #d9dce2;border-radius:12px;padding:12px;background:#fafafa}.photo-upload-box label{display:block;font-weight:700;margin-bottom:7px}.photo-preview{display:flex;align-items:center;gap:12px;margin-top:10px}.photo-preview img{width:86px;height:86px;object-fit:cover;border-radius:10px;border:1px solid #ddd;background:#eee}.photo-empty{width:86px;height:86px;border-radius:10px;border:1px solid #ddd;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;font-size:28px}.photo-help{font-size:11px;color:#777;margin-top:5px}
      .product-card .product-photo{width:100%;height:150px;object-fit:cover;border-radius:10px;margin-bottom:9px;background:#f1f1f1;display:block}.product-card .product-photo.empty{object-fit:contain;padding:24px;opacity:.35}
      .products-table-photo{width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #eee;vertical-align:middle;margin-right:8px;background:#f4f4f4}.photo-name-wrap{display:flex;align-items:center;gap:4px}
    `;document.head.appendChild(s);
  }

  function getProductById(id){return (localDb().products||[]).find(p=>String(p.id)===String(id))||null}
  function productImageMarkup(p){
    if(p?.photoUrl) return `<img class="product-photo" src="${esc(p.photoUrl)}" alt="${esc(p.name)}" loading="lazy" onerror="this.classList.add('empty');this.src='data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"><rect width="200" height="150" fill="#eee"/><text x="100" y="82" text-anchor="middle" font-size="48">🍞</text></svg>')}"/>`;
    return `<div class="product-photo empty" style="display:flex;align-items:center;justify-content:center;font-size:44px">🍞</div>`;
  }

  function decoratePos(){
    const root=document.getElementById('posProducts');if(!root)return;
    const products=localDb().products||[];
    root.querySelectorAll('.product-card').forEach(card=>{
      if(card.querySelector('.product-photo')) return;
      const m=(card.getAttribute('onclick')||'').match(/addCart\(['"]([^'"]+)['"]\)/);
      const p=m?products.find(x=>String(x.id)===String(m[1])):null;
      if(!p)return;
      card.insertAdjacentHTML('afterbegin',productImageMarkup(p));
    });
  }

  function decorateProductTable(){
    const root=document.getElementById('productsTable');if(!root)return;
    const products=localDb().products||[];
    root.querySelectorAll('tbody tr').forEach(row=>{
      if(row.dataset.photoDecorated==='1')return;
      const btn=row.querySelector('button[onclick*="editProduct"]');
      const m=(btn?.getAttribute('onclick')||'').match(/editProduct\(['"]([^'"]+)['"]\)/);
      const p=m?products.find(x=>String(x.id)===String(m[1])):null;
      if(!p)return;
      const cell=row.children[0];
      if(cell){cell.innerHTML=`<div class="photo-name-wrap">${p.photoUrl?`<img class="products-table-photo" src="${esc(p.photoUrl)}" alt="${esc(p.name)}">`:`<div class="products-table-photo" style="display:flex;align-items:center;justify-content:center;font-size:20px">🍞</div>`}<strong>${esc(p.name)}</strong></div>`;}
      row.dataset.photoDecorated='1';
    });
  }

  function addPhotoUI(){
    const form=document.getElementById('productForm');if(!form||document.getElementById('photoUploadBox'))return;
    const box=document.createElement('div');box.id='photoUploadBox';box.className='photo-upload-box';
    box.innerHTML=`<label for="productPhotoInput">📷 Foto Produk</label><input id="productPhotoInput" type="file" accept="image/*"><div class="photo-help">Format JPG/PNG/WebP. Foto akan disimpan di Google Drive dan ditampilkan pada kasir.</div><div class="photo-preview" id="productPhotoPreview"><div class="photo-empty">🍞</div><span>Belum ada foto baru</span></div>`;
    form.insertBefore(box,form.lastElementChild);
    const input=box.querySelector('#productPhotoInput');
    input.addEventListener('change',()=>{const f=input.files?.[0];const pr=document.getElementById('productPhotoPreview');if(!f||!pr)return;const url=URL.createObjectURL(f);pr.innerHTML=`<img src="${url}" alt="Preview"><span>${esc(f.name)}</span>`});
  }

  function refreshPhotoPreview(){
    const input=document.getElementById('productPhotoInput');const pr=document.getElementById('productPhotoPreview');const id=document.getElementById('productId')?.value;
    if(input){input.value=''}
    const p=getProductById(id);
    if(pr&&p?.photoUrl) pr.innerHTML=`<img src="${esc(p.photoUrl)}" alt="${esc(p.name)}"><span>Foto saat ini</span>`;
    else if(pr) pr.innerHTML='<div class="photo-empty">🍞</div><span>Belum ada foto</span>';
  }

  function observeModal(){
    const modal=document.getElementById('modal');if(!modal)return;
    const obs=new MutationObserver(()=>{addPhotoUI();if(!modal.classList.contains('hidden'))refreshPhotoPreview()});
    obs.observe(modal,{attributes:true,attributeFilter:['class']});
    addPhotoUI();
  }

  function compress(file){
    return new Promise((resolve,reject)=>{
      const img=new Image();const url=URL.createObjectURL(file);
      img.onload=()=>{try{const max=1000;const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);const mime='image/jpeg';const data=c.toDataURL(mime,.82).split(',')[1];URL.revokeObjectURL(url);resolve({base64:data,mimeType:mime,fileName=file.name.replace(/\.[^.]+$/,'')+'.jpg'})}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Foto tidak dapat dibaca'))};img.src=url});
  }

  async function post(body){
    const u=apiUrl();if(!u)throw new Error('Koneksi Google Sheets belum aktif');
    const r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});
    const j=await r.json();if(!j.ok)throw new Error(j.error||'API error');return j.data;
  }

  async function handleProductSubmit(e){
    if(e.target.id!=='productForm')return;
    e.preventDefault();e.stopImmediatePropagation();
    const id=document.getElementById('productId').value||uid();
    const product={id,name:document.getElementById('productName').value.trim(),category:document.getElementById('productCategory').value.trim(),price:Number(document.getElementById('productPrice').value),cost:Number(document.getElementById('productCost').value),stock:Number(document.getElementById('productStock').value)};
    if(!product.name||!product.category)return toast('Nama dan kategori produk wajib diisi');
    try{
      const data=await post({action:'saveProduct',product});
      const input=document.getElementById('productPhotoInput');
      const file=input?.files?.[0];
      if(file){
        if(file.size>6*1024*1024)throw new Error('Ukuran foto maksimal 6 MB');
        const img=await compress(file);
        await post({action:'uploadProductPhoto',productId:id,...img});
      }
      if(data)localStorage.setItem(LOCAL_KEY,JSON.stringify(data));
      toast(file?'Produk dan foto berhasil disimpan':'Produk berhasil disimpan');
      document.getElementById('modal').classList.add('hidden');
      setTimeout(()=>location.reload(),250);
    }catch(err){toast('Gagal menyimpan produk: '+err.message)}
  }

  function captureSubmit(){
    document.addEventListener('submit',handleProductSubmit,true);
  }

  function keepDecorating(){decoratePos();decorateProductTable()}

  document.addEventListener('DOMContentLoaded',()=>{
    ensureStyles();addPhotoUI();observeModal();captureSubmit();keepDecorating();
    const pObs=new MutationObserver(keepDecorating);const pos=document.getElementById('posProducts'),tbl=document.getElementById('productsTable');if(pos)pObs.observe(pos,{childList:true,subtree:true});if(tbl)pObs.observe(tbl,{childList:true,subtree:true});
    setInterval(()=>{addPhotoUI();keepDecorating()},1000);
  });
})();
