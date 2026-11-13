# Stock 42 Santé V3.4 — accès par compte Google

## Version en service

Déploiement Santé version 6 publié le 13 novembre 2026 à 19 h 40 (Paris). Application V3.4.

- Projet Apps Script Santé : 1pmiPm2x7R29gZuONH4RNWJ8eqgTOfYGgduV5yQSt4F1_uHlcwzzn8Wd2.
- Classeur Santé unique : https://docs.google.com/spreadsheets/d/1kcr4LWpIyWEKYYUXglsMdENVqnHpY_qwGC3s3UFawwo/edit
- Application : https://script.google.com/macros/s/AKfycby7Z4gp1uORCRMLmAw2IHsjfBPWVl_jXZsUCUdQOgLVK3VwC5FQxLUmic4rYJ9N-zgY/exec
- Réglages du déploiement vérifiés : Exécuter en tant que Moi ; Qui a accès : Moi uniquement. Ne pas repasser sur Tout le monde.
- Aucun fichier, classeur ou déploiement alimentaire V55 n’a été modifié.

## Accès sans clé sur le téléphone

La mémorisation locale V3.3 fonctionnait sur Chrome, mais l’utilisateur a constaté qu’elle ne survivait pas à la réouverture depuis l’icône iPhone. La V3.4 utilise donc le compte Google propriétaire plutôt qu’une clé enregistrée sur l’appareil.

Chaque lecture et écriture vérifie l’identité Google active contre son empreinte SHA-256 dans SANTE_GOOGLE_OWNER_HASH. Une identité absente ou un compte tiers est refusé, même avec l’ancienne clé. Ne jamais remplacer cette vérification par getEffectiveUser : en exécution comme propriétaire, cela désignerait le propriétaire même pour un visiteur anonyme.

La page ne contient plus de champ de clé et ne lit ni ne mémorise de secret pour se reconnecter. Elle retire l’ancienne entrée locale stock42_sante_remember_v1 lorsqu’elle est accessible. Le stockage bloqué n’empêche plus le chargement. SANTE_API_TOKEN est une propriété historique inutilisée par l’authentification V3.4 ; ne pas la publier ni la recopier sur le téléphone.

Google peut demander de sélectionner ou connecter le compte propriétaire. L’accès est personnel : les comptes Google de la famille ne sont pas encore autorisés. Le bouton Fermer l’inventaire masque la vue sans déconnecter Google des autres applications.

## Installation et mises à jour

1. Dans le projet Santé uniquement, conserver le fichier HTML QrDecoder à partir de apps-script/QrDecoder.html et remplacer Code.gs par apps-script/Stock42SanteTest.gs.
2. Exécuter setupSante depuis l’éditeur du propriétaire. Après le consentement userinfo.email, vérifier configured:true, auth:compte-google-proprietaire, version:3.4 et l’identifiant du classeur Santé. L’empreinte du propriétaire est créée une seule fois ; un autre compte ne peut pas la remplacer silencieusement.
3. Mettre à jour le déploiement Santé existant vers une nouvelle version, conserver son URL, Exécuter en tant que Moi et Qui a accès : Moi uniquement.
4. Ouvrir l’application avec le compte Google propriétaire : aucun champ de clé ne doit apparaître. Vérifier les deux lots et le total de 1 000 gants.
5. Sur l’iPhone, fermer puis rouvrir l’icône Santé et vérifier la connexion Google. Ce dernier contrôle sur l’appareil reste à effectuer après le déploiement V3.4.

## Stock vérifié

| Lot | Taille | Quantité | Lot fabricant | Péremption | Emplacement constaté |
|---|---|---:|---|---|---|
| S0001 | L | 500 gants | 26000278 | 31/03/2031 | 42-R3-N2-A |
| S0002 | M | 500 gants | ZFROM2603 | 30/03/2031 | 42-R3-N2-A |

Les emplacements ont été choisis par l’utilisateur. Les tests de connexion ne les ont pas modifiés. Les deux entrées iPhone ont été importées sans doublons. La sortie effacée par l’ancien test V2 a été reconstituée et signalée avec son heure exacte inconnue. Une sortie fictive de 100 gants puis son annulation ont été vérifiées dans Sheets en V3.1, ainsi que leur visibilité depuis deux onglets. Les écritures de test restent dans le journal.

Stock restant = quantité reçue + somme des impacts signés. Les lignes Entrée du journal ont un impact nul pour ne pas compter deux fois la réception. Les annulations conservent et référencent la sortie d’origine.

## Fonctionnement partagé

- Lecture à l’ouverture et toutes les 30 secondes lorsque l’onglet est visible ; bouton Actualiser.
- Contrôle de version entre appareils, verrou serveur et références uniques contre les doubles envois.
- Journal préalable SANTE_PENDING : reprise avant toute nouvelle lecture ou écriture après interruption. Ne pas effacer cette propriété sans examiner l’opération en attente.
- Ancien POST de snapshots locaux désactivé pour empêcher l’écrasement par un navigateur périmé.
- Gants L et M : entrées par boîtes de 100, sorties à l’unité, annulation complète d’une sortie une seule fois.
- FEFO par taille, sans substitution L/M. Lots périmés bloqués en sortie ; lots épuisés conservés dans l’historique.
- Export JSON daté manuel. Sauvegardes automatiques indépendantes et restauration testée restent à développer.

## Emplacements et QR existants

Décision utilisateur : aucun nouveau QR ni emplacement physique à créer. Les 78 codes reconnus par V55 sont réutilisés : rayonnages du 42, étage du 38, garage, frigo et congélateur. Cette liste ne préjuge ni de la place disponible ni de l’adéquation du lieu à chaque produit.

Ranger / déplacer permet la sélection d’un code ou sa lecture depuis une photo. La photo est décodée sur l’appareil avec jsQR embarqué (licence Apache-2.0 et provenance dans QrDecoder.html), sans service externe. Les URL et les codes inconnus sont refusés. Rien n’est enregistré avant confirmation du lot et de la destination.

Un transfert met à jour Site, Emplacement et Statut dans le seul classeur Santé ; sa source et sa destination sont journalisées avec impact stock nul. La reprise après interruption et l’idempotence s’appliquent aussi au transfert. La lecture photo sur l’iPhone physique et le scan direct continu restent à vérifier/développer.

## Validation V3.4

- Consentement Google terminé ; setupSante a confirmé l’empreinte du propriétaire et la version.
- Déploiement version 6 confirmé avec Moi uniquement.
- Sur Chrome, ouverture puis nouvel onglet sans saisie ni envoi de clé : inventaire confirmé dans Sheets et 1 000 gants retrouvés.
- Tests simulés : propriétaire autorisé sans clé ; anonyme et compte tiers refusés même avec ancienne clé ; écritures contrôlées ; stockage local bloqué sans effet sur l’accès ; fermeture/réouverture de la vue ; reprise réseau.
- Tests de stock/transferts : doubles envois, conflits, quantités invalides, dates, péremption, annulations, deux types de panne, mouvements entre 42/38 et conservation des quantités.

Commandes : node tests/sante-google-connection-v34.cjs et node tests/sante-shared-v31.cjs. Le fichier tests/sante-connection-v33.cjs est un point d’entrée de compatibilité vers les tests V3.4.

## Suite autorisée

Après confirmation de l’accès sans clé depuis l’icône iPhone : simplifier le scan direct des codes-barres produits et des QR existants, puis ajouter le référentiel générique et les masques. Préparer les sauvegardes automatiques et un essai de restauration dans une copie Santé. La clé est la priorité actuelle ; ne pas considérer le test Chrome comme une validation sur iPhone.


## Interface simplifiée — V3.5 préparée, non déployée

Décision utilisateur : commencer par l’interface ; scanner direct en pause. Aucun élargissement aux médicaments n’est activé à ce stade.

Navigation : Accueil, Entrée, Sortie, Stock, Configuration (Config. sur la barre compacte).

- Accueil : trois grandes actions (ajouter, sortir, consulter), nombre de produits/lots disponibles et alertes utiles.
- Entrée : produit, nombre de boîtes, péremption et emplacement ; lot fabricant et code-barres dans une section facultative repliée.
- Sortie : produit puis lot proposé par péremption non dépassée, quantité et confirmation. Aucun lot périmé n’est proposé. La confirmation reste nécessaire.
- Stock : une ligne/carte par produit avec quantité totale. Les lots et leurs emplacements se déplient à la demande ; recherche par nom/taille. Historique replié.
- Configuration : actualisation, export de sauvegarde, fermeture de l’inventaire, informations de connexion et version.

Les opérations, la connexion Google propriétaire, le classeur Santé, les 1 000 gants et leurs emplacements ne sont pas modifiés par cette refonte. La liste d’entrée reste limitée aux deux produits gants L/M ; le référentiel générique pour médicaments et masques vient après validation de l’interface.

Tests passés : navigation des cinq vues, regroupement de plusieurs lots d’un produit, repli initial des détails, recherche, lot FEFO non périmé, absence d’écriture lors de la navigation. Suites stock et connexion Google également passantes. Exécuter npm install --ignore-scripts dans tests, puis npm run test:interface ; les autres tests restent exécutables directement avec Node.

Le code V3.5 et les tests sont sauvegardés sur GitHub. L’installation dans Apps Script et le déploiement attendent le rétablissement de l’accès au navigateur d’origine sur le PC. La V3.4 reste en service. Après installation, vérifier le rendu iPhone et desktop, les cinq vues, le stock inchangé et la connexion sans clé avant de déclarer cette interface active.
