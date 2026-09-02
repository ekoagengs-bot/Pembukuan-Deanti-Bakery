(() => {
  const LOCAL_KEY = 'deanti_bakery_v2';
  const API_KEY = 'deanti_bakery_api_url';

  const apiUrl = () => localStorage.getItem(API_KEY) || '';
  const toast = msg => {
    if (typeof window.toast === 'function') return window.toast(msg);
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  };

  const compressImage = file => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type || !file.type.startsWith('image/')) return reject(new Error('File harus berupa gambar'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
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

  const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('Gagal membaca foto'));
    reader.readAsDataURL(file);
  });

  const post = async (action, data) => {
    const url = apiUrl();
    if (!url) throw new Error('URL Google Sheets belum tersedia');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...data })
    });
    if (!response.ok) throw new Error('Server API tidak merespons (' + response.status + ')');
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'API gagal menyimpan data');
    return result.data;
  };

  const getBootstrap = async () => {
    const url = apiUrl();
    if (!url) return null;
    const response = await fetch(url + '?action=bootstrap&_=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Gagal mengambil data terbaru');
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Gagal mengambil data');
    return result.data;
  };

  function preview(file) {
    const box = document.getElementById('productPhotoPreview');
    if (!box || !file) return;
    const url = URL.createObjectURL(file);
    box.innerHTML = `<img src="${url}" alt="Preview foto produk" style="width:100%;height:100%;object-fit:cover;border-radius:10px"><span style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.65);color:#fff;padding:4px 7px;border-radius:6px;font-size:10px">Preview</span>`;
    box.style.position = 'relative';
  }

  function localDb() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{"products":[],"transactions":[],"cashflows":[]}'); }
    catch (_) { return { products: [], transactions: [], cashflows: [] }; }
  }

  async function saveProduct(e) {
    e.preventDefault();
    e.stopPropagation();
    const form = e.currentTarget;
    if (form.dataset.saving === '1') return;

    const name = document.getElementById('productName')?.value.trim() || '';
    const category = document.getElementById('productCategory')?.value.trim() || '';
    const price = Number(document.getElementById('productPrice')?.value || 0);
    const cost = Number(document.getElementById('productCost')?.value || 0);
    const stock = Number(document.getElementById('productStock')?.value || 0);
    const oldId = document.getElementById('productId')?.value.trim() || '';
    const input = document.getElementById('productPhotoInput');
    const file = input?.files?.[0] || null;

    if (!name) return toast('Nama produk wajib diisi');
    if (!category) return toast('Kategori wajib diisi');
    if (price < 0 || cost < 0 || stock < 0) return toast('Harga, HPP, dan stok tidak boleh negatif');

    const id = oldId || ('prd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
    const product = { id, name, category, price, cost, stock };
    const submit = form.querySelector('button[type="submit"]');

    try {
      form.dataset.saving = '1';
      if (submit) { submit.disabled = true; submit.textContent = file ? 'Menyimpan & upload foto...' : 'Menyimpan...'; }

      if (apiUrl()) {
        await post('saveProduct', { product });
        if (file) {
          const compressed = await compressImage(file);
          const base64 = await fileToBase64(compressed);
          await post('uploadProductPhoto', {
            productId: id,
            base64,
            mimeType: 'image/jpeg',
            fileName: (name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'produk') + '-' + id + '.jpg'
          });
        }
        const fresh = await getBootstrap();
        if (fresh) localStorage.setItem(LOCAL_KEY, JSON.stringify(fresh));
        document.getElementById('modal')?.classList.add('hidden');
        if (input) input.value = '';
        toast(oldId ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
        setTimeout(() => location.reload(), 250);
      } else {
        const db = localDb();
        db.products = Array.isArray(db.products) ? db.products : [];
        const index = db.products.findIndex(p => String(p.id) === String(id));
        const existing = index >= 0 ? db.products[index] : {};
        const saved = { ...existing, ...product };
        if (file) {
          const compressed = await compressImage(file);
          const reader = await fileToBase64(compressed);
          saved.photoUrl = 'data:image/jpeg;base64,' + reader;
        }
        if (index >= 0) db.products[index] = saved; else db.products.push(saved);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
        document.getElementById('modal')?.classList.add('hidden');
        if (input) input.value = '';
        toast(oldId ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
        setTimeout(() => location.reload(), 250);
      }
    } catch (err) {
      console.error('Product save error:', err);
      toast('Gagal menambahkan produk: ' + (err?.message || err));
    } finally {
      form.dataset.saving = '0';
      if (submit) { submit.disabled = false; submit.textContent = 'Simpan Produk'; }
    }
  }

  function init() {
    const form = document.getElementById('productForm');
    if (!form || form.dataset.productFixV2 === '1') return;
    form.dataset.productFixV2 = '1';
    form.addEventListener('submit', saveProduct, true);
    const input = document.getElementById('productPhotoInput');
    input?.addEventListener('change', () => preview(input.files?.[0]));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
