const SHEETS = ['Produk','Transaksi','DetailTransaksi','Kas','Pengaturan'];

function setupDatabase(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const headers={
    'Produk':['id','name','category','price','cost','stock','updatedAt'],
    'Transaksi':['id','no','date','time','method','discount','total','createdAt'],
    'DetailTransaksi':['transactionId','productId','name','price','cost','qty','subtotal'],
    'Kas':['id','date','time','type','category','description','amount','reference'],
    'Pengaturan':['key','value']
  };
  SHEETS.forEach(n=>{let sh=ss.getSheetByName(n);if(!sh)sh=ss.insertSheet(n);if(sh.getLastRow()===0)sh.getRange(1,1,1,headers[n].length).setValues([headers[n]]);});
  PropertiesService.getScriptProperties().setProperty('SETUP','1');
  return 'Database siap: '+SHEETS.join(', ');
}

function cors_(output){return output.setMimeType(ContentService.MimeType.JSON);}
function json_(ok,data,error){return cors_(ContentService.createTextOutput(JSON.stringify({ok,data:data||null,error:error||null})))}
function rows_(sheetName){const sh=SpreadsheetApp.getActive().getSheetByName(sheetName);const values=sh.getDataRange().getValues();if(values.length<2)return[];const h=values[0];return values.slice(1).filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])))}
function dateStr_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');return String(v||'')}
function timeStr_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'HH:mm');return String(v||'')}
function normalize_(d){d.products=(d.products||[]).map(x=>({...x,price:Number(x.price||0),cost:Number(x.cost||0),stock:Number(x.stock||0)}));d.transactions=(d.transactions||[]).map(x=>({...x,date:dateStr_(x.date),time:timeStr_(x.time),discount:Number(x.discount||0),total:Number(x.total||0),items:(x.items||[]).map(i=>({...i,price:Number(i.price||0),cost:Number(i.cost||0),qty:Number(i.qty||0)}))}));d.cashflows=(d.cashflows||[]).map(x=>({...x,date:dateStr_(x.date),time:timeStr_(x.time),amount:Number(x.amount||0)}));return d}
function bootstrap(){if(!PropertiesService.getScriptProperties().getProperty('SETUP'))setupDatabase();const products=rows_('Produk').map(x=>({...x,price:Number(x.price||0),cost:Number(x.cost||0),stock:Number(x.stock||0)}));const tx=rows_('Transaksi');const detail=rows_('DetailTransaksi');const transactions=tx.map(t=>({...t,date:dateStr_(t.date),time:timeStr_(t.time),discount:Number(t.discount||0),total:Number(t.total||0),items:detail.filter(d=>String(d.transactionId)===String(t.id)).map(d=>({id:d.productId,name:d.name,price:Number(d.price||0),cost:Number(d.cost||0),qty:Number(d.qty||0)}))}));const cashflows=rows_('Kas').map(x=>({...x,date:dateStr_(x.date),time:timeStr_(x.time),amount:Number(x.amount||0)}));return normalize_({products,transactions,cashflows})}
function findRow_(sh,id,col){const vals=sh.getDataRange().getValues();for(let i=1;i<vals.length;i++)if(String(vals[i][col-1])===String(id))return i+1;return -1}
function saveProduct_(p){const sh=SpreadsheetApp.getActive().getSheetByName('Produk');const row=findRow_(sh,p.id,1);const data=[[p.id,p.name,p.category,Number(p.price),Number(p.cost),Number(p.stock),new Date()]];if(row>0)sh.getRange(row,1,1,7).setValues(data);else sh.getRange(sh.getLastRow()+1,1,1,7).setValues(data);return bootstrap()}
function deleteProduct_(id){const sh=SpreadsheetApp.getActive().getSheetByName('Produk');const row=findRow_(sh,id,1);if(row>0)sh.deleteRow(row);return bootstrap()}
function saveCashflow_(x){const sh=SpreadsheetApp.getActive().getSheetByName('Kas');sh.getRange(sh.getLastRow()+1,1,1,8).setValues([[x.id,x.date,x.time,x.type,x.category,x.description,Number(x.amount),x.reference||'']]);return bootstrap()}
function checkout_(t){const lock=LockService.getScriptLock();lock.waitLock(20000);try{const db=bootstrap();const productsById=Object.fromEntries(db.products.map(p=>[String(p.id),p]));t.items.forEach(i=>{const p=productsById[String(i.id)];if(!p)throw Error('Produk tidak ditemukan: '+i.name);if(Number(p.stock)<Number(i.qty))throw Error('Stok tidak cukup: '+i.name)});const total=t.items.reduce((s,i)=>s+Number(i.price)*Number(i.qty),0)-Number(t.discount||0);const trx=SpreadsheetApp.getActive().getSheetByName('Transaksi');const det=SpreadsheetApp.getActive().getSheetByName('DetailTransaksi');const kas=SpreadsheetApp.getActive().getSheetByName('Kas');trx.getRange(trx.getLastRow()+1,1,1,8).setValues([[t.id,t.no,t.date,t.time,t.method,Number(t.discount||0),total,new Date()]]);const details=t.items.map(i=>[t.id,i.id,i.name,Number(i.price),Number(i.cost),Number(i.qty),Number(i.price)*Number(i.qty)]);if(details.length)det.getRange(det.getLastRow()+1,1,details.length,7).setValues(details);const prod=SpreadsheetApp.getActive().getSheetByName('Produk');t.items.forEach(i=>{const row=findRow_(prod,i.id,1);if(row>0){const stock=Number(prod.getRange(row,6).getValue()||0);prod.getRange(row,6).setValue(stock-Number(i.qty));prod.getRange(row,7).setValue(new Date())}});kas.getRange(kas.getLastRow()+1,1,1,8).setValues([[t.id,t.date,t.time,'income','Penjualan',t.no,total,t.id]]);SpreadsheetApp.flush();return bootstrap();}finally{lock.releaseLock()}}

function doGet(e){try{const action=(e.parameter||{}).action||'bootstrap';if(action==='bootstrap')return json_(true,bootstrap(),null);if(action==='ping')return json_(true,{message:'Deanti Bakery API aktif',time:new Date().toISOString()},null);return json_(false,null,'Action GET tidak dikenal')}catch(err){return json_(false,null,err.message)}}
function doPost(e){try{const body=JSON.parse(e.postData.contents||'{}');const a=body.action;if(!a)throw Error('Action wajib diisi');if(a==='saveProduct')return json_(true,saveProduct_(body.product),null);if(a==='deleteProduct')return json_(true,deleteProduct_(body.id),null);if(a==='saveCashflow')return json_(true,saveCashflow_(body.item),null);if(a==='checkout')return json_(true,checkout_(body.transaction),null);if(a==='setup')return json_(true,{message:setupDatabase()},null);throw Error('Action tidak dikenal: '+a)}catch(err){return json_(false,null,err.message)}}
