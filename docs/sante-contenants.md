# Santé : un lot, plusieurs rangements

Le numéro interne `Lxxxx` désigne un seul lot de réception. Le numéro fabricant, la péremption, la fiche produit et le conditionnement appartiennent au lot. Les quantités disponibles appartiennent à ses rangements physiques : site, emplacement et contenant facultatif.

## Utilisation

- L’entrée rapide et la réception créent un lot et son premier rangement.
- La recherche par numéro montre le total du lot puis chaque rangement, avec sa quantité, sa boîte et son emplacement.
- « Répartir un lot » déplace seulement la quantité demandée vers un autre rangement. Le numéro du lot et le total restent identiques. Un rangement destinataire identique existant est réutilisé.
- Les sorties, déplacements, changements de contenant et inventaires demandent le rangement concerné. Les autres rangements sont conservés.
- Les boîtes sont distinctes aux sites 42 et 38 ; l’absence de contenant reste autorisée. Le serveur contrôle la cohérence boîte/site/emplacement.
- Les boîtes commerciales entières, le FEFO par site et les blocages de sortie des lots périmés restent appliqués.

## Stockage et compatibilité

Les anciennes lignes de réception et les mouvements sont conservés. Les anciennes références créées par répartition (`splitFrom`, `rootLot`) deviennent des identifiants historiques de rangement. Elles ne créent plus des lots supplémentaires dans la vue canonique. Les anciennes références restent recherchables comme alias du lot d’origine ; elles ne sont jamais réutilisées pour une nouvelle réception.

Une nouvelle répartition est un seul mouvement « Répartition Santé », d’impact global nul. Ses métadonnées précisent la source et la destination. La lecture rejoue le journal pour calculer chaque quantité ; la somme des rangements est le stock du lot. Un verrou, un identifiant d’opération persistant et la vérification des quantités/rangements attendus évitent les doublons et les modifications concurrentes.

Le client demande `snapshot` avec `allocationModel: 3`. La réponse `version: 3`, `capabilities.allocations: true` contient les lots uniques et leur tableau `allocations`. Les anciennes lectures restent compatibles tant qu’elles peuvent représenter les données ; les opérations ambiguës sans rangement précis sont refusées. L’interface valide la somme des rangements avant d’autoriser une écriture.

Les sauvegardes JSON conservent les lots et les rangements. L’export CSV contient une ligne par rangement avec le numéro de lot partagé, la quantité disponible, le site et l’emplacement.

## Reprise de l’existant

La reprise est calculée à la lecture, sans supprimer ou réécrire les quantités historiques. Par exemple, la portion créée sous L0012 est présentée comme un rangement de L0011, et celle sous L0014 comme un rangement de L0013. Le lot fabricant, la péremption, le contenu des boîtes, les emplacements et le journal restent conservés.

Les statuts des anciennes lignes de répartition doivent être identifiés comme « Rattaché à Lxxxx ». Les statuts des lots d’origine doivent inclure les sorties historiques de leurs anciens alias ; ils ne retranchent plus les transferts internes du stock global.

## Validation

`node tests/sante-health-writes.cjs`

`node tests/sante-containers-ui.cjs` (JSDOM 26)

Les tests couvrent le regroupement des anciennes répartitions, le maintien des numéros, les transferts partiels/complets et retours, les destinations fusionnées, les sorties par rangement, les inventaires sans suppression, le FEFO, les péremptions, la concurrence et les nouvelles tentatives après perte de réponse. L’interface est testée sur recherche, vues par emplacement, sorties, déplacement, contenant, répartition, mode invité et ancienne passerelle.

## Activation

Publier d’abord `apps-script/Stock42SanteClone.gs` dans le déploiement Santé existant, en conservant son URL et sa clé. Vérifier le snapshot v3 ; adapter les statuts historiques puis publier l’interface et son service worker. Confirmer sur la recherche réelle d’un lot réparti et sur les listes de sortie, sans effectuer de sortie de stock réelle pour les tests.

## Activation du modèle lot unique

1. Déployer `apps-script/Stock42SanteClone.gs` dans le déploiement Santé existant, sans changer l’URL ni la clé.
2. Vérifier le snapshot `allocationModel: 3` et comparer les quantités et rangements avec la lecture historique. Les données de réception et le journal ne sont pas réécrits pour regrouper les lots.
3. Exécuter une fois `migrateSanteUniqueLots` pour adapter les statuts du tableur. Cette fonction peut être relancée : les anciennes répartitions sont signalées comme rattachées au lot d’origine, et les statuts du lot prennent en compte les anciennes références. Elle ne modifie aucune quantité, péremption ou affectation.
4. Publier l’interface puis recharger l’application. Vérifier recherche, inventaire, sorties et répartition en lecture ou avec des données fictives ; aucune sortie réelle pour les essais.

Les anciennes références restent dans les données historiques afin de préserver les opérations et les sauvegardes. Une fois de nouveaux mouvements de rangement enregistrés, conserver un lecteur compatible avec le nouveau journal : ne pas revenir aveuglément à une ancienne passerelle.
