# Deanti Bakery — Google Sheets Database

Backend ini sudah dikunci ke Google Spreadsheet Deanti Bakery yang Anda berikan:

`https://docs.google.com/spreadsheets/d/1PVBhZn2xhNGitRgjHCo5x3OUX0_DKsx1ZrS2KeN7CAQ/edit`

## 1. Pasang backend ke Spreadsheet

1. Buka Spreadsheet tersebut.
2. Pilih **Extensions → Apps Script**.
3. Hapus kode bawaan Apps Script.
4. Buka file `google-apps-script/Code.gs` di repository GitHub ini.
5. Salin seluruh isinya ke Apps Script.
6. Klik **Save**.
7. Jalankan fungsi `setupDatabase` sekali dari editor Apps Script.
8. Berikan izin Google yang diminta.

Backend menggunakan `SpreadsheetApp.openById()` sehingga tetap menunjuk ke Spreadsheet yang benar meskipun dijalankan sebagai Web App.

## 2. Deploy sebagai API Web App

1. Di Apps Script pilih **Deploy → New deployment**.
2. Pilih tipe **Web app**.
3. **Execute as:** Me.
4. **Who has access:** Anyone.
5. Klik **Deploy**.
6. Salin URL yang berakhir dengan `/exec`.

## 3. Hubungkan ke aplikasi GitHub Pages

1. Buka aplikasi Deanti Bakery.
2. Masuk ke menu **Pengaturan**.
3. Tempel URL Web App `/exec`.
4. Klik **Simpan & Tes Koneksi**.
5. Status akan berubah menjadi **Google Sheets Terhubung** jika koneksi berhasil.

## Struktur database

Backend otomatis menyiapkan:

- `Produk` — master produk, harga jual, HPP, dan stok.
- `Transaksi` — header transaksi kasir.
- `DetailTransaksi` — item per transaksi.
- `Kas` — pemasukan dan pengeluaran.
- `Pengaturan` — konfigurasi tambahan.

## API yang digunakan aplikasi

### GET

`?action=ping` — tes API.

`?action=bootstrap` — mengambil seluruh data untuk dashboard/aplikasi.

### POST

`{"action":"setup"}` — menyiapkan sheet database.

`{"action":"saveProduct","product":{...}}` — tambah/edit produk.

`{"action":"deleteProduct","id":"..."}` — hapus produk.

`{"action":"saveCashflow","item":{...}}` — simpan pemasukan/pengeluaran.

`{"action":"checkout","transaction":{...}}` — simpan transaksi, detail transaksi, pemasukan penjualan, dan kurangi stok secara atomik dengan lock.

## Catatan keamanan

Untuk tahap awal endpoint dapat dibuat **Anyone** agar GitHub Pages dapat mengakses backend. Karena URL endpoint menjadi rahasia operasional, jangan publikasikan URL tersebut di README atau source code. Untuk tahap produksi, tambahkan autentikasi/token dan validasi pengguna/kasir.
