/* Deanti Bakery PRO - Export Laporan Excel
 * Membuat file .xlsx langsung dari data aplikasi.
 * Tidak mengubah data Google Sheets/localStorage.
 */
(function(){
  const money=n=>Number(n||0);
  const safe=v=>String(v??'');
  const dateSelected=()=>{
    const el=document.getElementById('reportDate');
    return el?.value || (typeof today==='function'?today():'');
  };

  function selectedTransactions(){
    const d=dateSelected();
    return (db.transactions||[]).filter(t=>normalizeDate(t.date)===d);
  }

  function exportExcel(){
    if(typeof XLSX==='undefined'){
      if(typeof toast==='function')toast('Modul Excel belum siap. Coba lagi sebentar.');
      return;
    }

    const tx=selectedTransactions();
    const d=dateSelected();
    const expenses=(db.cashflows||[]).filter(x=>normalizeDate(x.date)===d && x.type==='expense');

    const omzet=tx.reduce((a,t)=>a+txTotal(t),0);
    const hpp=tx.reduce((a,t)=>a+(t.items||[]).reduce((x,i)=>x+money(i.cost)*money(i.qty),0),0);
    const gross=tx.reduce((a,t)=>a+(t.items||[]).reduce((x,i)=>x+(money(i.price)-money(i.cost))*money(i.qty),0)-money(t.discount),0);
    const expense=expenses.reduce((a,x)=>a+money(x.amount),0);
    const net=gross-expense;

    const wb=XLSX.utils.book_new();

    // Sheet 1: Ringkasan laporan
    const summary=[
      ['DEANTI BAKERY PRO'],
      ['LAPORAN USAHA'],
      ['Tanggal',d],
      [],
      ['INDIKATOR','NILAI'],
      ['Total Omzet',omzet],
      ['Total HPP',hpp],
      ['Laba Kotor',gross],
      ['Total Pengeluaran',expense],
      ['Laba Bersih',net],
      ['Jumlah Transaksi',tx.length]
    ];
    const wsSummary=XLSX.utils.aoa_to_sheet(summary);
    wsSummary['!cols']=[{wch:28},{wch:22}];
    XLSX.utils.book_append_sheet(wb,wsSummary,'Ringkasan');

    // Sheet 2: Rekap produk pada tanggal laporan
    const productMap={};
    tx.forEach(t=>(t.items||[]).forEach(i=>{
      const key=String(i.id||i.name||'');
      if(!productMap[key])productMap[key]={id:i.id||'',name:i.name||'',qty:0,sales:0,hpp:0};
      productMap[key].qty+=money(i.qty);
      productMap[key].sales+=money(i.price)*money(i.qty);
      productMap[key].hpp+=money(i.cost)*money(i.qty);
    }));
    const productRows=Object.values(productMap).sort((a,b)=>b.sales-a.sales).map(x=>[
      x.id,x.name,x.qty,x.sales,x.hpp,x.sales-x.hpp
    ]);
    const wsProducts=XLSX.utils.aoa_to_sheet([
      ['ID PRODUK','PRODUK','TERJUAL','PENJUALAN','HPP','MARGIN'],
      ...productRows
    ]);
    wsProducts['!cols']=[{wch:38},{wch:25},{wch:12},{wch:18},{wch:18},{wch:18}];
    XLSX.utils.book_append_sheet(wb,wsProducts,'Rekap Produk');

    // Sheet 3: Detail transaksi
    const txRows=[];
    tx.forEach(t=>(t.items||[]).forEach(i=>{
      txRows.push([
        safe(t.no),safe(normalizeDate(t.date)),safe(normalizeTime(t.time)),safe(t.method),
        safe(i.name),money(i.qty),money(i.price),money(i.cost),money(i.price)*money(i.qty),
        money(i.cost)*money(i.qty)
      ]);
    }));
    const wsTx=XLSX.utils.aoa_to_sheet([
      ['NO. TRANSAKSI','TANGGAL','WAKTU','METODE','PRODUK','QTY','HARGA','HPP/UNIT','PENJUALAN','TOTAL HPP'],
      ...txRows
    ]);
    wsTx['!cols']=[{wch:24},{wch:14},{wch:10},{wch:14},{wch:25},{wch:8},{wch:16},{wch:16},{wch:18},{wch:18}];
    XLSX.utils.book_append_sheet(wb,wsTx,'Transaksi');

    // Sheet 4: Pengeluaran
    const expenseRows=expenses.map(x=>[
      safe(normalizeDate(x.date)),safe(normalizeTime(x.time)),safe(x.category),safe(x.description),money(x.amount)
    ]);
    const wsExpense=XLSX.utils.aoa_to_sheet([
      ['TANGGAL','WAKTU','KATEGORI','KETERANGAN','NOMINAL'],
      ...expenseRows
    ]);
    wsExpense['!cols']=[{wch:14},{wch:10},{wch:18},{wch:35},{wch:18}];
    XLSX.utils.book_append_sheet(wb,wsExpense,'Pengeluaran');

    // Sheet 5: Posisi stok saat export
    const stockRows=(db.products||[]).map(p=>[
      safe(p.id),safe(p.name),safe(p.category),money(p.price),money(p.cost),money(p.stock),money(p.price)*money(p.stock)
    ]);
    const wsStock=XLSX.utils.aoa_to_sheet([
      ['ID PRODUK','PRODUK','KATEGORI','HARGA JUAL','HPP','STOK','NILAI STOK'],
      ...stockRows
    ]);
    wsStock['!cols']=[{wch:38},{wch:25},{wch:18},{wch:18},{wch:18},{wch:10},{wch:18}];
    XLSX.utils.book_append_sheet(wb,wsStock,'Produk & Stok');

    const filename=`Laporan-Deanti-Bakery-${d||'Semua-Tanggal'}.xlsx`;
    XLSX.writeFile(wb,filename);
    if(typeof toast==='function')toast('Laporan Excel berhasil dibuat');
  }

  function install(){
    const old=document.getElementById('exportBtn');
    if(!old)return;
    // Clone untuk membersihkan listener export lama dan memastikan tombol memakai export XLSX PRO.
    const btn=old.cloneNode(true);
    btn.textContent='⬇ Export Excel';
    btn.title='Download laporan usaha dalam format Excel (.xlsx)';
    old.replaceWith(btn);
    btn.addEventListener('click',exportExcel);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
  window.exportLaporanExcel=exportExcel;
})();
