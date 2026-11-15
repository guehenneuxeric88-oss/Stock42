/**
 * Passerelle distincte Stock 42 Santé — raccordement de la copie V55.
 * Étape 3 : lecture seule ; aucune écriture dans l'inventaire ni ses journaux.
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
 console.log(JSON.stringify({ok:true,service:SC_SERVICE,readOnly:true,configured:true,lots:data.lots.length,products:data.products.length,nextLot:data.nextLot}));
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
 return scJson_({ok:true,service:SC_SERVICE,readOnly:true,version:1,authentication:'api-key'});
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
  if(action==='ping')return scReceipt_(requestId,{ok:true,service:SC_SERVICE,readOnly:true});
  if(action==='snapshot')return scReceipt_(requestId,scRead_());
  return scReceipt_(requestId,{ok:false,service:SC_SERVICE,error:'read_only_stage3'});
 }catch(err){return /^[a-f0-9]{32}$/.test(requestId)?scReceipt_(requestId,{ok:false,error:String(err&&err.message||err)}):scJson_({ok:false,error:'invalid_request'});}
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
function scRead_(){
 const ss=SpreadsheetApp.openById(SC_FILE);
 const received=scTable_(ss,SC_LOTS,20,5),moves=scTable_(ss,SC_MOVES,13,5),products=scTable_(ss,SC_PRODUCTS,6,2),orders=scTable_(ss,SC_ORDERS,13,2);
 const impacts={};
 moves.filter(r=>r[1]).forEach(r=>{impacts[r[1]]=(impacts[r[1]]||0)+scNumber_(r[12]);});
 const lots=received.filter(r=>r[0]).map(r=>{
  if(!/^L\d{4}$/.test(r[0]))throw Error('Identifiant Santé invalide : '+r[0]);
  const qty=scNumber_(r[4])+(impacts[r[0]]||0);
  if(qty<0)throw Error('Stock Santé négatif : '+r[0]);
  return {lot:r[0],dateReception:r[1],produit:r[2],categorie:r[3],quantite:qty,quantiteRecue:scNumber_(r[4]),unite:r[5],ddm:r[6],typeDate:r[7],fournisseur:r[8],reference:r[9],zone:r[10],emplacement:r[11],statut:r[12],conditionnement:r[13],lotFabricant:r[14],ouvert:r[15],dateOuverture:r[16],notes:r[17]};
 });
 const identifiers=new Set(lots.map(x=>x.lot));
 if(identifiers.size!==lots.length)throw Error('Lot Santé en double');
 const journal=moves.filter(r=>r[1]).map(r=>({date:r[0],lot:r[1],produit:r[2],type:r[3],quantite:scNumber_(r[4]),unite:r[5],source:r[6],destination:r[7],commentaire:r[8],reference:r[10],createdAt:r[11],impact:scNumber_(r[12]),serverRecorded:true}));
 const refs=products.filter(r=>r[1]).map(r=>({barcode:r[0],name:r[1],brand:r[2],category:r[3],pack:r[4],unit:r[5]}));
 const commands=orders.filter(r=>r[0]).map(r=>({id:r[0],status:r[1],product:r[2],category:r[3],qty:scNumber_(r[4]),unit:r[5],price:r[6],supplier:r[7],reference:r[8],orderDate:r[9],expected:r[10],lot:r[11],notes:r[12]}));
 const max=lots.reduce((n,x)=>Math.max(n,Number(x.lot.slice(1))),0);
 return {ok:true,service:SC_SERVICE,readOnly:true,lots,products:refs,orders:commands,movements:journal,nextLot:'L'+String(max+1).padStart(4,'0'),readAt:new Date().toISOString()};
}

