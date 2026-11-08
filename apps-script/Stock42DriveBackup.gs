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
