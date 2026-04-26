# BRAINSTORM — Run 4

Baseline : `iterations/baseline/playable.html` (gold-standard Sami `feature-trail@7061860` —
splash, endcard juicy, comeback cinematic, projectile_glow, idle_pulses, dev/prod fix).

Run-3 winner : **V3 y2k-neon** (palette, thumb-stop, 8-effect stack always-on).
Run-4 mission : challenger pool — explorer **4 axes orthogonaux non-gagnants en run-3**
pour valider (ou détrôner) le winner sur la grid de comparaison finale.

> Pas de réf aux playables Castle Clashers / tower-defense / royal-match-castle.
> Cross-pollination depuis hyper-casual / runner / TikTok creative / fighting-game / RPG.
> Heuristique humaine pure — pas de scoring Gemini sélection (Gemini autorisé en review qualité).
> Endcard variation = ADDITIVE (couche par-dessus, ne PAS récrire endcard.js).

---

## ⚡ JUICY DOCTRINE — héritée Run-3

Un effet seul = pas une variation. Chaque V doit empiler **≥4 effets juicy en cascade
synchronisée** sur le moment-clé de son axe (cf. table de la JUICY CHECKLIST dans
`ASSETS-BRIEF-r4.md`). Une exécution minimale = `needs-fix` automatique.

Anti-patterns reject : un wash uniforme alpha 0.10 / un badge avec un chiffre / un œil seul /
un texte qui pop puis disparait. Toujours composé, layered, en cascade.

---

## Insights complémentaires (avril 2026)

- **Cinematic intro pull-back** : Royal Match / Match Factory utilisent cold-open zoom-from-inside
  → pull-back reveal, +12% sur retention@3s vs static establishing shot (Voodoo deck Q1-26).
- **Charge / hold-to-power** : Archero / Stick War 3 winners 2026, le hold crée un contract émotionnel
  (release = pay-off) supérieur au tap-fire instant.
- **Comic-pop KAPOW** est ancré 2024-2026 sur audiences male 18-34 — halftone + bold lettering
  reste un thumb-stop top-3 sur AppLovin male-skewed campaigns.
- **Loot-chest reveal** est le seul axe endcard qui bat "next-level preview" sur audiences
  midcore (Mintegral 2026 Q1) — l'animation de gain matérialisé > la promesse abstraite.

---

## Notation 1–5 — `Σ = L + C + R` (Lift × Cost × Risk)

`L` = lift attendu sur la métrique cible / `C` = coût impl sub-agent (5=cheap) / `R` = safety vs combat loop (5=safe)

---

## Axe HOOK (intro 0–3s, métrique : retention@5s)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| H1 | In-medias-res cold-open : 2 ravens déjà mid-air t=0, impact à t+400ms, slow-mo 0.5× sur impact | 4 | 3 | 3 | 10 |
| H2 | POV first-person zoom-inside catapulte → pull-back cinematic à t+1000ms (CRT vignette + lens-flare) | 4 | 2 | 3 | 9 |
| **H3** | **Cinematic pull-back stacked : zoom inside catapulte t=0 + pull-back animé 0.6s + screen-shake low-amp continuous + parallax castles + lens-flare radial + lettering "DEFEND!" pop-in à t+700ms** | **5** | **3** | **4** | **12** |
| H4 | "VS" splash 2v2 fighting-game style castle bleu vs castle rouge | 4 | 2 | 4 | 10 |
| H5 | Compteur "WAVE 1 / 3" en top-banner pour suggérer meta-progrès | 3 | 4 | 4 | 11 |
| H6 | Voice-line "INCOMING!" + slow-mo bombe à 0.3× pendant 800ms | 4 | 2 | 3 | 9 |
| H7 | Failure-first : ennemi gagne à 70%, "OH NO!", recover (recyclé run-2) | 4 | 3 | 3 | 10 |
| H8 | Tutorial pre-empt : flèche+glow déjà sur le castle bleu avant le splash s'efface | 3 | 5 | 5 | 13 |
| H9 | Reverse-chrono : flash de la victoire t0, fade back to start | 2 | 2 | 3 | 7 |
| H10 | Speech-bubble "DEFEND THE KEEP!" du roi bleu pendant l'intro | 4 | 4 | 5 | 13 |

**Top axe HOOK = H3** (Cinematic pull-back stacked). Σ=12, retenu sur H8/H10 (Σ=13) car :
- H8 cosmétique pur, pas de signal nouveau ; H10 trop proche de `instruction_text.js`.
- H3 introduit un **mouvement caméra** que le baseline n'a pas → cinematic pull-back est LE pattern
  qui fait stop-scroll en 2026 (Royal Match analytics).
- Distinct de V1 run-3 (dragon-tease = villain) — H3 = grandeur/cinéma vs villain/horreur.
- Stack juicy naturel (zoom + parallax + shake + flare + lettering = 5 effets composés).

---

## Axe MECHANIC (modif boucle, métrique : depth perception / engagement)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| M1 | Charge meter : hold longer = stronger shot, ring fills cyan→pink→white, release fires double dmg si held >800ms | 5 | 3 | 4 | 12 |
| **M2** | **Charge meter JUICY : ring fill + screen-glow color match + scale-pulse hand cursor + radial sparks on max + KAPOW lettering on charged release + slow-mo 0.5× 200ms sur charged impact** | **5** | **3** | **4** | **12** |
| M3 | Auto-aim ghost trajectory permanent (assist) | 4 | 4 | 5 | 13 |
| M4 | Multi-projectile fan : 1 drag → 3 shots spread sur drag long | 4 | 2 | 2 | 8 |
| M5 | Power-up à collecter mid-flight (étoile dans l'arc) | 3 | 3 | 3 | 9 |
| M6 | Wall-bounce ricochet | 3 | 1 | 1 | 5 |
| M7 | Compteur 3-shots-only → tension scarcity | 3 | 4 | 3 | 10 |
| M8 | Tap-to-fire (one-finger casual) au lieu de drag | 3 | 3 | 1 | 7 |
| M9 | Shield/parry mini-mechanic sur ennemi attack | 3 | 2 | 2 | 7 |
| M10 | Bullseye-target sur point faible enemy + CRIT (recyclé run-2) | 4 | 4 | 5 | 13 |

**Top axe MECHANIC = M2** (Charge meter JUICY). Σ=12, retenu sur M3/M10 (Σ=13) car :
- M3 trop proche du `drawDottedTrajectory` déjà présent dans tutorial.
- M10 recyclé — déjà winner run-2, pas d'apprentissage nouveau.
- M2 introduit un **contract émotionnel hold→release** que le baseline n'a pas. Pattern Archero
  qui marche en 2026 sur action games.
- Distinct de V2 run-3 (combo meter = post-hit chaînage) — M2 = pré-hit anticipation.
- Risk modéré : la mécanique drag-to-aim existe, on rajoute une fenêtre de hold optionnelle —
  un drag court reste un shot normal (zéro régression sur tap-rapide).

---

## Axe PALETTE (visuel/ambiance, métrique : thumb-stop)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| **P1** | **Comic-pop KAPOW : halftone dots overlay + thick black outlines (3-5px) + KAPOW/BOOM/POW speech bubbles sur impacts (jaune+rouge stroke épais) + saturated CMYK + comic-frame vignette** | **5** | **3** | **5** | **13** |
| P2 | Pixel-art retro 8-bit overlay (NES palette + dithering) | 4 | 2 | 4 | 10 |
| P3 | Saturday-cartoon bright/clean + thin outlines | 3 | 3 | 5 | 11 |
| P4 | Watercolor / sepia hand-painted | 3 | 2 | 4 | 9 |
| P5 | Minimaliste mono+1 (blanc + accent doré) | 3 | 4 | 4 | 11 |
| P6 | Glow-only dark-mode (bloom partout) | 4 | 3 | 4 | 11 |
| P7 | Sand / desert reskin | 3 | 3 | 4 | 10 |
| P8 | Y2K néon (run-3 winner — exclu) | — | — | — | — |
| P9 | Chrome metallic : tout en réflexion argent/or, sky chrome | 3 | 2 | 3 | 8 |
| P10 | Vapor-wave grid floor + sun gradient | 3 | 2 | 3 | 8 |

**Top axe PALETTE = P1** (Comic-pop KAPOW). Σ=13, sélection naturelle :
- Y2K néon (run-3 winner) écarté volontairement — on cherche un challenger.
- Comic-pop = top-3 thumb-stop sur male-skewed feeds 2024-26 (audience overlap castle-clash).
- Stack juicy naturel : halftone + outlines + KAPOW lettering + frame vignette + saturated CMYK.
- Code-only via `globalCompositeOperation` + pattern halftone + drawText sur impact events.
- Distinct esthétique de V3 y2k-neon (cyber/futuriste) → A/B legitime sur thumb-stop.

---

## Axe ENDCARD (CTA + post-game, métrique : CTA pull) — **CONTRAINTE ADDITIVE**

> Le baseline a déjà : 3 stars staggered, confetti burst, social-proof "★ 4.8 · 12M+",
> shimmer band sur CTA, tap-anywhere. **NE PAS** récrire `endcard.js` ; ADDITIVE seulement.

| # | Hypothèse additive | L | C | R | Σ |
|---|---|---|---|---|---|
| **E1** | **Loot-chest opening cinematic : chest fade-in au-dessus title à +400ms après VICTORY, scale-punch 0.6→1.15→1.0, lid burst à +900ms + radial flash + 30 gems flow downward vers shimmer CTA + gold rain particles loop + chromatic glow sur "VICTORY!"** | **5** | **3** | **5** | **13** |
| E2 | Coin/gem rain en background derrière les stars (loop) | 3 | 4 | 5 | 12 |
| E3 | Multiplayer ghost "vs Real Players" tease badge | 4 | 4 | 4 | 12 |
| E4 | Progress bar 90% Zeigarnik au-dessus du CTA | 4 | 4 | 4 | 12 |
| E5 | "★★★ MASTER!" rating reveal sequencé après les stars | 3 | 4 | 5 | 12 |
| E6 | Avatar reveal : ton hero apparaît avec speech-bubble "JOIN ME" | 3 | 2 | 3 | 8 |
| E7 | Daily-bonus pop-up "Login bonus +500 gems" pré-CTA | 3 | 3 | 4 | 10 |
| E8 | Ennemi suivant teasé en silhouette à droite du CTA "vs ???" | 4 | 3 | 5 | 12 |
| E9 | Calm-to-chaos burst 3D au-dessus de "VICTORY!" | 4 | 3 | 4 | 11 |
| E10 | "Next level preview" (run-3 V4 — exclu) | — | — | — | — |

**Top axe ENDCARD = E1** (Loot-chest opening). Σ=13, sélection naturelle :
- Run-3 V4 level-preview écarté — on cherche challenger sur le même axe pour validation.
- Mintegral Q1-2026 : loot-chest reveal bat next-level-preview sur midcore audiences.
- Pure additive : nouveau module `endcard_loot_chest.js`, 1 import + 1 draw call dans endcard.js
  AVANT le draw des stars (chest est background-mid-layer), zéro régression.
- Materialise le gain (chest+gems) > promesse abstraite (level 2 image).
- Stack juicy naturel : scale-punch + radial flash + particles flow + gold rain + chromatic glow.

---

## Sélection finale Run-4 — 4 variations challenger

| Var | Axe | Hypothèse JUICY (≥4 effets composés) | Métrique cible | Distinction vs Run-3 |
|---|---|---|---|---|
| V1-cinematic-pullback | hook | Zoom inside catapulte t=0 + pull-back animé 0.6s + parallax 3-couches + screen-shake gradué + lens-flare radial + lettering "DEFEND!" pop+jitter | retention@5s | Run-3 V1 = villain/horreur ; V4 V1 = grandeur/cinéma |
| V2-charge-meter | mechanic | Hold-to-charge ring (cyan→pink→white) + screen-glow color match + scale-pulse hand cursor + radial sparks burst on max + KAPOW lettering on charged release + slow-mo 0.5× 200ms sur charged impact | depth perception / engagement | Run-3 V2 = post-hit combo ; V4 V2 = pre-hit anticipation |
| V3-comic-pop | palette | Halftone dots overlay (multiply) + thick black outlines (composite) + KAPOW/BOOM/POW speech bubbles sur impacts (60-80px font, double-stroke) + comic-frame vignette + saturated CMYK overlay | thumb-stop | A/B vs Run-3 V3 (y2k-neon) sur même métrique — challenger esthétique |
| V4-loot-chest | endcard (ADDITIVE) | Chest fade-in + scale-punch 0.6→1.15→1.0 + lid burst radial flash + gems flow vers CTA + gold rain particles loop + chromatic glow sur "VICTORY!" | CTA pull | Run-3 V4 = promesse abstraite ; V4 V4 = gain matérialisé |

Pas de variation narrative — recouvrement avec H10/E6/lore.

---

*Run-4 lancée le 2026-04-26.*
