/**
 * Stock 42 — future Google Sheets bridge.
 * Install this script as a bound Apps Script project on a Google Sheets copy
 * of Gestion_stock_alimentaire_autonomie. Do not put secrets in GitHub.
 *
 * The V3 app is local-first today. This bridge is prepared for the next step:
 * writing app orders / receipts to the workbook after one-time Google authorization.
 */
function stock42Info() {
  return {
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    lotsSheet: 'Réception & lots',
    movementsSheet: 'Mouvements'
  };
}

function ensureStock42OrdersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Commandes Stock42');
  if (!sh) {
    sh = ss.insertSheet('Commandes Stock42');
    sh.getRange(1,1,1,13).setValues([[
      'Commande','Statut','Produit','Catégorie','Quantité','Unité','Prix €',
      'Fournisseur','Référence','Date commande','Livraison prévue','Lot reçu','Notes'
    ]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Run once after installation to create the orders sheet.
 */
function setupStock42() {
  ensureStock42OrdersSheet_();
  return stock42Info();
}
