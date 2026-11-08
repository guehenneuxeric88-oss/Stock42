/**
 * Stock 42 — sauvegardes Google Drive (module serveur pour Google Apps Script).
 *
 * Installation : ajouter ce fichier au PROJET APPS SCRIPT EXISTANT, sans remplacer
 * son doPost ni sa validation du jeton API. Dans le routeur doPost, APRÈS
 * validation du jeton, ajouter :
 *
 *   if (request.action === 'backup') {
 *     return ContentService.createTextOutput(
 *       JSON.stringify(handleStock42Backup_(request.data))
 *     ).setMimeType(ContentService.MimeType.JSON);
 *   }
 *
 * Adapter "request" au nom de la variable déjà utilisée dans ce routeur.
 * Publier une nouvelle version du déploiement Web App puis autoriser Drive.
 * Ne jamais publier la valeur du jeton de synchronisation dans GitHub.
 */
function handleStock42Backup_(input) {
  try {
    if (!input || typeof input !== 'object' || !input.backup)
      throw new Error('Sauvegarde absente.');
    var b = input.backup;
    if (b.format !== 'stock42-complete' || Number(b.version) < 54)
      throw new Error('Format Stock 42 incompatible.');
    var required = ['catalog','lots','orders','movements','assignments','products','history'];
    required.forEach(function(k) {
      if (!Array.isArray(b[k])) throw new Error('Champ manquant : ' + k);
    });
    if (Object.prototype.hasOwnProperty.call(b,'syncKey') ||
        Object.prototype.hasOwnProperty.call(b,'syncUrl'))
      throw new Error('Données de connexion interdites dans la sauvegarde.');
    var raw = JSON.stringify(b);
    if (raw.length > 5 * 1024 * 1024)
      throw new Error('Sauvegarde trop volumineuse.');
    var props = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('STOCK42_BACKUP_FOLDER_ID');
    var folder;
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      folder = DriveApp.createFolder('Stock42_Sauvegardes_Automatiques');
      props.setProperty('STOCK42_BACKUP_FOLDER_ID', folder.getId());
    }
    var stamp = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss_SSS');
    var file = folder.createFile('Stock42_auto_' + stamp + '.json',raw,'application/json');
    if (!file || !file.getId()) throw new Error('Création Drive non confirmée.');
    return {ok:true,backupSaved:true,fileId:file.getId(),folderId:folder.getId(),name:file.getName()};
  } catch(e) {
    return {ok:false,backupSaved:false,error:String(e && e.message || e)};
  }
}
