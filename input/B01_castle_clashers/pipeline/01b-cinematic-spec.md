# Étape 1b — Lock cinématique (caméra, rythme, opening)

> **Étape ajoutée v0.2.** La cinématique (caméra, rythme, transitions, frame d'ouverture) est un sous-système load-bearing au même titre que la mécanique. Sans lock explicite avant scaffold, l'agent fabrique un pacing arbitraire qui s'éloigne de la source et plombe la fidélité finale. **Cette étape est bloquante avant 02.**

---

## 1b.1. Pourquoi cette étape existe

Cas vécu run-1 : la mécanique tour-par-tour était correcte mais le rendu visuel a été noté **3.5/10** par Gemini Vision parce que :

- La caméra restait statique au lieu d'enchaîner un *ping-pong* (zoom_in_us → follow_proj → cut_to_them → dwell → cut_to_us…) observé dans la source.
- Les 2 châteaux étaient affichés simultanément alors que la source montre **un seul château à la fois** (cinématique mono-entité avec cut entre les deux).
- L'opening démarrait en `state=ready` neutre alors que la source démarre **en pleine attaque ennemie** sur la 1ère frame.
- Les projectiles voyageaient en 200 ms au lieu des ~700 ms cinématographiques de la source.

Aucun de ces points n'est dans `input/<jeu>/input/*.md`. Ils ne sortent que d'une analyse visuelle frame-par-frame de la source. → cette étape les force.

## 1b.2. Trois questions à locker (input Gemini obligatoire)

Lance un appel Gemini focal sur la **vidéo source complète** avec ce prompt-type (à adapter dans `SANDBOX/prompts/cinematic-spec.md`) :

```markdown
Analyse cette vidéo de playable ad. Pour chaque question, donne une réponse 
courte et factuelle, avec timestamps précis [mm:ss.ms] :

1. **Mono ou dual frame** : la source montre-t-elle simultanément les 2 entités 
   principales (2 châteaux, 2 joueurs, 2 zones) à l'écran, ou jamais ? Si jamais, 
   liste les cuts qui basculent de l'une à l'autre avec leurs timestamps.

2. **Camera state machine** : sur les premières 15 secondes, liste dans l'ordre 
   chaque mouvement caméra observé (zoom in / cut / pan / dwell / dezoom) avec 
   sa durée approximative en ms. Format : 
   `T+<ms> <move_name> dur=<ms> from=<state> to=<state>`.

3. **Opening anchor** : décris en détail la 1ère frame de la vidéo (qui est en 
   train d'agir, où est la caméra, zoom level, état HP, animations en cours). 
   C'est l'état initial exact du playable.

4. **Projectile speed** : mesure la durée bout-en-bout d'un tir (depuis 
   apparition jusqu'à impact) sur 2-3 occurrences. Donne la moyenne en ms.

5. **Cycle ping-pong** : durée d'un cycle complet "tour joueur + tour ennemi" 
   en ms. Décompose en sous-phases si tu peux.

Réponds en moins de 400 mots, structure ferme.
```

Lance avec :

```bash
set -a; source .env; set +a
python tools/analyze_video.py input/<jeu>/input/source.mp4 \
    --prompt SANDBOX/prompts/cinematic-spec.md \
    --out SANDBOX/outputs/cinematic-gemini-raw.md
```

## 1b.3. Sors `cinematic-spec.md` lockée

À partir de la réponse Gemini + ton skim §1, écris `SANDBOX/outputs/cinematic-spec.md` :

```markdown
# Cinematic spec — <jeu>

## Frame visibility
- [ ] Mono-frame (1 entité visible à la fois) — cuts entre vues
- [ ] Dual-frame (2 entités simultanément à l'écran)
- [ ] Hybride : <description>

→ Conséquence sur scene-split : <mono → scene_<vue> avec view=A|B / dual → 
scene_A + scene_B simultanées>

## Opening anchor (1ère frame)
- État initial : <qui agit, animation en cours>
- Caméra : zoom=<level>, focus=<entité>
- HP : ours=<X%>, them=<Y%>
- Action en cours : <ex: bombe ennemie en chute, impact dans 200ms>

→ `scene_manager.start()` doit démarrer dans cet état exact, **pas** dans un 
`state=ready` neutre.

## Camera state machine
| T+ms | Move | Durée | From | To | Notes |
|---|---|---|---|---|---|
| 0 | dwell | 600 | OURS_zoom_in | OURS_zoom_in | hook, montre l'attaque ennemie |
| 600 | cut | 0 | OURS | INTERIOR | révèle l'intérieur |
| ... | ... | ... | ... | ... | ... |

## Projectile speed
- Moyenne bout-en-bout : <X> ms
- Trajectoire : <ballistique haute / tendue / autre>
- Trail : <oui/non, couleur>

## Cycle ping-pong
- Durée totale : <X> ms
- Décomposition : fire(<a>ms) → cut_to_enemy(<b>ms) → dwell(<c>ms) → 
  cut_to_ours(<d>ms) → dwell(<e>ms)

## Gates de validation step 5
Le playable final doit, en clip vidéo, reproduire :
- [ ] L'opening anchor à ±100 ms
- [ ] Le ping-pong cycle à ±15 % de durée totale
- [ ] La séquence camera state machine dans le même ordre
- [ ] La projectile speed à ±20 %
```

Cette spec est **lockée** : elle ne change pas après ce point sans documenter pourquoi (commit avec `[unlock-cinematic]`).

## 1b.4. Sortie attendue

- `SANDBOX/prompts/cinematic-spec.md` (le prompt focal)
- `SANDBOX/outputs/cinematic-gemini-raw.md` (la réponse Gemini brute)
- `SANDBOX/outputs/cinematic-spec.md` (la spec lockée — **canonique**)
- **Commit jalon** : `pipeline(01b): cinematic spec locked`

→ Le commit body doit contenir un résumé en 5 lignes des 5 points de la spec, pour faciliter le rebase d'agents futurs.

---

Étape suivante : [`02-asset-anchor.md`](02-asset-anchor.md).
