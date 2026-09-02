(() => {
  const API_KEY = 'deanti_bakery_api_url';
  const LOCAL_KEY = 'deanti_bakery_v2';

  const apiUrl = () => localStorage.getItem(API_KEY) || '';
  const esc = value => String(value ?? '').replace(/[&<>\'"]/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'
  }[ch]));
  const toast = message => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  };

  function injectStyles() {
    if (document.getElementById('productPhotoStylesSafe')) return;
    const style = document.createElement('style');
    style.id = 'productPhotoStylesSafe';
    style.textContent = `
      .product-card { overflow:hidden; }
      .product-card .kasir-photo-wrap { width:calc(100% + 28px); height:150px; margin:-14px -14px 12px; background:#f7f2ed; display:flex; align-items:center; justify-content:center; overflow:hidden; border-bottom:1px solid #eee; }
      .product-card .kasir-photo { width:100%; height:100%; object-fit:cover; display:block; }
      .product-card .kasir-photo-placeholder { font-size:52px; opacity:.55; }
      @media(max-width:680px){ .product-card .kasir-photo-wrap{height:120px;} }
      .products-table-photo-safe { width:48px; height:48px; object-fit:cover; border-radius:8px; border:1px solid #eee; background:#f4f4f4; }
    `;
    document.head.appendChild(style);
  }

  function readDb() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); }
    catch (_) { return { products: [], transactions: [], cashflows: [] }; }
  }

  function productById(id) {
    const products = Array.isArray(readDb().products) ? readDb().products : [];
    return products.find(p => String(p.id) === String(id)) || null;
  }

  function imageMarkup(product) {
    const url = String(product?.photoUrl || '').trim();
    if (!url) return '<div class="kasir-photo-wrap"><div class="kasir-photo-placeholder">🍞</div></div>';
    return `<div class="kasir-photo-wrap"><img class="kasir-photo" src="${esc(url)}" alt="${esc(product?.name || 'Produk')}" loading="lazy" referrerpolicy="no-referrer"></div>`;
  }

  function enhancePOS() {
    const root = document.getElementById('posProducts');
    if (!root) return;
    root.querySelectorAll('.product-card').forEach(card => {
      const match = String(card.getAttribute('onclick') || '').match(/addCart\(['"]([^'"]+)['"]\)/);
      if (!match) return;
      const product = productById(match[1]);
      if (!product) return;
      const old = card.querySelector('.kasir-photo-wrap');
      if (old) old.remove();
      card.insertAdjacentHTML('afterbegin', imageMarkup(product));
    });
  }

  function enhanceProductTable() {
    const root = document.getElementById('productsTable');
    if (!root) return;
    root.querySelectorAll('tbody tr').forEach(row => {
      const editButton = row.querySelector('button[onclick*="editProduct"]');
      const match = (editButton?.getAttribute('onclick') || '').match(/editProduct\(['"]([^'"]+)['"]\)/);
      if (!match || !row.children[0]) return;
      const product = productById(match[1]);
      if (!product) return;
      const url = String(product.photoUrl || '').trim();
      const image = url
        ? `<img class="products-table-photo-safe" src="${esc(url)}" alt="${esc(product.name)}" loading="lazy" referrerpolicy="no-referrer">`
        : '<div class="products-table-photo-safe" style="display:flex;align-items:center;justify-content:center;font-size:20px">🍞</div>';
      row.children[0].innerHTML = `<div style="display:flex;align-items:center;gap:8px">${image}<strong>${esc(product.name)}</strong></div>`;
    });
  }

  function wrapRenderer(name, enhancer) {
    if (typeof window[name] !== 'function' || window[name].__photoSafeWrapped) return;
    const original = window[name];
    const wrapped = function(...args) {
      const result = original.apply(this, args);
      try { enhancer(); } catch (_) {}
      return result;
    };
    wrapped.__photoSafeWrapped = true;
    window[name] = wrapped;
  }

  async function compress(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
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
          resolve({ base64, mimeType: 'image/jpeg', fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg' });
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

    const id = document.getElementById('productId').value || Date.now().toString(36);
    const product = {
      id,
      name: document.getElementById('productName').value.trim(),
      category: document.getElementById('productCategory').value.trim(),
      price: Number(document.getElementById('productPrice').value || 0),
      cost: Number(document.getElementById('productCost').value || 0),
      stock: Number(document.getElementById('productStock').value || 0)
    };
    const file = document.getElementById('productPhotoInput')?.files?.[0] || null;
    const url = apiUrl();

    try {
      if (!url) throw new Error('Koneksi Google Sheets belum aktif');

      const saved = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'saveProduct',product})
      }).then(r => r.json());
      if (!saved.ok) throw new Error(saved.error || 'Gagal menyimpan produk');

      if (file) {
        if (file.size > 6 * 1024 * 1024) throw new Error('Ukuran foto maksimal 6 MB');
        const image = await compress(file);
        const uploaded = await fetch(url, {
          method:'POST',
          headers:{'Content-Type':'text/plain;charset=utf-8'},
          body:JSON.stringify({action:'uploadProductPhoto',productId:id,...image})
        }).then(r => r.json());
        if (!uploaded.ok) throw new Error(uploaded.error || 'Gagal mengupload foto');
      }

      const latest = await fetch(url + '?action=bootstrap&_=' + Date.now(), {cache:'no-store'}).then(r => r.json());
      if (latest.ok && latest.data) localStorage.setItem(LOCAL_KEY, JSON.stringify(latest.data));
      document.getElementById('modal')?.classList.add('hidden');
      toast(file ? 'Produk dan foto berhasil disimpan' : 'Produk berhasil disimpan');
      setTimeout(() => window.location.reload(), 150);
    } catch (error) {
      toast('Gagal menyimpan produk: ' + error.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    wrapRenderer('renderPOS', enhancePOS);
    wrapRenderer('renderProducts', enhanceProductTable);
    document.addEventListener('submit', saveProductWithPhoto, true);
    setTimeout(() => { enhancePOS(); enhanceProductTable(); }, 600);
  });
})();
