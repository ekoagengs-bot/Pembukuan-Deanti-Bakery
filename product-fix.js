(() => {
  const LOCAL_KEY='deanti_bakery_v2', API_KEY='deanti_bakery_api_url';
  const apiUrl=()=>localStorage.getItem(API_KEY)||'';
  const toast=msg=>{if(typeof window.toast==='function')return window.toast(msg);const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500);};
  const compressImage=file=>new Promise((resolve,reject)=>{if(!file)return resolve(null);if(!file.type?.startsWith('image/'))return reject(new Error('File harus berupa gambar'));const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{try{const max=1200,scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((img.naturalWidth||1)*scale));canvas.height=Math.max(1,Math.round((img.naturalHeight||1)*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);blob?resolve(blob):reject(new Error('Gagal memproses foto'));},'image/jpeg',.82);}catch(e){URL.revokeObjectURL(url);reject(e);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Foto tidak dapat dibaca'));};img.src=url;});
  const fileToBase64=file=>new Promise((resolve,reject)=>{if(!file)return resolve('');const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.onerror=()=>reject(new Error('Gagal membaca foto'));reader.readAsDataURL(file);});
  const post=async(action,data)=>{const url=apiUrl();if(!url)throw Error('URL Google Sheets belum tersedia');const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...data})});const text=await r.text();let j;try{j=JSON.parse(text);}catch(_){throw Error('Respons API bukan JSON. Backend Google Apps Script perlu di-deploy ulang.');}if(!r.ok)throw Error('Server API tidak merespons ('+r.status+')');if(!j.ok)throw Error(j.error||'API gagal menyimpan data');return j.data;};
  const preview=file=>{const box=document.getElementById('productPhotoPreview');if(!box||!file)return;const url=URL.createObjectURL(file);box.innerHTML=`<img src="${url}" alt="Preview foto produk" style="width:100%;height:100%;object-fit:cover;border-radius:10px"><span style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.65);color:#fff;padding:4px 7px;border-radius:6px;font-size:10px">Preview</span>`;box.style.position='relative';};
  const showExistingPhoto=url=>{const box=document.getElementById('productPhotoPreview');if(!box)return;if(!url){box.innerHTML='<div class="photo-empty">🍞</div><span>Belum ada foto</span>';return;}box.innerHTML=`<img src="${String(url).replace(/"/g,'&quot;')}" alt="Foto produk" style="width:100%;height:100%;object-fit:cover;border-radius:10px" onerror="this.style.display='none'">`;box.style.position='relative';};

  async function saveProduct(e){
    e.preventDefault();e.stopImmediatePropagation();
    const form=e.currentTarget;if(form.dataset.saving==='1')return;
    const name=document.getElementById('productName')?.value.trim()||'',category=document.getElementById('productCategory')?.value.trim()||'',price=Number(document.getElementById('productPrice')?.value||0),cost=Number(document.getElementById('productCost')?.value||0),stock=Number(document.getElementById('productStock')?.value||0),oldId=document.getElementById('productId')?.value.trim()||'',input=document.getElementById('productPhotoInput'),file=input?.files?.[0]||null,id=oldId||('prd-'+Date.now()+'-'+Math.random().toString(36).slice(2,8));
    if(!name)return toast('Nama produk wajib diisi');if(!category)return toast('Kategori wajib diisi');if(![price,cost,stock].every(Number.isFinite)||price<0||cost<0||stock<0)return toast('Harga, HPP, dan stok tidak valid');
    const product={id,name,category,price,cost,stock},submit=form.querySelector('button[type="submit"]');
    try{
      form.dataset.saving='1';if(submit){submit.disabled=true;submit.textContent=file?'Menyimpan & upload foto...':'Menyimpan...';}
      if(!apiUrl()){
        let db;try{db=JSON.parse(localStorage.getItem(LOCAL_KEY)||'{"products":[],"transactions":[],"cashflows":[]}')}catch(_){db={products:[],transactions:[],cashflows:[]};}
        db.products=Array.isArray(db.products)?db.products:[];const idx=db.products.findIndex(p=>String(p.id)===String(id));const saved={...(idx>=0?db.products[idx]:{}),...product};
        if(file){const b=await compressImage(file);saved.photoUrl='data:image/jpeg;base64,'+await fileToBase64(b);}if(idx>=0)db.products[idx]=saved;else db.products.push(saved);localStorage.setItem(LOCAL_KEY,JSON.stringify(db));
      }else{
        let fresh=await post('saveProduct',{product});
        let saved=Array.isArray(fresh?.products)?fresh.products.find(p=>String(p.id)===String(id)):null;
        if(!saved)throw Error('Produk tidak tersimpan di server. Backend Google Apps Script perlu di-update/re-deploy.');
        if(file){const b=await compressImage(file),base64=await fileToBase64(b),photo=await post('uploadProductPhoto',{productId:id,base64,mimeType:'image/jpeg',fileName:(name.replace(/[^a-zA-Z0-9._-]/g,'_')||'produk')+'-'+id+'.jpg'});if(!photo?.photoUrl)throw Error('URL foto tidak diterima server');fresh=await post('saveProduct',{product:{...product,photoUrl:photo.photoUrl}});}
        localStorage.setItem(LOCAL_KEY,JSON.stringify(fresh));
        if(typeof window.syncFromSheets==='function')await window.syncFromSheets();
      }
      document.getElementById('modal')?.classList.add('hidden');if(input)input.value='';if(typeof window.renderAll==='function')window.renderAll();toast(oldId?'Produk berhasil diperbarui':'Produk berhasil ditambahkan');
    }catch(err){console.error('Product save error:',err);toast('Gagal menyimpan produk: '+(err?.message||err));}
    finally{form.dataset.saving='0';if(submit){submit.disabled=false;submit.textContent='Simpan Produk';}}
  }

  function init(){const form=document.getElementById('productForm');if(!form||form.dataset.productFixV4==='1')return;form.dataset.productFixV4='1';form.addEventListener('submit',saveProduct,true);document.getElementById('productPhotoInput')?.addEventListener('change',e=>preview(e.currentTarget.files?.[0]));}
  window.showExistingProductPhoto=showExistingPhoto;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
