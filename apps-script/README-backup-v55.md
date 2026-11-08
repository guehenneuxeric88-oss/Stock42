# Stock 42 V55 — Sauvegardes Google Drive automatiques

Cette branche est une **préparation**, non un déploiement actif. La V54 reste en production.

## Architecture et sécurité

- L'application garde ses 5 sauvegardes locales.
- L'utilisateur doit d'abord appuyer sur **Tester la connexion Drive**.
- L'application n'accepte comme preuve que la réponse `{ok:true,backupSaved:true,fileId:"..."}` du serveur. Elle ne prend **jamais** un simple `ok:true` pour une preuve.
- Après test réussi, l'utilisateur active explicitement le mode automatique.
- Les changements locaux déclenchent une sauvegarde 8 secondes après la dernière modification, **seulement pendant l'utilisation de l'application** et en présence d'Internet.
- En l'absence de connexion, un indicateur local note la sauvegarde en attente et l'application réessaie lorsqu'elle est rouverte ou repasse en ligne.
- Les fichiers dans Drive ne comportent pas la clé API ni l'URL du script, qui sont supprimées du contenu sauvegardé.
- Aucune suppression ni rotation des fichiers cloud n'est activée : on évite la perte de versions tant que le fonctionnement réel n'est pas confirmé.

## Configuration Google Apps Script indispensable

Le code actuel du serveur Apps Script n'est pas présent dans le dépôt GitHub et n'a **pas** été modifié.

1. Dans le projet Apps Script qui sert déjà Stock 42, ajouter le fichier `apps-script/Stock42DriveBackup.gs`.
2. Dans la fonction `doPost`, identifier le bloc existant qui valide le jeton de synchronisation.
3. **Après** validation du jeton, brancher l'action `backup` sur `handleStock42Backup_(request.data)`. Ne pas créer une seconde fonction `doPost`. Ne pas contourner la vérification de jeton.
4. Autoriser l'accès à Google Drive pour ce projet et redéployer sa Web App en nouvelle version.
5. Dans la V55 de test, cliquer sur **Tester la connexion Drive** puis vérifier la présence du fichier dans le dossier `Stock42_Sauvegardes_Automatiques` du bon compte Google.
6. Vérifier le contenu JSON et l'absence de données de connexion, puis activer les sauvegardes automatiques.

Le module crée un dossier privé dans le Drive du compte qui exécute le script, et ne touche pas au tableur ni aux stocks. Le système est **non opérationnel** tant que le serveur n'est pas mis à jour et que le test réel n'est pas concluant.

## Limites

Une PWA iPhone fermée ne peut pas garantir l'exécution du JavaScript de sauvegarde. Le mode automatique ne remplace pas une sauvegarde planifiée côté serveur. Google Sheets continue à fournir la base des lots, mais l'historique local, les commandes, préférences, emplacements et références 100 % sont copiés uniquement lorsque l'application est ouverte, le mode activé et l'envoi confirmé.
