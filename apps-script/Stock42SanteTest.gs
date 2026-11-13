/**
 * Stock42 Santé — passerelle autonome, version d'essai.
 * Installer UNIQUEMENT dans le classeur Santé (Extensions > Apps Script).
 * Exécuter setupSante() une fois, puis configurer Script Properties:
 *   SANTE_API_TOKEN = secret privé aléatoire créé par le propriétaire.
 * Déployer le projet en application web "Exécuter en tant que moi".
 * Aucun identifiant/secret dans GitHub. Ne jamais installer dans le classeur alimentaire.
 * Un reçu de synchronisation est associé à chaque envoi pour éviter les doublons.
 */
const SANTE_SHEETS = Object.freeze({
  lots:'Réception & lots Santé',
  moves:'Mouvements Santé',
  config:'Configuration Santé'
});
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function lock_() { const l=LockService.getScriptLock();l.waitLock(25000);return l; }
function db_() {
  const ss=SpreadsheetApp.openById('1kcr4LWpIyWEKYYUXglsMdENVqnHpY_qwGC3s3UFawwo');
  if(!ss || ss.getId()!=='1kcr4LWpIyWEKYYUXglsMdENVqnHpY_qwGC3s3UFawwo') throw Error('Classeur interdit : Santé uniquement.');
  if(!ss || !ss.getSheetByName(SANTE_SHEETS.lots) || !ss.getSheetByName(SANTE_SHEETS.moves)) throw Error('Ce script doit être installé dans le classeur Santé.');
  return ss;
}
function initializeSanteToken() {
  db_();
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('SANTE_API_TOKEN')) throw Error('Clé existante : ne pas la remplacer sans préparation.');
  const token=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'');
  props.setProperty('SANTE_API_TOKEN',token);
  // La clé reste dans les propriétés du projet ; aucun journal ne la contient.
  return 'Clé créée dans les propriétés privées du projet.';
}
function setupSante() { const ss=db_();const result={ok:true,spreadsheetId:ss.getId(),service:'Stock42-Sante',configured:!!PropertiesService.getScriptProperties().getProperty('SANTE_API_TOKEN')};console.log(JSON.stringify(result));return result; }
function doGet(e) {
  const p=e&&e.parameter||{};
  if(p.action!=='receipt') return out_({ok:false,error:'read_disabled'});
  const cb=String(p.callback||'');
  if(!/^santeReceipt_[a-zA-Z0-9_]{1,70}$/.test(cb)) return out_({ok:false,error:'callback'});
  const id=String(p.id||'');
  const result=/^[a-f0-9]{32}$/.test(id) && PropertiesService.getScriptProperties().getProperty('sante_receipt_'+id)==='saved';
  return ContentService.createTextOutput(cb+'('+JSON.stringify({ok:true,saved:result})+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function doPost(e) {
  let l;
  try {
    l=lock_();
    const b=JSON.parse(e&&e.postData&&e.postData.contents||'{}');
    const expected=PropertiesService.getScriptProperties().getProperty('SANTE_API_TOKEN');
    if(!expected || String(b.token||'')!==expected) return out_({ok:false,error:'unauthorized'});
    if(b.action!=='sync') return out_({ok:false,error:'unknown_action'});
    const receipt=String(b.receiptId||'');
    if(!/^[a-f0-9]{32}$/.test(receipt)) return out_({ok:false,error:'receipt_invalid'});
    const payload=b.data||{};
    const records=payload.lots;
    let events=payload.events;
    if(!Array.isArray(records)||!Array.isArray(events)||records.length>300||events.length>2000) throw Error('Format ou taille incorrects');
    // V2 removed fictitious exits when undoing them. Restore their audit counterpart.
    events=events.slice();
    events.filter(x=>x.type==='Retour / annulation de sortie'&&!x.reversesUid).forEach(x=>{
      events.push({id:x.id,type:'Sortie',boxes:x.boxes,date:x.date,uid:'legacy_exit_'+x.uid,legacy:true});
    });
    const ids=new Set(), eventIds=new Set();
    records.forEach(x=>{
      if(!/^S[0-9]{4,}$/.test(x.id)||ids.has(x.id)||!['L','M'].includes(x.size)||!Number.isSafeInteger(x.boxes)||x.boxes<0) throw Error('Lot invalide ou dupliqué');
      ids.add(x.id);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(x.expiry)||Utilities.formatDate(isoDate_(x.expiry), 'Europe/Paris','yyyy-MM-dd')!==x.expiry) throw Error('Péremption invalide');
    });
    events.forEach(x=>{
      if(!ids.has(x.id)||!['Entrée','Sortie','Retour / annulation de sortie'].includes(x.type)||!Number.isSafeInteger(x.boxes)||x.boxes<1||!/^[a-zA-Z0-9_-]{8,120}$/.test(x.uid)||eventIds.has(x.uid)||!isoDate_(x.date)) throw Error('Mouvement invalide ou dupliqué');
      eventIds.add(x.uid);
    });
    records.forEach(x=>{
      const net=events.filter(e=>e.id===x.id).reduce((n,e)=>n+(e.type==='Sortie'?-e.boxes:e.boxes),0);
      if(net!==x.boxes) throw Error('Solde des mouvements incohérent : '+x.id);
    });
    const ss=db_(),sh=ss.getSheetByName(SANTE_SHEETS.lots),mh=ss.getSheetByName(SANTE_SHEETS.moves);
    const knownLot=readIds_(sh,1),knownMove=readIds_(mh,11);
    records.forEach(x=>{
      const id=String(x.id||'').trim();
      if(!/^S[0-9]{4,}$/.test(id)|| !['L','M'].includes(x.size)) throw Error('Lot invalide');
      const count=events.filter(e=>e.id===id&&e.type==='Entrée').reduce((n,e)=>n+e.boxes,0);
      if(!Number.isSafeInteger(count)||count<0||count>10000) throw Error('Quantité invalide');
      const date=String(x.expiry||'');
      if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Date invalide');
      const product=x.size==='L'?'Gants nitrile robemed+ Ultra Sensitive — L':'Gants nitrile robemedical+ Ultra Protect — M';
      const row=[
        id,isoDate_(x.received),product,'Protection / EPI',count*100,'gant',
        date?isoDate_(date):'','Péremption','','','Site 42',
        text_(x.location||'À ranger',100),'À ranger','Boîte de 100',
        text_(x.manufacturer||'',80),text_(x.barcode||'',80),
        'Santé V3 : quantité reçue initiale ; entrées du journal à impact nul, autres flux signés'
      ];
      const dest=knownLot[id]||Math.max(2,sh.getLastRow()+1);
      sh.getRange(dest,1,1,row.length).setValues([row]);
      sh.getRange(dest,2).setNumberFormat('dd/mm/yyyy');
      sh.getRange(dest,7).setNumberFormat('dd/mm/yyyy');
      knownLot[id]=dest;
    });
    events.forEach(x=>{
      const id=String(x.id||''),type=String(x.type||''),qty=Number(x.boxes);
      const uid=String(x.uid||'').trim();
      if(!/^S[0-9]{4,}$/.test(id)||!Number.isSafeInteger(qty)||qty<0||qty>10000||!/^[a-zA-Z0-9_-]{8,120}$/.test(uid)) throw Error('Mouvement invalide');
      if(knownMove[uid]) return;
      const impact=type==='Entrée'?0:(type==='Sortie'?-qty*100:qty*100);
      mh.appendRow([isoDate_(x.date),id,'Gants nitrile',type,qty*100,'gant','','',
        x.legacy?'Reconstitution sortie fictive effacée par annulation V2 (date exacte inconnue)':'Test iPhone, unités en gants','Stock42 Santé',uid,new Date(),impact]);
      knownMove[uid]=true;
    });
    SpreadsheetApp.flush();
    const savedLots=readIds_(sh,1),savedMoves=readIds_(mh,11);
    if(records.some(x=>!savedLots[x.id])||events.some(x=>!savedMoves[x.uid])) throw Error('Vérification des écritures impossible');
    PropertiesService.getScriptProperties().setProperty('sante_receipt_'+receipt,'saved');
    return out_({ok:true,saved:true,receiptId:receipt});
  }catch(err){return out_({ok:false,error:String(err&&err.message||err)});}
  finally{if(l)l.releaseLock();}
}
function readIds_(sheet,col) {
  const end=sheet.getLastRow(),result=Object.create(null);
  if(end<2)return result;
  sheet.getRange(2,col,end-1,1).getDisplayValues().forEach((r,i)=>{if(r[0])result[String(r[0])]=i+2});
  return result;
}
function isoDate_(s) {
  if(!s)return '';
  const d=new Date(s);
  return isNaN(d.getTime())?'':d;
}

function text_(value,max) { const s=String(value).slice(0,max);return /^[=+@-]/.test(s)?"'"+s:s; }
