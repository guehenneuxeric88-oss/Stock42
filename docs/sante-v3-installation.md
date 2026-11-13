# Stock 42 Santé V3.1 — inventaire partagé

Le module Santé utilise uniquement le classeur `1kcr4LWpIyWEKYYUXglsMdENVqnHpY_qwGC3s3UFawwo`. Aucun fichier ni déploiement du stock alimentaire V55 ne doit être modifié.

## État vérifié le 13 novembre 2026

Les données de l'export iPhone ont été importées et relues dans Google Sheets :

| Lot | Taille | Quantité | Lot fabricant | Péremption |
|---|---|---:|---|---|
| S0001 | L | 500 gants | 26000278 | 31/03/2031 |
| S0002 | M | 500 gants | ZFROM2603 | 30/03/2031 |

Deux imports identiques n'ont créé aucun doublon : deux réceptions, une annulation et la sortie V2 reconstituée, soit quatre mouvements. L'heure exacte de cette ancienne sortie est inconnue et signalée dans le motif. Les entrées du journal ont un impact nul : stock = quantité reçue + impacts signés.

## Installation V3.1

1. Le code autonome `apps-script/Stock42SanteTest.gs` contient l'interface partagée et le serveur. Il est installé dans le projet Santé `1pmiPm2x7R29gZuONH4RNWJ8eqgTOfYGgduV5yQSt4F1_uHlcwzzn8Wd2`.
2. Conserver la propriété privée existante `SANTE_API_TOKEN`. Ne pas relancer sa création ni la mettre dans le code, les URL, le classeur, les captures ou les conversations.
3. Exécuter `setupSante`, terminer le consentement Google, vérifier le classeur cible et `configured:true`.
4. Déployer > Gérer les déploiements > modifier le déploiement Santé existant > Nouvelle version > Déployer. Conserver le propriétaire, les droits et l'URL existants. Ne pas modifier les déploiements alimentaires.
5. Ouvrir l'URL Santé /exec : https://script.google.com/macros/s/AKfycby7Z4gp1uORCRMLmAw2IHsjfBPWVl_jXZsUCUdQOgLVK3VwC5FQxLUmic4rYJ9N-zgY/exec
6. Saisir la clé privée Santé dans l'interface. Vérifier 1 000 gants et les deux lots. La clé ne quitte pas les appels authentifiés Google, ne figure pas dans l'URL et reste uniquement en mémoire dans l'onglet.
7. Tester une sortie fictive de 100 gants puis son annulation, contrôler les quantités et le journal dans Sheets, ainsi que l'affichage sur un deuxième appareil. Ne considérer cette étape comme réalisée qu'après contrôle réel.

Mise à jour du 13 novembre 2026 : autorisation Google terminée ; version 3 du déploiement Santé publiée à 18 h 41 (Paris), contenant l’application V3.1. Lecture authentifiée réelle : 1 000 gants. Sortie fictive de 100 gants à 18 h 41 puis annulation à 18 h 42, relues dans Google Sheets : six mouvements au total, impact net nul, deux lots conservés. Deux onglets indépendants affichent successivement 900 puis 1 000 gants. La vérification sur l’iPhone physique reste à effectuer avec la clé Santé.

## Comportement V3.1

- Le même serveur Google fournit l'interface et les opérations : lecture authentifiée sans clé dans les URL, confirmation des écritures dans Sheets.
- Lecture à l'ouverture et actualisation toutes les 30 secondes pendant que l'onglet est visible ; bouton Actualiser disponible.
- Une empreinte de version détecte les changements entre appareils et refuse les commandes périmées.
- Chaque commande dispose d'une référence unique ; le journal ne répète pas une commande déjà enregistrée.
- Verrou côté serveur et journal préalable privé `SANTE_PENDING` : une opération interrompue est reprise avant la prochaine lecture ou écriture. Ne jamais effacer cette propriété pour débloquer un incident sans examiner les données.
- Le POST de snapshots locaux est désactivé dans la nouvelle version pour empêcher l'écrasement par l'ancien prototype.
- Stock en gants ; réceptions en boîtes de 100 ; sorties à l'unité. Annulation complète d'une sortie, une seule fois, sans effacer la trace.
- Lots périmés bloqués en sortie. FEFO proposé par taille, sans substitution automatique L/M. Les lots épuisés restent dans l'historique.
- Export JSON daté, manuel, avec lots, mouvements et version. Ceci n'est pas encore une sauvegarde automatique indépendante ni une restauration testée.
- La page GitHub conserve uniquement l'export des anciens stocks locaux et le lien vers l'interface partagée. Elle n'efface pas le stockage local.

## Vérifications simulées

Authentification ; récupération des 1 000 gants et des anciennes annulations V2 ; sortie et retour ; double envoi ; collision de référence ; commande périmée ; quantité excessive ; dates invalides ; reprise d'une réception interrompue ; perte d'accusé après écriture ; refus des sorties de lots périmés. Les contrôles réels de la version partagée restent distincts.

## Suite prévue

1. Emplacements Santé : valider les lieux physiques, identifiants stables et un premier QR sur iPhone avant impression.
2. Référentiel générique et masques : type, unité, conditionnement, code-barres, lot fabricant facultatif, péremption ; réception et sortie de test dédiées.
3. Sauvegarde indépendante datée, conservation et essai de restauration dans une copie Santé.
4. Vérifier l'usage sur iPhone avec la clé puis simplifier l'accès quotidien sans divulguer cette clé.


## Emplacements existants — V3.2 préparée le 13 novembre 2026

Décision utilisateur : conserver les QR et emplacements existants du 42 et du 38. Aucun nouvel emplacement ni QR à imprimer n’est créé. La V55 alimentaire n’est pas modifiée.

Le registre reprend exactement les 78 codes déjà reconnus par le code V55 : 45 cases de rayonnage 42-R1-N1-A à 42-R3-N5-C, 18 cases 38-ETAGE-01 à 18, 6 congélateur, 5 frigo et 4 garage. Cette liste ne préjuge pas de la disponibilité physique ni de l’adéquation de chaque lieu au produit.

- Bouton Ranger / déplacer sur chaque lot, sélection d’un code existant ou lecture depuis une photo de QR. Aucune modification n’est envoyée avant la confirmation explicite du lot et de sa destination.
- La photo est décodée sur l’appareil avec une copie embarquée de jsQR ; aucun service de lecture externe ne reçoit la photo, la clé ou le stock. Le fichier embarqué conserve sa licence Apache-2.0 et sa provenance.
- Les QR ne sont jamais suivis comme des liens. Un texte inconnu ou une URL est refusé. La liste reste disponible lorsque l’image ne peut pas être décodée.
- L’opération met à jour Site, Emplacement et Statut dans le seul classeur Santé. Le transfert est inscrit dans Mouvements avec source, destination et impact stock nul. La même référence ne peut pas ajouter deux transferts.
- Les réceptions peuvent choisir directement un emplacement existant ; le site est déduit du code 42/38.
- Protection contre les écrans périmés et reprise automatique d’un transfert interrompu, comme pour les autres écritures.

### Installation à terminer

Le contrôle du navigateur du PC est bloqué par sa configuration au moment de cette préparation. Le code V3.2 et les tests sont sauvegardés sur GitHub mais ne sont pas encore installés ni déployés. La version en service reste V3.1, avec les deux lots et les 1 000 gants validés.

Dans le projet Apps Script Santé uniquement : créer le fichier HTML QrDecoder depuis apps-script/QrDecoder.html, puis remplacer Code.gs par apps-script/Stock42SanteTest.gs. Vérifier setupSante et mettre à jour le déploiement existant vers une nouvelle version en conservant l’URL, les autorisations et la clé. Vérifier le chargement des deux lots, la présence des choix 42/38 et du bouton de lecture photo. La caméra et la photo sur l’iPhone physique restent à tester.

Les tests simulés couvrent : codes inconnus et URL refusés ; transfert 42 vers 38 puis retour au 42 ; statuts et sites ; conservation de la quantité ; double envoi ; interruption entre mise à jour de l’emplacement et journal ; refus d’une commande périmée ; réception directement au 38. Le décodeur a aussi reconnu deux images de test des formats 42-R1-N5-C et 38-ETAGE-01. Les images de test ne sont pas des livrables ni de nouvelles étiquettes.

Les lots réels S0001 et S0002 restent À ranger : leur emplacement physique doit être choisi par l’utilisateur dans l’interface, sans affectation fictive.
