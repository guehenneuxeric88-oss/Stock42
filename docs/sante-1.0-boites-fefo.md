# Santé 1.0 — boîtes et péremptions

Mise en service le 15 novembre 2026. La copie conserve les cinq écrans de Stock 42 V55, le logo approuvé et les mêmes URL/clé Santé que lors du raccordement. Aucun changement alimentaire dans cette étape.

## Fonctions

- Catégories Santé ; champs conditionnels médicaments (dosage et forme) ou gants (taille et matière).
- Les gants sont saisis et sortis en boîtes entières. Le contenu par boîte donne un total informatif : 5 boîtes de 100 = 500 gants. Aucun mouvement en gant individuel dans cette version.
- Code-barres et lot fabricant facultatifs. Saisie manuelle disponible ; scanner encore désactivé.
- Péremption validée sans correction silencieuse des dates impossibles. MM/AAAA correspond à la fin du mois. « Sans date » est explicite et interdit pour un médicament.
- FEFO par produit/unité, toutes localisations prises en compte. Un autre lot non périmé exige une confirmation. Les lots périmés ou sans péremption valide ne sont pas proposés dans les sorties ordinaires.
- Entrée rapide directement dans le stock ; commandes puis réception intégrale ; affectations, déplacements et sorties.
- Les modifications sont enregistrées sur le serveur avant actualisation locale ; un échec n'annonce pas un faux stock local enregistré.
- Identifiants alloués sous verrou serveur. Chaque opération garde son identifiant et sa charge dans sa propre ligne. Une réponse perdue peut être retentée sans doubler un lot ou une sortie. Les refus de validation permettent de corriger les champs.
- Les formules d'alerte des réceptions et l'état reçu des commandes sont alimentés lors des nouvelles écritures.

## Vérifications

Tests exécutés : sante-stock42-backend.cjs, sante-health-writes.cjs, sante-health-ui.cjs, sante-stock42-clone.cjs et stock42-worker-isolation.cjs (les tests DOM nécessitent linkedom).

Cas couverts : 5 boîtes de 100, refus des fractions et surstocks, variantes M/L et médicaments, calendrier et mois bissextiles, FEFO global, lots périmés, envoi répété et réponse perdue, réception déjà effectuée, refus d'une autre charge utilisant le même identifiant, stockage alimentaire intact.

Contrôle réel : passerelle version 2 déployée sur la même URL ; lecture authentifiée à zéro lot et zéro produit ; tentative d'entrée invalide rejetée sans création. Client publié synchronisé avec entrées/sorties actives ; affichage contrôlé en largeur mobile 414 px ; champs gants/médicaments conditionnels et total 500 gants vérifiés. Aucun lot fictif envoyé au stock réel. Les saisies réelles des deux produits restent à faire avec l'utilisateur.

## Suite

Scanner, sauvegarde Google Drive Santé, suivi après ouverture et blocage/rappel manuel des lots restent à traiter. Les réceptions partielles sont refusées explicitement à cette étape. Le serveur conserve les sources de vérité (réceptions et mouvements), même quand une lecture locale est momentanément interrompue.

## Sources techniques

- Google : https://developers.google.com/apps-script/reference/lock/lock — verrou et flush avant libération.
- Notice officielle, exemple de péremption au dernier jour du mois : https://base-donnees-publique.medicaments.gouv.fr/medicament/61304982/extrait
