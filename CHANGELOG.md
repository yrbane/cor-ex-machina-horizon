# Journal des versions

## 1.2.0 — 2026-09-06 · « Foule »

- Timecode discret en bas à gauche : position et durée, en petit, avec un halo, masqué quand la console est ouverte.
- Huit passages de plus : drones à feux clignotants, patrouilles de trois chasseurs avec postcombustion, fusées qui décollent derrière les montagnes avec flamme et fumée, feux d'artifice la nuit, familles de canards, dauphins qui sautent, serpent de mer à bosses, périscope et son sillage. Vingt-neuf types au total.
- Nuages redessinés : bourgeons modelés par des dégradés, ombre portée, base plate de cumulus. Chaque nuage est rendu une fois dans un sprite par éclairage et réutilisé, ce qui coûte moins qu'avant.
- Étoiles de tailles et de teintes variées.
- Modules dédiés pour les nuages et le timecode, quatre tests de plus.

## 1.1.2 — 2026-09-06 · « Onde large »

- La forme d'onde prend toute la largeur de l'écran, avec un trait plus épais, un dégradé horizontal dans la palette du moment et une lueur douce.

## 1.1.1 — 2026-09-06 · « Onde de repli »

- Sans son accessible, la forme d'onde du premier plan est un signal synthétique modulé par les crêtes précalculées, qui défile en temps réel, au lieu d'une enveloppe plate.

## 1.1.0 — 2026-09-06 · « Onde »

- Forme d'onde au premier plan, sur l'eau, en petit : le signal audio en direct qui défile quand la page a accès au son, l'enveloppe des crêtes précalculée sinon.
- Architecture : une interface de source de signal avec deux implémentations, un rendu séparé, un bandeau qui choisit la source. Cinq tests.

## 1.0.4 — 2026-09-06 · « Banderole »

- Le texte « EMT » suit l'ondulation de la banderole : chaque lettre est posée à sa hauteur locale et inclinée selon la pente, dans l'ordre de lecture quel que soit le sens de vol.

## 1.0.3 — 2026-09-06 · « Halo »

- Le halo de la lune suit le croissant : il s'efface progressivement côté ombre au lieu de dessiner un trou rond dans la lueur.

## 1.0.2 — 2026-09-06 · « Croissant »

- La lune est dessinée sur un calque transparent : sa partie dans l'ombre est effacée au lieu d'être peinte en noir. Le ciel passe à travers, sans contour ni halo côté ombre, avec un terminateur adouci.
- La comète, les étoiles filantes et les satellites passent derrière les nuages.

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
