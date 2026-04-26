# Run-3 — Winner

**V3 — y2k-neon JUICY** (axe : palette).

## Pourquoi V3 ?

| Critère | V1 dragon-tease | V2 combo-meter | V3 y2k-neon | V4 level-preview |
|---|---|---|---|---|
| Métrique cible | retention@5s | depth perception | **thumb-stop** | CTA pull |
| Quand l'effet hit le user | t=0-4.2s (intro) | t=10s+ (après 1er hit) | **t=0+ (immédiat, permanent)** | t=30s+ (endcard only) |
| Effets juicy stack | 6 | 8 | **8** | 7 |
| Asset cost | 0 | 0 | **0** | 0 |
| Pertinence cold-traffic feed | 4/5 | 2/5 | **5/5** | 1/5 |
| Demo value pour pipeline (deliverable hackathon) | 3/5 | 3/5 | **5/5** | 4/5 |

V3 dominait sur **2 dimensions critiques** simultanément :
1. **Thumb-stop performance** : sur TikTok/Reels 2026, les 200 premières ms de l'impression décident scroll-vs-stop. Y2K néon (chromatic aberration permanent + neon trails sur projectiles + scan-line wave + CRT boot + animated wash) est immédiatement distinct du visual baseline grain de mille autres playables tower-defense / castle-clash dans le feed.
2. **Demo value pour la deliverable hackathon** : le track Voodoo demande que **la pipeline soit le livrable**, pas un seul playable. V3 prouve que la pipeline peut produire des transformations stylistiques non-triviales **purement à partir d'une spec, zéro nouveau asset, zéro Scenario MCP** — c'est la meilleure démonstration de la plage créative du tool.

V1 dragon-tease arrive 2e (excellent narrative pull, mais le hook ne joue qu'une fois ; V3 reste actif tout au long des 28s).
V2 combo-meter et V4 level-preview ont une grande qualité d'exécution mais leur effet ne se déploie pas dans la fenêtre où le thumb-stop se décide (avant la 1ère seconde).

## Stack V3 (8 effets composés)

1. Wash diagonal pink/cyan/purple animé (rotation 0.05Hz, multiply alpha 0.12)
2. Chromatic aberration RGB permanent (R/B 2px split, 1-pass offscreen, screen blend)
3. Glitch burst sur chaque `_impactEnemy` + `_impactOurs` (10 bandes horizontales displacement + inversion flash, 90ms)
4. Neon trails sur projectiles (ring buffer 12-entries, cyan/pink alternés, fade exponentiel, lighter blend)
5. Scan-line wave avec drift vertical (3px lignes tous les 6px, 0.5Hz, lighter alpha 0.05)
6. CRT boot-up sur intro 0-600ms (tube-open vignette + cyan vertical sweep + 200ms flicker)
7. Vignette violet aux coins (radial → rgba(120,40,200,0.45))
8. Neon outline 3px sur chaque projectile (cyan ours / pink enemy + inner glow blur 6)

## Trade-offs documentés

- Chromatic aberration downgradée de 3-pass à 1-pass pour tenir le budget frame <16ms à 60fps sur AppLovin Preview hardware.
- Barrel-distortion via canvas filter omis (coût per-frame trop élevé) — la vignette violet seule couvre le peripheral darkening.
- Post-FX skip strict pendant `phase === 'endcard'` ET `phase === 'forcewin'` → confetti, stars, social-proof, shimmer, flash blanc de Sami restent pristine.

## Branche & artifacts

- Sous-branche : `iter/r3-V3-y2k-neon`
- Artefact : `iterations/r3-V3-y2k-neon/playable.html` (2.96 MB)
- Thumbnail : `iterations/r3-V3-y2k-neon/thumbnail.png` (996 KB)
- Bundle : 2.82 MB single-file (well under 5 MB AppLovin cap)
- Mergé dans : `iter/run3-gold-baseline`

---

*Run-3 lancée le 2026-04-26. Winner décidé par l'agent main après reviewer pass juicy doctrine.*
