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


## Bilan de validation du 9 novembre 2026

La clé Drive est désormais indépendante de la clé Google Sheets (commit fdc5fff). Le bac à sable a été aligné sur ce traitement (473c7f8, uniquement test-v55/app/index.html). Test Drive réel confirmé à 20:39:22, puis modification fictive L9007 sauvegardée automatiquement à 20:39:50. Fichier vérifié : Stock42_auto_20261109_203947_042.json, huit éléments fictifs, aucune clé API. Les champs de connexion Sheets du bac à sable étaient vides.

Cinq tests déterministes de la logique extraite du candidat V55 ont réussi avec stockage et réseau simulés :

- Hors connexion : attente persistante, aucun envoi.
- Événement online : reprise programmée.
- Confirmation serveur : attente effacée et date enregistrée.
- Sauvegardes désactivées : aucune reprise automatique.
- Modifications rapprochées : une seule programmation.

Ces tests de logique ne remplacent pas un test navigateur complet pendant une coupure réelle : ce dernier reste partiellement vérifié. La restauration externe et la sauvegarde après restauration ont été validées le 8 novembre avec des données fictives. Drive conserve toutes les anciennes copies, sans purge automatique ; la limite de cinq concerne les copies locales.

Aucune fusion de cette PR ni activation dans l’application principale n’a été effectuée. Les 142 lots réels et Google Sheets n’ont pas été modifiés pendant ces essais. Avant production : validation explicite de l’utilisateur, vérification de la configuration du serveur Drive dédié, sauvegarde de précaution et contrôle du déploiement.


## Plan de déploiement préparé le 9 novembre 2026 — validation requise

État observé : PR #11 ouverte, sans conflit avec main ; aucun contrôle GitHub Actions attaché à la PR. Base main de référence : 473c7f85e75283250866174126a0df9d2351c8a2. Cette référence est un repère de comparaison, pas une instruction de réinitialisation. Revérifier main juste avant fusion.

### Périmètre

La PR modifie index.html, service-worker.js et les fichiers du dossier apps-script. Aucun changement de lots.json ni du module google-sync. Le stockage réel conserve ses noms existants ; les essais test-v55 utilisent leurs propres clés isolées. La nouvelle clé Drive n’est pas copiée depuis la clé Sheets et aucun secret n’est intégré au dépôt.

### Étape A : publier le code, uniquement après accord explicite

1. Vérifier que main n’a pas changé et examiner à nouveau les fichiers de la PR.
2. Fusionner uniquement la PR #11 puis attendre la réussite du workflow GitHub Pages pour ce commit.
3. Vérifier les fichiers publiés et la version du cache sans ouvrir l’application réelle tant que l’interdiction de toute interaction Sheets est maintenue.
4. Ne pas modifier les lots, ne pas restaurer une sauvegarde fictive dans l’application principale et ne pas remplacer le serveur de synchronisation Sheets par Code-V55-TEST.gs. Ce dernier est un serveur de sauvegarde exclusivement.

### Étape B : activer Drive sur les données réelles — accord distinct

Cette étape enverra une copie des données réelles vers le serveur Drive dédié. Avant de la lancer, convenir explicitement de la levée ou du maintien de la contrainte Sheets : l’application existante peut synchroniser les lots à son ouverture si une connexion est déjà configurée. Préparer une copie de précaution des données réelles actuelles ; ne jamais utiliser les sauvegardes L9000–L9007 comme données réelles.

Configurer uniquement les champs Drive avec une clé dédiée cohérente avec STOCK42_V55_TEST_TOKEN du serveur testé (ou une configuration de production dédiée vérifiée). Les propriétés Apps Script sont communes aux versions d’un même projet : ne pas changer la clé ou le dossier d’un projet partagé sans vérifier les déploiements qui en dépendent. Conserver la connexion Sheets existante. Tester Drive, vérifier le fichier créé et l’absence de secrets, puis activer volontairement. Les réglages du bac à sable ne sont pas transférés automatiquement vers l’application principale.

### Retour arrière

Avant activation Drive : si le code publié présente un problème, annuler le commit de fusion par un nouveau commit de revert, puis laisser Pages redéployer ; ne pas réinitialiser main et ne pas écraser les changements d’autrui. Après activation : désactiver d’abord les sauvegardes Drive, puis appliquer le même retour de code si nécessaire. Ne supprimer aucun fichier Drive ni aucune donnée locale. Les données et les paramètres restent distincts du retour de code.

### Limites connues

Les tests réels réussis couvrent les sauvegardes fictives, la restauration, la clé Drive dédiée et la persistance après rechargement. Cinq tests de logique réseau simulée ont réussi. Le scénario navigateur complet pendant une coupure reste partiellement vérifié ; aucune garantie d’exécution PWA fermée. Pas de purge automatique Drive.

Ce plan n’autorise ni fusion, ni activation des sauvegardes sur les lots réels.
