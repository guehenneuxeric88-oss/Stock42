# Scanner Santé 1.1

- Lecture caméra des codes produits EAN/UPC/GTIN et des DataMatrix GS1 portant l'identifiant (01).
- Lecture des QR officiels d'emplacements des sites 42 et 38 pour entrée, sortie, déplacement et consultation.
- Le produit est rappelé uniquement depuis les références Santé déjà présentes sur cet appareil et synchronisées depuis le serveur. Un nouveau code demande une première saisie manuelle de la fiche ; aucune base alimentaire n'est consultée.
- Le GTIN est vérifié par sa clé de contrôle et normalisé sur 14 chiffres pour rapprocher EAN-13 et GS1. Les URL et les données arbitraires ne sont pas transformées en chiffres ni suivies.
- La lecture produit ne déduit ni dosage, ni péremption, ni numéro de lot. Ces données restent à vérifier sur la boîte. Une nouvelle lecture remet quantité, péremption et lot fabricant à blanc pour éviter la reprise d'un ancien lot.
- Aucun scan ne valide une entrée ou une sortie. La confirmation existante reste nécessaire.
- Caméra arrière préférée, lecture locale dans le navigateur, arrêt sur résultat, annulation, changement d'écran et mise en arrière-plan. Une ouverture caméra tardive après annulation est immédiatement arrêtée.
- Saisie manuelle de secours à l'intérieur du scanner ; rappel direct depuis le champ code-barres.

## Distribution et licences

ZXing Browser 0.2.1 est fourni localement dans `sante-stock42/vendor/` (MIT), avec la licence Apache 2.0 de ZXing Library. La copie provient du paquet npm officiel. Le moteur et les modules de lecture sont inclus dans le cache propre à Santé ; aucune dépendance de décodage ne doit être téléchargée depuis un CDN à chaque lancement.

Sources : https://github.com/zxing-js/browser ; https://support.gs1.org/support/solutions/articles/43000733404-what-is-an-implied-application-identifier-01-in-a-barcode-

## Vérification

`NODE_PATH=<linkedom>/node_modules node tests/sante-scanner.cjs`

Le moteur distribué décode réellement trois symboles de test générés avec ReportLab : EAN-13, QR d'emplacement et DataMatrix. Tests supplémentaires : clé GTIN erronée, rapprochement GS1/EAN, produit connu/inconnu, routage des emplacements, absence d'écriture réseau de stock, refus caméra et saisie de secours, annulation pendant l'ouverture caméra, arrêt après résultat. Les tests existants de boîtes, péremptions, FEFO, backend et isolation alimentaire passent également.

La caméra physique de l'iPhone et ses autorisations Safari restent à vérifier sur le téléphone de l'utilisateur. Aucun produit de test n'est ajouté au stock réel.
