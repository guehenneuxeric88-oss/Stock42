# Raccordement Santé au stock vierge — étape 3

## Destination

Nouveau fichier vide : https://docs.google.com/spreadsheets/d/1pac-pS7IW66NgaewGJpGz--1CypMeE2pS1C23qtSMhs/edit

Projet Apps Script distinct : https://script.google.com/home/projects/1sPGt2TvwLQT-PevsLO39yueMdg9xuZpFjyEB08_bSVAM4Fja3JuBJuOB/edit

La reprise des deux anciens lots et de leur historique est abandonnée à la demande de l’utilisateur. Ils seront ressaisis après les vérifications.

## Accès

Une clé aléatoire distincte de l’alimentaire est enregistrée uniquement dans Configuration!B2 du nouveau fichier privé. Elle n’est ni dans le dépôt, ni dans une URL, ni dans les exports.

Le manifeste limite cette étape au scope spreadsheets.readonly. Le code lit seulement le fichier Santé fixé dans SC_FILE. setupSanteClone vérifie son identifiant et la présence d’une clé, puis affiche uniquement les compteurs.

## Transport

Le client envoie la clé par POST text/plain, puis récupère le résultat par un reçu aléatoire de 128 bits valable 120 secondes. Le mécanisme reprend le principe de confirmation asynchrone déjà utilisé pour les sauvegardes alimentaires afin de ne pas confondre une requête envoyée et un résultat confirmé malgré les restrictions CORS Apps Script.

GET ne publie aucun catalogue. Le reçu renvoie les données seulement après un POST authentifié. Les callbacks sont validés. Toutes les actions d’écriture sont refusées pendant cette étape ; les commandes de modification sont désactivées côté interface.

## État

- Passerelle enregistrée dans le nouveau projet Apps Script, liée au fichier vierge.
- Clé distincte enregistrée dans le fichier privé.
- Client de connexion et tests préparés sur la branche feature/duplication-stock42-sante.
- Tests locaux de lecture/authentification/isolation réussis.
- Autorisation Google demandée au premier lancement : à valider par le propriétaire.
- Déploiement et essai réel depuis la copie encore à terminer après autorisation.
- Aucun produit saisi, aucune migration ni écriture de stock.
- Sauvegarde Drive et activation des écritures non configurées à cette étape.

## Vérification locale

node tests/sante-stock42-backend.cjs
node tests/sante-stock42-clone.cjs

Le second test nécessite les dépendances de tests/package.json. Les données des tests sont fictives et ne sont jamais envoyées aux fichiers réels.

