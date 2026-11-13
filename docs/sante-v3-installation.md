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

Au moment de cette préparation, le code V3.1 est installé et testé en simulation, mais l'autorisation supplémentaire et le nouveau déploiement restent à terminer. Le déploiement existant reste en V3 tant que l'étape 4 n'est pas effectuée.

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
