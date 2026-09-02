# Deanti Bakery — Google Sheets Database

## 1. Buat database
1. Buat Google Spreadsheet baru, misalnya **Database Deanti Bakery**.
2. Buka **Extensions → Apps Script**.
3. Hapus kode bawaan dan paste isi `Code.gs` dari folder ini.
4. Simpan, lalu jalankan fungsi `setupDatabase` sekali.
5. Izinkan akses yang diminta Google.

## 2. Deploy sebagai API
1. Di Apps Script pilih **Deploy → New deployment**.
2. Pilih tipe **Web app**.
3. **Execute as:** Me.
4. **Who has access:** Anyone.
5. Deploy dan salin URL yang berakhir dengan `/exec`.

## 3. Hubungkan aplikasi
1. Buka web app Deanti Bakery.
2. Masuk ke **Pengaturan**.
3. Tempel URL `/exec` ke kolom **URL Web App**.
4. Klik **Simpan & Tes Koneksi**.

## Sheet yang otomatis dibuat
- `Produk`: master produk dan stok.
- `Transaksi`: header penjualan.
- `DetailTransaksi`: detail setiap item penjualan.
- `Kas`: pemasukan dan pengeluaran.
- `Pengaturan`: ruang konfigurasi.

## Catatan keamanan
URL Web App yang disetel **Anyone** berarti endpoint dapat dipanggil siapa pun yang mengetahui URL. Untuk penggunaan internal yang sensitif, tambahkan autentikasi/token pada backend sebelum dipakai sebagai sistem produksi.
