# BRAINSTORM — Run 2

Baseline : `iterations/baseline/playable.html` ← `origin/feature-trail@4eae529` (Sami).
Run-1 archivé sous tag `iter-run1-archive` (V1 cold-open / V2 aim-preview / V3 night-storm / V4 fail-tease ; winner V1).

> Règle : pas de réf aux playables Castle Clashers ni du genre tower-defense / royal-match-castle. Cross-pollination depuis puzzle / runner / idle / hyper-casual / TikTok creative.
> Heuristique humaine pure — pas de scoring Gemini.

---

## Insights du web search (avril 2026)

- **Premier 3s** = pattern-interrupt, drama, before/after, surprise visuelle. C'est *le* levier ROAS.
- **End-card** : un seul CTA clair (2-4 mots), flèche → +26% clics, juiciness > minimalisme pour mobile gaming.
- **Genre-bending** : top-performeurs prennent un core-loop et le réskinent avec aesthetics d'un autre genre (Match3 → shooter wrapping, idle → puzzle wrapping).
- **Praise-stack / Zeigarnik effect** sur l'endcard : sentiment d'inachèvement → install.

---

## Notation 1–5 sur 3 critères (Lift × Cost × Risk)

`L=Lift attendu sur la métrique cible (retention@5s | clarity | CTA pull)`
`C=Coût d'implémentation sub-agent (5=cheap, 1=heavy)`
`R=Risk de régression du combat loop (5=safe, 1=risky)`
`Score = L + C + R (max 15)`

---

## Axe HOOK (intro 0–3s, métrique : retention@5s)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| H1 | "You're already hit" : l'enemy a tiré, ton castle prend feu, screen-shake → frustration → recover | 4 | 4 | 4 | 12 |
| H2 | Floating numbers Royal-Match style ("3 200!" "+CRIT!") sur le bombardement intro | 3 | 4 | 5 | 12 |
| H3 | POV first-person depuis l'intérieur du catapulte (zoom inside, then pull-back to gameplay) | 4 | 2 | 3 | 9 |
| **H4** | **Failure-first : ennemi gagne pendant 2s ("OH NO!"), pull-back to "wait, you can fix this"** | **5** | **3** | **3** | **11** |
| H5 | Slow-mo intro : bombe mi-air à 0.2× speed pendant 1.5s, vitesse normale au tap | 4 | 3 | 3 | 10 |
| H6 | Character zoom + voice-line ("ATTACK!") avant reveal scene | 3 | 3 | 4 | 10 |
| H7 | Tutorial hook : glow + arrow déjà pulsing sur le catapulte avant que user voie même le terrain | 3 | 5 | 5 | 13 |
| H8 | Reverse-chrono : flash de la victoire en frame 0, fade back to start | 3 | 2 | 3 | 8 |

**Top axe HOOK = H4** (Failure-first). Émotionnellement distinct de V1 cold-open (run-1). Drama instantanée. Plus risqué que H7/H1 mais lift max si exécuté.

---

## Axe MECHANIC (modif boucle, métrique : clarity / mechanic-grasp@10s)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| M1 | Tap-to-fire (one-finger casual) au lieu de drag-and-release | 3 | 3 | 1 | 7 |
| M2 | Power = pull-back de la bow visuelle, le catapulte recule physiquement | 4 | 2 | 2 | 8 |
| M3 | Rythm-tap auto-aim : trajectoire qui balaie, tap pour lock | 4 | 2 | 2 | 8 |
| **M4** | **Critical-zone target : marker bullseye sur point faible enemy, feedback combo** | **4** | **4** | **5** | **13** |
| M5 | Two-shot combo : 1ère shot free, 2ème déclenche glow DOUBLE-damage | 3 | 4 | 4 | 11 |
| M6 | Compteur 3-shots-only → tension scarcity | 3 | 4 | 3 | 10 |
| M7 | Power-up à collecter mid-flight (étoile dans l'arc) | 3 | 3 | 3 | 9 |
| M8 | Wall-bounce ricochet | 3 | 2 | 2 | 7 |
| M9 | Multi-projectile fan (1 drag → 3 shots spread) | 4 | 3 | 3 | 10 |

**Top axe MECHANIC = M4** (Critical-zone). Best Σ. Augmente clarity (où viser) + adds juice (combo feedback). Distinct de V2 aim-preview (run-1, qui aidait à *comment* viser, pas *où*).

---

## Axe PALETTE (visuel/ambiance, métrique : thumb-stop)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| **P1** | **Comic-book pop : outlines épais, halftone dots, KAPOW sur impacts** | **5** | **3** | **5** | **13** |
| P2 | Saturday-cartoon : bright/clean child-friendly | 3 | 3 | 5 | 11 |
| P3 | Pixel-art retro 8-bit overlay (NES palette) | 4 | 2 | 4 | 10 |
| P4 | Y2K néon (pink/cyan/purple) | 4 | 3 | 4 | 11 |
| P5 | Watercolor / sepia hand-painted | 3 | 2 | 4 | 9 |
| P6 | Minimaliste mono+1 (blanc + accent doré ou rouge) | 3 | 4 | 4 | 11 |
| P7 | Glow-only dark-mode (bloom partout) | 3 | 3 | 4 | 10 |
| P8 | Sand / desert reskin (palette flamme) | 3 | 3 | 4 | 10 |

**Top axe PALETTE = P1** (Comic-book pop). Thumb-stop immédiat sur feed TikTok. Genre-bending (mobile-game → comics). Distinct de V3 night-storm (cool/dark) — ici chaud/saturé.

---

## Axe NARRATIVE (story beat, métrique : emotional pull)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| N1 | Speech-bubble "Save the princess!" avant fight | 3 | 4 | 5 | 12 |
| N2 | "Defeat the king" → vilain montré smirking → revenge motive | 3 | 3 | 4 | 10 |
| N3 | Friend cheers "GO!" floating bubble à chaque shot | 2 | 4 | 5 | 11 |
| N4 | Lore tooltip "Dragon coming" → urgency narrative | 4 | 3 | 4 | 11 |
| N5 | Cinematic scroll : villages détruits → empathie pré-game | 4 | 2 | 3 | 9 |
| N6 | Boss-tease : œil de dragon clignote derrière castle ennemi | 4 | 3 | 4 | 11 |
| N7 | Personal stakes : icône famille sur ton castle | 3 | 3 | 4 | 10 |

Axe NARRATIVE non sélectionné — moins de leverage qu'un axe visuel/mécanique pour un playable de 28s, et risque "text-heavy" qui ralentit retention. Garder pour run-3 si run-2 montre un signal sur la dimension émotionnelle.

---

## Axe ENDCARD (CTA + post-game, métrique : CTA pull)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| E1 | "200+ levels next" carousel teaser | 3 | 4 | 5 | 12 |
| **E2** | **Loot drop : chest s'ouvre, gems flow vers le compteur du bouton CTA** | **5** | **3** | **5** | **13** |
| E3 | "PLAY AS [hero]" perso-locked CTA | 3 | 3 | 4 | 10 |
| E4 | Multiplayer tease ghost opponent + "vs Real Players" | 4 | 3 | 4 | 11 |
| E5 | Progress bar à 90% (Zeigarnik) "You're 90% to next reward" | 5 | 4 | 5 | 14 |
| E6 | "Continue or quit?" red×/green✓ binary | 3 | 4 | 4 | 11 |
| E7 | Single arrow CTA "PLAY →" (data : +26% clics) | 3 | 5 | 5 | 13 |
| E8 | Auto-restart difficulté +1 pour 5s avant CTA | 3 | 2 | 2 | 7 |
| E9 | Praise-stack "★★★ MASTER!" rating reveal | 3 | 4 | 5 | 12 |
| E10 | Calm-to-chaos : serene win UI explose en 3D burst | 4 | 3 | 4 | 11 |

**Top axe ENDCARD = E5** (Zeigarnik 90% bar) > E2 (loot juicy) en Σ pur, mais **E2 retenu** : plus visuel, donc plus visible côté grid de comparaison + lift plus dramatique sur thumbnail. E5 garde une excellence "design pure" qu'un sub-agent peut sur-interpréter.

Choix retenu : **E2 (Loot chest → CTA gems)**. Distinct de V4 fail-tease (run-1, qui jouait sur l'inversion du fail).

---

## Sélection finale Run-2 — 4 variations, axes orthogonaux

| Var | Axe | Hypothèse | Métrique cible |
|---|---|---|---|
| V1-failure-first | hook | Ennemi gagne dans les 2 premières secondes, screen-shake + "OH NO", puis le user reprend la main | retention@5s |
| V2-bullseye-target | mechanic | Marker bullseye sur le point faible du castle ennemi, combo feedback "CRIT!" sur impact zone | clarity / mechanic-grasp |
| V3-comic-pop | palette | Outlines épais, halftone dots overlay, KAPOW/BOOM lettering sur impacts | thumb-stop |
| V4-loot-chest | endcard | Chest s'ouvre sur la win/loss screen, gems flow vers le CTA, compteur tick visible | CTA pull |

Pas de variation narrative dans run-2 — réservée pour run-3 si signal.

---

*Run-2 lancée le 2026-04-26.*
