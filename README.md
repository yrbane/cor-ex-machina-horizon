# Cor ex machina, horizon

Paysage en parallaxe piloté par le live improvisé « EMT — la machine » du 5 septembre 2026. Le résultat est un seul fichier HTML, `EMT - la machine 260905 - horizon.html`, à poser à côté du MP3 du master.

Chaque plan du paysage est la courbe de loudness du set à une échelle de temps différente, centrée sur l'instant présent : le lointain défile lentement, le premier plan file. Autour : un cycle jour et nuit avec un soleil et une lune qui changent à chaque cycle, une météo par segments de trois minutes, et une vingtaine de passages tirés au hasard, des oiseaux aux baleines en passant par l'avion qui tire une banderole « EMT ».

## Utilisation

Dans le dossier qui contient la page et le MP3 :

```
python -m http.server 8080
```

puis ouvrir `http://localhost:8080/` et cliquer sur la page. Servie en HTTP, la page analyse le son en temps réel. Ouverte directement depuis le disque, elle suit l'analyse précalculée, ou le son si on charge le fichier avec la touche `o`.

Commandes : clic dans l'eau pour lire ou mettre en pause, clic sur le paysage pour sauter au temps visé, molette pour avancer ou reculer, flèches, Page haut et bas, Début et Fin, `f` pour le plein écran, `?` pour la console de documentation et de statistiques.

## Développement

```
npm test        # suite de tests, sans navigateur
npm run build   # assemble ../EMT - la machine 260905 - horizon.html
npm run check   # les deux
```

Aucune dépendance : Node 20 ou plus suffit. Les modules de `src/` sont des modules ES testés avec `node --test` ; `build.js` les concatène dans un seul script inséré dans `template.html`, avec les données de `data/analysis.json`.

| Module | Rôle |
|---|---|
| `src/util.js` | bornes, hachage déterministe, lissage, formats |
| `src/analysis.js` | données du set, interpolation, détection des coups |
| `src/sky.js` | cycle du soleil et de la lune |
| `src/weather.js` | météo par segments, reproductible |
| `src/events.js` | règles d'apparition et mouvements des passages |
| `src/waveform.js` | sources de signal pour la forme d'onde du premier plan, et le bandeau qui les combine |
| `src/draw/*.js` | dessins : astres, paysage, passages, météo, eau, forme d'onde, console |
| `src/main.js` | câblage de la page : audio, boucle de rendu, interactions |

Les données d'analyse sont produites par `tools/extract.py` à partir du master WAV, avec ffmpeg et numpy :

```
python tools/extract.py "../EMT - la machine 260905 - master.wav" data/analysis.json
```

## Tests

Les dessins sont testés avec un faux contexte canvas qui enregistre les appels. On vérifie par exemple que la banderole écrit bien « EMT », que l'avion de ligne a ses hublots et ses réacteurs, que la lune a des mers et des cratères, et qu'un plan silencieux ne trace rien, ce qui évite tout reflet parasite au démarrage.
