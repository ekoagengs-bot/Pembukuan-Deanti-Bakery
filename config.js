// Konfigurasi aplikasi Deanti Bakery
// URL Google Apps Script Web App yang sudah Anda deploy.
const DEANTI_API_URL = 'https://script.google.com/macros/s/AKfycbxEV7XkFpuH52mrhQdvkORiD4LQFcNb77jJANx4yXCzqRcjdtBoue96FAvyMcIj97Y-Cg/exec';

try {
  localStorage.setItem('deanti_bakery_api_url', DEANTI_API_URL);
} catch (e) {
  console.warn('Gagal menyimpan konfigurasi API:', e);
}
