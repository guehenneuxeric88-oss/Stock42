// GENERATED: shared health-rules.js + gateway + health-writes.gs
/* Shared, deterministic inventory rules. No treatment or dosing recommendations. */
var HealthRules=(function(){
  const categories=['Médicaments','Pansements / soins','Protection / EPI','Hygiène','Matériel médical','Autre'];
  const units=['boîte','paquet','flacon','tube','sachet','unité','g','ml','L'];
  const counts=['boîte','paquet','flacon','tube','sachet','unité'];
  function text(v,max){return String(v==null?'':v).trim().slice(0,max||200);}
  function number(v){const s=String(v==null?'':v).trim().replace(',','.');return /^\d+(?:\.\d+)?$/.test(s)?Number(s):NaN;}
  function date(v){
    const s=text(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/)||s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    let y,mo,d;
    if(m){if(m[1].length===4){y=+m[1];mo=+m[2];d=+m[3];}else{y=+m[3];mo=+m[2];d=+m[1];}}
    else{const mm=s.match(/^(\d{2})\/(\d{4})$/);if(!mm)return '';mo=+mm[1];y=+mm[2];d=new Date(Date.UTC(y,mo,0)).getUTCDate();}
    if(y<2000||y>2199||mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate())return '';
    return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  }
  function details(raw){const h=raw||{};return {name:text(h.name),dosage:text(h.dosage,60),form:text(h.form,60),kind:h.kind==='gloves'?'gloves':'other',size:text(h.size,10),material:text(h.material,30),perBox:number(h.perBox)||null,contentUnit:text(h.contentUnit,30),barcode:text(h.barcode,60)};}
  function productName(name,h,category){
    h=details(h);let out=text(name);
    if(category==='Médicaments'){if(h.dosage&&!out.toLowerCase().includes(h.dosage.toLowerCase()))out+=' — '+h.dosage;if(h.form&&!out.toLowerCase().includes(h.form.toLowerCase()))out+=' — '+h.form;}
    if(h.kind==='gloves'){if(h.material&&!out.toLowerCase().includes(h.material.toLowerCase()))out+=' — '+h.material;if(h.size&&!out.toUpperCase().includes('TAILLE '+h.size.toUpperCase()))out+=' — taille '+h.size;}
    return out;
  }
  function validateEntry(raw){
    const x=raw||{},h=details(x.health),qty=number(x.quantite),unit=text(x.unite),category=text(x.categorie),name=text(x.produit);
    if(!name||!categories.includes(category)||!units.includes(unit))throw Error('Produit, catégorie et unité Santé sont obligatoires.');
    if(!Number.isFinite(qty)||qty<=0||(counts.includes(unit)&&!Number.isSafeInteger(qty)))throw Error('Saisissez un nombre entier positif de boîtes ou de contenants.');
    if(category==='Médicaments'&&(!h.dosage||!h.form))throw Error('Renseignez le dosage et la forme du médicament.');
    if(h.kind==='gloves'&&(!h.size||!h.material||unit!=='boîte'||!Number.isSafeInteger(h.perBox)||h.perBox<=0))throw Error('Gants : indiquez la taille, la matière et le nombre de gants par boîte. Le stock est suivi en boîtes entières.');
    if(unit==='boîte'&&(!Number.isSafeInteger(h.perBox)||h.perBox<=0||!h.contentUnit))throw Error('Indiquez le contenu et le nombre d’unités par boîte.');
    const type=x.typeDate==='Sans date'?'Sans date':'Péremption',expiry=type==='Sans date'?'':date(x.ddm);
    if(type==='Sans date'&&category==='Médicaments')throw Error('La péremption est obligatoire pour un médicament.');
    if(type!=='Sans date'&&!expiry)throw Error('Péremption invalide : utilisez JJ/MM/AAAA ou MM/AAAA.');
    if(type==='Sans date'&&text(x.ddm))throw Error('Effacez la date ou choisissez Péremption.');
    return {...x,produit:productName(name,h,category),categorie:category,quantite:qty,unite:unit,ddm:expiry,typeDate:type,health:h,conditionnement:unit==='boîte'?h.perBox+' '+h.contentUnit+' par boîte':text(x.conditionnement)};
  }
  function allowed(x,today){return x.typeDate==='Sans date'||!!date(x.ddm)&&date(x.ddm)>=today;}
  function compare(a,b){return (date(a.ddm)||'9999').localeCompare(date(b.ddm)||'9999')||(date(a.dateReception)||'9999').localeCompare(date(b.dateReception)||'9999')||String(a.lot).localeCompare(String(b.lot));}
  return {categories,units,counts,text,number,date,details,productName,validateEntry,allowed,compare};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HealthRules;

/**
 * Passerelle distincte Stock 42 Santé — raccordement de la copie V55.
 * Étape 4 : opérations Santé validées et idempotentes ; fichier Santé exclusivement.
 * La clé est dans Configuration!B2 du fichier Santé privé, jamais publiée ni placée dans une URL.
 */
const SC_SERVICE='Stock42SanteClone';
const SC_FILE='1pac-pS7IW66NgaewGJpGz--1CypMeE2pS1C23qtSMhs';
const SC_LOTS='Réception & lots', SC_MOVES='Mouvements';
const SC_PRODUCTS='Référentiel produits', SC_ORDERS='Commandes Stock42';
function setupSanteClone(){
 const ss=SpreadsheetApp.openById(SC_FILE);
 const cfg=ss.getSheetByName('Configuration');
 if(!cfg||cfg.getRange('B3').getDisplayValue()!==SC_FILE)throw Error('Le fichier Santé ne correspond pas à la configuration.');
 if(!/^[A-Za-z0-9_-]{48,}$/.test(scToken_()))throw Error('Clé Santé absente ou invalide');
 const data=scRead_();
 console.log(JSON.stringify({ok:true,service:SC_SERVICE,readOnly:false,configured:true,lots:data.lots.length,products:data.products.length,nextLot:data.nextLot}));
}
function scToken_(){
 const sh=SpreadsheetApp.openById(SC_FILE).getSheetByName('Configuration');
 return sh?String(sh.getRange('B2').getDisplayValue()).trim():'';
}
function doGet(e){
 const q=e&&e.parameter||{};
 if(q.action==='receipt'){
  if(!/^[a-f0-9]{32}$/.test(q.requestId||'')||!/^stock42SanteCloneRead_[a-f0-9]{32}$/.test(q.callback||''))return scJson_({ok:false,error:'invalid_request'});
  const content=CacheService.getScriptCache().get('sc_receipt_'+q.requestId);
  const data=content?JSON.parse(content):{ok:false,pending:true};
  return ContentService.createTextOutput(q.callback+'('+JSON.stringify(data).replace(/</g,'\\u003c')+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
 }
 return scJson_({ok:true,service:SC_SERVICE,readOnly:false,version:2,authentication:'api-key'});
}
function doPost(e){
 let b,requestId='';
 try{
  const raw=e&&e.postData&&e.postData.contents||'';
  if(raw.length>200000)return scJson_({ok:false,error:'request_too_large'});
  b=JSON.parse(raw);requestId=String(b.requestId||'');
  if(!/^[a-f0-9]{32}$/.test(requestId))return scJson_({ok:false,error:'invalid_request'});
  const expected=scToken_();
  if(!expected||!scEquals_(expected,String(b.token||'')))return scReceipt_(requestId,{ok:false,error:'unauthorized'});
  const action=String(b.action||'');
  if(action==='ping')return scReceipt_(requestId,{ok:true,service:SC_SERVICE,readOnly:false});
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
   if(action==='snapshot')return scReceipt_(requestId,b.data&&b.data.allocationModel===3?scRead_():scLegacyRead_());
   if(!['quickEntry','order','receive','movement','assign','container','split','redistribute','inventory'].includes(action))throw Error('Action Santé inconnue.');
   return scReceipt_(requestId,scMutate_(action,b.data||{},requestId));
  }finally{lock.releaseLock();}
 }catch(err){return /^[a-f0-9]{32}$/.test(requestId)?scReceipt_(requestId,{ok:false,error:String(err&&err.message||err),rejected:!err.uncertain}):scJson_({ok:false,error:'invalid_request'});}
}
function scEquals_(a,b){
 let diff=a.length^b.length;
 for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^(b.charCodeAt(i)||0);
 return diff===0;
}
function scJson_(d){return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON);}
function scReceipt_(id,d){
 const json=JSON.stringify(d);
 if(json.length>80000)d={ok:false,error:'snapshot_too_large'};
 // La requête est authentifiée avant de produire un reçu. Le reçu est un identifiant
 // aléatoire de 128 bits, valable 120 secondes, sans clé API dans l'URL.
 CacheService.getScriptCache().put('sc_receipt_'+id,JSON.stringify(d),120);
 return scJson_({ok:d.ok,accepted:true});
}
function scTable_(ss,name,width,start){
 start=start||2;
 const sh=ss.getSheetByName(name);
 if(!sh)throw Error('Onglet Santé manquant : '+name);
 return sh.getLastRow()<start?[]:sh.getRange(start,1,sh.getLastRow()-start+1,width).getDisplayValues();
}
function scNumber_(v){
 const s=String(v==null?'':v).replace(/\s/g,'').replace(',','.');
 if(!s)return 0;const n=Number(s);if(!Number.isFinite(n))throw Error('Quantité Santé invalide');return n;
}
function scReadPositions_(){
 const ss=SpreadsheetApp.openById(SC_FILE);
 const received=scTable_(ss,SC_LOTS,20,5),moves=scTable_(ss,SC_MOVES,13,5),products=scTable_(ss,SC_PRODUCTS,6,2),orders=scTable_(ss,SC_ORDERS,13,2);
 const lots=received.filter(r=>r[0]).map(r=>{
  if(!/^L\d{4}$/.test(r[0]))throw Error('Identifiant Santé invalide : '+r[0]);
  const qty=scNumber_(r[4]);
  if(qty<0)throw Error('Stock Santé négatif : '+r[0]);
  const metadata=scMeta_(r[17]);
  return {splitFrom:metadata.splitFrom||'',rootLot:metadata.rootLot||r[0],containerId:metadata.containerId||'',health:metadata.health||{},sourceOrder:metadata.orderId||'',barcode:metadata.barcode||'',lot:r[0],dateReception:r[1],produit:r[2],categorie:r[3],quantite:qty,quantiteRecue:scNumber_(r[4]),unite:r[5],ddm:r[6],typeDate:r[7],fournisseur:r[8],reference:r[9],zone:r[10],emplacement:r[11],statut:r[12],conditionnement:r[13],lotFabricant:r[14],ouvert:r[15],dateOuverture:r[16],notes:metadata.notes||(!String(r[17]).startsWith(SC_META)?r[17]:'')};
 });
 // A split is committed in one receipt row. Its metadata debits the parent;
 // no separate write can leave only half of the transfer recorded.
 for(const row of received.filter(r=>r[0])){
  const m=scMeta_(row[17]);if(!m.splitFrom)continue;
  const parent=lots.find(l=>l.lot===m.splitFrom),child=lots.find(l=>l.lot===row[0]);
  const qty=scNumber_(row[4]);
  if(!parent||!child||parent.lot>=child.lot||qty<=0||parent.produit!==child.produit||parent.unite!==child.unite)throw Error('Répartition Santé incohérente.');
  parent.quantite-=qty;if(parent.quantite<0)throw Error('Stock Santé négatif après répartition : '+parent.lot);
 }
 // Replay historical and current operations against their exact physical position.
 for(const r of moves.filter(r=>r[1])){
  const m=scMeta_(r[9]),x=lots.find(p=>p.lot===(m.allocationId||r[1]));
  if(!x)throw Error('Rangement Santé introuvable dans le journal.');
  if(r[3]==='Répartition Santé'){
   const t=m.transfer,qty=scNumber_(r[4]);
   if(!t||!/^P[a-f0-9]{32}$/.test(t.id)&&!t.existing||qty<=0||qty>x.quantite)throw Error('Répartition Santé invalide dans le journal.');
   const target=lots.find(p=>p.lot===t.id);
   if(t.existing&&(!target||target.rootLot!==x.rootLot||target===x))throw Error('Rangement destinataire invalide.');
   if(!t.existing&&target)throw Error('Rangement destinataire déjà utilisé.');
   x.quantite-=qty;
   if(target)target.quantite+=qty;else lots.push({...x,lot:t.id,rootLot:x.rootLot||x.lot,splitFrom:x.lot,quantite:qty,quantiteRecue:0,emplacement:t.location||'',containerId:t.containerId||'',zone:'Site '+t.site,statut:t.location?'Rangé':'À ranger'});
  }else{
   x.quantite+=scNumber_(r[12]);if(x.quantite<0)throw Error('Stock Santé négatif : '+x.rootLot);
   if(r[3]==='Transfert'){x.emplacement=r[7];x.statut=r[7]?'Rangé':'À ranger';}
   if(r[3]==='Rangement contenant')x.containerId=m.containerId||'';
  }
 }
 const containers=scContainers_(ss);
 lots.forEach(x=>{x.containerId=scCanonicalContainer_(x.containerId,x.emplacement,containers);x.zone=scSite_(x.emplacement)?'Site '+scSite_(x.emplacement):x.zone;});
 const identifiers=new Set(lots.map(x=>x.lot));
 if(identifiers.size!==lots.length)throw Error('Lot Santé en double');
 const journal=moves.filter(r=>r[1]||r[3]==='Contrôle inventaire').map(r=>({allocationId:scMeta_(r[9]).allocationId||r[1],transfer:scMeta_(r[9]).transfer,date:r[0],lot:r[1],produit:r[2],type:r[3],quantite:scNumber_(r[4]),unite:r[5],source:r[6],destination:r[7],commentaire:r[8],reference:r[10],createdAt:r[11],impact:scNumber_(r[12]),serverRecorded:true}));
 const refs=products.filter(r=>r[1]).map(r=>({barcode:r[0],name:r[1],brand:r[2],category:r[3],pack:r[4],unit:r[5]}));
 const commands=orders.filter(r=>r[0]).map(r=>({id:r[0],status:r[1],product:r[2],category:r[3],qty:scNumber_(r[4]),unit:r[5],price:r[6],supplier:r[7],reference:r[8],orderDate:r[9],expected:r[10],lot:r[11],notes:scMeta_(r[12]).notes||(!String(r[12]).startsWith(SC_META)?r[12]:'')}));
 commands.forEach(o=>{const lot=lots.find(l=>l.sourceOrder===o.id);if(lot){o.status='Reçue';o.lot=lot.lot;}});
 for(const l of lots)if(!refs.some(p=>p.name===l.produit))refs.push({name:l.produit,category:l.categorie,unit:l.unite,pack:l.conditionnement,barcode:l.barcode,health:l.health});
 const max=received.filter(r=>r[0]).reduce((n,r)=>Math.max(n,Number(r[0].slice(1))),0);
 return {ok:true,service:SC_SERVICE,readOnly:false,version:2,capabilities:{containers:true,siteContainers:true,split:true},containers,lots,products:refs,orders:commands,movements:journal,nextLot:'L'+String(max+1).padStart(4,'0'),readAt:new Date().toISOString()};
}



function scLegacyRead_(){
 const s=scReadPositions_();
 if(s.lots.some(x=>x.lot.startsWith('P')))return {ok:false,error:'Actualisez l’application Santé : les lots ont plusieurs rangements.'};
 return s;
}
function scRead_(){
 const s=scReadPositions_(),roots=new Map();
 for(const p of s.lots){
  const id=p.rootLot||p.lot;
  if(!roots.has(id)){
   const root=s.lots.find(x=>x.lot===id);if(!root)throw Error('Lot d’origine introuvable.');
   roots.set(id,{...root,lot:id,rootLot:id,splitFrom:'',quantite:0,allocations:[],legacyAliases:[]});
  }
  const root=roots.get(id);
  if(p.produit!==root.produit||p.unite!==root.unite||p.ddm!==root.ddm||p.lotFabricant!==root.lotFabricant)throw Error('Les caractéristiques du lot réparti diffèrent.');
  root.quantite+=p.quantite;
  root.allocations.push({id:p.lot,quantite:p.quantite,emplacement:p.emplacement||'',containerId:p.containerId||'',site:scLotSite_(p,s),statut:p.statut});
  if(p.lot!==id&&/^L\d{4}$/.test(p.lot))root.legacyAliases.push(p.lot);
 }
 for(const root of roots.values()){
  const active=root.allocations.filter(a=>a.quantite>0),one=active.length===1?active[0]:null;
  root.emplacement=one?.emplacement||'';root.containerId=one?.containerId||'';root.zone=one?.site?'Site '+one.site:'';
  root.statut=active.every(a=>a.emplacement)?'Rangé':active.length?'À ranger':'Épuisé';
 }
 const byId=new Map(s.lots.map(p=>[p.lot,p.rootLot||p.lot]));
 return {...s,version:3,capabilities:{containers:true,siteContainers:true,split:false,allocations:true},lots:[...roots.values()],orders:s.orders.map(o=>({...o,lot:byId.get(o.lot)||o.lot})),movements:s.movements.map(m=>({...m,legacyLot:m.lot!==byId.get(m.lot)?m.lot:undefined,lot:byId.get(m.lot)||m.lot}))};
}
function scPosition_(snapshot,data){
 const key=String(data.allocationId||data.lot),x=snapshot.lots.find(l=>l.lot===key);
 if(!x)throw Error('Lot ou rangement introuvable.');
 if(data.allocationId&&(x.rootLot||x.lot)!==data.lot)throw Error('Le rangement ne correspond pas au lot.');
 if(!data.allocationId&&snapshot.lots.filter(p=>p.rootLot===data.lot&&p.quantite>0).length>1)throw Error('Ce lot a plusieurs rangements : actualisez et choisissez le rangement concerné.');
 return x;
}
function scCheckPosition_(x,data){
 if(data.expectedQuantity!==x.quantite||data.expectedLocation!==(x.emplacement||'')||data.expectedContainerId!==(x.containerId||''))throw Error('Le stock ou le rangement a changé : actualisez avant de confirmer.');
}

// Optional idempotent status migration; historical quantities and metadata are untouched.
function migrateSanteUniqueLots(){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const ss=SpreadsheetApp.openById(SC_FILE),rows=scTable_(ss,SC_LOTS,20,5),data=scRead_(),sh=ss.getSheetByName(SC_LOTS);
  for(let i=0;i<rows.length;i++){
   const row=rows[i];if(!row[0])continue;const n=i+5,m=scMeta_(row[17]);
   if(m.splitFrom){sh.getRange(n,20).setValue('Rattaché à '+(m.rootLot||m.splitFrom));continue;}
   const lot=data.lots.find(l=>l.lot===row[0]);if(!lot)throw Error('Lot d’origine absent de la migration.');
   const ids=[lot.lot,...lot.legacyAliases],terms=ids.map(id=>'SUMIF(Mouvements!B:B;"'+id+'";Mouvements!M:M)').join('+');
   sh.getRange(n,20).setFormula('=IF(A'+n+'="";"";IF(E'+n+'+'+terms+'<=0;"Épuisé";IF(H'+n+'="Sans date";"Sans date";IF(S'+n+'="";"";IF(S'+n+'<0;"Dépassée";IF(S'+n+'<=90;"≤ 3 mois";"OK"))))))');
  }
  SpreadsheetApp.flush();console.log(JSON.stringify({ok:true,lots:data.lots.length,rangements:data.lots.reduce((n,l)=>n+l.allocations.length,0),quantitesConservees:true}));
 }finally{lock.releaseLock();}
}

function scContainers_(ss){
 const sh=ss.getSheetByName('Contenants Santé');
 if(!sh||sh.getLastRow()<2)return [];
 return sh.getRange(2,1,sh.getLastRow()-1,6).getDisplayValues().filter(r=>/^(?:(?:42|38)-)?SANTE-\d{2}$/.test(r[0])).map(r=>({id:r[0],name:r[1],site:r[2],location:r[3]}));
}
function scSite_(location){return /^(38|42)-/.exec(String(location||''))?.[1]||'';}
function scCanonicalContainer_(id,location,containers){
 if(/^SANTE-\d{2}$/.test(id)&&!containers.some(c=>c.id===id))return (scSite_(location)||'42')+'-'+id;
 return id||'';
}
function scContainer_(value,snapshot,location){
 if(value==null||value==='')return '';
 const id=scCanonicalContainer_(String(value),location,snapshot.containers),box=snapshot.containers.find(x=>x.id===id);
 if(!box)throw Error('Contenant de rangement inconnu.');
 const site=scSite_(location);
 if(site&&(box.site||scSite_(box.id))&&String(box.site||scSite_(box.id))!==site)throw Error('La boîte et l’emplacement doivent appartenir au même site (42 ou 38).');
 return id;
}

function scLotSite_(x,snapshot){return scSite_(x.emplacement)||snapshot.containers.find(c=>c.id===x.containerId)?.site||String(x.zone||'').replace('Site ','');}

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
 const ss=SpreadsheetApp.openById(SC_FILE),snapshot=scReadPositions_(),meta=scOperation_(id,action,data),now=new Date().toISOString();
 if(action==='quickEntry'||action==='receive'){
  const x=HealthRules.validateEntry(data),loc=scLocation_(data.location),orderId=HealthRules.text(data.orderId);
  if(action==='receive'){
   const order=snapshot.orders.find(o=>o.id===orderId);
   if(!order||order.status==='Reçue')throw Error('Commande absente ou déjà réceptionnée.');
   if((order.product!==x.produit&&order.product!==x.health.name)||order.unit!==x.unite)throw Error('Le produit et l’unité doivent correspondre à la commande.');
   if(x.quantite!==order.qty)throw Error('Réception partielle : corrigez ou complétez la commande avant validation.');
  }
  const lot=snapshot.nextLot;if(!/^L\d{4}$/.test(lot))throw Error('Limite de numérotation atteinte.');
  const details={...meta,containerId:scContainer_(data.containerId,snapshot,loc),health:x.health,notes:HealthRules.text(data.notes,1000),orderId,barcode:x.health.barcode};
  scWriteRow_(SC_LOTS,5,[lot,scToday_(),x.produit,x.categorie,x.quantite,x.unite,x.ddm,x.typeDate,HealthRules.text(x.fournisseur),orderId||HealthRules.text(x.reference),loc?(loc.startsWith('38-')?'Site 38':'Site 42'):'',loc,loc?'Rangé':'À ranger',x.conditionnement,HealthRules.text(x.lotFabricant),'Non','',SC_META+JSON.stringify(details),'','']);
  return {ok:true,service:SC_SERVICE,lot,orderId};
 }
 if(action==='container'){
  const x=scPosition_(snapshot,data);
  if(x.quantite<=0)throw Error('Ce lot est épuisé.');
  if(data.allocationId)scCheckPosition_(x,data);
  const containerId=scContainer_(data.containerId,snapshot,x.emplacement||scLotSite_(x,snapshot)+'-');
  if(scCanonicalContainer_(data.expectedContainerId,x.emplacement,snapshot.containers)!==x.containerId)throw Error('Le rangement a changé : actualisez avant de confirmer.');
  // Zero stock impact; retries remain idempotent through the persisted operation ID.
  scWriteRow_(SC_MOVES,5,[scToday_(),x.rootLot||x.lot,x.produit,'Rangement contenant',0,x.unite,x.emplacement,x.emplacement,'Rangement de l’ensemble du lot',SC_META+JSON.stringify({...meta,allocationId:x.lot,containerId}),'',now,0]);
  return {ok:true,service:SC_SERVICE,lot:x.lot,containerId};
 }
 if(action==='split'){
  const x=scPosition_(snapshot,data);
  const qty=HealthRules.number(data.quantite),loc=scLocation_(data.location),site=String(data.site||'');
  if(!['42','38'].includes(site))throw Error('Choisissez le site destinataire.');
  if(loc&&scSite_(loc)!==site)throw Error('L’emplacement doit correspondre au site destinataire.');
  const containerId=scContainer_(data.containerId,snapshot,loc||site+'-');
  if(!(qty>0)||!Number.isFinite(qty)||qty>x.quantite||(HealthRules.counts.includes(x.unite)&&!Number.isSafeInteger(qty)))throw Error('Quantité à répartir invalide ou stock insuffisant.');
  if(data.expectedQuantity!==x.quantite||data.expectedLocation!==x.emplacement||data.expectedContainerId!==x.containerId)throw Error('Le stock ou le rangement a changé : actualisez avant de répartir.');
  const lot=snapshot.nextLot;if(!/^L\d{4}$/.test(lot))throw Error('Limite de numérotation atteinte.');
  const details={...meta,splitFrom:x.lot,rootLot:x.rootLot||x.lot,containerId,site,health:x.health,barcode:x.barcode,notes:x.notes};
  scWriteRow_(SC_LOTS,5,[lot,x.dateReception,x.produit,x.categorie,qty,x.unite,x.ddm,x.typeDate,x.fournisseur,'REPARTITION:'+x.lot,'Site '+site,loc,loc?'Rangé':'À ranger',x.conditionnement,x.lotFabricant,x.ouvert||'Non',x.dateOuverture||'',SC_META+JSON.stringify(details),'','']);
  return {ok:true,service:SC_SERVICE,lot,splitFrom:x.lot,remaining:x.quantite-qty};
 }
 if(action==='redistribute'){
  const x=scPosition_(snapshot,data);scCheckPosition_(x,data);
  const qty=HealthRules.number(data.quantite),site=String(data.site||''),loc=scLocation_(data.location);
  if(!['38','42'].includes(site)||loc&&scSite_(loc)!==site)throw Error('Choisissez un site et un emplacement cohérents.');
  const containerId=scContainer_(data.containerId,snapshot,loc||site+'-');
  if(!(qty>0)||qty>x.quantite||!Number.isFinite(qty)||(HealthRules.counts.includes(x.unite)&&!Number.isSafeInteger(qty)))throw Error('Quantité à répartir invalide ou stock insuffisant.');
  if(scLotSite_(x,snapshot)===site&&(x.emplacement||'')===loc&&(x.containerId||'')===containerId)throw Error('Le rangement source et le rangement destinataire sont identiques.');
  const target=snapshot.lots.find(p=>p!==x&&p.rootLot===x.rootLot&&scLotSite_(p,snapshot)===site&&(p.emplacement||'')===loc&&(p.containerId||'')===containerId);
  const transfer={id:target?target.lot:'P'+id,existing:!!target,site,location:loc,containerId};
  scWriteRow_(SC_MOVES,5,[scToday_(),x.rootLot||x.lot,x.produit,'Répartition Santé',qty,x.unite,x.emplacement,loc,'Répartition sans changement de lot',SC_META+JSON.stringify({...meta,allocationId:x.lot,transfer}),'',now,0]);
  return {ok:true,service:SC_SERVICE,lot:x.rootLot||x.lot,allocationId:transfer.id,remaining:x.quantite-qty};
 }
 if(action==='inventory'){
  const loc=scLocation_(data.location);if(!loc)throw Error('Choisissez un emplacement.');
  const x=data.allocationId?scPosition_(snapshot,data):null;
  if(x&&x.emplacement!==loc)throw Error('Le rangement a changé : actualisez l’inventaire.');
  if(x)scCheckPosition_(x,data);
  scWriteRow_(SC_MOVES,5,[scToday_(),x?.rootLot||x?.lot||'',x?.produit||'','Contrôle inventaire',0,x?.unite||'',loc,loc,data.present===false?'Rangement non retrouvé, à vérifier':'Inventaire conforme',SC_META+JSON.stringify({...meta,allocationId:x?.lot||''}),'',now,0]);
  return {ok:true,service:SC_SERVICE};
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
  const x=scPosition_(snapshot,data);
  const loc=action==='assign'?scLocation_(data.location):'',qty=action==='assign'?0:HealthRules.number(data.quantite);
  if(data.allocationId)scCheckPosition_(x,data);
  if(action==='assign'&&!loc)throw Error('Choisissez un emplacement.');
  if(action==='assign')scContainer_(x.containerId,snapshot,loc);
  if(action==='movement'){
   if(!(qty>0)||!Number.isFinite(qty)||qty>x.quantite||(HealthRules.counts.includes(x.unite)&&!Number.isSafeInteger(qty)))throw Error('Quantité de sortie invalide ou stock insuffisant.');
   if(data.unite!==x.unite)throw Error('L’unité de sortie doit correspondre à celle du lot.');
   if(!HealthRules.allowed(x,scToday_()))throw Error('Lot périmé ou péremption manquante : sortie ordinaire bloquée.');
   const first=snapshot.lots.filter(l=>l.produit===x.produit&&l.unite===x.unite&&scLotSite_(l,snapshot)===scLotSite_(x,snapshot)&&l.quantite>0&&HealthRules.allowed(l,scToday_())).sort(HealthRules.compare)[0];
   if(first&&(first.rootLot||first.lot)!==(x.rootLot||x.lot)&&!data.fefoOverride)throw Error('Utilisez en priorité '+first.lot+' ('+first.ddm+'), ou confirmez explicitement le choix de cet autre lot.');
  }
  scWriteRow_(SC_MOVES,5,[scToday_(),x.rootLot||x.lot,x.produit,action==='assign'?'Transfert':'Sortie Santé',qty,x.unite,x.emplacement,loc,HealthRules.text(data.commentaire,1000)+(data.fefoOverride?' • Autre lot confirmé':''),SC_META+JSON.stringify({...meta,allocationId:x.lot}),'',now,-qty]);
  return {ok:true,service:SC_SERVICE,lot:x.lot,remaining:x.quantite-qty};
 }
 throw Error('Action Santé inconnue.');
}


