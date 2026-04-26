# ASSETS-BRIEF — Run 3

> **Décision globale : code-only / canvas-vector pour les 4 variations.** Aucun appel Scenario MCP,
> aucune nouvelle frame extraite. On reste dans le bundle existant + Canvas2D / DOM. Justification :
> deadline serrée, 4 axes orthogonaux, et le substrat gold-standard est déjà très chargé en assets
> (splash, endcard, projectile_glow). Ajouter de l'asset ferait gonfler le bundle au-delà de 5 MB.

Bundle existant disponible (déjà inliné dans `assets-inline.js`) : sprites castles tier-100/dégâts,
treads, ground, hand 3D, projectile sprites (orcs/sk/bombs), raven, ravens flock, audio cues, hud cards,
splash icon, ENDCARD_BG.

Modules récents à connaître côté substrat (gold-standard) :
- `playable/confetti.js` — burst confetti
- `playable/idle_pulses.js` — drawAimReadyPulse / drawDustMotes / drawAmbientHaze
- `playable/endcard.js` (306 LOC) — stars, confetti, social proof, shimmer, tap-anywhere
- `scene_exterior/projectile_glow.js` — drawGlowHalo / drawSparks / dropSpark / shouldDropSpark
- `playable/script.js` — phase machine + comeback cinematic POWER UP

---

## V1 — dragon-tease (axe : hook)

**Hypothèse** : pendant l'intro (0–4500ms), un œil rouge de dragon clignote derrière le castle ennemi
en silhouette, sous-titre "BEWARE!" pulse une fois. Pattern-interrupt visuel + Zeigarnik (qui est
cette créature ?).

**Fichiers à toucher (sub-agent)** :
- `playable/script.js` : pendant `phase === 'intro'`, draw l'overlay dragon-tease (un appel `drawDragonTease(ctx, elapsed)` dans `_paintOverlay` avant le hand cursor).
- `playable/dragon_tease.js` (NEW, ~80 LOC) : module dédié — dessine au canvas un œil rouge avec halo (radial gradient rouge) + pulse 0.6Hz + clignote (closed/open cycle 1800ms) + sous-titre "BEWARE!" en bas, fade-in 400ms / fade-out 600ms aligné sur PHASE_INTRO_END.
- `playable/instruction_text.js` : aucun changement (le sub-titre BEWARE est rendu à part pour ne pas overlap avec les futurs "DRAG TO AIM!").

**Assets** : aucun externe. Œil = polygon canvas (amande + iris radial gradient + pupille noire). Halo = radial gradient. Texte = font système Impact / Arial Black bold italic.

**À ne PAS toucher** : combat loop après PHASE_INTRO_END, mécanique drag-aim, palette globale, endcard, scenes exterior/interior.

---

## V2 — combo-meter (axe : mechanic)

**Hypothèse** : un compteur de combo (x1, x2, x3, x5) apparaît en haut-droite du canvas après le 1er
hit. Chaque hit consécutif dans <2s fait monter le multiplicateur. Damage scale visible : x2 = +50%,
x3 = +100%. Texte "x3 COMBO!" pop-bounce sur impact. Reset si délai > 2s ou miss.

**Fichiers à toucher** :
- `playable/combo_meter.js` (NEW, ~120 LOC) : state combo (count, lastHitT, multiplier), API `recordHit()` `drawComboMeter(ctx, t)` `getComboMultiplier()`. Pop-bounce sur l'incrément, fade-out après 2s d'inactivité.
- `scene_exterior/index.js` : aux deux callsites `_impactEnemy` (hit du joueur sur le castle rouge) — appeler `recordHit()` + multiplier le `dmg` par `getComboMultiplier()`. **Ne PAS** appeler sur les impacts ennemi (raven sur OURS).
- `playable/script.js` : import + `drawComboMeter(ctx, t)` dans `_paintOverlay` (après `drawPraiseFloats`, avant `drawDecoTimer`), uniquement en phase tutorial/freeplay.
- `playable/praise_floats.js` : ajouter une variante `spawnComboPraise(level)` qui spawn "x2 COMBO!" "x3 COMBO!" en gros texte coloré (orange→rouge→pink selon level). Réutilise le pipe existant.

**Assets** : aucun externe. Compteur = drawn vector (badge rond + chiffre). Texte combo = font sans-serif bold italique stroke noir.

**À ne PAS toucher** : intro hook, palette, endcard, fail-screen.

---

## V3 — y2k-neon (axe : palette)

**Hypothèse** : surcouche Y2K néon : tinted overlay pink/cyan/purple (chromatic aberration léger) +
neon-outline sur projectiles + scan-lines subtiles → thumb-stop sur feed TikTok / Reels 2026.

**Fichiers à toucher** :
- `playable/y2k_overlay.js` (NEW, ~100 LOC) : exporte `applyY2KPostFX(ctx)` qui peint :
  1. Wash diagonal pink→cyan (linear gradient, alpha 0.10, multiply)
  2. Scan-lines horizontales 4px (rgba 255,255,255,0.04, top à bottom, additive)
  3. Vignette violet aux 4 coins
  Et `drawNeonProjectileOutline(ctx, x, y, r, color)` pour l'outline 3px néon (cyan/pink) avec inner glow.
- `playable/script.js` : import + appel `applyY2KPostFX(ctx)` au top de `_paintOverlay` (skip si endcard).
- `scene_exterior/projectile_glow.js` : étendre `drawGlowHalo` pour accepter une `palette` cyan/pink → si Y2K mode actif, override la couleur (ou ajouter un `drawNeonOutline` call dans `scene_exterior/index.js` autour de chaque projectile rendu).
- Alternative simple : juste re-tinter via `globalCompositeOperation = 'hue'` + un wash uniforme — moins joli mais plus safe.

**Assets** : aucun externe. Tout en Canvas2D : gradients linéaires + scan-lines.

**À ne PAS toucher** : intro hook, mécanique d'aim, structure endcard (l'overlay s'arrête en phase endcard pour ne pas bouffer le shimmer).

---

## V4 — level-preview (axe : endcard, ADDITIVE)

**Hypothèse** : au-dessus des 3 stars du nouvel endcard, un panneau "LEVEL 2 →" slide-in à 800ms après
l'opening de l'endcard, montrant une silhouette dragon (le boss du level 2) en thumbnail. Zeigarnik
visuel : "qui est ce dragon, qu'est-ce qui se passe au level 2 ?". Pousse le tap.

**Contrainte critique** : le baseline `endcard.js` (306 LOC) contient déjà : stars staggered, confetti
burst, social-proof, shimmer CTA, tap-anywhere. **Ne PAS le récrire**. Ajout par layer compositionnelle :
nouveau module + 1 import + 1 draw call dans `drawEndcard`.

**Fichiers à toucher** :
- `playable/endcard_level_preview.js` (NEW, ~140 LOC) : exporte `drawLevelPreview(ctx, t, entryT)`. Dessine en haut du canvas (y ~ 130–250) un cadre bois (rectangle marron stroke noir 4px) avec :
  1. Label "LEVEL 2 →" en jaune stroke noir (font bold 28px)
  2. Silhouette dragon dessiné canvas (polygon noir : tête + corne + œil rouge clignotant) sur fond ciel sombre
  3. Slide-in horizontal de droite vers position finale, easeOutBack, démarrage à `entryT + 800ms`, durée 500ms
  4. Léger float-bob (sin 0.5Hz, ±4px) une fois en place
- `playable/endcard.js` : 1 import + 1 appel `drawLevelPreview(ctx, t, _entryT)` à insérer **après** le `_drawTapHint(ctx, t)` (pour qu'il se peigne au-dessus des stars/title sans interférer avec les CTA paint order). NE PAS modifier les autres _draw functions, NE PAS toucher confetti/stars/shimmer/tap-handler.

**Assets** : aucun externe. Cadre + dragon = polygon canvas. Texte = font système.

**À ne PAS toucher** : combat loop, intro, palette, mechanic. Sur l'endcard : ne PAS modifier stars, confetti, social proof, CTA, shimmer, tap-handler. Couche **ajoutée**, jamais soustraite.

---

## Convention sub-agent commune

Chaque sub-agent reçoit son brief mono-axe et doit :
1. Cloner sur sa sous-branche `iter/r3-V<n>-<slug>` (préfixe `r3-` obligatoire) depuis `iter/run3-gold-baseline`.
2. Modifier UNIQUEMENT les fichiers listés dans son axe.
3. `npm run build` → vérifier que `dist/playable.html` reste sous 5 MB.
4. `cp dist/playable.html iterations/r3-V<n>-<slug>/playable.html`.
5. Écrire `iterations/r3-V<n>-<slug>/meta.json` (id, title, axis, hypothesis, diff_from_baseline, review:"pending").
6. Capture thumbnail : `BASE_URL=http://127.0.0.1:8766 node iterations/capture.mjs r3-V<n>-<slug>`.
7. **Reset** les fichiers source modifiés (`git checkout -- playable/ scene_exterior/ scene_interior/ shared/ assets-inline.js dist/`) — seul `iterations/r3-V<n>-<slug>/` est commit.
8. Commit + retour sur `iter/run3-gold-baseline` via `git checkout iter/run3-gold-baseline && git merge --no-ff iter/r3-V<n>-<slug>`.

> Garde-fou intégrité : si un fichier hors de l'axe annoncé est touché, le reviewer flag `needs-fix`.
> **Pas de push.** Tout reste local sur `iter/run3-gold-baseline`.
