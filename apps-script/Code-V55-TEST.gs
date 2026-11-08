/** V55 TEST uniquement. Installer comme Code.gs avec Stock42DriveBackup.gs.
 * Remplace le point entree TEST : ne pas ajouter a un serveur ayant deja doGet/doPost.
 * Cle privee STOCK42_V55_TEST_TOKEN dans les proprietes, jamais dans Git.
 * Drive v3 / drive.file ; aucun acces Sheets.
 * Tests 08/11/2026 Europe/Paris : connexion OK 18:56 ; L9000 fictif
 * sauvegarde automatiquement 19:01 ; activation conservee apres rechargement ;
 * L9000 + L9001 sauvegardes 19:03, fichier verifie 827 octets :
 * Stock42_auto_20261108_190337_831.json, sans cle ni URL de synchronisation.
 * 142 lots reels preserves ; aucune fusion. Application ouverte et connectee requise.
 * Format compatible v54 conserve. Drive conserve les anciennes copies sans purge.
 * Cloture des essais 08/11/2026 : sauvegarde confirmee apres retour en ligne
 * a 19:25:47 ; fichier Stock42_auto_20261108_192546_679.json controle :
 * 7 elements fictifs L9000 a L9006, aucune cle API.
 * Limite : etat attente hors connexion non observe de bout en bout ;
 * ce scenario reste partiellement verifie, pas de validation complete annoncee.
 * Anciennes sauvegardes toujours presentes ; aucune suppression automatique
 * implementee dans le serveur Drive (limite de 5 uniquement en local).
 * Restauration externe validee le 08/11/2026 : 3 elements fictifs vers 2,
 * L9000 et L9001 verifies, L9002 retire, etat conserve apres rechargement.
 * Sauvegarde automatique apres restauration confirmee a 19:14 :
 * Stock42_auto_20261108_191444_950.json (827 octets), contenu verifie.
 */
/** Stock 42 V55 TEST — sauvegardes Drive uniquement. Aucun accès Sheets. */
function doGet(e) {
  if (String(e && e.parameter && e.parameter.action || '') === 'backupReceipt') return stock42BackupReceiptResponse_(e);
  return json_({ok:false,error:'V55_TEST_GET_DISABLED'});
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e && e.postData && e.postData.contents || '{}');
    if (body.action !== 'backup') return json_({ok:false,error:'V55_TEST_ACTION_DISABLED'});
    const expected = PropertiesService.getScriptProperties().getProperty('STOCK42_V55_TEST_TOKEN');
    if (!expected || String(body.token || '') !== expected) return json_({ok:false,error:'unauthorized'});
    const data = body.data || {};
    return json_(data.receiptId ? handleStock42BackupWithReceipt_(data) : handleStock42Backup_(data));
  } catch (err) {
    return json_({ok:false,error:String(err && err.message || err)});
  } finally { lock.releaseLock(); }
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
