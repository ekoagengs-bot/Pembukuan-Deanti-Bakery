(() => {
  const API_KEY = 'deanti_bakery_api_url';
  const LOCAL_KEY = 'deanti_bakery_v2';
  let photoMap = new Map();
  let refreshTimer = null;

  const apiUrl = () => localStorage.getItem(API_KEY) || '';
  const esc = value => String(value ?? '').replace(/[&<>\'"]/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'
  }[ch]));

  function injectStyles() {
    if (document.getElementById('productPhotoStylesV2')) return;
    const style = document.createElement('style');
    style.id = 'productPhotoStylesV2';
    style.textContent = `
      .product-card { overflow:hidden; }
      .product-card .kasir-photo-wrap { width:100%; height:155px; margin:-14px -14px 12px; width:calc(100% + 28px); background:#f7f2ed; display:flex; align-items:center; justify-content:center; overflow:hidden; border-bottom:1px solid #eee; }
      .product-card .kasir-photo { width:100%; height:100%; object-fit:cover; display:block; }
      .product-card .kasir-photo-placeholder { font-size:52px; opacity:.55; }
      .product-card.photo-ready { padding-top:14px; }
      @media(max-width:680px){ .product-card .kasir-photo-wrap{height:125px;} }
    `;
    document.head.appendChild(style);
  }

  function readLocalProducts() {
    try {
      const db = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      return Array.isArray(db.products) ? db.products : [];
    } catch (_) { return []; }
  }

  async function loadPhotosFromApi() {
    const url = apiUrl();
    if (!url) return;
    try {
      const res = await fetch(url + '?action=bootstrap&_=' + Date.now(), { cache:'no-store' });
      const payload = await res.json();
      if (!payload.ok || !payload.data) return;
      const products = Array.isArray(payload.data.products) ? payload.data.products : [];
      photoMap = new Map(products.map(p => [String(p.id), String(p.photoUrl || '')]));
      try {
        const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
        local.products = products;
        localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
      } catch (_) {}
      decoratePOS();
      decorateProductTable();
    } catch (_) {
      // Tetap gunakan data lokal bila API sedang tidak tersedia.
    }
  }

  function productById(id) {
    const idStr = String(id);
    const local = readLocalProducts().find(p => String(p.id) === idStr);
    return local || { id:idStr, photoUrl:photoMap.get(idStr) || '' };
  }

  function imageMarkup(product) {
    const url = String(product?.photoUrl || photoMap.get(String(product?.id)) || '').trim();
    if (!url) {
      return '<div class="kasir-photo-wrap"><div class="kasir-photo-placeholder">🍞</div></div>';
    }
    return `<div class="kasir-photo-wrap"><img class="kasir-photo" src="${esc(url)}" alt="${esc(product?.name || 'Produk')}" loading="lazy" referrerpolicy="no-referrer"><span></span></div>`;
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
      card.classList.add('photo-ready');
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
      const url = String(product.photoUrl || photoMap.get(String(product.id)) || '').trim();
      const image = url
        ? `<img src="${esc(url)}" alt="${esc(product.name || '')}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #eee">`
        : `<div style="width:48px;height:48px;border-radius:8px;border:1px solid #eee;background:#f4f4f4;display:flex;align-items:center;justify-content:center;font-size:20px">🍞</div>`;
      cell.innerHTML = `<div style="display:flex;align-items:center;gap:8px">${image}<strong>${esc(product.name || '')}</strong></div>`;
    });
  }

  function startObserver() {
    const pos = document.getElementById('posProducts');
    const tbl = document.getElementById('productsTable');
    const callback = () => { decoratePOS(); decorateProductTable(); };
    if (pos) new MutationObserver(callback).observe(pos, { childList:true, subtree:true });
    if (tbl) new MutationObserver(callback).observe(tbl, { childList:true, subtree:true });
    setInterval(callback, 1200);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    startObserver();
    setTimeout(() => { decoratePOS(); decorateProductTable(); loadPhotosFromApi(); }, 250);
    refreshTimer = setInterval(loadPhotosFromApi, 12000);
  });
})();
