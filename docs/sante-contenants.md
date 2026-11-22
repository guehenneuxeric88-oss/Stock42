# Contenants Santé facultatifs

Le contenant de rangement est distinct du conditionnement commercial et de l’adresse physique sur le rayonnage. Le registre privé `Contenants Santé` fournit les identifiants et libellés. Le site est enregistré explicitement dans le registre ; l’emplacement physique reste à préciser. Le registre n’est jamais publié dans le dépôt.

## Comportement

- Choix facultatif lors d’une entrée rapide ou d’une réception ; valeur vide autorisée.
- Écran Stock : association ou retrait du contenant pour l’ensemble du lot, avec confirmation explicite. L’emplacement reste inchangé.
- Écran Stock : « Répartir un lot entre deux rangements » transfère une quantité, éventuellement la totalité, vers un site, un emplacement et un contenant facultatif. Aucune répartition automatique.
- Les boîtes portent des identifiants distincts : `42-SANTE-01` à `42-SANTE-08` et `38-SANTE-01` à `38-SANTE-08`. Le serveur refuse les incohérences de site. Les références historiques `SANTE-xx` sont résolues au site de leur lot.
- Affichage du contenant dans les détails de quantité des lots ; conditionnement commercial conservé.
- Mode invité et absence de connexion : écritures bloquées.

## Stockage et compatibilité

Les lots restent sur vingt colonnes. L’entrée conserve `containerId` dans les métadonnées du lot ; les changements sont des événements « Rangement contenant » dans Mouvements, d’impact stock nul. Les identifiants d’opération, le verrou et la vérification du contenant attendu protègent contre les doublons et les modifications concurrentes. Les anciens lots ont un contenant vide.

Une répartition écrit une seule ligne dans Réception & lots, avec `splitFrom` et `rootLot` dans les métadonnées et une référence réservée `REPARTITION:Lxxxx`. Le snapshot déduit cette quantité de la portion source. La portion destinataire conserve la fiche produit, le lot fabricant, la date de réception, la péremption et le conditionnement. La réception de transfert ne représente pas un nouvel achat ; ne pas sommer les quantités brutes reçues pour calculer le stock disponible. Les formules de statut retranchent les répartitions et les sorties. Les références internes Lxxxx sont propres à chaque portion physique. Le FEFO des sorties s’applique au stock du site concerné.

La passerelle annonce `capabilities.containers` et `capabilities.split`. Sans ce signal, les nouveaux contrôles sont désactivés et les entrées ordinaires restent compatibles. Le registre est lu uniquement dans le fichier Santé ; les lignes de documentation sont exclues par le format strict des identifiants.

## Validation

`cd tests && npm install && npm run test:containers`

Les tests utilisent des données fictives : entrée sans contenant, choix d’un contenant, retrait, registre invalide, lots historiques, deux sites, répartition partielle et complète, répartition d’une portion déjà créée, conservation du total, cohérence du site, FEFO par site, concurrence, nouvelle tentative après confirmation perdue, quantités et emplacements conservés, mode invité et ancienne passerelle.

## Activation

Déployer d’abord le fichier Apps Script généré `apps-script/Stock42SanteClone.gs` dans la passerelle Santé existante en conservant son URL, puis publier l’interface et son service worker. Vérifier une synchronisation réelle avant de confirmer la mise en service. Aucun lot réel ne doit être affecté pour les essais sans instruction de l’utilisateur.
