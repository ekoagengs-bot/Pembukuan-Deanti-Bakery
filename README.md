# Deanti Bakery — Kasir & Pembukuan

Aplikasi web kasir dan pembukuan untuk operasional Deanti Bakery.

## Fitur
- Dashboard omzet, laba kotor, pengeluaran, dan nilai stok
- Kasir / POS dengan keranjang, diskon, pembayaran, dan kembalian
- Produk & stok: tambah, edit, hapus
- Riwayat transaksi
- Pencatatan pemasukan dan pengeluaran
- Laporan rekap penjualan per produk
- Grafik omzet 7 hari
- Export backup data JSON
- Responsive untuk desktop dan Android
- Database online Google Sheets melalui Google Apps Script
- Fallback localStorage saat database online belum dikonfigurasi

## Database Google Sheets
Backend tersedia di `google-apps-script/Code.gs`.
Panduan instalasi ada di `google-apps-script/SETUP.md`.

Alur koneksi:
`Web App GitHub Pages → Google Apps Script Web App → Google Sheets`

Sheet yang digunakan:
- `Produk`
- `Transaksi`
- `DetailTransaksi`
- `Kas`
- `Pengaturan`

## Menjalankan
Buka `index.html` untuk uji lokal. Workflow GitHub Pages juga sudah tersedia di `.github/workflows/pages.yml`.

Setelah GitHub Pages aktif, buka menu **Pengaturan** di aplikasi dan tempel URL Web App Google Apps Script yang berakhir `/exec`, kemudian klik **Simpan & Tes Koneksi**.
