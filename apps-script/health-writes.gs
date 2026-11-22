// Each authoritative mutation is one row write under a script-wide lock.
// Operation IDs are persisted in the same row, so retries cannot duplicate stock.
const SC_META='@S42HEALTH:';
function scMeta_(value){try{return String(value||'').startsWith(SC_META)?JSON.parse(String(value).slice(SC_META.length)):{};}catch(e){return {};}}
function scSafe_(v){return typeof v==='string'&&/^[=+@-]/.test(v)?"'"+v:v;}
function scWriteRow_(name,start,row){
 const sh=SpreadsheetApp.openById(SC_FILE).getSheetByName(name);
 const n=Math.max(start,sh.getLastRow()+1);
 if(n>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),50);
 const values=row.map(scSafe_);
 if(name===SC_LOTS){
  values[18]='=IF(OR(G'+n+'="";H'+n+'="Sans date");"";IF(ISNUMBER(G'+n+');INT(G'+n+');DATE(VALUE(LEFT(G'+n+';4));VALUE(MID(G'+n+';6;2));VALUE(RIGHT(G'+n+';2))))-TODAY())';
  values[19]='=IF(A'+n+'="";"";IF(E'+n+'+SUMIF(Mouvements!B:B;A'+n+';Mouvements!M:M)<=0;"Épuisé";IF(H'+n+'="Sans date";"Sans date";IF(S'+n+'="";"";IF(S'+n+'<0;"Dépassée";IF(S'+n+'<=90;"≤ 3 mois";"OK"))))))';
 }
 if(name===SC_ORDERS)values[1]='=IF(COUNTIF(\'Réception & lots\'!J:J;A'+n+')>0;"Reçue";"Commandée")';
 try{sh.getRange(n,1,1,row.length).setValues([values]);if(name===SC_LOTS)sh.getRange(n,19).setNumberFormat('0');SpreadsheetApp.flush();}
 catch(e){e.uncertain=true;throw e;}return n;
}
function scToday_(){return Utilities.formatDate(new Date(),'Europe/Paris','yyyy-MM-dd');}
function scOperation_(id,action,data){return {operationId:id,action,payload:JSON.stringify(data)};}
function scExisting_(id,action,data){
 const ss=SpreadsheetApp.openById(SC_FILE),tables=[[SC_LOTS,20,5,17],[SC_MOVES,13,5,9],[SC_ORDERS,13,2,12]];
 for(const [name,width,start,col] of tables)for(const row of scTable_(ss,name,width,start)){
  const m=scMeta_(row[col]);if(m.operationId!==id)continue;
  if(m.action!==action||m.payload!==JSON.stringify(data))throw Error('Identifiant de tentative déjà utilisé pour une autre opération.');
  return {ok:true,service:SC_SERVICE,duplicate:true,lot:name===SC_LOTS?row[0]:name===SC_MOVES?row[1]:'',orderId:name===SC_ORDERS?row[0]:m.orderId||''};
 }
 return null;
}
function scLocation_(loc){loc=HealthRules.text(loc).toUpperCase();if(loc&&!/^(?:42-R[1-3]-N[1-5]-[ABC]|38-ETAGE-(?:0[1-9]|1[0-8])|42-CONGELATEUR-0[1-6]|42-FRIGO-0[1-5]|42-GARAGE-0[1-4])$/.test(loc))throw Error('Emplacement inconnu.');return loc;}
function scMutate_(action,data,id){
 const existing=scExisting_(id,action,data);if(existing)return existing;
 const ss=SpreadsheetApp.openById(SC_FILE),snapshot=scRead_(),meta=scOperation_(id,action,data),now=new Date().toISOString();
 if(action==='quickEntry'||action==='receive'){
  const x=HealthRules.validateEntry(data),loc=scLocation_(data.location),orderId=HealthRules.text(data.orderId);
  if(action==='receive'){
   const order=snapshot.orders.find(o=>o.id===orderId);
   if(!order||order.status==='Reçue')throw Error('Commande absente ou déjà réceptionnée.');
   if((order.product!==x.produit&&order.product!==x.health.name)||order.unit!==x.unite)throw Error('Le produit et l’unité doivent correspondre à la commande.');
   if(x.quantite!==order.qty)throw Error('Réception partielle : corrigez ou complétez la commande avant validation.');
  }
  const lot=snapshot.nextLot;if(!/^L\d{4}$/.test(lot))throw Error('Limite de numérotation atteinte.');
  const details={...meta,containerId:scContainer_(data.containerId,snapshot),health:x.health,notes:HealthRules.text(data.notes,1000),orderId,barcode:x.health.barcode};
  scWriteRow_(SC_LOTS,5,[lot,scToday_(),x.produit,x.categorie,x.quantite,x.unite,x.ddm,x.typeDate,HealthRules.text(x.fournisseur),orderId||HealthRules.text(x.reference),loc?(loc.startsWith('38-')?'Site 38':'Site 42'):'',loc,loc?'Rangé':'À ranger',x.conditionnement,HealthRules.text(x.lotFabricant),'Non','',SC_META+JSON.stringify(details),'','']);
  return {ok:true,service:SC_SERVICE,lot,orderId};
 }
 if(action==='container'){
  const x=snapshot.lots.find(l=>l.lot===String(data.lot));if(!x)throw Error('Lot introuvable.');
  if(x.quantite<=0)throw Error('Ce lot est épuisé.');
  const containerId=scContainer_(data.containerId,snapshot);
  if(data.expectedContainerId!==x.containerId)throw Error('Le rangement a changé : actualisez avant de confirmer.');
  // Zero stock impact; retries remain idempotent through the persisted operation ID.
  scWriteRow_(SC_MOVES,5,[scToday_(),x.lot,x.produit,'Rangement contenant',0,x.unite,x.emplacement,x.emplacement,'Rangement de l’ensemble du lot',SC_META+JSON.stringify({...meta,containerId}),'',now,0]);
  return {ok:true,service:SC_SERVICE,lot:x.lot,containerId};
 }
 if(action==='order'){
  const product=HealthRules.text(data.product),category=HealthRules.text(data.category),qty=HealthRules.number(data.qty),unit=HealthRules.text(data.unit);
  if(!product||!HealthRules.categories.includes(category)||!HealthRules.units.includes(unit)||!(qty>0)||!Number.isFinite(qty)||(HealthRules.counts.includes(unit)&&!Number.isSafeInteger(qty)))throw Error('Commande Santé invalide.');
  const next=snapshot.orders.reduce((n,o)=>Math.max(n,Number(String(o.id).slice(1))||0),0)+1;
  const orderId='C'+String(next).padStart(4,'0');
  scWriteRow_(SC_ORDERS,2,[orderId,'Commandée',product,category,qty,unit,data.price==null?'':HealthRules.number(data.price),HealthRules.text(data.supplier),HealthRules.text(data.reference),scToday_(),HealthRules.date(data.expected),'',SC_META+JSON.stringify({...meta,notes:HealthRules.text(data.notes,1000)})]);
  return {ok:true,service:SC_SERVICE,orderId};
 }
 if(action==='movement'||action==='assign'){
  const x=snapshot.lots.find(l=>l.lot===String(data.lot));if(!x)throw Error('Lot introuvable.');
  const loc=action==='assign'?scLocation_(data.location):'',qty=action==='assign'?0:HealthRules.number(data.quantite);
  if(action==='assign'&&!loc)throw Error('Choisissez un emplacement.');
  if(action==='movement'){
   if(!(qty>0)||!Number.isFinite(qty)||qty>x.quantite||(HealthRules.counts.includes(x.unite)&&!Number.isSafeInteger(qty)))throw Error('Quantité de sortie invalide ou stock insuffisant.');
   if(data.unite!==x.unite)throw Error('L’unité de sortie doit correspondre à celle du lot.');
   if(!HealthRules.allowed(x,scToday_()))throw Error('Lot périmé ou péremption manquante : sortie ordinaire bloquée.');
   const first=snapshot.lots.filter(l=>l.produit===x.produit&&l.unite===x.unite&&l.quantite>0&&HealthRules.allowed(l,scToday_())).sort(HealthRules.compare)[0];
   if(first&&first.lot!==x.lot&&!data.fefoOverride)throw Error('Utilisez en priorité '+first.lot+' ('+first.ddm+'), ou confirmez explicitement le choix de cet autre lot.');
  }
  scWriteRow_(SC_MOVES,5,[scToday_(),x.lot,x.produit,action==='assign'?'Transfert':'Sortie Santé',qty,x.unite,x.emplacement,loc,HealthRules.text(data.commentaire,1000)+(data.fefoOverride?' • Autre lot confirmé':''),SC_META+JSON.stringify(meta),'',now,-qty]);
  return {ok:true,service:SC_SERVICE,lot:x.lot,remaining:x.quantite-qty};
 }
 throw Error('Action Santé inconnue.');
}


