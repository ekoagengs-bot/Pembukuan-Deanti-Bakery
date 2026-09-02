(() => {
  const API_KEY = 'deanti_bakery_api_url';
  const LOCAL_KEY = 'deanti_bakery_v2';
  let photoMap = new Map();
  let apiPhotoLoadStarted = false;

  const apiUrl = () => localStorage.getItem(API_KEY) || '';
  const esc = value => String(value ?? '').replace(/[&<>\'\"]/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'
  }[ch]));

  function injectStyles() {
    if (document.getElementById('productPhotoStylesV3')) return;
    const style = document.createElement('style');
    style.id = 'productPhotoStylesV3';
    style.textContent = `
      .product-card { overflow:hidden; }
      .product-card .kasir-photo-wrap { width:calc(100% + 28px); height:155px; margin:-14px -14px 12px; background:#f7f2ed; display:flex; align-items:center; justify-content:center; overflow:hidden; border-bottom:1px solid #eee; }
      .product-card .kasir-photo { width:100%; height:100%; object-fit:cover; display:block; }
      .product-card .kasir-photo-placeholder { font-size:52px; opacity:.55; }
      @media(max-width:680px){ .product-card .kasir-photo-wrap{height:125px;} }
    `;
    document.head.appendChild(style);
  }

  function readLocalProducts() {
    try {
      const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return Array.isArray(data.products) ? data.products : [];
    } catch (_) { return []; }
  }

  function productById(id) {
    const idStr = String(id);
    const local = readLocalProducts().find(p => String(p.id) === idStr) || { id:idStr };
    // photoMap is authoritative when the local cached product has no photoUrl.
    return { ...local, photoUrl: String(local.photoUrl || photoMap.get(idStr) || '') };
  }

  function imageMarkup(product) {
    const url = String(product?.photoUrl || '').trim();
    if (!url) return '<div class="kasir-photo-wrap"><div class="kasir-photo-placeholder">🍞</div></div>';
    return `<div class="kasir-photo-wrap"><img class="kasir-photo" src="${esc(url)}" alt="${esc(product?.name || 'Produk')}" loading="lazy" referrerpolicy="no-referrer"></div>`;
  }

  function decoratePOS() {
    const root = document.getElementById('posProducts');
    if (!root) return;
    root.querySelectorAll('.product-card').forEach(card => {
      const match = String(card.getAttribute('onclick') || '').match(/addCart\(['"]([^'"]+)['"]\)/);
      if (!match) return;
      const product = productById(match[1]);
      const existing = card.querySelector('.kasir-photo-wrap');
      if (existing) existing.remove();
      card.insertAdjacentHTML('afterbegin', imageMarkup(product));
    });
  }

  function decorateProductTable() {
    const root = document.getElementById('productsTable');
    if (!root) return;
    root.querySelectorAll('tbody tr').forEach(row => {
      const btn = row.querySelector('button[onclick*="editProduct"]');
      const match = (btn?.getAttribute('onclick') || '').match(/editProduct\(['"]([^'"]+)['"]\)/);
      if (!match) return;
      const product = productById(match[1]);
      const cell = row.children[0];
      if (!cell) return;
      const url = String(product.photoUrl || '').trim();
      const image = url
        ? `<img src="${esc(url)}" alt="${esc(product.name || '')}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #eee">`
        : `<div style="width:48px;height:48px;border-radius:8px;border:1px solid #eee;background:#f4f4f4;display:flex;align-items:center;justify-content:center;font-size:20px">🍞</div>`;
      cell.innerHTML = `<div style="display:flex;align-items:center;gap:8px">${image}<strong>${esc(product.name || '')}</strong></div>`;
    });
  }

  async function loadPhotosFromApiOnce() {
    if (apiPhotoLoadStarted) return;
    const url = apiUrl();
    if (!url) return;
    apiPhotoLoadStarted = true;
    try {
      const res = await fetch(url + '?action=bootstrap&_=' + Date.now(), { cache:'no-store' });
      const payload = await res.json();
      if (!payload.ok || !payload.data) return;
      const products = Array.isArray(payload.data.products) ? payload.data.products : [];
      photoMap = new Map(products.map(p => [String(p.id), String(p.photoUrl || '')]));
      const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch (_) { return {}; } })();
      local.products = products;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
      decoratePOS();
      decorateProductTable();
    } catch (_) {
      // Data lokal tetap dipakai bila API tidak tersedia.
    }
  }

  function addPhotoUploadField() {
    const form = document.getElementById('productForm');
    if (!form || document.getElementById('photoUploadBox')) return;
    const box = document.createElement('div');
    box.id = 'photoUploadBox';
    box.className = 'photo-upload-box';
    box.innerHTML = `
      <label for="productPhotoInput">📷 Foto Produk</label>
      <input id="productPhotoInput" type="file" accept="image/*">
      <div class="photo-help">JPG/PNG/WebP, maksimal 6 MB. Foto akan tersimpan di Google Drive.</div>
      <div class="photo-preview" id="productPhotoPreview"><div class="photo-empty">🍞</div><span>Belum ada foto</span></div>
    `;
    form.insertBefore(box, form.lastElementChild);

    const input = box.querySelector('#productPhotoInput');
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      const preview = document.getElementById('productPhotoPreview');
      if (!file || !preview) return;
      const objectUrl = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${objectUrl}" alt="Preview"><span>${esc(file.name)}</span>`;
    });
  }

  function compress(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        try {
          const max = 1000;
          const scale = Math.min(1, max / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
          URL.revokeObjectURL(objectUrl);
          resolve({base64, mimeType:'image/jpeg', fileName:file.name.replace(/\.[^.]+$/, '') + '.jpg'});
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Foto tidak dapat dibaca')); };
      image.src = objectUrl;
    });
  }

  async function saveProductWithPhoto(event) {
    if (event.target?.id !== 'productForm') return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const id = document.getElementById('productId').value || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
    const product = {
      id,
      name: document.getElementById('productName').value.trim(),
      category: document.getElementById('productCategory').value.trim(),
      price: Number(document.getElementById('productPrice').value || 0),
      cost: Number(document.getElementById('productCost').value || 0),
      stock: Number(document.getElementById('productStock').value || 0)
    };
    const url = apiUrl();
    if (!url) { toast('Koneksi Google Sheets belum aktif'); return; }

    try {
      const file = document.getElementById('productPhotoInput')?.files?.[0] || null;
      const saved = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'saveProduct',product})
      }).then(r => r.json());
      if (!saved.ok) throw new Error(saved.error || 'Gagal menyimpan produk');

      if (file) {
        if (file.size > 6 * 1024 * 1024) throw new Error('Ukuran foto maksimal 6 MB');
        const data = await compress(file);
        const uploaded = await fetch(url, {
          method:'POST',
          headers:{'Content-Type':'text/plain;charset=utf-8'},
          body:JSON.stringify({action:'uploadProductPhoto',productId:id,...data})
        }).then(r => r.json());
        if (!uploaded.ok) throw new Error(uploaded.error || 'Gagal mengupload foto');
      }

      const latest = await fetch(url + '?action=bootstrap&_=' + Date.now(), {cache:'no-store'}).then(r => r.json());
      if (latest.ok && latest.data) localStorage.setItem(LOCAL_KEY, JSON.stringify(latest.data));
      document.getElementById('modal')?.classList.add('hidden');
      location.reload();
    } catch (error) {
      toast('Gagal menyimpan produk: ' + error.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    addPhotoUploadField();
    decoratePOS();
    decorateProductTable();
    document.addEventListener('submit', saveProductWithPhoto, true);
    // One API read only: eliminates the repeated 1.2s/12s polling that caused the slow/crashing page.
    loadPhotosFromApiOnce();
  });
})();
