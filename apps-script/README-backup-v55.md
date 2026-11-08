# V55 — Correctif GitHub Pages → Apps Script (CORS)

## État
- **V54 en production inchangée**.
- V55: correction client dans la branche `feature/sauvegarde-drive-auto-v55`.
- Page fictive de test séparée sur `/Stock42/test-v55/`.
- Module serveur de référence : `apps-script/Stock42DriveBackup.gs`.
- Aucune sauvegarde automatique n'est activée avant un test réel de bout en bout.

## Pourquoi le premier test a échoué
Les réponses `ContentService` d'Apps Script sont redirigées via `script.googleusercontent.com`. Un `fetch()` cross-origin de GitHub Pages peut échouer à lire le résultat même si le POST a été traité.

## Protocole préparé
1. `POST` text/plain avec `mode:'no-cors'`, authentifié par le jeton **dans le corps de requête**, avec un identifiant aléatoire `receiptId` (128 bits).
2. Après création confirmée d'un fichier Google Drive, le serveur stocke `s42r_<receiptId> = saved` en cache 1 heure.
3. Le client vérifie le reçu avec une requête GET *read-only* JSONP, sans mot de passe, dont la réponse est uniquement `{ok:true,saved:boolean}`.
4. Sans reçu valide, le client indique une sauvegarde **non confirmée**. **Ne jamais relancer automatiquement immédiatement après une absence de confirmation**, pour limiter les doublons.

## À intégrer dans Code.gs (projet Google Apps Script existant)

**A.** Dans `doGet(e)`, après la ligne `const action = String((e && e.parameter && e.parameter.action) || '');`, insérer :

```javascript
if (action === 'backupReceipt') {
  return stock42BackupReceiptResponse_(e);
}
```

**B.** Dans `doPost(e)`, à l'intérieur du bloc existant `if (action === 'backup')`, juste après la vérification du jeton API, remplacer

```javascript
return json_(handleStock42Backup_(data));
```

par

```javascript
return json_(data && data.receiptId
  ? handleStock42BackupWithReceipt_(data)
  : handleStock42Backup_(data));
```

**C.** Remplacer **entièrement** le fichier `Stock42DriveBackup.gs` par la dernière version présente dans la branche GitHub V55. Cette version utilise le service avancé Drive API v3 et le scope `drive.file`.

**D.** Pour le déploiement de test uniquement, si un endpoint accessible depuis GitHub Pages est nécessaire, le déploiement « Moi uniquement » doit être changé à « Tout le monde ». Ce changement permet des requêtes non authentifiées à `doGet`, dont la branche `action=lots` présente dans `Code.gs` révèle le catalogue ; **ne pas l'effectuer avant d'avoir restreint cette route dans le déploiement de test** ou obtenu un consentement éclairé à cette exposition. Le jeton API reste obligatoire pour toute action POST modifiant le stock ou enregistrant un backup.

**Attention** : les projets Apps Script qui s'exécutent « en tant que moi » ont accès au Drive de leur propriétaire selon leurs OAuth scopes. Le code ne doit ni imprimer ni renvoyer la valeur de B2.

## Limites
- Les fichiers locaux de la PWA ne sont sauvés automatiquement que lorsque l'application est en cours d'exécution et connectée.
- Un POST en mode no-cors peut être envoyé même quand le reçu est bloqué ; une réponse absente ne prouve pas que Drive n'a rien reçu.
- On ne peut pas confirmer automatiquement la sauvegarde avec « Moi uniquement » si les requêtes interdomaines ne passent pas.
- Il faudra tester avec deux lots fictifs et inspecter le dossier Drive avant toute mise en production.
