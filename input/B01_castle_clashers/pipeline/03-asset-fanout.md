# Étape 3 — Fan-out parallèle des autres assets

> La DA est verrouillée à l'étape 2. Tu inventories maintenant tous les autres assets nécessaires, estimes leur difficulté, et dispatches un sub-agent par asset, **en parallèle**.

---

## 3.1. Inventaire des assets

À partir de tes lectures (étape 1) + assets-officiels disponibles + DA-LOCKED, liste **tous** les assets visuels du jeu. Catégories typiques :

- **Personnages / mobs** (joueur, ennemis, neutres)
- **Bâtiments / structures** (châteaux, plateformes, décor de fond)
- **Projectiles / armes** (tirs joueur, tirs ennemi, traînées)
- **VFX** (explosions, particules d'impact, fumées, étincelles)
- **HUD elements** (barres, cards, icônes, polices custom)
- **Endcard elements** (logo, bouton CTA, illustration de fond, perso 3D Chibi si applicable)

Écris l'inventaire dans `SANDBOX/fanout/inventory.md` au format :

```markdown
| Asset | Cat. | Difficulté | Officiel dispo ? | Sub-agent | Status |
|---|---|---|---|---|---|
| château bleu cross-section | bâtiment | L4 | non | - (anchor, déjà fait) | done |
| château rouge exterior | bâtiment | L3 | partiel (PNG castle) | sub-A | pending |
| cyclop sprite | mob | L2 | oui (cyclop.png) | - | done |
| oiseau kamikaze | mob | L3 | non | sub-B | pending |
| projectile rocket cyclop | proj | L2 | oui | sub-C | pending |
| ... | | | | | |
```

## 3.2. Estimer la difficulté (CRITIQUE)

Échelle :

| Niveau | Description | Itérations sub-agent attendues | Sortie attendue |
|---|---|---|---|
| **L1** | trivial : couleur unie, forme géométrique, icône stylisée plate | 1 itération + screenshot final | code + screenshot |
| **L2** | simple : asset officiel à wrapper, icône custom, projectile basique | 2 itérations avec diff visuel | code + 2 screenshots intermédiaires |
| **L3** | moyen : mob avec idle anim, projectile + traînée, VFX simple | 3-4 itérations | code + 3-4 screenshots + comparaison frame |
| **L4** | complexe : structure asymétrique, VFX explosion multi-stage, animation séquencée | 5+ itérations | code + tous screenshots + comparaison frame |
| **L5** | critique : flow caméra global, scene_manager, intégration cross-scène | **NE PAS dispatcher en sub-agent** — tu le fais toi-même |

**L'estimation est de TON ressort, pas du sub-agent**. Tu communiques explicitement le niveau dans le brief.

## 3.3. Brief sub-agent — template

Pour chaque asset L1-L4, dispatch un sub-agent (subagent_type=`general-purpose` ou `Explore` si tu veux qu'il fasse du R&D visuel d'abord).

Le brief **doit** contenir :

```markdown
**Mission** : produire le rendu Canvas2D de [ASSET], conforme à la DA verrouillée.

**Difficulté estimée** : L<N> → tu dois itérer minimum <N> fois.
Tu peux dépasser le minimum si la qualité n'y est pas. Mieux vaut sur-itérer que rendre 
un truc bâclé.

**DA à respecter** : lis `SANDBOX/anchor/DA-LOCKED.md`. Pas de dérive sur palette / 
outline / niveau de détail. Si tu hésites, suis le pattern de l'asset anchor 
`SANDBOX/anchor/<asset>.js`.

**Frame(s) de référence** : 
- `SANDBOX/frames/<frame_a>.png` (timestamp <mm:ss>)
- `SANDBOX/frames/<frame_b>.png` (si plusieurs angles/states)
Si tu en veux d'autres, extrais-les avec ffmpeg : 
  `ffmpeg -ss MM:SS -frames:v 1 input/<jeu>/input/source.mp4 SANDBOX/frames/<nom>.png`

**Fichier de sortie** : `SANDBOX/fanout/<asset>.js` exportant `drawXxx(ctx, x, y, params)`.

**Boucle d'itération obligatoire** :
1. Lis la/les frame(s) de référence
2. Code une v1
3. Crée `SANDBOX/fanout/<asset>.html` minimal qui dessine ton asset
4. Playwright screenshot → compare à la frame de référence
5. Identifie 3+ écarts (proportion, palette, détail, animation) → corrige
6. Re-screenshot, re-compare. Boucle jusqu'à <N> itérations minimum.
7. Si après <N>+2 itérations tu n'es toujours pas satisfait, remonte à l'agent principal 
   avec ta meilleure version + explication

**Critère d'acceptation** : à l'œil, ton rendu et la frame de référence sont 
indistinguables au-delà de la résolution naturelle de Canvas2D. Si tu n'es pas sûr, 
itère.

**Tu retournes** : 
- Le code dans `SANDBOX/fanout/<asset>.js`
- Tous tes screenshots intermédiaires dans `SANDBOX/fanout/<asset>-iter<N>.png`
- Une note `SANDBOX/fanout/<asset>-NOTES.md` listant : itérations faites, écarts résiduels, 
  hypothèses faites en l'absence d'info précise
```

## 3.4. Parallélisme — règle d'or

Lance les sub-agents **dans un seul message** avec plusieurs `Agent` tool calls. Ne séquence pas.

Limite : pas plus de 6 sub-agents en parallèle (au-delà ça devient ingérable). Si l'inventaire en a plus, fais 2-3 vagues.

## 3.5. Audit après fan-out

Quand tous les sub-agents ont rendu :

1. Visualise chaque asset isolément (ouvre le `SANDBOX/fanout/<asset>.html` en local) 
2. Identifie les **dérives DA** (palette qui s'éloigne, outline incohérent, etc.)
3. **Re-dispatche** un sub-agent ciblé pour les assets non conformes (ne le fais pas toi-même, c'est plus rapide en parallèle)
4. Une fois tout conforme : copie les `SANDBOX/fanout/<asset>.js` vers leurs emplacements définitifs (cf. étape 4)

## 3.6. Suivi visuel pour l'humain (`shots/`)

À la fin du fan-out, **toi** (pas les sub-agents — tu ne veux pas qu'ils écrivent dans `shots/` directement) tu produis dans `input/<jeu>/shots/03-fanout/` :

- **Un compare par asset L2+** (`<asset>_compare.png`, format côte-à-côte réf vidéo / rendu) — voir 07.
- Mets à jour `shots/_index.md` avec le tableau récap (asset / difficulté / itérations / compare).

Pas besoin de mettre toutes les itérations intermédiaires des sub-agents (ça pollue) — juste le compare final par asset.

## 3.7. Sortie attendue

- `SANDBOX/fanout/inventory.md` à jour (status all done)
- `SANDBOX/fanout/<asset>.js` × N
- `SANDBOX/fanout/<asset>-iter*.png` (traces d'itération internes)
- `SANDBOX/fanout/<asset>-NOTES.md` × N
- `shots/03-fanout/<asset>_compare.png` × N (au moins pour les L2+)
- `shots/_index.md` mis à jour
- **Commit jalon** : `pipeline(03): asset fanout done — N assets produced`

---

Étape suivante : [`04-implementation.md`](04-implementation.md).
