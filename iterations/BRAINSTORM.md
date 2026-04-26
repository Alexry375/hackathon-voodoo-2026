# BRAINSTORM — Run 3

Baseline : `iterations/baseline/playable.html` ← gold-standard Sami `origin/feature-trail@7061860`
(inclut splash pre-canvas, endcard juicy [stars + confetti + social-proof + shimmer + tap-anywhere],
comeback cinematic POWER UP sur Continue, idle_pulses, projectile_glow, dev/prod fix 952a7cc, micro-feedback dead-time).

Run-1 (tag `iter-run1-archive`) et run-2 (sur `iteration-pipeline-alexis`) : **obsolètes** — bâtis sur de
vieux baselines (4eae529 puis 14edd1a) qui n'avaient ni l'endcard juicy ni le comeback cinematic.

> Règle : pas de réf aux playables Castle Clashers ni au genre tower-defense / royal-match-castle.
> Cross-pollination depuis puzzle / runner / idle / hyper-casual / TikTok creative.
> Heuristique humaine pure — pas de scoring Gemini de **sélection** (Gemini reste autorisé en review qualité phase 6).
> **V4 doit être ADDITIVE** — couche par-dessus l'endcard juicy de Sami, ne PAS le récrire.

---

## ⚡ JUICY DOCTRINE — règle absolue Run-3

Le baseline gold-standard de Sami est techniquement propre mais **émotionnellement tiède**. Les 4
variations ne sont PAS des features additionnelles — ce sont des **amplificateurs sensoriels**.
Le but : que le user ait envie de cliquer parce que ça lui *fait quelque chose* en 3 secondes.

**Règle composition** : un effet seul = pas une variation. Chaque variation doit empiler **≥4
effets juicy en cascade synchronisée** sur le moment-clé de son axe. Le sub-agent qui livre une
exécution minimale (ex. "j'ai dessiné un œil + un texte") sera flag `needs-fix`. Critères :

| Effet | Exemple concret |
|---|---|
| Screen-shake gradué | amplitude scale avec l'intensité, pas binaire |
| Particles ≥2 types | sparkles + dust + radial flash, pas une seule famille |
| Color-shift dynamique | hue-rotate ou palette stops qui glissent sur 200-400ms |
| Scale-punch + rotation jitter | overshoot ≥1.15, jitter ±8°, settle ease-out-back |
| Glow-bloom / chromatic aberration | à minima sur les moments-clés, pas constant |
| Slow-mo flash | time-scale 0.4-0.7× pendant 150-300ms sur un trigger |
| Persistence / trail | l'effet laisse une trace ≥400ms, pas pop-fade instantané |
| Layered timing ≥3 events | sur la fenêtre 0-300ms, 3 events orchestrés (ex. flash 0ms + pop 80ms + shake 120ms) |
| Lettering animé | font ≥56px, stroke épais, scale-pulse + rotation, fade 600-800ms |
| Audio stinger (silent-ok) | sub-pulse low-freq via WebAudio si trivial à plug ; visuel doit rester 100% intelligible muted |

**Minimum acceptable par variation** : 4 effets de cette table OU justification explicite dans
meta.json sur pourquoi un effet est délibérément absent.

**Anti-pattern** : "wash overlay alpha 0.10" tout seul = NO. "Badge rond avec un chiffre" tout
seul = NO. "Œil qui clignote" tout seul = NO. Toujours composé.

---

## Insights actualisés (avril 2026)

- AppLovin/Mintegral 2026 winners : **3D camera-zoom hook** (face-cam style, character à l'écran les
  3 premières secondes) bat le pattern-interrupt classique sur retention@5s.
- **Dialogue/voice-line bubble** ("HELP!", "ATTACK!") = +18% retention (Voodoo deck Q1-26).
- **Anti-frustration** > juiciness pure : les playables qui *donnent* la réussite (assist auto-aim,
  win-tease) battent ceux qui mettent en challenge — surtout sur audiences cold-traffic.
- **Sound-on assumption** : 30% des impressions mute → la juice doit être 100% visuelle.
- **End-card "what's next"** : montrer 1 frame du level 2 ou un ennemi non-débloqué = +14% CTR
  (Zeigarnik appliqué à un asset visuel concret, pas une barre de progress).

---

## Notation 1–5 sur 3 critères (Lift × Cost × Risk)

`L=Lift attendu sur la métrique cible`
`C=Coût d'implémentation sub-agent (5=cheap, 1=heavy)`
`R=Safety vs régression du combat loop (5=safe, 1=risky)`
`Σ = L + C + R (max 15)`

---

## Axe HOOK (intro 0–3s, métrique : retention@5s)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| H1 | Speech-bubble "DEFEND THE KEEP!" du roi bleu pendant l'intro (pop scale + tail) | 4 | 4 | 5 | 13 |
| H2 | In-medias-res : 2 ravens déjà mid-air à t0, impact à t+400ms (pas d'attente) | 4 | 3 | 3 | 10 |
| H3 | Voice-line "INCOMING!" + slow-mo bombe à 0.3× pendant 800ms | 4 | 2 | 3 | 9 |
| H4 | Failure-first : ennemi gagne à 70%, "OH NO!", recover (recyclé run-2) | 4 | 3 | 3 | 10 |
| **H5** | **Dragon-eye boss-tease : œil rouge clignote derrière le castle ennemi pendant l'intro, "BEWARE!" subtitle** | **5** | **3** | **4** | **12** |
| H6 | Tutorial pre-empt : flèche+glow déjà sur le castle bleu avant le splash s'efface | 3 | 5 | 5 | 13 |
| H7 | POV first-person : zoom inside du catapulte, pull-back à t+1000ms | 3 | 1 | 2 | 6 |
| H8 | Reverse-chrono : flash de la victoire t0, fade back to start | 2 | 2 | 3 | 7 |
| H9 | "VS" splash 2v2 fighting-game style avec castle bleu vs castle rouge | 4 | 2 | 4 | 10 |
| H10 | Compteur "WAVE 1 / 3" en top-banner pour suggérer un meta-progrès | 3 | 4 | 4 | 11 |

**Top axe HOOK = H5** (Dragon-eye boss-tease). Score 12, mais le tie-break humain le retient car :
- introduit un **villain visible** que le baseline n'a pas → emotional pull
- Zeigarnik visuel ("qui est cette créature ?")
- coût modéré (un sprite œil dessiné canvas + animation blink + texte)
- **distinct des winners run-1 (cold-open) et run-2 (failure-first)** → pas de répétition d'axe

H1 et H6 ont le meilleur Σ (13) mais H1 est trop proche d'un simple "instruction text" déjà géré par
`instruction_text.js`, et H6 est cosmétique pur sans valeur narrative. H5 apporte plus de signal.

---

## Axe MECHANIC (modif boucle, métrique : clarity / mechanic-grasp@10s)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| M1 | Tap-to-fire (one-finger casual) au lieu de drag | 3 | 3 | 1 | 7 |
| M2 | Bullseye-target sur point faible enemy + CRIT (recyclé run-2 winner d'axe) | 4 | 4 | 5 | 13 |
| **M3** | **Combo meter : x1 → x2 → x3 chaîne sur hits consécutifs <2s, gros texte "x3 COMBO!" + multiplicateur damage visible** | **5** | **3** | **4** | **12** |
| M4 | Two-shot loaded : la 2e shot a un glow violet → DOUBLE damage si tirée vite | 4 | 3 | 4 | 11 |
| M5 | Auto-aim ghost trajectory : ligne pointillée prédictive permanente (assist) | 4 | 4 | 5 | 13 |
| M6 | Compteur 3-shots-only → tension scarcity | 3 | 4 | 3 | 10 |
| M7 | Power-up à collecter mid-flight (étoile dans l'arc) | 3 | 3 | 3 | 9 |
| M8 | Wall-bounce ricochet | 3 | 1 | 1 | 5 |
| M9 | Multi-projectile fan (1 drag → 3 shots spread) | 4 | 2 | 2 | 8 |
| M10 | Charge meter : hold longer = stronger shot, libère au release | 4 | 3 | 4 | 11 |

**Top axe MECHANIC = M3** (Combo meter). Score 12, retenu sur M2/M5 (Σ=13) car :
- **distinct** du run-2 winner d'axe (M2 bullseye) → pas de cannibalisation
- mécanique de skill-progression visible → plus addictif que clarity-aid pur
- s'agrippe au système `praise_floats.js` existant (extension naturelle, pas d'ajout d'asset)
- montre la "depth" du game à l'utilisateur cold-traffic en 10 secondes

M5 (auto-aim ghost) écarté : trop proche du `drawDottedTrajectory` déjà présent dans le tutorial.

---

## Axe PALETTE (visuel/ambiance, métrique : thumb-stop)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| P1 | Comic-book pop : halftone + KAPOW (recyclé run-2 winner) | 5 | 3 | 5 | 13 |
| P2 | Saturday-cartoon bright/clean | 3 | 3 | 5 | 11 |
| P3 | Pixel-art retro 8-bit overlay (NES palette) | 4 | 2 | 4 | 10 |
| **P4** | **Y2K néon : pink/cyan/purple chromatic-aberration overlay + neon-outline sur projectiles + scan-lines subtiles** | **5** | **3** | **4** | **12** |
| P5 | Watercolor / sepia hand-painted | 3 | 2 | 4 | 9 |
| P6 | Minimaliste mono+1 (blanc + accent doré) | 3 | 4 | 4 | 11 |
| P7 | Glow-only dark-mode (bloom partout) | 4 | 3 | 4 | 11 |
| P8 | Sand / desert reskin | 3 | 3 | 4 | 10 |
| P9 | Watercolor + soft-light overlay (Studio-Ghibli vibe) | 3 | 1 | 3 | 7 |
| P10 | Chrome metallic : tout en réflexion argent/or, sky chrome | 3 | 2 | 3 | 8 |

**Top axe PALETTE = P4** (Y2K néon). Score 12, retenu sur P1 (Σ=13 mais run-2 winner) car :
- Comic-pop a déjà été fait et gagné — refaire = pas d'apprentissage nouveau
- Y2K néon = **second meilleur thumb-stop** sur feed TikTok 2026 (palette pink/cyan = high-saturation on small screens)
- Reskin par overlay (additive blend) → coût bas, zéro régression
- Code-only via `globalCompositeOperation` + scan-lines pattern

---

## Axe NARRATIVE (story beat, métrique : emotional pull)

| # | Hypothèse | L | C | R | Σ |
|---|---|---|---|---|---|
| N1 | Speech-bubble "Save the princess!" avant fight | 3 | 4 | 5 | 12 |
| N2 | Vilain montré smirking → revenge motive | 3 | 3 | 4 | 10 |
| N3 | Friend cheers floating bubble à chaque shot | 2 | 4 | 5 | 11 |
| N4 | Lore tooltip "Dragon coming" → urgency (overlap H5) | 3 | 3 | 4 | 10 |
| N5 | Cinematic scroll : villages détruits → empathie pré-game | 4 | 1 | 2 | 7 |
| N6 | Personal stakes : icône famille sur ton castle | 3 | 3 | 4 | 10 |

**Axe NARRATIVE non sélectionné** — recouvrement avec H5 (boss-tease) sur l'axe HOOK et avec
le futur axe ENDCARD sur l'emotional pull. Garder comme back-up si une variation fail au reviewer.

---

## Axe ENDCARD (CTA + post-game, métrique : CTA pull) — **CONTRAINTE ADDITIVE**

> Le baseline a déjà : 3 stars staggered, confetti burst, social-proof "★ 4.8 · 12M+ players",
> shimmer band sur CTA, tap-anywhere. **NE PAS** récrire `endcard.js` ; ajouter une couche
> au-dessus (compositionnelle) ou modifier seulement l'ordre `_drawXXX` calls.

| # | Hypothèse additive | L | C | R | Σ |
|---|---|---|---|---|---|
| E1 | Coin/gem rain en background derrière les stars (loop) | 3 | 4 | 5 | 12 |
| **E2** | **"Next level preview" : carte teaser scrollante au-dessus des stars (frame 2 d'un dragon ou 3 sprites villageois à sauver) avec label "LEVEL 2 →"** | **5** | **3** | **5** | **13** |
| E3 | Loot-chest qui s'ouvre au-dessus de la title, gems flow vers le compteur (recyclé run-2) | 4 | 3 | 4 | 11 |
| E4 | Multiplayer ghost "vs Real Players" tease badge | 4 | 4 | 4 | 12 |
| E5 | Progress bar 90% Zeigarnik au-dessus du CTA | 4 | 4 | 4 | 12 |
| E6 | "★★★ MASTER!" rating reveal sequencé après les stars | 3 | 4 | 5 | 12 |
| E7 | Calm-to-chaos burst 3D au-dessus de "VICTORY!" | 4 | 3 | 4 | 11 |
| E8 | Avatar reveal : ton hero apparaît avec speech-bubble "JOIN ME" | 3 | 2 | 3 | 8 |
| E9 | Daily-bonus pop-up "Login bonus +500 gems" pré-CTA | 3 | 3 | 4 | 10 |
| E10 | Ennemi suivant teasé en silhouette à droite du CTA "vs ???" | 4 | 3 | 5 | 12 |

**Top axe ENDCARD = E2** (Next level preview).
- Best Σ (13) **et** purement additif (nouveau module `endcard_level_preview.js` qui se branche
  dans `endcard.js` avec 1 import + 1 draw call, sans toucher l'existant)
- Zeigarnik visuel concret > barre de progress abstraite
- Donne au user une **raison spécifique** d'installer (level 2 visible)
- Coût bas : un sprite teaser dessiné canvas (silhouette dragon ou village) + slide-in animation
- Aucune régression sur le tap-anywhere (le preview est zone-passive, le tap toujours déclenche redirect)

---

## Sélection finale Run-3 — 4 variations, axes orthogonaux (version JUICY)

| Var | Axe | Hypothèse JUICY (≥4 effets composés) | Métrique cible |
|---|---|---|---|
| V1-dragon-tease | hook | Œil rouge dragon **+ griffes en bordure d'écran (silhouette gauche/droite scratch in)** + vignette pulse rouge low-freq + tremblement écran 4Hz + lettering "BEWARE!" scale-punch+rotation jitter + lens-flare radial sur l'œil | retention@5s |
| V2-combo-meter | mechanic | Compteur combo x1→x2→x3→x5 **avec hue jaune→orange→rose→cyan** + screen-shake amplitude scaling + radial flash full-screen au franchissement x3 + slow-mo 0.6× 200ms à x5 + lettering "x5 COMBO!" qui shake + ring particle burst sur chaque incrément | clarity / depth perception |
| V3-y2k-neon | palette | Tinted overlay pink/cyan/purple **+ chromatic aberration RGB displacement permanent (split 2-3px) + glitch micro-flickers sur impact (3 frames)** + neon-trail persistance 400ms sur projectiles + scan-lines wave (vertical drift 0.5Hz) + boot-up CRT tube effect (vignette + flicker 200ms au splash) | thumb-stop |
| V4-level-preview | endcard (ADDITIVE) | Panneau "LEVEL 2 →" qui **déchire un voile fog-of-war** (mask reveal animé) + dragon silhouette avec œil glow pulsing + breath particles (smoke wisps) + parallax 3 couches (sky / mountains / fog) + scale-punch d'entrée + chromatic glow sur le label "LEVEL 2 →" + bobbing 0.5Hz post-settle | CTA pull |

Pas de variation narrative dans run-3 — recouvrement avec H5/E2.

---

*Run-3 lancée le 2026-04-26.*
