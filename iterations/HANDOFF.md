# HANDOFF — Pipeline d'itérations Castle Clashers

**Pour l'agent qui prend la suite.** Tu hérites d'une session précédente qui a livré le MVP Castle Clashers (B01) en 6h45. Ta mission : itérer dessus en parallèle pour produire ~5 variations comparables côte à côte dans la grid UI déjà scaffoldée.

---

## Contexte minimal — RUN-3 (en cours)

- **Repo** : `~/Global/Claude_Projects/hackathon_voodoo/` — remote `Alexry375/hackathon-voodoo-2026`. **Vérifie `git remote -v` avant tout push.**
- **Branche de base run-3** : `iter/run3-gold-baseline` (locale, pas encore poussée). **Bascule dessus au démarrage** : `git checkout iter/run3-gold-baseline`.
- **Baseline gold-standard** : `iterations/baseline/playable.html` (single-file 2.82 MB, build de `origin/feature-trail@7061860` par Sami — inclut splash pré-canvas, endcard juicy avec stars/confetti/social-proof/shimmer/tap-anywhere, comeback cinematic, dev/prod fix 952a7cc, micro-feedback dead-time).
- **Run-1 (tag `iter-run1-archive`) et Run-2 (sur `iteration-pipeline-alexis`)** : OBSOLÈTES — bâtis sur de vieux baselines (4eae529, 14edd1a) sans endcard juicy ni splash. Ignorer leur contenu, ne pas réutiliser.
- **Deadline hackathon** : dimanche 14:30 (Voodoo × Unaite × Anthropic).

---

## ⚡ Mode parallèle 2 sessions (architecture run-3)

Run-3 tourne sur **2 sessions Claude Code fraîches en parallèle**, chacune dans son propre worktree.

| Session | Working tree | Port HTTP | V assignées | Sous-branches |
|---|---|---|---|---|
| **A** | `~/Global/Claude_Projects/hackathon_voodoo/` (principal) | 8766 | V1 + V3 | `iter/r3-V1-dragon-tease`, `iter/r3-V3-y2k-neon` |
| **B** | `~/Global/Claude_Projects/hackathon_voodoo-r3b/` (worktree) | 8767 | V2 + V4 | `iter/r3-V2-combo-meter`, `iter/r3-V4-level-preview` |

**Règles parallélisme (CRITIQUES)** :
- Chaque session ne touche QUE ses 2 sous-branches `iter/r3-V<n>-*` assignées.
- Aucune session ne commit `iterations/manifest.json`, `iterations/BRAINSTORM.md`, `iterations/ASSETS-BRIEF.md`, `iterations/HANDOFF.md` (ces fichiers sont **read-only** depuis les sub-sessions).
- Aucune session ne merge dans `iter/run3-gold-baseline` — elles laissent leurs sous-branches commitées localement seulement.
- Capture thumbnail : chacune utilise son propre port via `BASE_URL=http://127.0.0.1:<port>`.
- Les sub-agents Variables forks chacun leur fichier source dans le working tree de la session ; le reset post-build s'applique localement à ce working tree.

**Convergence** (Alexis, à la main, après que les 2 sessions ont fini) :
```bash
cd ~/Global/Claude_Projects/hackathon_voodoo
git checkout iter/run3-gold-baseline
git merge --no-ff iter/r3-V1-dragon-tease iter/r3-V3-y2k-neon
git merge --no-ff iter/r3-V2-combo-meter iter/r3-V4-level-preview
node iterations/build-manifest.mjs
git add iterations/manifest.json && git commit -m "iter(run3): converge 4 variations from 2 parallel sessions"
git worktree remove ../hackathon_voodoo-r3b
```

---

## Archi pipeline (figée — ne pas redébattre)

3 rôles d'agents :

1. **Main** (toi) — fait le brainstorm initial, le triage des assets, orchestre les variables, choisit la gagnante.
2. **Variables** — sous-agents lancés en parallèle, un par variation. Chacun travaille sur **un seul axe**.
3. **Reviewer** — sous-agent unique, vérifie cohérence (axe respecté, assets cohérents, pas de régression du combat loop).

---

## Étape 1 — Brainstorm (TOI, sans skill)

WebSearch des **top mobile games 2026 / playable ad trends / casual mobile hooks**.

🚫 **Interdiction stricte : ne PAS chercher de playables de Castle Clashers ni de jeux du même genre** (tower defense, royale match castle, etc.). On veut des **mécaniques exotiques** d'autres genres (puzzle, runner, idle, hyper-casual) pour cross-pollination.

Génère **30+ hypothèses** sur 5 axes possibles : `hook` (3 premières secondes), `mechanic` (modif boucle gameplay), `palette` (visuel/ambiance), `narrative` (story beat), `endcard` (CTA + post-game).

Note chaque hypothèse 1–5 sur **lift attendu × coût × risque**. Sélectionne **top 4–5 variations**, **axes différents** (pas 5 hooks). Documente le tri dans `iterations/BRAINSTORM.md`.

⚠️ **Pas de scoring Gemini de SÉLECTION** — décision actée, Gemini a été trop sévère en pratique. Pure heuristique humaine + tes raisonnements pour le choix winner. Note : Gemini reste **autorisé en review qualité visuelle phase 6** (refinement), via `tools/compare_clips.py` / `tools/compare_images.py` — voir prompt PHASE6 livré séparément.

⚡ **JUICY DOCTRINE — règle absolue run-3** : un effet seul = pas une variation. Chaque variation doit empiler **≥4 effets juicy en cascade synchronisée** sur le moment-clé de son axe. Voir BRAINSTORM.md section "JUICY DOCTRINE" et ASSETS-BRIEF.md section "JUICY CHECKLIST" pour la liste obligatoire (screen-shake gradué, particles ≥2 types, color-shift dynamique, scale-punch+rotation jitter, glow-bloom/chromatic, slow-mo flash, trail persistence, layered timing ≥3 events, lettering animé). Une exécution minimale = `needs-fix` automatique.

**Anti-patterns reject** : un wash uniforme alpha 0.10, un badge avec un chiffre, un œil qui clignote tout seul, un texte qui pop puis disparait. Toujours composé, layered, en cascade.

---

## Étape 2 — Triage assets (TOI)

Pour chaque variation retenue, liste les assets nécessaires et leur origine :
- **Frame-recoverable** : crop dans `RESSOURCES/B01.mp4` ou `frames/clip*.mp4` côté Sami → rembg si besoin.
- **Existing** : déjà dans `assets-inline.js` ou `RESSOURCES/`.
- **À générer** : Scenario MCP (palette, persona, props).

Centralise dans `iterations/V<n>-<slug>/assets-brief.md`.

---

## Étape 3 — Variables en parallèle (sous-agents)

Pour chaque V_n :

1. Crée la sous-branche : `git checkout -b iter/V<n>-<slug>` depuis `iteration-pipeline-alexis`.
2. Lance un sous-agent avec un brief **mono-axe** :
   ```
   Variation V<n> — <titre>
   Hypothèse : <phrase>
   Axe unique : <hook | mechanic | palette | narrative | endcard>
   NE PAS TOUCHER : <les axes non choisis>
   Métrique cible : <retention@5s | clarity | CTA pull>
   Bundle assets : iterations/V<n>-<slug>/assets-brief.md
   ```
3. Le sous-agent fork les fichiers `playable/*.js` pertinents, fait sa modif, lance `npm run build`, copie le résultat :
   ```bash
   npm run build
   cp dist/playable.html iterations/V<n>-<slug>/playable.html
   ```
4. Crée `iterations/V<n>-<slug>/meta.json` :
   ```json
   {
     "id": "V<n>",
     "title": "<titre court>",
     "axis": "<axe>",
     "hypothesis": "<phrase>",
     "diff_from_baseline": ["<liste bullet>"],
     "review": "pending"
   }
   ```
5. Capture thumbnail : `BASE_URL=http://127.0.0.1:8766 node iterations/capture.mjs V<n>-<slug>` (le serveur dev tourne déjà sur 8766).
6. Reset les fichiers source touchés (ne pas commit la diff `playable/*.js` sur la sous-branche — seul `iterations/V<n>/` doit rester).
7. Commit + retour sur `iteration-pipeline-alexis` : `git checkout iteration-pipeline-alexis && git merge --no-ff iter/V<n>-<slug>`.

---

## Étape 4 — Reviewer (sous-agent, séquentiel après variables)

Pour chaque variation, le reviewer lit `meta.json` + ouvre le `playable.html` (mentalement via lecture du single-file ou via Playwright capture multi-frames). Vérifie :

- L'axe annoncé est respecté (si `axis: hook`, la modif n'a touché QUE l'intro).
- Pas de régression sur le combat loop (drag-aim-fire-impact toujours fonctionnel).
- Assets cohérents avec le bundle déclaré.

Met à jour `meta.json.review` à `pass` / `fail` / `needs-fix`. Si `needs-fix`, retour à l'étape 3 sur la même variation.

---

## Étape 5 — Manifest + UI

Après chaque commit dans `iteration-pipeline-alexis`, regénère le manifest :

```bash
node iterations/build-manifest.mjs
```

UI live à : **http://127.0.0.1:8766/iterations/** (serveur déjà en background — task ID `bezgmsly7`).

Click sur une carte → modal iframe plein écran. Échap pour fermer.

---

## Garde-fous

- ✅ Toujours `cd ~/Global/Claude_Projects/hackathon_voodoo/` (pas `games/` — incident le 25/04).
- ✅ `git remote -v` avant tout `git push`.
- ❌ **Ne pas push `iteration-pipeline-alexis`** sans validation explicite d'Alexis.
- ❌ Pas de force-push (5 collaborateurs sur le repo).
- ❌ Pas de Gemini scoring — décision actée.
- ❌ Pas de référence aux playables de Castle Clashers / jeux du même genre dans le brainstorm.
- ⚠️ Les fichiers source modifiés pendant le build (playable/*.js etc.) doivent être **reset** après build sur chaque sous-branche `iter/V_n` — seul `iterations/V_n/` doit être commit.

---

## Livrables attendus

À la fin :
- `iteration-pipeline-alexis` contient **`iterations/baseline/`** + **4–5 `iterations/V<n>-<slug>/`** (chacun = `playable.html` + `meta.json` + `thumbnail.png`).
- `iterations/manifest.json` à jour, listant tout.
- `iterations/BRAINSTORM.md` documentant les 30+ hypothèses + sélection.
- Un commit "winner" qui marque dans le top-level meta la variation choisie comme gagnante.

Bonne chance. Alexis bosse en parallèle sur les diapos+rapport, ne le ping pas pour valider chaque détail — décide, livre, on review en fin de cycle.
