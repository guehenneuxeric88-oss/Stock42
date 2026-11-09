/**
 * Stock 42 — Sauvegarde Google Drive via API v3.
 * Nécessite le service avancé Drive v3 et le scope drive.file.
 * La fonction doPost de Code.gs vérifie le jeton AVANT cet appel.
 */
function handleStock42Backup_(input) {
  try {
    if (!input || typeof input !== 'object' || !input.backup) {
      throw new Error('Sauvegarde absente.');
    }
    const b = input.backup;
    if (b.format !== 'stock42-complete' || Number(b.version) < 54) {
      throw new Error('Format Stock 42 incompatible.');
    }
    ['catalog','lots','orders','movements','assignments','products','history']
      .forEach(function(k) {
        if (!Array.isArray(b[k])) throw new Error('Champ manquant : ' + k);
      });
    if (Object.prototype.hasOwnProperty.call(b,'syncKey') ||
        Object.prototype.hasOwnProperty.call(b,'syncUrl')) {
      throw new Error('Données de connexion interdites dans la sauvegarde.');
    }

    const raw = JSON.stringify(b);
    if (raw.length > 5 * 1024 * 1024) {
      throw new Error('Sauvegarde trop volumineuse.');
    }

    const props = PropertiesService.getScriptProperties();
    let folderId = props.getProperty('STOCK42_BACKUP_FOLDER_ID');

    // Uniquement des fichiers et dossiers créés par ce projet.
    if (!folderId) {
      const folder = Drive.Files.create({
        name: 'Stock42_Sauvegardes_Automatiques',
        mimeType: 'application/vnd.google-apps.folder'
      }, null, {fields:'id,name'});
      if (!folder || !folder.id) throw new Error('Création du dossier non confirmée.');
      folderId = folder.id;
      props.setProperty('STOCK42_BACKUP_FOLDER_ID', folderId);
    }

    const stamp = Utilities.formatDate(
      new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss_SSS'
    );
    const name = 'Stock42_auto_' + stamp + '.json';
    const blob = Utilities.newBlob(raw, 'application/json', name);
    const file = Drive.Files.create({
      name: name,
      mimeType: 'application/json',
      parents: [folderId]
    }, blob, {fields:'id,name,parents'});

    if (!file || !file.id) throw new Error('Création Drive non confirmée.');
    return {
      ok: true, backupSaved: true,
      fileId: file.id, folderId: folderId, name: file.name
    };
  } catch (e) {
    return {ok:false, backupSaved:false, error:String(e && e.message || e)};
  }
}

// Vérifie uniquement la disponibilité du service ; aucun fichier modifié.
function testAccesDriveStock42() {
  Logger.log('Service Drive v3 : ' + (typeof Drive !== 'undefined' ? 'disponible' : 'absent'));
}


/**
 * Receipt-only protocol for Github Pages:
 * - POST no-cors: server stores a receipt only AFTER successful Drive creation.
 * - GET JSONP: returns strictly {ok,saved}; never file contents or credentials.
 *
 * The caller's 32-character hexadecimal id is an unpredictable receipt handle.
 * doPost MUST verify the API token before calling this function.
 */
function handleStock42BackupWithReceipt_(data) {
  const id = String(data && data.receiptId || '');
  if (!/^[a-f0-9]{32}$/.test(id)) {
    return {ok:false, backupSaved:false, error:'Identifiant de confirmation invalide'};
  }
  const key = 's42r_' + id;
  // A one-hour receipt enables a safe retry if the original browser request was opaque.
  const prior = CacheService.getScriptCache().get(key);
  if (prior === 'saved') return {ok:true,backupSaved:true,duplicate:true};
  const result = handleStock42Backup_(data);
  if (result.ok === true && result.backupSaved === true && result.fileId) {
    CacheService.getScriptCache().put(key,'saved',3600);
  }
  return result;
}

/**
 * Publicly readable receipt (no secret material). Must be added as a
 * FIRST branch in doGet, before default handling.
 * Using JSONP in this narrowly scoped, read-only endpoint avoids CORS.
 */
function stock42BackupReceiptResponse_(e) {
  const id = String(e && e.parameter && e.parameter.receiptId || '');
  const prefix = String(e && e.parameter && e.parameter.prefix || '');
  if (!/^[a-f0-9]{32}$/.test(id) || !/^stock42Receipt_[a-f0-9]{32}$/.test(prefix)) {
    return ContentService.createTextOutput('/* invalid receipt */')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  const saved = CacheService.getScriptCache().get('s42r_' + id) === 'saved';
  return ContentService.createTextOutput(
    prefix + '(' + JSON.stringify({ok:true,saved:saved}) + ');'
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
