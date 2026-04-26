# HANDOFF — Pipeline d'itérations Castle Clashers

**Pour l'agent qui prend la suite.** Tu hérites d'une session précédente qui a livré le MVP Castle Clashers (B01) en 6h45. Ta mission : itérer dessus en parallèle pour produire ~5 variations comparables côte à côte dans la grid UI déjà scaffoldée.

---

## Contexte minimal

- **Repo** : `~/Global/Claude_Projects/hackathon_voodoo/` — remote `Alexry375/hackathon-voodoo-2026`. **Vérifie `git remote -v` avant tout push.**
- **Branche de base** : `iteration-pipeline-alexis` (locale, pas encore poussée). **Bascule dessus au démarrage** : `git checkout iteration-pipeline-alexis`.
- **Baseline figée** : `iterations/baseline/playable.html` (single-file 2.81 MB, build de `origin/feature-trail@14edd1a` par Sami : timeline 28s, 3D hand sprite, dual-CTA loss screen).
- **Deadline hackathon** : dimanche 14:30 (Voodoo × Unaite × Anthropic).

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

⚠️ **Pas de scoring Gemini** — décision actée, Gemini a été trop sévère en pratique. Pure heuristique humaine + tes raisonnements.

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
