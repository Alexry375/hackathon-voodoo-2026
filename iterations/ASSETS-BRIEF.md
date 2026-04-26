# ASSETS-BRIEF — Run 2

> **Décision globale : code-only / canvas-vector pour les 4 variations.** Aucun appel Scenario MCP, aucune nouvelle frame extraite. On reste dans le bundle existant + Canvas2D / DOM. Justification : 4 axes orthogonaux + deadline serrée → on évite la dépendance asset-gen pour rester en parallèle pur.

Bundle existant disponible (déjà inliné dans `assets-inline.js`) : sprites castles tier-100/dégâts, treads, ground, hand 3D, projectile sprites (orcs/sk/bombs), raven, ravens flock, audio cues, hud cards.

---

## V1 — failure-first (axe : hook)

**Hypothèse** : ennemi marque pendant les 2 premières secondes, screen-shake + "OH NO", puis le user reprend la main et peut renverser.

**Fichiers à toucher (sub-agent)** :
- `playable/script.js` : `PHASE_INTRO_END`, séquence de l'intro, ajout d'un `enemy_first_strike` event en t0+200ms.
- `scene_exterior/index.js` : trigger un projectile **enemy → player** sur l'intro avec un dmgVal élevé (~70%) sur le castle bleu.
- `playable/instruction_text.js` : remplacer le texte d'intro par "OH NO! THEY HIT FIRST!" puis transition normale.
- `shared/hud_top.js` : amplifier la barre HP joueuse (animation rouge intense) sur ce premier hit.

**Assets** : aucun nouveau. Reuse projectile.bomb, vignette rouge déjà présent dans le code (cf. `script.js` low-HP vignette).

**À ne PAS toucher** : combat loop après t=3s, mécanique drag-aim, palette, endcard.

---

## V2 — bullseye-target (axe : mechanic)

**Hypothèse** : un marqueur bullseye apparaît sur le point faible du castle ennemi (ex : porte, banner). Toucher cette zone déclenche un combo "CRIT!" et un dégât bonus visuel.

**Fichiers à toucher** :
- `scene_interior/aim.js` ou `scene_exterior/index.js` : ajouter draw d'un overlay bullseye sur le castle rouge (3 cercles concentriques, centre rouge clignotant).
- Logic d'impact : dans le code de résolution de hit (probablement dans `scene_exterior/index.js`), tester si l'impact tombe dans une zone radius autour du point bullseye → flag crit.
- `playable/praise_floats.js` : ajouter une variante "CRIT!" / "+50% DMG!" (couleur or vs blanc actuel).

**Assets** : aucun nouveau. Cercles dessinés en Canvas2D, texte float sur le pipe `praise_floats` existant.

**À ne PAS toucher** : intro hook, palette, endcard, fail-screen.

---

## V3 — comic-pop (axe : palette)

**Hypothèse** : surcouche comic-book : contours épais sur sprites, halftone dots overlay, lettering "KAPOW! BOOM!" sur les impacts → thumb-stop sur feed TikTok.

**Fichiers à toucher** :
- `playable/script.js` ou `entry.js` : un canvas post-process filter (CSS `filter: contrast(...) saturate(...)` + une seconde canvas overlay halftone pattern SVG inline).
- `scene_exterior/index.js` ou nouveau fichier `scene_exterior/comic_overlay.js` : à chaque impact projectile, spawn un texte DOM/canvas "KAPOW!" avec font bold italique stroke noir épais, scale-pulse 0.3s.
- `assets-inline.js` : optionnellement, pattern SVG halftone (≈300B inline) — sinon générer le pattern en Canvas2D.

**Assets** : aucun externe. Halftone = canvas drawn (cercles répétés sur grid 8px). Lettering = font système sans-serif extra-bold (Impact / Arial Black).

**À ne PAS toucher** : intro hook, mécanique d'aim, structure endcard.

---

## V4 — loot-chest (axe : endcard)

**Hypothèse** : sur la screen win **et** loss, un chest se pose, s'ouvre, des gems volent vers le bouton CTA en l'animant (tick compteur). Single CTA "PLAY → ".

**Fichiers à toucher** :
- `playable/endcard.js` (125 LOC) : ajouter le chest + animation gem-flow.
- `playable/fail_screen.js` (303 LOC, gros fichier) : intégrer la même animation côté loss (avant le dual-CTA existant ou en remplacement de la dual-CTA → single CTA "PLAY →" pour suivre la data 2-4 mots + arrow +26%).
- `playable/persistent_cta.js` : amplifier le bouton CTA pendant le gem-flow (scale-pulse, sheen).

**Assets** : aucun externe. Chest = drawn vector (rectangle marron + lid + serrure jaune). Gems = canvas particles (emoji 💎 sinon shapes). Aucune frame video.

**À ne PAS toucher** : combat loop, intro hook, palette, mécanique aim.

---

## Convention sub-agent commune

Chaque sub-agent reçoit son brief mono-axe et doit :
1. Cloner sur sa sous-branche `iter/V<n>-<slug>` depuis `iteration-pipeline-alexis`.
2. Modifier UNIQUEMENT les fichiers listés dans son axe.
3. `npm run build` → vérifier que `dist/playable.html` reste sous 5 MB.
4. `cp dist/playable.html iterations/V<n>-<slug>/playable.html`.
5. Écrire `iterations/V<n>-<slug>/meta.json`.
6. **Reset** les fichiers source modifiés (`git checkout -- playable/ scene_exterior/ scene_interior/ shared/ assets-inline.js`) — seul `iterations/V<n>-<slug>/` est commit.
7. Commit + retour sur `iteration-pipeline-alexis` via merge --no-ff.

> Garde-fou intégrité : si un fichier hors de l'axe annoncé est touché, le reviewer flag `needs-fix`.
