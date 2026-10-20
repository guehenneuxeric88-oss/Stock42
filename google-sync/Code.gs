/**
 * Stock 42 — passerelle Google Sheets.
 * Ce script doit être collé dans Extensions > Apps Script du classeur
 * "Stock 42 - Gestion stock alimentaire autonomie", puis déployé comme
 * application Web (Exécuter en tant que : moi / Accès : toute personne).
 *
 * La clé API n'est PAS dans GitHub. Elle est lue dans l'onglet Configuration.
 */

const LOTS_SHEET = 'Réception & lots';
const MOVES_SHEET = 'Mouvements';
const ORDERS_SHEET = 'Commandes Stock42';
const CONFIG_SHEET = 'Configuration';
const PRODUCTS_SHEET = 'Référentiel produits';

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '');
  if (action === 'products') return json_({ok:true,products:products_()});
  const info = {
    ok: true,
    service: 'Stock42',
    lots: countLots_(),
    nextLot: nextLot_()
  };
  return json_(info);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!body.token || body.token !== apiToken_()) {
      return json_({ok:false,error:'unauthorized'});
    }
    const action = String(body.action || '');
    const data = body.data || {};

    if (action === 'order') return json_(upsertOrder_(data));
    if (action === 'receive') return json_(upsertReceipt_(data));
    if (action === 'assign') return json_(assignLot_(data));
    if (action === 'movement') return json_(appendMovement_(data));
    if (action === 'ping') return json_({ok:true,service:'Stock42',nextLot:nextLot_()});

    return json_({ok:false,error:'unknown_action'});
  } catch (err) {
    return json_({ok:false,error:String(err && err.message ? err.message : err)});
  } finally {
    lock.releaseLock();
  }
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function apiToken_() {
  const sh = ss_().getSheetByName(CONFIG_SHEET);
  if (!sh) throw new Error('Onglet Configuration introuvable');
  return String(sh.getRange('B2').getDisplayValue()).trim();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function countLots_() {
  const sh = ss_().getSheetByName(LOTS_SHEET);
  if (!sh) return 0;
  const last = Math.max(4, sh.getLastRow());
  const vals = sh.getRange(5,1,Math.max(1,last-4),1).getDisplayValues().flat();
  return vals.filter(Boolean).length;
}

function nextLot_() {
  const sh = ss_().getSheetByName(LOTS_SHEET);
  let max = 0;
  if (sh && sh.getLastRow() >= 5) {
    const vals = sh.getRange(5,1,sh.getLastRow()-4,1).getDisplayValues().flat();
    vals.forEach(v => {
      const m = String(v).match(/^L(\d{4})$/);
      if (m) max = Math.max(max, Number(m[1]));
    });
  }
  return 'L' + String(max + 1).padStart(4,'0');
}

function findRowByValue_(sheet, column, value, startRow) {
  const last = sheet.getLastRow();
  if (last < startRow) return 0;
  const vals = sheet.getRange(startRow,column,last-startRow+1,1).getDisplayValues().flat();
  const target = String(value || '').trim();
  const idx = vals.findIndex(v => String(v).trim() === target);
  return idx < 0 ? 0 : startRow + idx;
}

function parseDate_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return v;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
  m = s.match(/^(\d{2})\/(\d{4})$/);
  if (m) return new Date(Number(m[2]),Number(m[1])-1,1);
  return s;
}

function ensureOrdersSheet_() {
  let sh = ss_().getSheetByName(ORDERS_SHEET);
  if (!sh) {
    sh = ss_().insertSheet(ORDERS_SHEET);
    sh.getRange(1,1,1,13).setValues([[
      'Commande','Statut','Produit','Catégorie','Quantité','Unité','Prix €',
      'Fournisseur','Référence','Date commande','Livraison prévue','Lot reçu','Notes'
    ]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function upsertOrder_(d) {
  const sh = ensureOrdersSheet_();
  const id = String(d.id || '').trim();
  if (!id) throw new Error('Commande sans identifiant');
  let row = findRowByValue_(sh,1,id,2);
  if (!row) row = Math.max(2,sh.getLastRow()+1);
  sh.getRange(row,1,1,13).setValues([[
    id,
    d.status || 'Commandée',
    d.product || '',
    d.category || '',
    num_(d.qty),
    d.unit || '',
    num_(d.price),
    d.supplier || '',
    d.reference || '',
    parseDate_(d.orderDate),
    parseDate_(d.expected),
    d.lot || '',
    d.notes || ''
  ]]);
  sh.getRange(row,10,1,2).setNumberFormat('dd/mm/yyyy');
  return {ok:true,action:'order',id:id,row:row};
}

function upsertReceipt_(d) {
  const sh = ss_().getSheetByName(LOTS_SHEET);
  if (!sh) throw new Error('Onglet Réception & lots introuvable');

  let lot = String(d.lot || '').trim();
  if (!/^L\d{4}$/.test(lot)) lot = nextLot_();

  let row = findRowByValue_(sh,1,lot,5);
  if (!row) row = Math.max(5,sh.getLastRow()+1);

  const location = String(d.location || d.emplacement || '').trim();
  const zone = location.startsWith('42-') ? 'Site 42' : (d.zone || 'À affecter');
  const status = location.startsWith('42-') ? 'Rangé' : (d.statut || 'À ranger');

  sh.getRange(row,1,1,18).setValues([[
    lot,
    parseDate_(d.dateReception),
    d.produit || d.product || '',
    d.categorie || d.category || '',
    num_(d.quantite != null ? d.quantite : d.qty),
    d.unite || d.unit || '',
    parseDate_(d.ddm || d.expiry),
    d.typeDate || 'DDM',
    d.fournisseur || d.supplier || '',
    d.reference || d.sourceOrder || '',
    zone,
    location,
    status,
    d.conditionnement || d.pack || '',
    d.lotFabricant || d.makerLot || '',
    'Non',
    '',
    d.notes || ''
  ]]);
  sh.getRange(row,2).setNumberFormat('dd/mm/yyyy');
  sh.getRange(row,7).setNumberFormat('dd/mm/yyyy');
  sh.getRange(row,19).setFormula('=IF(G'+row+'="";"";G'+row+'-TODAY())');
  sh.getRange(row,20).setFormula('=IF(G'+row+'="";"À saisir";IF(G'+row+'<TODAY();"DÉPASSÉE";IF(G'+row+'-TODAY()<=90;"≤ 3 mois";IF(G'+row+'-TODAY()<=180;"≤ 6 mois";"OK"))))');

  const orderId = String(d.sourceOrder || d.orderId || '').trim();
  if (orderId) {
    const orders = ensureOrdersSheet_();
    const orow = findRowByValue_(orders,1,orderId,2);
    if (orow) {
      orders.getRange(orow,2).setValue('Reçue');
      orders.getRange(orow,12).setValue(lot);
    }
  }

  appendMovement_({
    date: d.dateReception || new Date(),
    lot: lot,
    produit: d.produit || d.product || '',
    type: 'Entrée réception',
    quantite: d.quantite != null ? d.quantite : d.qty,
    unite: d.unite || d.unit || '',
    source: '',
    destination: location,
    commentaire: 'Réception ' + (orderId || ''),
    reference: d.reference || orderId || ''
  });

  return {ok:true,action:'receive',lot:lot,row:row};
}

function assignLot_(d) {
  const lot = String(d.lot || '').trim();
  const location = String(d.location || '').trim();
  if (!/^L\d{4}$/.test(lot)) throw new Error('Lot invalide');
  if (!/^42-R[1-3]-N[1-5]-[ABC]$/.test(location)) throw new Error('Emplacement invalide');

  const sh = ss_().getSheetByName(LOTS_SHEET);
  const row = findRowByValue_(sh,1,lot,5);
  if (!row) throw new Error('Lot introuvable : ' + lot);

  const oldLocation = sh.getRange(row,12).getDisplayValue();
  sh.getRange(row,11).setValue('Site 42');
  sh.getRange(row,12).setValue(location);
  sh.getRange(row,13).setValue('Rangé');

  appendMovement_({
    date: new Date(),
    lot: lot,
    produit: sh.getRange(row,3).getDisplayValue(),
    type: 'Déplacement',
    quantite: 0,
    unite: sh.getRange(row,6).getDisplayValue(),
    source: oldLocation,
    destination: location,
    commentaire: 'Affectation QR Stock 42',
    reference: ''
  });
  return {ok:true,action:'assign',lot:lot,location:location};
}

function appendMovement_(d) {
  const sh = ss_().getSheetByName(MOVES_SHEET);
  if (!sh) throw new Error('Onglet Mouvements introuvable');
  const row = Math.max(5,sh.getLastRow()+1);
  const q = num_(d.quantite);
  let impact = '';
  const type = String(d.type || '');
  if (type === 'Sortie consommation' || type === 'Inventaire -' || type === 'Perte / casse') impact = q === '' ? '' : -Math.abs(q);
  else if (type === 'Entrée réception' || type === 'Inventaire +' || type === 'Retour / entrée') impact = q === '' ? '' : Math.abs(q);
  else impact = 0;

  sh.getRange(row,1,1,13).setValues([[
    parseDate_(d.date || new Date()),
    d.lot || '',
    d.produit || '',
    type,
    q,
    d.unite || '',
    d.source || '',
    d.destination || '',
    d.commentaire || '',
    'Stock 42',
    d.reference || '',
    new Date(),
    impact
  ]]);
  sh.getRange(row,1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(row,12).setNumberFormat('dd/mm/yyyy hh:mm');
  return {ok:true,action:'movement',row:row};
}

function products_() {
  const sh = ss_().getSheetByName(PRODUCTS_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getRange(2,1,sh.getLastRow()-1,6).getDisplayValues();
  return vals.filter(r => r[1]).map(r => ({
    barcode: String(r[0] || '').trim(),
    name: String(r[1] || '').trim(),
    brand: String(r[2] || '').trim(),
    category: String(r[3] || '').trim(),
    pack: String(r[4] || '').trim(),
    unit: String(r[5] || '').trim()
  }));
}

function num_(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(String(v).replace(',','.'));
  return Number.isFinite(n) ? n : '';
}

function setupStock42() {
  ensureOrdersSheet_();
  return {
    spreadsheetId: ss_().getId(),
    tokenConfigured: Boolean(apiToken_()),
    nextLot: nextLot_()
  };
}
