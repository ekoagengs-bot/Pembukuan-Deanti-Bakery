# Deanti Bakery — Kasir & Pembukuan

Aplikasi web sederhana untuk operasional Deanti Bakery.

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

## Penyimpanan
Versi awal menggunakan `localStorage` browser. Artinya data tersimpan pada perangkat/browser yang digunakan dan belum menjadi database online bersama.

## Menjalankan
Buka `index.html` pada browser. Untuk publikasi paling mudah, aktifkan **GitHub Pages** pada repository ini melalui Settings → Pages → Deploy from branch → `main` → `/ (root)`.

## Pengembangan lanjutan
Untuk kebutuhan usaha multi-perangkat, tahap berikutnya sebaiknya memakai Google Sheets/Firebase/Supabase sebagai database online, dilengkapi login pengguna, sinkronisasi, cetak struk, dan manajemen kasir.
