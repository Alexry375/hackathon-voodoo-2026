# Pipeline v0.4 — propositions d'évolution (post run-3)

> Rapport rédigé après run-3 (Castle Clashers), basé sur tout ce qui s'est passé depuis le merge final de run-2 (commit `f44e383`) jusqu'à la pass5 du gate clip-vs-clip (score 2.0 → 2.8 en 5 itérations, 3 vagues de sub-agents).
> **Cible** : améliorer la pipeline framework pour les futures runs, en intégrant les patterns qu'on a dû redécouvrir et les pièges qu'on a rencontrés.
>
> Ce fichier est destiné à être merge-back sur la parent branch `pipeline-cc-Alexis-v0` pour devenir la v0.4.

---

## Synthèse exécutive

Cinq grands chantiers d'amélioration ressortent :

1. **Hook test programmatique** dans le playable, pour que `record_clip.mjs` puisse driver la cinématique sans simuler des inputs pointer fragiles. → impact massif sur reproductibilité de la gate clip-vs-clip.
2. **Cinematic-spec sous-cap'd** : il manque une UI-spec, une background-spec, et une recoil/shake-spec lockées en step 01b.
3. **Limite fondamentale du score Gemini fps=1** : il sous-évalue tout le polish (transitions sub-seconde, finesse de VFX). Il faut un protocole de scoring multi-fps.
4. **Sub-agents en parallèle** : `isolation: worktree` n'a PAS fonctionné dans nos runs (worktrees créés vides → fallback dans le worktree principal). Pattern à documenter ou tooling à fixer.
5. **Recording window** : 12 s ne suffit pas. Pour observer les 3 unités du roster + endcard, il faut ≥ 45-50 s avec multi-fires programmatiques espacés.

---

## 1. PROMPT.md (entry point)

### Ajouts proposés

```diff
+## Outils & hooks pour la gate clip-vs-clip

+- Le playable doit exposer **`window.__simulateFire(angle_deg, power)`**
+  (ou équivalent) pour permettre à Playwright de driver la cinématique
+  sans dépendre de pointer events fragiles (HIT_RADIUS, anchor positions).
+  Ce hook est test-only mais reste dans le bundle prod (overhead négligeable).
+  Voir `playable/script.js` du run-3 pour l'implémentation type.
+
+- **`tools/record_clip.mjs`** doit driver 3 fires programmatiques espacés de
+  ≥ 11 s (ping-pong cycle complet) pour couvrir les 3 unités du roster +
+  endcard sur un clip de 45-50 s. Le 1er fire ne doit pas être trop tôt
+  pour laisser visible le tutorial (5-6 s minimum).
```

### Modifs au § "Règles de fonctionnement"

```diff
- **Re-lis `pipeline/` au fil du run** : avant d'attaquer chaque étape...
+ **Re-lis `pipeline/` au fil du run** : avant d'attaquer chaque étape...
+ **Score fps=1 = ground truth structurel, fps=4 = polish** : un score
+ Gemini fps=1 sous-évalue les transitions <1s (iris, dive, micro-cuts) et
+ la finesse VFX. Quand tu améliores du polish, complète par un score
+ focal fps=4 sur un crop court (3-5s) du segment concerné. Voir
+ `pipeline/05-playwright-loop.md` § sampling fin.
```

---

## 2. `pipeline/01b-cinematic-spec.md`

La spec actuelle couvre frame visibility / opening anchor / camera state / projectile speed / cycle ping-pong. **Trois sections manquent** :

### 2.1. UI / HUD spec (à ajouter)

Sans lock UI, l'agent fabrique un curseur générique (la pointer arrow par défaut) et une ligne de visée minimaliste, alors que les playables Voodoo ont presque tous une **main de tuto** + **ligne pointillée balistique** + **HUD source-style** spécifique. Run-3 a explicitement payé sur cet axe (segment aim 2/10 → 4/10 quand on a câblé le hand cursor).

```markdown
## UI/HUD spec

- **HUD top** : description précise (texte HP, icônes châteaux miniatures,
  séparateur "VS", police, couleurs, layout).
- **Tutorial cursor** : main stylisée vs pointer générique. Animation
  cyclique attendue (durée du cycle, mouvement drag).
- **Aim feedback** : ligne pointillée balistique (couleur, espacement,
  taille des dots), barre de power éventuelle.
- **End-card** : layout (logo, characters, CTA), transition d'arrivée
  (fade, blur, scale).
```

### 2.2. Background atmosphere (à ajouter)

Run-3 a perdu des points "fidélité visuelle" en oubliant pluie, soldat sur le rempart ennemi, profondeur d'arrière-plan.

```markdown
## Background atmosphere

- **Météo** : pluie / neige / poussière / soleil ? Densité, couleur,
  vitesse.
- **Parallaxe** : nombre de couches (ciel / collines / forêt /
  premier plan), vitesse de déplacement relative.
- **Static actors** : unités sur les remparts, drapeaux, animaux —
  qui est-ce qu'on voit en idle ?
```

### 2.3. Impact / shake / recoil spec (à ajouter)

Run-3 a régressé sur "impact" segment quand Gemini a noté "absence screen shake et inclinaison du château". Le code AVAIT shake + tilt, mais d'intensité insuffisante.

```markdown
## Impact / shake / recoil spec

Pour chaque type d'impact (player→enemy, enemy→ours), locker :
- **Screen shake** : amplitude (px), durée (ms), courbe d'amortissement.
- **Castle tilt** : angle max (rad), durée (ms), axe.
- **VFX** : explosion (taille, couleur), debris (count, spread, gravity),
  smoke (opacity, lifetime).
- **Camera pause** (dwell) sur l'impact : durée recommandée (1500-3000 ms).
```

### 2.4. Spec "test hook"

```markdown
## Test hook (pour gate Playwright)

Le playable doit exposer `window.__simulateFire(angle_deg, power)` qui :
- lit `getActiveUnitId()` côté interior turn,
- emit `'player_fire'` avec un payload valide,
- retourne `true` si une unité est active, `false` sinon.

Cela permet à `record_clip.mjs` de driver la cinématique sans simuler
des inputs pointer (qui dépendent de HIT_RADIUS et de la position de
l'unit anchor — fragile et fragilité d'un test à l'autre).
```

---

## 3. `pipeline/05-playwright-loop.md`

Le run-3 a buté sur 4 pièges liés à cette étape. **Recommandations** :

### 3.1. § 5.1 — Recording duration et multi-fires

```diff
+## 5.1.1. Driver de fires programmatique

+Le playable doit exposer `window.__simulateFire(angle_deg, power)` (cf
+`pipeline/01b-cinematic-spec.md` § Test hook). `record_clip.mjs` doit
+lancer ≥ 3 fires espacés d'au moins **11 s** (un ping-pong cycle
+complet, voir cinematic-spec) pour couvrir les 3 unités du roster +
+l'endcard.

+Timeline type pour un clip de 50 s :
+- T+10500ms : 1er simulateFire (tutorial visible 5.5s d'abord)
+- T+21500ms : 2e simulateFire
+- T+32500ms : 3e simulateFire
+- T+45000ms : observation endcard

+Si tu sets 5500 ms entre fires (run-3 round 1), le 2e fire arrive
+pendant que le 1er cycle est encore en EXTERIOR_RESOLVE → comportement
+indéterminé, projectiles qui se mélangent visuellement.
```

### 3.2. § 5.5.3 — Sampling fin via `--fps`

Compléter avec :

```diff
+**Pattern dual-fps obligatoire** :
+
+1. **Score global fps=1 / clip 45 s** : gate principale. Donne le score
+   par segment. Gemini est strict sur la structure (camera state,
+   timing macro).
+2. **Score focal fps=4 / clip 3-5 s croppé sur la transition** : valide
+   le polish (iris, fade, micro-pacing). Sans ce 2e check, tu peux
+   shipper une transition iris parfaite mais avoir un score fps=1 qui
+   dit "c'est un cut sec" parce qu'il a sampled 2 frames sur ta 1.3s
+   de transition.
+
+Run-3 a observé : sub-agent B a livré un iris dive parfait (vu
+visuellement frame-par-frame). Le score fps=1 a donné 1/10 "cut sec".
+Le score fps=4 cropped a confirmé "1/10 cut sec" car le sampling 4 fps
+sur 4 s de clip donne 16 frames, dont seulement 5 dans la fenêtre iris.
+→ il faut **clip court** (≤ 4 s, idéalement 2 s), **fps élevé** (4-5),
+et un prompt focal qui demande à Gemini de noter UNIQUEMENT le segment
+transition.
```

### 3.3. § 5.4 — Caveat sur la perception fps=1

```markdown
## 5.4.1. Limitation connue : fps=1 sous-évalue le polish

Gemini fps=1 est aveugle à :
- Transitions sub-seconde (iris closing 1.3 s = 1 frame samplée).
- VFX rapides (sparks, motion lines, frame flashes).
- Détails de pixel art (chunks polish réintroduits par run-3 sub-agent C
  → toujours noté "polygones noirs" car la résolution GROK 540p +
  MEDIUM ne capte pas la finesse).

Quand un changement est "polish-level" (pas structural), s'attendre à un
gain de score Gemini fps=1 modeste (+0 à +1 pt) malgré une amélioration
visuelle nette frame-par-frame. **Ne pas re-itérer** sur ces axes en
boucle si la frame humaine est déjà bonne.
```

### 3.4. § 5.5 — Garde-fou anti-régression

Run-3 a vu fire passer de 2/10 → 1/10 quand on a corrigé l'intro (le pan_out manquant a fait dire à Gemini "plan intermédiaire OURS_ext parasite").

```markdown
## 5.5.7. Garde-fou anti-régression

À chaque pass de score, comparer chaque segment au pass précédent. Si
un segment régresse de ≥ 1 pt :
- soit le changement a réellement cassé quelque chose → fix immédiat ou
  revert si non-bloquant ;
- soit Gemini perçoit différemment parce qu'un autre segment voisin a
  changé → noter dans le rapport pass et continuer (pas un bloqueur).

Documenter le verdict dans `score-evolution.md`.
```

---

## 4. `pipeline/03-asset-fanout.md` (pattern sub-agents //)

Run-3 a utilisé ce pattern HORS asset (chantiers structurels parallèles : ravens / transition / chunks / intro / hand). Il faut documenter et étendre.

### 4.1. Caveat worktree isolation

```markdown
## 3.6. Caveat — `isolation: "worktree"` peut être un no-op

Sur certains setups (run-3, avril 2026), l'option `isolation: "worktree"`
crée bien un worktree temporaire mais sans checkout de la branche
courante : le worktree est vide. Les sub-agents fallback alors dans le
worktree principal.

**Conséquences** :
- Plusieurs sub-agents peuvent éditer le même fichier en concurrence.
- Si les sections éditées sont disjointes, ça passe (le dernier write
  gagne mais d'autres sont préservés). Si elles se chevauchent, perte.

**Mitigations** :
1. **Partition par fichier** : chaque sub-agent reçoit un fichier
   distinct (ou un nouveau fichier à créer).
2. **Partition par fonction explicite** dans le brief : "tu modifies
   UNIQUEMENT la fonction X, lignes Y-Z".
3. Maximum **3-4 sub-agents** par batch sur le même fichier (au-delà,
   les diff conflicts deviennent ingérables).
4. Si vraiment besoin d'isolation : faire un `git worktree add` manuel
   AVANT de lancer le sub-agent et passer le path explicitement dans
   le brief.
```

### 4.2. Pattern d'orchestration (à ajouter)

```markdown
## 3.7. Orchestrer N sub-agents en background

Pattern run-3 (vague 3 — sub-agents D + E en bg) :

1. **Brief précis** : chaque sub-agent reçoit (a) le contexte projet en
   2-3 lignes, (b) son OBJECTIF en 1 phrase, (c) la liste des FICHIERS
   + LIGNES qu'il OWN, (d) la liste de ce qu'il NE TOUCHE PAS, (e) la
   procédure build → record → frame validate → rapport.
2. **Bornes Math.random()** : explicites dans le brief (ex: "from.x ∈
   [W+80, W+200]"). Sinon le sub-agent improvise et ça part en délire.
3. **`run_in_background: true`** pour les sub-agents qui bossent ≥ 1
   minute. Tu travailles sur autre chose pendant.
4. **TaskCreate** pour chaque sub-agent avant lancement, TaskUpdate à
   completion. Permet au humain de tracer ce qui tourne.
5. **Pas de commit côté sub-agent** : le sub-agent fait le travail et
   rapporte ; l'orchestrateur (toi) commit avec un message qui résume
   les N contributions.
```

---

## 5. `pipeline/04-implementation.md`

### 5.1. Pattern per-unit dispatch (à ajouter)

Run-3 a découvert que le routing per-unit (skeleton/cyclop/orc) est plus propre via un dictionnaire que via un switch dans `startPlayerShot`. Pattern réutilisable :

```markdown
## 4.5. Pattern : dispatch per-unit / per-asset via dictionnaire

Quand le playable a N unités (ou N types d'assets) avec des
comportements distincts (sprite, durée, count, stagger, peakLift…),
extraire la table dans un module dédié :

```js
// scene_X/dispatch.js
export const PLAN_BY_KEY = {
  skeleton: { count: 4, staggerMs: 110, asset: 'ROCKET', ... },
  cyclop:   { count: 1, asset: 'BOMB', ... },
  orc:      { count: 1, asset: null, ... },  // procedural fallback
};
export function planFor(key) { return PLAN_BY_KEY[key] ?? PLAN_BY_KEY.<default>; }
```

Avantages :
- 1 seul endroit pour ajuster le tuning (size, count, stagger, etc.).
- Trivial à tester (pure data).
- Sub-agents peuvent itérer sur le tuning sans toucher la logique de
  spawn ou de rendering.
```

### 5.2. Caveat "kind" projectile et state pollution

```markdown
## 4.6. Caveat — étendre l'union `kind` avec attention

Quand tu ajoutes un nouveau type de projectile (ex: `kind:'bomb_p2'`),
vérifier que les state machines (`step === 'cut_to_ours'` etc.) ne
font pas un check `kind === 'bomb'` qui exclurait ton nouveau kind.

Run-3 : `_drawProjectiles` fait un special-case `if (p.kind === 'bomb')`
pour router l'impact via `_routeOursImpact`. On a dû ajouter `bomb_p2`
comme nouveau kind distinct car les sémantiques d'arrivée (player→enemy
vs enemy→ours) sont opposées.
```

---

## 6. `reference/tools-available.md`

### 6.1. Documenter `window.__simulateFire`

Section dédiée :

```markdown
## window.__simulateFire — test hook bundle prod

Le playable expose en prod (overhead négligeable) :

```js
window.__simulateFire(angle_deg = 55, power = 0.95) → boolean
```

Lance un fire programmatique sur l'unité active (lue via
`getActiveUnitId()` du turn manager). Utilisé par `tools/record_clip.mjs`
pour driver le clip-vs-clip headless sans simuler des inputs pointer.

Implementation type (à reproduire dans chaque playable) :
```js
import { emit } from '../shared/events.js';
import { getActiveUnitId } from '../scene_interior/turn.js';
window.__simulateFire = (angle_deg = 55, power = 0.95) => {
  const unit_id = getActiveUnitId();
  if (!unit_id) return false;
  emit('player_fire', { unit_id, angle_deg, power });
  return true;
};
```
```

### 6.2. record_clip.mjs — multi-fires timing

```markdown
### Multi-fires programmatiques

`tools/record_clip.mjs` doit driver ≥ 3 fires pour couvrir un roster
de 3 unités + endcard sur 50 s. Timing type :

| Wall clock | Action |
|---|---|
| 0-3 s    | intro cinématique |
| 4.5-10 s | tutorial visible (hand + dotted) |
| 10.5 s   | 1er __simulateFire (cyclop dans run-3) |
| 11-21 s  | cycle 1 (fire → impact → riposte → impact us) |
| 21.5 s   | 2e __simulateFire (skeleton) |
| 22-32 s  | cycle 2 |
| 32.5 s   | 3e __simulateFire (orc) |
| 33-42 s  | cycle 3 |
| 42-45 s  | endcard fade-in |

Espacement < 11 s = chevauchement de cycles → comportement parasite.
```

---

## 7. Checklist meta — ce que la pipeline DEVRAIT exiger en step 1b

Pour éviter les régressions structurelles entre runs, locker en step 1b :

- [ ] Cinematic state machine (déjà ✓)
- [ ] **UI/HUD spec** (cursor, ligne pointillée, HUD layout) — manquant
- [ ] **Background atmosphere** (pluie, parallaxe, static actors) — manquant
- [ ] **Recoil/shake spec** (intensité, durée, axes) — manquant
- [ ] **Test hook spec** (`window.__simulateFire` ou équivalent) — manquant
- [ ] Camera state machine **avec timestamps absolus** + variantes par turn-index (la state machine actuelle est valable seulement pour le 1er cycle ; les cycles 2-3 du source vidéo ont des cuts différents)

---

## 8. Score-evolution attendu — ordre des chantiers

Run-3 a montré que l'ordre d'attaque importe. Ordre recommandé :

1. **Structural** (camera state machine, intro anchor, mono-frame) → débloque ≥ 3 segments simultanément. Coût : refactor important.
2. **UI** (hand cursor + dotted + HUD source-style) → impact +2 sur segment aim seul.
3. **Per-unit assets** (sprites distincts par unité) → impact mineur Gemini fps=1 (humain le voit).
4. **VFX polish** (chunks, trails, recoil) → impact très mineur Gemini fps=1, fort impact humain.
5. **Background atmosphere** (pluie, parallaxe) → impact "fidélité visuelle" sur tous les segments.

Si tu attaques dans le désordre (polish avant structural, comme run-2), tu plafonnes vite et tu déclenches des régressions parasites quand tu corriges la structure plus tard.

---

## 9. Ce qu'il faut conserver en l'état

Pour ne pas survendre l'évolution, ces parties de la pipeline v0.3 ont parfaitement fonctionné en run-3 :

- **Format `score-evolution.md` tabulaire** : extrêmement lisible pour suivre les passes.
- **Pattern "shots/05-playwright/critique-passN.md"** copie de chaque pass : permet de revenir en arrière.
- **Files API directe Gemini** : aucun rate limit, latence acceptable (~40-60s par scoring).
- **Cinematic-spec lockée** : permet à Gemini de scorer "selon la spec" et pas selon son interprétation arbitraire.

---

*Rédigé par Claude Opus 4.7 (run-3) le 2026-04-26, après pass5 (score 2.8/10).*
