(() => {
  const waitFor = (fn, tries = 40) => {
    if (document.getElementById('productForm') && typeof window.apiPost === 'function') return fn();
    if (tries > 0) setTimeout(() => waitFor(fn, tries - 1), 150);
  };

  const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const compressImage = file => new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('File harus berupa gambar'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('Gagal memproses foto'));
          resolve(blob);
        }, 'image/jpeg', 0.82);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak dapat dibaca')); };
    img.src = url;
  });

  function showPreview(file) {
    const box = document.getElementById('productPhotoPreview');
    if (!box || !file) return;
    const url = URL.createObjectURL(file);
    box.innerHTML = `<img src="${url}" alt="Preview foto" style="width:100%;height:100%;object-fit:cover;border-radius:10px"><span style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.65);color:#fff;padding:4px 7px;border-radius:6px;font-size:10px">Preview</span>`;
    box.style.position = 'relative';
  }

  async function saveProductForm(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    if (btn?.dataset.saving === '1') return;

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const price = Number(document.getElementById('productPrice').value || 0);
    const cost = Number(document.getElementById('productCost').value || 0);
    const stock = Number(document.getElementById('productStock').value || 0);
    const oldId = document.getElementById('productId').value.trim();
    const photoInput = document.getElementById('productPhotoInput');
    const file = photoInput?.files?.[0] || null;

    if (!name || !category) return window.toast?.('Nama produk dan kategori wajib diisi');
    if (price < 0 || cost < 0 || stock < 0) return window.toast?.('Harga, HPP, dan stok tidak boleh negatif');

    const id = oldId || (typeof window.uid === 'function' ? window.uid() : 'prd-' + Date.now());
    const product = { id, name, category, price, cost, stock };

    try {
      if (btn) { btn.dataset.saving = '1'; btn.disabled = true; btn.textContent = file ? 'Menyimpan & mengunggah...' : 'Menyimpan...'; }

      if (typeof window.apiUrl === 'function' && window.apiUrl()) {
        // Save the product first so the Drive upload has a valid product ID.
        await window.apiPost('saveProduct', { product });

        if (file) {
          const compressed = await compressImage(file);
          const base64 = await fileToBase64(compressed);
          await window.apiPost('uploadProductPhoto', {
            productId: id,
            base64,
            mimeType: 'image/jpeg',
            fileName: (name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'produk') + '-' + id + '.jpg'
          });
        }

        // Let the original app.js update its lexical `db` variable safely.
        if (typeof window.syncFromSheets === 'function') await window.syncFromSheets();
        if (typeof window.setStatus === 'function') window.setStatus(true);
      } else {
        // Local/offline fallback. app.js keeps db in a module-level lexical variable,
        // so use its existing localSave path only when the API is unavailable.
        const local = JSON.parse(localStorage.getItem('deanti_bakery_v2') || '{"products":[],"transactions":[],"cashflows":[]}');
        local.products = Array.isArray(local.products) ? local.products : [];
        const idx = local.products.findIndex(p => String(p.id) === String(id));
        const old = idx >= 0 ? local.products[idx] : {};
        const saved = { ...old, ...product };
        if (idx >= 0) local.products[idx] = saved; else local.products.push(saved);
        localStorage.setItem('deanti_bakery_v2', JSON.stringify(local));
        if (typeof window.syncFromSheets === 'function') window.syncFromSheets();
      }

      document.getElementById('modal')?.classList.add('hidden');
      if (photoInput) photoInput.value = '';
      if (typeof window.renderAll === 'function') window.renderAll();
      window.toast?.(oldId ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
    } catch (err) {
      console.error('Product save error:', err);
      window.toast?.('Gagal menyimpan produk: ' + (err?.message || err));
    } finally {
      if (btn) { btn.dataset.saving = '0'; btn.disabled = false; btn.textContent = 'Simpan Produk'; }
    }
  }

  function init() {
    const form = document.getElementById('productForm');
    if (!form || form.dataset.productFix === '1') return;
    form.dataset.productFix = '1';
    form.addEventListener('submit', saveProductForm);

    const input = document.getElementById('productPhotoInput');
    input?.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) showPreview(file);
    });

    const originalOpen = window.openProduct;
    if (typeof originalOpen === 'function' && !originalOpen.__productFixWrapped) {
      const wrapped = function(p = null) {
        originalOpen(p);
        const preview = document.getElementById('productPhotoPreview');
        const input = document.getElementById('productPhotoInput');
        if (input) input.value = '';
        if (preview) {
          preview.style.position = 'relative';
          preview.innerHTML = p?.photoUrl
            ? `<img src="${String(p.photoUrl).replace(/"/g, '&quot;')}" alt="Foto produk" style="width:100%;height:100%;object-fit:cover;border-radius:10px" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:34px">🍞</span>`
            : '<div class="photo-empty">🍞</div><span>Belum ada foto</span>';
        }
      };
      wrapped.__productFixWrapped = true;
      window.openProduct = wrapped;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => waitFor(init));
  else waitFor(init);
})();
