/* Deanti Bakery PRO - Perbaikan Laporan
 * Laba Bersih = Laba Kotor - Pengeluaran
 * File ini menimpa fungsi renderReports() tanpa mengubah alur transaksi yang sudah berjalan.
 */
(function(){
  function renderReportsPro(){
    const s=db.transactions.reduce((a,t)=>a+txTotal(t),0);
    const e=db.cashflows
      .filter(x=>x.type==='expense')
      .reduce((a,x)=>a+Number(x.amount||0),0);

    // Laba kotor = penjualan bersih setelah diskon - HPP barang terjual.
    const grossProfit=db.transactions.reduce((a,t)=>{
      const gross=(t.items||[]).reduce((x,i)=>
        x+(Number(i.price||0)-Number(i.cost||0))*Number(i.qty||0),0);
      return a+gross-Number(t.discount||0);
    },0);

    // Laba bersih sesuai permintaan: laba kotor - seluruh pengeluaran operasional.
    const netProfit=grossProfit-e;

    const salesEl=document.getElementById('reportSales');
    const expenseEl=document.getElementById('reportExpense');
    const profitEl=document.getElementById('reportProfit');
    const netEl=document.getElementById('reportNetProfit');
    const countEl=document.getElementById('reportCount');

    if(salesEl)salesEl.textContent=rupiah(s);
    if(expenseEl)expenseEl.textContent=rupiah(e);
    if(profitEl)profitEl.textContent=rupiah(grossProfit);
    if(netEl){
      netEl.textContent=rupiah(netProfit);
      netEl.style.fontWeight='800';
      netEl.style.color=netProfit>=0?'#2f8f62':'#c94b4b';
    }
    if(countEl)countEl.textContent=db.transactions.length;

    const map={};
    db.transactions.flatMap(t=>t.items||[]).forEach(i=>{
      if(!map[i.id])map[i.id]={name:i.name,qty:0,sales:0,hpp:0};
      map[i.id].qty+=Number(i.qty||0);
      map[i.id].sales+=Number(i.price||0)*Number(i.qty||0);
      map[i.id].hpp+=Number(i.cost||0)*Number(i.qty||0);
    });

    const rows=Object.values(map).sort((a,b)=>b.sales-a.sales);
    const table=document.getElementById('reportProducts');
    if(table){
      table.innerHTML=rows.length
        ?`<table><thead><tr><th>Produk</th><th>Terjual</th><th>Penjualan</th><th>HPP</th><th>Margin</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.qty}</td><td>${rupiah(x.sales)}</td><td>${rupiah(x.hpp)}</td><td class="money">${rupiah(x.sales-x.hpp)}</td></tr>`).join('')}</tbody></table>`
        :'<p style="color:var(--muted)">Belum ada penjualan.</p>';
    }
  }

  // app.js mendefinisikan renderReports sebagai fungsi global.
  // Timpa setelah file app.js selesai dimuat agar renderAll() memakai versi PRO ini.
  window.renderReports=renderReportsPro;
})();
