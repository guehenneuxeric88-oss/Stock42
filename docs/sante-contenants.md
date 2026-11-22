# Contenants Santé facultatifs

Le contenant de rangement est distinct du conditionnement commercial et de l’adresse physique sur le rayonnage. Le registre privé `Contenants Santé` fournit les identifiants et libellés. Aucun site ou emplacement n’est déduit des intitulés. Le registre n’est jamais publié dans le dépôt.

## Comportement

- Choix facultatif lors d’une entrée rapide ou d’une réception ; valeur vide autorisée.
- Écran Stock : association ou retrait du contenant pour l’ensemble du lot, avec confirmation explicite. L’emplacement reste inchangé.
- Un lot réparti entre plusieurs contenants ou entre boîte et étagère nécessite des affectations avec quantités ; cette fonction n’est pas incluse et aucune répartition automatique n’est réalisée.
- Affichage du contenant dans les détails de quantité des lots ; conditionnement commercial conservé.
- Mode invité et absence de connexion : écritures bloquées.

## Stockage et compatibilité

Les lots restent sur vingt colonnes. L’entrée conserve `containerId` dans les métadonnées du lot ; les changements sont des événements « Rangement contenant » dans Mouvements, d’impact stock nul. Les identifiants d’opération, le verrou et la vérification du contenant attendu protègent contre les doublons et les modifications concurrentes. Les anciens lots ont un contenant vide.

La passerelle annonce `capabilities.containers`. Sans ce signal, les nouveaux contrôles sont désactivés et les entrées ordinaires restent compatibles. Le registre est lu uniquement dans le fichier Santé ; les lignes de documentation sont exclues par le format strict des identifiants.

## Validation

`cd tests && npm install && npm run test:containers`

Les tests utilisent des données fictives : entrée sans contenant, choix d’un contenant, retrait, registre invalide, lots historiques, concurrence, nouvelle tentative après confirmation perdue, quantités et emplacements conservés, mode invité et ancienne passerelle.

## Activation

Déployer d’abord le fichier Apps Script généré `apps-script/Stock42SanteClone.gs` dans la passerelle Santé existante en conservant son URL, puis publier l’interface et son service worker. Vérifier une synchronisation réelle avant de confirmer la mise en service. Aucun lot réel ne doit être affecté pour les essais sans instruction de l’utilisateur.
