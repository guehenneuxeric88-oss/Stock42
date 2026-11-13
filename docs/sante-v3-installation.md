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
5. Exécuter `initializeSanteToken` **une seule fois**. Autoriser les permissions demandées. Copier la clé du journal d'exécution dans un gestionnaire de mots de passe ; ne jamais la partager dans ChatGPT, GitHub ni Google Sheet.
6. Déployer > Nouveau déploiement > Application Web. Exécuter en tant que : moi. Accès : toute personne (les écritures POST exigent la clé privée). Copier l'URL /exec. Attention : avec ce paramétrage le point GET de reçu est publiquement accessible, mais il ne fournit ni stock ni clé.
7. Dans la V3 (même navigateur que le test initial), saisir l'URL /exec et la clé Santé. Vérifier d'abord que les deux lots sont présents et totalisent 1 000 gants. Cliquer sur **Envoyer et vérifier la synchronisation** une seule fois.
8. Vérifier que l'application confirme le reçu, puis consulter le classeur Santé : 2 lots en Réception et les événements dans Mouvements. Si la confirmation échoue, vérifier le classeur avant de réessayer.
9. Ne pas modifier/activer une autre passerelle Apps Script du stock alimentaire.

## Limitations du prototype
- Le mécanisme reste expérimental. Ne pas considérer ce transfert comme une sauvegarde durable avant contrôle des valeurs dans Sheets.
- La V3 conserve des données dans le stockage local du navigateur ; la synchronisation n'est pas bidirectionnelle et ne reconstruit pas encore l'état local depuis Google Drive.
- Le script d'essai gère les deux tailles de gants seulement. Les masques, codes-barres scannés par caméra, emplacements QR et produits additionnels sont à développer et tester séparément.
- Les données envoyées à Sheets représentent les quantités restantes ; les en-têtes et le calcul des flux devront évoluer pour une production complète.
- Ne jamais saisir la clé dans une capture d'écran publique ni l'envoyer en discussion.
