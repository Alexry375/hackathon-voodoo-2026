# Cinematic spec — Castle Clashers (B01)

> **Lockée step 01b — pipeline-cc-Alexis-v0--run-3.** Source : Gemini 3.1 Pro Preview sur `source.mp4` (cf. `cinematic-gemini-raw.md`). Toute modification après ce point doit être documentée par un commit `[unlock-cinematic]`.

## Frame visibility

- [x] **Mono-frame** (1 château visible à la fois) — cuts entre vues
- [ ] Dual-frame
- [ ] Hybride

**Exception dual-frame** : un unique pan/dezoom à T+1500 ms qui montre les 2 châteaux pendant que le projectile traverse l'écran (durée ~1500 ms). Hors de cette transition, **toujours 1 château**.

→ Conséquence sur scene-split : `scene_exterior` mono-château avec param `view = OURS_BLUE | THEM_RED`. Le pan dual sert uniquement de transition cinématique pour la trajectoire projectile inter-châteaux. Pas de rendu simultané statique.

## Opening anchor (1ère frame, T = 0)

- **Caméra** : fixe, plan moyen (medium close-up), centrée sur le **château ennemi rouge** (à droite dans la source).
- **Action en cours** : tir ennemi imminent — la première seconde est un dwell sur l'ennemi qui s'apprête à attaquer (animation de catapult/cannon armée).
- **HP** : `ours = 100%`, `them = 100%` (les 2 jauges HUD affichent 100).
- **Ambiance** : pluie en arrière-plan, château + chenilles statiques, **1 unité postée sur le rempart central** côté ennemi.
- **Pas d'UI tutoriel** au-dessus du cinematic — le drag-tutorial démarre seulement à T+5000 quand on cut sur l'intérieur bleu.

→ `scene_manager.start()` doit démarrer **dans cet état exact** (view=THEM_RED, dwell, projectile non encore tiré). **Pas** de `state=ready` neutre, pas d'opening sur notre château.

## Camera state machine (lockée pour les 15 premières secondes)

| T+ms  | Move        | Durée | From                  | To                   | Notes                                |
|-------|-------------|-------|-----------------------|----------------------|--------------------------------------|
| 0     | dwell       | 1500  | THEM_RED_ext          | THEM_RED_ext         | Hook : ennemi prépare tir            |
| 1500  | pan_out     | 1500  | THEM_RED_ext          | BOTH_wide            | Suit projectile ennemi (dual-frame)  |
| 3000  | cut         | 0     | BOTH_wide             | OURS_BLUE_ext        |                                      |
| 3000  | dwell       | 2000  | OURS_BLUE_ext         | OURS_BLUE_ext        | Impact sur nous + recoil tilt        |
| 5000  | cut         | 0     | OURS_BLUE_ext         | OURS_BLUE_int        | Bascule vue intérieure (player turn) |
| 5000  | dwell       | 4000  | OURS_BLUE_int         | OURS_BLUE_int        | Drag/aim tutorial visible            |
| 9000  | cut         | 0     | OURS_BLUE_int         | THEM_RED_ext         | Cut sur enemy au moment du tir       |
| 9000  | dwell       | 3000  | THEM_RED_ext          | THEM_RED_ext         | Impact + pause + chunks               |
| 12000 | pan_left    | 1000  | THEM_RED_ext          | THEM_RED_ext_left    | Amorce du tir ennemi                  |
| 13000 | cut         | 0     | THEM_RED_ext_left     | OURS_BLUE_ext        |                                      |
| 13000 | dwell       | 2000  | OURS_BLUE_ext         | OURS_BLUE_ext        | Impact sur nous                       |

## Projectile speed

- **Moyenne bout-en-bout** : **1500 ms** (mesuré sur 2 occurrences ennemi 00:01.5→00:03.0, joueur 00:18.5→00:20.0).
- **Trajectoire** : ballistique haute (parabole nettement arquée).
- **Trail** : oui, traînée visible (à confirmer couleur — probablement orange/feu pour boulets).
- Implication : **pas** de tir éclair 200-400 ms. Le pacing dépend de cette durée.

## Cycle ping-pong (player→enemy→player)

- **Durée totale** : **~10 000 ms** (mesuré de T+5000 à T+15000).
- **Décomposition** :
  - **Drag/aim** : 3500 ms (player turn intérieur)
  - **Fire + cut (vol masqué)** : 500 ms
  - **Impact ennemi + pause** : 3000 ms
  - **Enemy fire + flight** : 1000 ms (pan + tir)
  - **Impact joueur + cut back** : 2000 ms

## Gates de validation step 5.5 (clip-vs-clip ≥ 9/10 par segment)

Le playable final doit, en clip vidéo, reproduire :

- [ ] Opening anchor à ±100 ms (vue ennemi rouge, dwell 1.5 s avant tout tir)
- [ ] Ping-pong cycle à ±15 % de durée totale (~10 s ±1.5 s)
- [ ] Séquence camera state machine **dans le même ordre** sur 15 s
- [ ] Projectile speed à ±20 % (1500 ms ±300 ms)
- [ ] Mono-frame respecté hors transition dual du pan_out (T+1500→T+3000)
- [ ] Recoil tilt + chunks/débris à chaque impact

## Segments scorés en step 5.5

1. **intro** (T 0 → 3000) : dwell ennemi + pan projectile + impact sur nous
2. **aim** (T 5000 → 8500) : drag tutorial intérieur bleu
3. **fire_cinematic** (T 8500 → 9000) : tir + cut
4. **impact** (T 9000 → 12000) : ennemi se prend l'obus, chunks, recoil
5. **endcard** (T ~26000+ → fin) : CTA visuel
