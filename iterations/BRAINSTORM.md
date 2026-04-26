# BRAINSTORM — Castle Clashers playable iterations

> Generated 2026-04-26 by main agent. Heuristic-only (no Gemini scoring).
> Source signal: WebSearch on "playable ad trends 2026 / first-3s best practices".
> Constraint: NO reference to tower-defense / castle-genre playables (cross-pollination only).

## Signal harvested

- 71% of retention decided in **first 2 seconds**. Pattern-interrupt > exposition.
- 2026 trend: lead with **micro-drama / light-horror / frustration-tease**, not mechanic exposition.
- Mechanic diversification (drag → tap, lane, charge, gate) is the #1 lever in modular UA testing.
- AI/companion-style narrative hooks rising fast; emotional-stakes characters > generic mascots.
- Over-simplified one-tap is fading; mid-engagement (15–30s, real verb) wins.
- Dishonest gameplay-vs-game divergence destroys D1 retention → keep core loop honest.
- Endcard is a UA primitive — fail-tease ("you almost lost") often beats victory CTA.

## 30 hypotheses (1–5 lift × cost × risk)

> L = expected lift, C = build cost, R = risk to combat loop. Score = L − C − R.

### Axis: HOOK (first 3 s)

| # | Hypothesis | L | C | R | Σ |
|---|---|---|---|---|---|
| H1 | Cold-open at HP 15% with enemy bomb mid-air → "save it" urgency | 5 | 2 | 1 | **+2** |
| H2 | Black-screen → red flash → "ENEMY ATTACKING" diegetic title card | 3 | 1 | 1 | +1 |
| H3 | Princess voiceover: "They're at the gate!" subtitle bubble | 4 | 3 | 2 | -1 |
| H4 | Slow-mo bomb arc with character POV gasp | 3 | 3 | 1 | -1 |
| H5 | Start mid-trajectory of player's first arrow already fired | 4 | 4 | 3 | -3 |
| H6 | Question overlay "Can you survive 30s?" + countdown | 3 | 2 | 1 | 0 |
| H7 | Fake-loading bar that "fails" then triggers attack | 2 | 4 | 2 | -4 |

### Axis: MECHANIC (combat loop modifier)

| # | Hypothesis | L | C | R | Σ |
|---|---|---|---|---|---|
| M1 | Persistent trajectory preview (parabolic dotted line during drag) | 4 | 2 | 1 | **+1** |
| M2 | Charge-to-fire (hold to power, release) replaces drag-aim | 4 | 5 | 5 | -6 |
| M3 | Multi-shot combo: 3 projectiles per release, fan spread | 3 | 4 | 4 | -5 |
| M4 | Tap-to-fire auto-aim (drag-free, tap unit to lock target) | 3 | 4 | 3 | -4 |
| M5 | Damage-multiplier crit zone (ring on enemy) | 3 | 3 | 2 | -2 |
| M6 | Time-rewind: lose-state triggers "rewind 1 turn" tutorial beat | 5 | 5 | 4 | -4 |
| M7 | Slow-mo on perfect-aim window | 4 | 3 | 2 | -1 |
| M8 | Shake-to-reload (motion gimmick) — DROP, gimmicky | 1 | 3 | 3 | -5 |

### Axis: PALETTE (visual / ambient)

| # | Hypothesis | L | C | R | Σ |
|---|---|---|---|---|---|
| P1 | Night + storm palette with lightning flashes during enemy turn | 4 | 2 | 1 | **+1** |
| P2 | Sunset orange tint, warm cinematic | 3 | 1 | 0 | +2 (low lift but free) |
| P3 | Cel-shaded comic-book outlines on units | 3 | 4 | 2 | -3 |
| P4 | High-contrast monochrome red on attack frames | 2 | 2 | 1 | -1 |
| P5 | Snow / winter reskin (white roof, breath puffs) | 3 | 3 | 2 | -2 |
| P6 | Hellscape: lava ground + ember particles | 4 | 4 | 3 | -3 |
| P7 | Glowing magic palette (purple/teal aura on projectiles) | 3 | 2 | 1 | 0 |

### Axis: NARRATIVE (story beat)

| # | Hypothesis | L | C | R | Σ |
|---|---|---|---|---|---|
| N1 | Floating speech bubble from active unit ("Defend the king!") | 3 | 3 | 2 | -2 |
| N2 | Damsel-in-tower silhouette behind player castle (visible during freeplay) | 4 | 4 | 2 | -2 |
| N3 | Boss-name reveal banner before each enemy turn | 3 | 3 | 2 | -2 |
| N4 | Dialogue card after first hit ("HE'S WEAKENING!") | 3 | 2 | 1 | 0 |
| N5 | Numeric kill-count tally that punches up on hit | 3 | 2 | 1 | 0 |
| N6 | Companion-pet sprite cheering on every player shot | 3 | 4 | 2 | -3 |

### Axis: ENDCARD

| # | Hypothesis | L | C | R | Σ |
|---|---|---|---|---|---|
| E1 | Fail-tease endcard: "You barely survived. Try harder?" + CTA | 5 | 2 | 1 | **+2** |
| E2 | Split A/B end: "EASY" vs "HARD" buttons, both → install | 4 | 2 | 1 | +1 |
| E3 | Animated zoom-out reveal of full kingdom + CTA | 3 | 4 | 2 | -3 |
| E4 | Stat card: "You did 540 dmg. 92% of players did less." | 4 | 3 | 1 | 0 |
| E5 | Countdown CTA — "Install in 3… 2… 1…" auto-redirect | 2 | 2 | 4 | -4 (annoying) |
| E6 | Chest-open reveal animation, install = open chest | 4 | 4 | 2 | -2 |

## Selection — top 4 (one axis each)

Picked for **highest Σ on its axis** + cross-pollination + low regression risk.

| ID | Slug | Axis | Hypothesis | Why |
|---|---|---|---|---|
| **V1** | `cold-open` | hook | H1 — Cold-open at HP 15% with bomb mid-air | Pattern-interrupt = #1 retention lever, low blast radius (script.js + initial HP only) |
| **V2** | `aim-preview` | mechanic | M1 — Persistent parabolic trajectory preview | Honest mechanic clarification, lifts CTA pull, only touches scene_interior/aim.js |
| **V3** | `night-storm` | palette | P1 — Night + storm palette + lightning on enemy turn | Visual pattern-interrupt, ambient drama, scene_exterior tint only |
| **V4** | `fail-tease` | endcard | E1 — Fail-tease endcard "You barely survived" | Inverts victory CTA, modular swap on endcard.js only |

Skipped narrative axis: top score is N4 at 0 — not worth the build cost on hackathon clock. Endcard E2 is the runner-up alternate if a slot opens.

## Per-variation success metric

- V1: time-to-first-meaningful-frame < 800 ms; retention@5s as secondary
- V2: ratio of shots that land near target / total shots (clarity)
- V3: visual differentiation vs baseline (qualitative diff)
- V4: CTA pull (subjective — endcard tap rate proxy)
