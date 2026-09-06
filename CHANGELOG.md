# Journal des versions

## 1.5.0 — 2026-09-06 · « Cabine »

- Barre de contrôles sur <kbd>c</kbd>, construite avec les Web Components de potard (MIT, embarqués) : transport, position, volume, VU-mètre, témoin d'analyse en direct, accès à la playlist, à l'aide et au plein écran.
- Trois passages au plus à la fois, jamais deux de la même sorte.
- Cache des analyses construites en direct : une piste déjà entendue retrouve son paysage dès le départ, sauvegarde toutes les quinze secondes, à la pause et à la fin, éviction des plus anciennes quand le stockage déborde. Un saut en avant dans le morceau garde l'alignement temporel.
- Console réorganisée en onglets : Aide, En direct, Le set, Passages ; commandes en tableau de touches, tuiles colorées, graphiques dessinés seulement quand leur onglet est visible.
- Playlist et panneaux : entêtes, touches et espacements peaufinés.
- Sept tests de plus, 72 au total.

## 1.4.0 — 2026-09-06 · « Embarquement »

- Playlist plus vivante : glisser-déposer de fichiers et de dossiers n'importe où sur la page, avec une zone d'accueil animée ; une icône par piste tirée de son nom ; égaliseur à quatre barres et barre de progression sur la piste en cours ; réordonnancement à la souris ; mélange, boucle, compteur de pistes et de durée ; durées lues depuis les métadonnées ; arrivée des pistes animée ; accent coloré qui suit la teinte du paysage.
- Toast discret en bas de l'écran à chaque changement de morceau.
- Sans boucle, la liste s'arrête à la dernière piste.
- Quatre tests de plus sur la logique de playlist.

## 1.3.0 — 2026-09-06 · « Playlist »

- Playlist sur la touche <kbd>p</kbd> : ajout de fichiers, d'un dossier local, d'une URL de fichier audio ou d'un dossier servi en HTTP dont l'index est lu. Piste suivante et précédente avec <kbd>n</kbd> et <kbd>b</kbd>, enchaînement automatique, pistes distantes retenues d'une visite à l'autre.
- Pour toute piste autre que le set, le paysage se construit en direct à l'écoute : une analyse est accumulée à mesure, les plans se dressent derrière l'instant présent, l'avenir reste vide. La console suit la piste courante.
- Correction : ajouter un fichier avec <kbd>o</kbd> recréait le graphe audio, ce qui échouait ; le graphe est maintenant créé une seule fois.
- Nuages en aplats : corps, ombre plate dans la moitié basse, rehaut plat, base de cumulus, sans dégradé.
- Modules playlist, panneau de playlist et analyse en direct, neuf tests de plus.

## 1.2.2 — 2026-09-06 · « Gerbes »

- Feux d'artifice plus grands, plus longs, avec lueur d'ensemble, traînées épaisses et cœur blanc sur chaque étincelle.
- Fumée de la fusée émise par bouffées espacées, qui se dissipe.

## 1.2.1 — 2026-09-06 · « Feux »

- Les feux d'artifice éclatent devant les nuages, pas derrière.
- Fumée de la fusée plus légère, qui se dissipe au lieu de s'accumuler en bloc.

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
