# Pipeline Voodoo Playable Ad — entry point

> Tu es Claude Code, lancé en autonomie sur ce dossier. Ta mission : produire un **playable ad HTML5 single-file** fidèle au jeu décrit dans les fichiers fournis. Lis ce doc d'abord, puis suis la pipeline ci-dessous **dans l'ordre**.

---

## Mission en une phrase

Construire `dist/playable.html` (single-file <5 MB, AppLovin/MRAID compliant) qui reproduit la mécanique core et le feeling du jeu décrit dans `input/`, **en utilisant la vidéo source comme arbitre final** quand les descriptions divergent.

---

## Contexte d'exécution

- **Stack imposée** : Canvas2D + ESM + esbuild → un seul HTML inline. Pas de framework. Voir [`reference/stack.md`](reference/stack.md).
- **Pattern d'architecture** : scene-split + 3 events lockés. Voir [`reference/scene-split-pattern.md`](reference/scene-split-pattern.md).
- **Outils dispos** : `tools/analyze_video.py` (Gemini Files API), ffmpeg, Playwright. Voir [`reference/tools-available.md`](reference/tools-available.md).
- **Sandbox libre** : crée et organise `SANDBOX/` à ta guise pour scripts custom, extraits vidéo, prompts Gemini, screenshots, outputs. Convention suggérée : `SANDBOX/{scripts,extracts,frames,prompts,outputs}/`.
- **Variables d'environnement requises** : `GEMINI_API_KEY` (à demander à l'utilisateur si absente).

---

## Pipeline — étapes ordonnées

Travaille ces étapes **séquentiellement**. Lis chacun de ces fichiers au moment où tu attaques l'étape correspondante (pas tous d'un coup) :

1. [`pipeline/00-mission.md`](pipeline/00-mission.md) — livrable, contraintes, critères de succès
2. [`pipeline/01-skim-and-validate.md`](pipeline/01-skim-and-validate.md) — skim des descriptions + validation Gemini sur la vidéo
3. [`pipeline/02-asset-anchor.md`](pipeline/02-asset-anchor.md) — choisir et produire l'asset directeur (DA verrouillée)
4. [`pipeline/03-asset-fanout.md`](pipeline/03-asset-fanout.md) — sub-agents parallèles sur les autres assets, briefés avec la DA
5. [`pipeline/04-implementation.md`](pipeline/04-implementation.md) — scaffold du jeu, scene-split, contrat events
6. [`pipeline/05-playwright-loop.md`](pipeline/05-playwright-loop.md) — boucle visuelle : screenshot vs frame de référence
7. [`pipeline/06-bundle-and-deliver.md`](pipeline/06-bundle-and-deliver.md) — esbuild → `dist/playable.html` + check compliance

---

## Règles de fonctionnement

- **Branche git dédiée** : crée `pipeline-cc-Alexis-v0/run-1-<nom-du-jeu>` au démarrage. Tous tes commits y atterrissent.
- **Commits jalons** : minimum 1 commit par étape de pipeline (00-skim done / 02-anchor done / 04-scaffold done / etc.). Permet le rollback granulaire.
- **Gemini = arbitre final** : si une description Antoine contredit ce que tu vois ou ce que rapporte un appel Gemini sur la vidéo, **la vidéo gagne**. Documente la divergence.
- **Exigence > vitesse** : tu et tes sub-agents itérez tant que le résultat n'est pas conforme. Mieux vaut 5 itérations qu'un asset bâclé. Voir niveau de difficulté dans [`pipeline/03-asset-fanout.md`](pipeline/03-asset-fanout.md).
- **Tu n'inventes pas** : si une mécanique/asset n'est pas dans les sources et pas dans la vidéo, tu ne l'ajoutes pas.

---

## Si tu te bloques

- Re-lance Gemini sur un extrait court (`ffmpeg -ss MM:SS -t 3` puis `analyze_video.py --prompt SANDBOX/prompts/focal.md`)
- Pose la question dans un commit body, continue, marque `[blocker]` dans le commit
- Le user reviendra sur les blockers à la fin

---

Vas-y. Commence par [`pipeline/00-mission.md`](pipeline/00-mission.md).
