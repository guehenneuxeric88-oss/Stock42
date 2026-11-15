# Stock 42 Santé — duplication de Stock 42 alimentaire

## Étape 2 — copie préparée, sans raccordement

Source : Stock 42 alimentaire V55, commit `192e52533bd72f691c9993d93ec9760487bfd6a0`.
Point de retour : `backup/avant-duplication-sante-2026-11-15`.

La copie conserve le HTML, les styles, les cinq vues et la logique métier du fichier alimentaire `index.html` : commandes, entrées rapides, réceptions, sorties, stock, emplacements, inventaire et sauvegardes.

Modifications limitées à la préparation de la copie :
- nom Stock 42 Santé et première icône S42 approuvée ;
- dossier, manifeste, stockage local, exports et cache distincts ;
- suppression de l'appel au nettoyage ponctuel des anciens essais alimentaires (C0001-C0003, L0057-L0058), inapplicable à Santé ;
- refus des sauvegardes alimentaires dans la copie Santé ;
- aucun raccordement réseau réel : champs de connexion désactivés et gardes dans les fonctions de synchronisation et d'envoi ;
- message explicite quand aucun inventaire Santé n'est chargé.

Aucun fichier alimentaire existant ni fichier de l'application Santé précédente n'est remplacé. Aucune donnée réelle ni clé n'est incluse.

## Étapes suivantes

3. Raccordement au fichier Santé et configuration des accès/sauvegardes, séparés de l'alimentaire.
4. Adaptations sanitaires minimales (dont FEFO) et reprise contrôlée des lots/historique Santé.
5. Essais PC/iPhone puis remplacement de l'accès après validation.

À cette étape la copie conserve les catégories, identifiants L et FIFO de son modèle. Elle n'est pas prête à gérer les données Santé réelles. La reconnaissance Open Food Facts est héritée du modèle alimentaire et devra être traitée à l'étape d'adaptation ; ce n'est pas une source de médicaments.

## Vérification

Après installation des dépendances existantes de `tests/package.json` :
```sh
node tests/sante-stock42-clone.cjs
```

Le test démarre l'application avec un stockage simulé contenant des données alimentaires sentinelles, vérifie les cinq vues, l'absence de lecture/écriture alimentaire et de connexion réelle, les formats de sauvegarde et la conservation des identifiants légitimes de la copie. Il vérifie aussi que le service worker Santé ne supprime pas les caches alimentaires.

Limite : ces contrôles DOM ne remplacent pas les essais réels PC/iPhone prévus à l'étape 5. Le service worker alimentaire hérité supprime les caches d'autres applications lors de sa propre activation : la copie Santé n'introduit pas cette suppression et l'alimentaire n'est pas modifié à l'étape 2. Un hébergement sur la même origine nécessitera de traiter ce point avant installation finale.
