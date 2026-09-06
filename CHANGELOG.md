# Journal des versions

## 1.0.1 — 2026-09-06 · « Rivage »

- Le ciel est peint jusqu'au bord de l'eau : plus de bande sombre entre l'horizon et l'eau quand les plans sont silencieux, au démarrage du set.

## 1.0.0 — 2026-09-06 · « Cor ex machina, horizon »

Première version versionnée, refonte en modules testés du visuel unique.

- Code découpé en modules ES : utilitaires, analyse, ciel, météo, passages, dessins, console, câblage.
- Suite de 38 tests `node --test`, dont des tests de dessin sur un faux contexte canvas.
- Script de build qui assemble le fichier HTML unique avec vérification syntaxique.
- Passages redessinés avec plus de détail : avion de ligne blanc avec hublots, réacteurs, ailettes, liseré de compagnie et double traînée ; avion à hélice avec roues, haubans, hélice et banderole « EMT » lisible dans les deux sens ; hélicoptère avec verrière, patins, rotors ; montgolfière modelée avec brûleur ; zeppelin avec couples et nacelle ; parapente à caissons ; satellite à panneaux ; ovni métallique à dôme, feux tournants et rayon ; ballons, cerf-volant à nœuds, papillons à ocelles, chauve-souris, aigrettes ; voilier avec rouf, foc, flamme et sillage ; cargo à conteneurs et fumée ; poisson, baleine avec souffle et queue.
- Ovnis possibles de jour comme de nuit, plus fréquents.
- Quatre espèces d'oiseaux aux routes propres, corps et rémiges pour les grands.
- Les plans silencieux ne dessinent rien : plus de trait lumineux ni de reflet parasite au démarrage.
- Console de statistiques avec numéro de version.
