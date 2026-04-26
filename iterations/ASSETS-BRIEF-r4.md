# ASSETS-BRIEF — Run 4

> **Décision globale : code-only / canvas-vector pour les 4 variations.** Aucun appel Scenario MCP,
> aucune nouvelle frame extraite. On reste dans le bundle existant + Canvas2D / DOM.
> Le substrat gold-standard est déjà chargé en assets (splash, endcard, projectile_glow). Ajouter
> de l'asset ferait gonfler le bundle au-delà de 5 MB. Tous les effets sont vectoriels / procéduraux.

Bundle existant disponible (déjà inliné dans `assets-inline.js`) : sprites castles tier-100/dégâts,
treads, ground, hand 3D, projectile sprites (orcs/sk/bombs), raven, ravens flock, audio cues, hud cards,
splash icon, ENDCARD_BG.

Modules récents à connaître (gold-standard) :
- `playable/confetti.js` — burst confetti
- `playable/idle_pulses.js` — drawAimReadyPulse / drawDustMotes / drawAmbientHaze
- `playable/endcard.js` (306 LOC) — stars, confetti, social proof, shimmer, tap-anywhere
- `scene_exterior/projectile_glow.js` — drawGlowHalo / drawSparks / dropSpark / shouldDropSpark
- `playable/script.js` — phase machine + comeback cinematic POWER UP

---

## ⚡ JUICY CHECKLIST (obligatoire par variation)

Chaque sub-agent doit valider **au moins 4 items** sur cette liste, OU justifier l'omission dans
le `meta.json` (`juicy_omitted`: ["item": "raison"]). Une variation qui n'en remplit que 1-2 = `needs-fix`.

- [ ] **Screen-shake gradué** — amplitude scaling avec l'intensité (pas binaire)
- [ ] **Particles ≥2 types** — au moins 2 systèmes (ex. spark + dust, ring + radial-flash)
- [ ] **Color-shift dynamique** — hue-rotate / gradient stops glissants sur 200-400ms
- [ ] **Scale-punch + rotation jitter** — overshoot ≥1.15, settle ease-out-back, jitter ±5-12°
- [ ] **Glow-bloom OU chromatic aberration** — sur moments-clés
- [ ] **Slow-mo flash** — time-scale 0.4-0.7× pendant 150-300ms sur trigger fort
- [ ] **Trail persistence ≥400ms** — l'effet laisse une trace, pas pop-fade instantané
- [ ] **Layered timing ≥3 events** — sur fenêtre 0-300ms, 3 events orchestrés
- [ ] **Lettering animé** — font ≥56px, stroke ≥3px, scale-pulse + rotation jitter, fade 600-800ms
- [ ] **Audio stinger (optionnel)** — sub-pulse low-freq via WebAudio

**Anti-patterns reject** : un wash uniforme alpha 0.10 / un badge avec un chiffre / un effet seul.
Toujours composé, toujours layered, toujours en cascade.

---

## V1 — cinematic-pullback (axe : hook) — JUICY

**Hypothèse** : pendant l'intro (0–4500ms, `phase === 'intro'`), une caméra zoom-inside démarre
serré sur le castle bleu (scale 1.6, légèrement décalé), puis pull-back animé sur 0.6s révèle
le champ de bataille complet, avec parallax + lens-flare + lettering "DEFEND!".

**Stack juicy obligatoire (≥4 items checklist)** :
1. **Camera zoom-pullback** : transform overlay sur le rendu existant — `ctx.scale(1.6, 1.6)` à t=0
   décroissant easeOutCubic vers 1.0 sur 0-700ms, translate adapté pour garder le castle bleu en focus.
2. **Parallax 3-couches** : sky-layer offset −20% du movement, mountains-layer −10%, ground-layer 0%
   (pendant la pullback) — coût zéro, on déduit du scale.
3. **Lens-flare radial** : drawn sur l'overlay, position (520, 200), 6 branches étoilées
   rotation 0.15Hz, additive blend, alpha pulse 0.8Hz amplitude 0.3→0.7, fade out 0-2200ms.
4. **Screen-shake gradué** : 4Hz baseline 1.5px pendant 0-700ms (camera "settle" rumble),
   spike 6px au moment où la pullback finit (+700ms), decay 250ms.
5. **Lettering "DEFEND!"** : pop-in à +900ms, font Arial Black italic 84px, double-stroke
   (#1a1a1a 8px outer + gold #FFD24A 3px inner), fill #FFFFFF, easeOutBack scale 0.6→1.18→1.0
   sur 380ms, ±5° rotation jitter idle, fade-out 500ms à +3700ms.
6. **Vignette cinematic** : letterbox bands top/bottom (h=60px) qui slide-in 0-400ms (du dehors),
   restent jusqu'à +3500ms puis slide-out 400ms.

**Non-touch** : combat loop (drag/aim/fire), tutorial trigger (>=4500ms), endcard, palette globale.

**Fichiers à modifier** :
- NEW `playable/cinematic_pullback.js` (~200 LOC) exposant `drawCinematicPullback(ctx, elapsedMs)`
  + `getCameraTransform(elapsedMs)` + `getTremorOffset(elapsedMs)`.
- `playable/script.js` : dans `_paintOverlay` AVANT le tutoriel hand cursor, gated `phase==='intro'` :
  - wrap exterior render dans `ctx.save()` / `getCameraTransform()` / `ctx.restore()` (overlay uniquement)
  - appel `drawCinematicPullback(ctx, elapsed)` après les autres draws intro
  - tremor wrap avec `getTremorOffset` sur l'overlay

---

## V2 — charge-meter (axe : mechanic) — JUICY

**Hypothèse** : pendant freeplay (post-tutorial), tout drag est aussi une "charge" — plus le drag
est tenu longtemps avant release, plus le shot est puissant. Indicateur visuel : ring de charge
autour du hand cursor, screen-glow color-match, sparks au max, KAPOW lettering sur charged release,
slow-mo sur charged impact.

**Stack juicy obligatoire (≥4 items checklist)** :
1. **Charge ring** : autour du touch point pendant drag, radius 60px, fill arc qui croît avec
   `holdMs / 1000`, color stops cyan(#00E0FF, 0-400ms) → pink(#FF2AB0, 400-800ms) → white(#FFFFFF, 800ms+).
   Stroke 6px + inner glow blur 8.
2. **Screen-glow color match** : vignette radial du même color stop, alpha 0.18 max, fade-in
   linéaire avec hold time, fade-out 200ms à release.
3. **Hand cursor scale-pulse** : `scale = 1.0 + 0.18 * sin(holdMs * 0.012)` pendant le hold,
   reset 200ms à release.
4. **Radial sparks burst** : à `holdMs >= 800`, 12 sparks dorés émis depuis le touch point en
   arc 360°, vitesse 180px/s, fade 350ms, lighter blend.
5. **KAPOW lettering** : sur release si `holdMs >= 800`, spawn "KAPOW!" à la position du touch,
   font 72px Impact, double-stroke (black 8px + red 3px), fill #FFD300, easeOutBack
   scale 0.5→1.20→1.0 sur 350ms, ±8° rotation, fade 600ms.
6. **Slow-mo sur charged impact** : time-scale 0.55× pendant 200ms à l'instant où le projectile
   charged hit l'enemy castle, accompagné d'un radial flash blanc full-screen alpha 0.35.
7. **Damage multiplier** : si `holdMs >= 800`, le projectile fait ×1.6 dégâts (visible via le HP
   meter + un "+CRIT" praise float, ré-utilise `praise_floats.js`).

**Non-touch** : intro cinematic, endcard, palette, tutorial drag (qui ne peut pas charge).

**Fichiers à modifier** :
- NEW `playable/charge_meter.js` (~280 LOC) exposant `drawChargeRing` + `drawChargeGlow` +
  `onChargeRelease(holdMs, x, y)` + `isCharged(holdMs)` helper + slow-mo state mgmt.
- `playable/script.js` : hook sur les events drag-start/drag-end (les capture déjà `_paintOverlay`
  reçoit `state.drag` ou similaire), spawn KAPOW + slow-mo flag.
- `scene_interior/aim.js` — appliquer multiplier dégâts si `isCharged(holdMs)` (locate + extend).
  Si trop intrusif, fallback : multiplier appliqué au moment du resolve via un global flag.

---

## V3 — comic-pop (axe : palette) — JUICY

**Hypothèse** : un overlay post-FX permanent transforme la palette en bande dessinée Marvel/DC :
halftone dots multiply blend + thick black outlines via 1-pass edge-detect approximate +
KAPOW/BOOM/POW speech bubbles spawn sur chaque impact + saturated CMYK + comic-frame vignette.

**Stack juicy obligatoire (≥4 items checklist)** :
1. **Halftone dots overlay** : grid pattern (offscreen canvas 540x960) — dots noirs r=2px tous les
   8px (offset row), composite `multiply` alpha 0.18 sur tout le frame, statique (skip pendant
   `phase === 'endcard'` && `phase === 'forcewin'`).
2. **Thick black outlines** : pre-render trick — pour chaque sprite drawn, copie offscreen
   en silhouette noire, blur 2px, draw à offset ±2px N/S/E/W AVANT le sprite réel.
   *Trade-off* : si trop coûteux per-frame, fallback à un seul overlay vignette epais
   ou à une bordure stroke sur les rectangles canvas seulement.
3. **KAPOW/BOOM/POW speech bubbles** : sur chaque `_impactEnemy` ET `_impactOurs`, spawn
   un bubble (random parmi POW!/BAM!/BOOM!/KAPOW!/WHAM!), font Bangers/Impact 64-80px,
   double-stroke (black 7px + white 3px), fill jaune saturé #FFEB00 ou rouge #FF1A1A,
   scale-punch easeOutBack 0.4→1.20→1.0 sur 280ms, ±10° rotation jitter,
   spike+drift upward 40px sur 800ms, fade 600ms.
4. **Saturated CMYK overlay** : tinted multiply-pass alpha 0.10 cyan/magenta/yellow split en
   3 zones verticales (offscreen 540x960, soft gradient), composite `overlay`.
5. **Comic-frame vignette** : bord noir épais 12px tout autour du canvas, plus 4 angles
   "page-corner" qui mimiquent une planche BD (triangles noir 18x18 aux 4 corners).
6. **Color-shift dynamique** : sur chaque impact, hue-rotate flash (canvas filter
   `hue-rotate(45deg)`) pendant 80ms full-frame.

**Non-touch** : combat loop, intro (les bubbles spawn sur impact donc compatibles),
endcard juicy de Sami (skip overlay pendant `phase === 'endcard'`), splash.

**Fichiers à modifier** :
- NEW `playable/comic_pop.js` (~250 LOC) exposant `drawComicOverlay(ctx, elapsedMs, phase)` +
  `spawnComicBubble(x, y)` + `drawComicBubbles(ctx, elapsedMs)` + `drawComicFrame(ctx)`.
- `playable/script.js` : appel `drawComicOverlay` à la fin de `_paintOverlay` (gated pour skip
  endcard/forcewin/splash) + appel `drawComicBubbles` après.
- Listen sur les events `impact-enemy` et `impact-ours` via `shared/events.js` pour spawn bubble.
  Si pas d'event explicite, hook sur le draw des HP changes ou sur la frame où damage est appliqué.

---

## V4 — loot-chest (axe : endcard, ADDITIVE) — JUICY

**Hypothèse** : à l'entrée endcard (`phase === 'endcard'`), un coffre apparaît en background-mid-layer
au-dessus du title VICTORY!, s'ouvre cinématiquement, gems jaillissent et flow downward vers le
shimmer CTA. Pure additive — `endcard.js` n'est pas modifié, on s'insère AVANT son draw.

**Stack juicy obligatoire (≥4 items checklist)** :
1. **Chest fade-in + scale-punch** : à `endcardElapsed >= 400`, chest (rectangle wood-grain dessiné
   canvas, 140x100px) fade-in 200ms + scale 0.6→1.15→1.0 easeOutBack 380ms à pos (270, 280).
2. **Lid burst** : à `endcardElapsed >= 900`, lid pivote -65° en 280ms easeOutBack autour de son
   coin haut-gauche, accompagné d'un radial flash blanc rgba(255,255,235,0.55) r=180 fade 250ms.
3. **Gems flow** : à `endcardElapsed >= 1100`, spawn batch de 30 gems (cyan/pink/gold mix),
   départ depuis le chest, jaillissement initial vers le haut+latéral (vy=−320, vx=±180),
   gravité +800px/s², drift downward attiré progressivement (post-apex) vers la position du CTA
   shimmer (≈ y=820), fade 1500ms à proximité du CTA.
4. **Gold rain particles loop** : background continu post-1500ms, 4-6 particles/s, gold dorées
   r=2-4px, fall vy=180px/s avec slight wobble, lighter blend, depth-based alpha 0.4-0.8.
5. **Chromatic glow sur "VICTORY!"** : non-destructif — overlay d'un duplicate du texte VICTORY
   en cyan offset (-2,0) et magenta offset (+2,0) avec alpha 0.5 chacun, lighter blend.
   Si endcard.js dessine "VICTORY!", on draw OVER le label avec ce halo (lecture des coords du label
   via une convention zone, ou via un draw fixe à la même pos hardcodée).

**Non-touch** : `endcard.js` (stars, confetti, social-proof, shimmer, tap-anywhere) — TOUS pristine.
Skip strict pendant `phase === 'forcewin'` (flash blanc pré-endcard non-altéré).

**Fichiers à modifier** :
- NEW `playable/endcard_loot_chest.js` (~260 LOC) exposant `drawLootChest(ctx, endcardElapsedMs)`
  + `drawGemsFlow` + `drawGoldRain` + `drawVictoryChromaticGlow`.
- `playable/endcard.js` : 1 import + 4 draw calls **AVANT** `_drawTitle` / `_drawStars` / etc.
  pour que chest soit en background. Ordre :
    1. drawLootChest (background mid-layer)
    2. drawGoldRain (background ambient)
    3. [existing endcard draws — stars, confetti, social-proof, shimmer]
    4. drawGemsFlow (over stars but under shimmer? Test — adjust if collide)
    5. drawVictoryChromaticGlow (right after _drawTitle)
  Aucune modif des autres draws — pure interleave.

---

*Run-4 ASSETS-BRIEF — code-only, zéro nouvel asset, zéro Scenario MCP.*
