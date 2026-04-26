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

## ⚡ JUICY CHECKLIST (obligatoire par variation)

Chaque sub-agent doit valider **au moins 4 items** sur cette liste, OU justifier l'omission dans
le `meta.json` (`juicy_omitted`: ["item": "raison"]). Une variation qui n'en remplit que 1-2 = `needs-fix`.

- [ ] **Screen-shake gradué** — amplitude scaling avec l'intensité (pas binaire)
- [ ] **Particles ≥2 types** — au moins 2 systèmes (ex. spark + dust, ring + radial-flash)
- [ ] **Color-shift dynamique** — hue-rotate / gradient stops glissants sur 200-400ms
- [ ] **Scale-punch + rotation jitter** — overshoot ≥1.15, settle ease-out-back, jitter ±5-12°
- [ ] **Glow-bloom OU chromatic aberration** — sur moments-clés, code-only via canvas filter ou compositing
- [ ] **Slow-mo flash** — time-scale 0.4-0.7× pendant 150-300ms sur trigger fort (crit / combo / KO)
- [ ] **Trail persistence ≥400ms** — l'effet laisse une trace, pas pop-fade instantané
- [ ] **Layered timing ≥3 events** — sur fenêtre 0-300ms, 3 events orchestrés (flash 0 + pop 80 + shake 120)
- [ ] **Lettering animé** — font ≥56px, stroke ≥3px, scale-pulse + rotation jitter, fade 600-800ms
- [ ] **Audio stinger (optionnel mais bonus)** — sub-pulse low-freq via WebAudio (gameplay doit rester intelligible muted, mais un stinger amplifie)

**Anti-patterns explicites (= reject)** : un wash uniforme alpha 0.10, un badge rond avec chiffre,
un "œil qui clignote", un texte qui pop puis disparait. **Tout seul** = NO. Toujours composé,
toujours layered, toujours en cascade.

---

## V1 — dragon-tease (axe : hook) — VERSION JUICY

**Hypothèse** : pendant l'intro (0–4500ms), une cascade d'effets composés impose un villain dragon
avant même que l'utilisateur ait compris le jeu. Pattern-interrupt + Zeigarnik + emotional pull.

**Stack juicy obligatoire (≥4 items checklist)** :
1. **Œil dragon** : radial-gradient rouge profond, iris vertical reptilien, pupille qui dilate (scale 0.6→1.0 sur 600ms) puis blink (closed 200ms) toutes les 1.8s — overlay derrière le castle ennemi en silhouette.
2. **Lens-flare** sur l'œil : ray-burst étoilé rotatif (8 branches, rotation 0.1Hz), pulse alpha en sync avec la dilatation pupille.
3. **Griffes en bordure** : silhouettes noires de 3 griffes qui scratch-in depuis le bord gauche puis droit, durée 200ms d'entrée, persiste 1.5s, fade 400ms. Stagger : 0ms left + 150ms right.
4. **Vignette pulse rouge** : radial gradient rouge profond depuis les bords (1.5× la fréquence cardiaque, ~0.7Hz), amplitude 0.15→0.35 alpha, layered avec un sub-shake d'écran 4Hz amplitude 2px.
5. **Lettering "BEWARE!"** : font ≥72px Impact bold italic, stroke noir 4px + double-stroke rouge 2px outer, fade-in 250ms scale 0.5→1.15→1.0 (overshoot ease-out-back), rotation jitter ±6°, persiste 1200ms, fade-out 500ms. Position : bas-centre.
6. **Tremor cumulatif** : screen-shake low-freq (4Hz, 2px) en background pendant tout l'intro, qui spike à 12px sur le moment où l'œil ouvre la première fois.
7. (Bonus) sub-pulse audio low-freq via WebAudio si trivial à plug — sinon documenté comme omis (WebAudio context déjà géré dans `shared/audio.js`).

**Fichiers à toucher** :
- `playable/dragon_tease.js` (NEW, ~180 LOC) : module dédié exposant `drawDragonTease(ctx, t, phaseElapsed)` qui orchestre les 6 effets visuels. Sub-helpers : `drawDragonEye`, `drawLensFlare`, `drawClawsLeft`, `drawClawsRight`, `drawVignettePulse`, `drawBewareLettering`. State machine simple (entry 0→400ms, hold 400→3500ms, exit 3500→4500ms).
- `playable/script.js` : import + appel `drawDragonTease(ctx, t, phaseElapsed)` dans `_paintOverlay` pendant `phase === 'intro'` (uniquement). Avant le hand cursor draw.
- `shared/audio.js` : OPTIONNEL — ajouter `playLowSubPulse(durationMs)` si bandwidth audio context permet. Sinon skip + justify.

**Assets** : aucun externe. Tout en Canvas2D (radial gradients, polygones griffes, lens-flare branches, lettering système).

**À ne PAS toucher** : combat loop, drag-aim, palette globale, endcard, scenes exterior/interior, instruction_text.js.

---

## V2 — combo-meter (axe : mechanic) — VERSION JUICY

**Hypothèse** : compteur de combo orchestré qui scale visuellement, sonorement (visuel) et
mécaniquement avec le multiplier. Empilage d'effets en cascade synchronisée à chaque incrément.

**Stack juicy obligatoire (≥4 items)** :
1. **Compteur principal** : badge en haut-droite, halo radial qui pulse (alpha sync avec les pulses idle), chiffre dans une typo bold italic ≥48px stroke épais. Background du badge avec **gradient hue qui glisse** : x1 jaune → x2 orange → x3 rouge → x5 cyan/pink électrique, transition 200ms.
2. **Lettering combo "x3 COMBO!"** spawné via `praise_floats` étendu : font ≥72px, stroke 4px noir + double-outer 2px hue-of-multiplier, scale 0.4→1.25→1.0 (overshoot), rotation jitter ±10°, fade 800ms, persistence trail 400ms (3-4 ghost copies fading derrière).
3. **Screen-shake amplitude scaling** : x2 → 4px / x3 → 8px / x5 → 14px, 250ms decay. Cumule avec le shake existant de l'impact.
4. **Radial flash full-screen** : alpha 0→0.25→0 sur 200ms, hue assortie au multiplier (jaune/orange/rouge/cyan). Blend mode `screen` ou `lighter`.
5. **Particles ring burst** sur l'incrément : 12-16 sparks émis radialement depuis le centre du badge, hue assortie, vélocité 200-400px/s, drag rapide, fade 600ms.
6. **Slow-mo flash** au franchissement x5 : time-scale 0.55× pendant 250ms (via un multiplicateur sur le `dt` du loop), accompagné d'une freeze-frame visuelle 80ms juste avant.
7. **Damage scaling visible** : multiplier intégré au calcul `dmg = baseDmg * multiplier` ET reflété dans la HP bar enemy : à x3+, le drop HP bar fait un overshoot animé (pop-out 1.1×) au lieu d'un slide linéaire.
8. **Reset feedback** : si délai > 2s ou miss → "COMBO BROKEN!" rouge pop + screen-shake court + fade-out badge en gris.

**Fichiers à toucher** :
- `playable/combo_meter.js` (NEW, ~280 LOC) : state machine combo + tous les helpers de rendu (badge avec gradient anim, ring particles, radial flash, slow-mo trigger). API : `recordHit()` `recordMiss()` `drawComboMeter(ctx, t, dt)` `getComboMultiplier()` `getTimeScale()` (pour le slow-mo).
- `scene_exterior/index.js` : aux callsites `_impactEnemy` → `recordHit()` + scale `dmg` par `getComboMultiplier()`. Pas sur ravens entrants.
- `playable/script.js` : import + appel `drawComboMeter(ctx, t, dt)` dans `_paintOverlay` (après `drawPraiseFloats`, avant `drawDecoTimer`). Aussi : appliquer `getTimeScale()` au `dt` du step physique pour le slow-mo (intégration propre, pas un sleep).
- `playable/praise_floats.js` : ajout `spawnComboPraise(level, x, y)` avec la variante typographie+trail décrite item #2.
- `shared/hud_top.js` : OPTIONNEL — wire l'overshoot HP bar décrit item #7. Sinon skip + justify.

**Assets** : aucun externe. Badge / particles / lettering tout Canvas2D.

**À ne PAS toucher** : intro hook (pas d'overlay pré-tutorial), palette globale, endcard, fail-screen.

---

## V3 — y2k-neon (axe : palette) — VERSION JUICY

**Hypothèse** : reskin Y2K-cyber qui fait flipper les yeux (dans le bon sens) — chromatic
aberration permanent + glitch flickers sur impact + neon trails persistantes + scan-line wave
animée + boot-up CRT effect au splash. Genre-bending mobile→cyberpunk-arcade.

**Stack juicy obligatoire (≥4 items)** :
1. **Wash diagonal animé** : linear gradient pink→cyan→purple, mode `multiply` alpha 0.12, mais le gradient **rotate lentement** (0.05Hz, déplacement angle 30°) → vivant pas statique.
2. **Chromatic aberration RGB displacement** : permanent en gameplay, séparation 2-3px (R offset gauche, B offset droite, G centré). Implémenté via 3 passes du canvas avec `globalCompositeOperation = 'screen'` et offset translate. Coût ~3× draw mais sur 540×960 OK.
3. **Glitch micro-flickers sur impact** : sur 3 frames (~50ms) après chaque `_impactEnemy` → block-displacement (10 bandes horizontales aléatoires shifted ±15px), inversion couleur sur 1 frame, retour normal. Implémenté via canvas slice/redraw.
4. **Neon trails persistantes** : sur les projectiles, trail d'historique des positions des 12 derniers steps, dessinées en cyan/pink alternées avec fade exponentiel + glow blur. Trail visible ≥400ms après le passage.
5. **Scan-line wave** : scan-lines horizontales 3px (rgba 255,255,255,0.05, mode `lighter`) avec un **drift vertical** lent (0.5Hz, amplitude full-height) → impression de tube CRT. Skip pendant phase splash et endcard pour ne pas bouffer leurs effets.
6. **Boot-up CRT** au tout début du splash : vignette qui s'ouvre comme un tube (radius 10%→100% sur 400ms ease-out) + un flicker 200ms (alpha 0→1→0.7→1) + scan-line vertical sweep d'écran (du haut vers le bas en 600ms). Donne l'impression d'allumer une vieille TV.
7. **Vignette violet aux coins** + un léger barrel-distortion via canvas filter (subtle, pour effet écran courbe).
8. **Neon-outline projectiles** : outline 3px néon (cyan/pink alterné selon ownership) avec inner glow blur 6px, en plus du sprite normal.

**Fichiers à toucher** :
- `playable/y2k_overlay.js` (NEW, ~250 LOC) : tous les helpers post-FX (`applyY2KPostFX(ctx, t)`, `applyChromaticAberration(ctx)`, `applyGlitchBurst(ctx, t)`, `applyScanLineWave(ctx, t)`, `applyCRTBoot(ctx, t)`). State pour les flickers déclenchables.
- `playable/script.js` : import + appel `applyY2KPostFX(ctx, t)` à la **toute fin** de `_paintOverlay` (donc après tous les autres draws, c'est un post-process). Skip pendant `phase === 'endcard'`. Et pendant `phase === 'splash'` → appel spécifique `applyCRTBoot(ctx, t)`.
- `scene_exterior/projectile_glow.js` : étendre `drawGlowHalo` pour accepter une override palette ; ajouter export `drawNeonTrail(ctx, history, color)`.
- `scene_exterior/index.js` : sur chaque update de projectile, push `{x, y}` dans un `history[]` (ring buffer 12 entries) ; à chaque draw, appel `drawNeonTrail` avant le projectile lui-même. Sur impact `_impactEnemy` et `_impactOurs` → trigger `applyGlitchBurst()` via flag.

**Assets** : aucun externe. Tout Canvas2D + compositing modes (`multiply`, `screen`, `lighter`). Vérifier le coût frame : si <16ms à 60fps OK, sinon downgrade chromatic aberration à 1 pass au lieu de 3.

**À ne PAS toucher** : intro hook (overlay arrive APRÈS l'intro structurelle, ne re-design pas l'intro), mécanique d'aim, structure endcard (skip post-FX en phase endcard pour préserver shimmer/confetti/stars).

---

## V4 — level-preview (axe : endcard, ADDITIVE) — VERSION JUICY

**Hypothèse** : panneau "LEVEL 2 →" qui déchire un voile fog-of-war pour révéler un dragon boss
qui respire — Zeigarnik visuel concret + sense of escalation. Empilage d'effets pour que le
panneau soit aussi spectaculaire que les stars/confetti existants, sans les écraser.

**Contrainte critique ADDITIVE** : `endcard.js` (306 LOC) contient déjà stars + confetti +
social-proof + shimmer CTA + tap-anywhere. **Ne PAS le récrire**. Ajout = 1 import + 1 draw call
inséré dans le paint order, jamais de modification d'un draw existant.

**Stack juicy obligatoire (≥4 items)** :
1. **Fog-of-war reveal** : à `entryT + 800ms`, voile gris-noir alpha 0.85 sur la zone preview, puis déchirement central — mask radial qui s'ouvre (radius 0→full sur 600ms ease-out-expo) avec particules de fumée se dispersant en bordure. Voile résiduel reste sur les coins en wisps semi-transparents.
2. **Dragon silhouette en couches** : tête + corne + gueule entrouverte + aile arrière (polygon canvas). **Œil rouge avec glow pulsing** (radial gradient rouge, pulse 0.8Hz) + lens-flare 6 rayons rotatifs.
3. **Breath particles** : volutes fumée/feu émises depuis la gueule en continu post-reveal — 4-6 particles/s, vélocité ascendante 30-60px/s, fade 1200ms, hue rouge→orange→noir gradient.
4. **Parallax 3 couches** : sky (gradient violet-bleu-noir) arrière + mountains lointaines (silhouette dégradé bleu sombre) milieu + fog (rectangles flous semi-transparents drift gauche-droite, 0.05Hz) avant. Drift par couche : sky 0px, mountains 1px, fog 4px.
5. **Scale-punch d'entrée** à `entryT + 1400ms` : panneau entier 1.0→1.06→1.0 sur 250ms ease-out-back, accompagné d'un flash radial cyan derrière (alpha 0.3→0 sur 300ms).
6. **Lettering "LEVEL 2 →" chromatic** : font bold italic ≥36px, chromatic aberration RGB 1-2px, glow violet/cyan blur 8px derrière, scale-pulse subtil 0.04 amplitude (persistant, pas de fade).
7. **Bobbing post-settle** : panneau bouge sin 0.5Hz amplitude ±3px (vertical) — vie sans instabilité.
8. **Tap-anywhere preserved** : zone du panneau reste passive — le tap-anywhere de Sami fonctionne sans changement. Documenter la non-régression.

**Fichiers à toucher** :
- `playable/endcard_level_preview.js` (NEW, ~280 LOC) : tous les helpers (`drawLevelPreview(ctx, t, entryT)`, `drawFogReveal`, `drawDragonSilhouette`, `drawBreathParticles`, `drawParallaxLayers`, `drawChromaticLabel`). State machine : pre-entry (avant entryT+800ms : invisible) → fog-reveal (800-1400ms : voile + tear anim) → settled (>1400ms : bobbing + breath loop). Timing absolu via `t - entryT`.
- `playable/endcard.js` : 1 import + 1 appel `drawLevelPreview(ctx, t, _entryT)` inséré **avant** `_drawTapHint(ctx, t)` mais **après** `_drawConfetti` et `_drawStars` (panneau au-dessus du confetti, tap-hint glow visible par-dessus le panneau). Respecter strictement l'ordre actuel des `_draw*` calls. AUCUNE modif des autres draw functions. AUCUNE modif du tap-handler.

**Assets** : aucun externe. Sky gradient + mountains polygon + fog rectangles flous + dragon polygon + breath particles + chromatic label = tout Canvas2D.

**À ne PAS toucher** : combat loop, intro, palette globale, mechanic. Sur l'endcard : **interdit absolu** de modifier stars, confetti, social proof, CTA, shimmer, tap-handler, leur ordre relatif, leurs timings d'entrée. **Couche ajoutée, jamais soustraite, jamais re-ordonnée.**

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
