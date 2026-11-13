# Stock 42 Santé V3 — installation de la passerelle test

## Important
Ce module est indépendant de Stock 42 alimentaire V55. Il doit être installé depuis le **classeur Santé**, pas dans le classeur alimentaire. Les 1 000 gants existent pour l'instant uniquement dans le navigateur de test sur iPhone.

Classeur Santé : https://docs.google.com/spreadsheets/d/1kcr4LWpIyWEKYYUXglsMdENVqnHpY_qwGC3s3UFawwo/edit
Application V3 : https://guehenneuxeric88-oss.github.io/Stock42/test-sante-v3/
Code de la passerelle : https://github.com/guehenneuxeric88-oss/Stock42/blob/main/apps-script/Stock42SanteTest.gs

## Procédure PC

1. Dans le classeur Santé, ouvrir **Extensions > Apps Script**.
2. Créer/remplacer le contenu de `Code.gs` dans **ce projet uniquement** par le contenu du fichier GitHub `apps-script/Stock42SanteTest.gs`.
3. Enregistrer le projet.
4. Dans la liste déroulante des fonctions, sélectionner `setupSante`, exécuter et vérifier que l'identifiant retourné correspond au classeur Santé.
5. Exécuter `initializeSanteToken` **une seule fois**. Autoriser les permissions demandées. La clé est créée dans les propriétés privées du projet (`SANTE_API_TOKEN`), jamais dans les journaux. Le propriétaire la reporte lui-même dans l'application et dans son gestionnaire de mots de passe ; ne jamais la partager dans ChatGPT, GitHub ni Google Sheet.
6. Déployer > Nouveau déploiement > Application Web. Exécuter en tant que : moi. Accès : toute personne (les écritures POST exigent la clé privée). Copier l'URL /exec. Attention : avec ce paramétrage le point GET de reçu est publiquement accessible, mais il ne fournit ni stock ni clé.
7. Dans la V3 (même navigateur que le test initial), saisir l'URL /exec et la clé Santé. Vérifier d'abord que les deux lots sont présents et totalisent 1 000 gants. Cliquer sur **Envoyer et vérifier la synchronisation** une seule fois.
8. Vérifier que l'application confirme le reçu, puis consulter le classeur Santé : 2 lots en Réception et les événements dans Mouvements. Si la confirmation échoue, vérifier le classeur avant de réessayer.
9. Ne pas modifier/activer une autre passerelle Apps Script du stock alimentaire.

## Limitations du prototype
- Le mécanisme reste expérimental. Ne pas considérer ce transfert comme une sauvegarde durable avant contrôle des valeurs dans Sheets.
- La V3 conserve des données dans le stockage local du navigateur ; la synchronisation n'est pas bidirectionnelle et ne reconstruit pas encore l'état local depuis Google Drive.
- Le script d'essai gère les deux tailles de gants seulement. Les masques, codes-barres scannés par caméra, emplacements QR et produits additionnels sont à développer et tester séparément.
- La colonne Quantité reçue conserve les réceptions initiales. Stock restant = quantité reçue + somme des impacts des mouvements ; les lignes Entrée du journal ont un impact nul pour ne pas compter deux fois la réception. Les autres impacts sont signés. Les annulations V3 conservent la sortie et la référencent. Pour les anciennes annulations V2, la sortie effacée est reconstituée explicitement avec une date historique inconnue, signalée dans le motif.
- Ne jamais saisir la clé dans une capture d'écran publique ni l'envoyer en discussion.

## Contrôles de reprise du 13 novembre 2026

- Conteneur du projet Apps Script vérifié dans Présentation : classeur Santé ci-dessus.
- Syntaxe corrigée ; classeur cible fixé dans le code, aucun accès au classeur alimentaire.
- Tests simulés : deux lots / 1 000 gants, ancien retour V2 équilibré, double envoi sans ajout de lignes, refus de clé incorrecte et de flux incohérents.
- Aucun test simulé ne constitue une confirmation d'écriture réelle dans Google Sheets.
- Autorisation Google, création de la clé privée, déploiement et transfert depuis le navigateur iPhone restent à effectuer.

## Étapes suivantes après validation de la synchronisation

1. Attribuer les emplacements physiques Santé, définir des identifiants stables et tester un QR sur iPhone avant impression.
2. FEFO : calculer les quantités restantes, exclure les lots épuisés, isoler les périmés et proposer les dates les plus proches (M avant L seulement pour un produit/usage compatible).
3. Sauvegardes : export indépendant daté des lots et mouvements, politique de conservation, puis test de restauration dans une copie Santé.
4. Masques : ajouter un référentiel générique (type, unité, conditionnement, code-barres, lot facultatif, péremption), puis une réception et une sortie de test avant extension du prototype.
