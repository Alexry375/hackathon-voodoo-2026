# Pipeline Voodoo Playable Ad — entry point

> Tu es Claude Code, lancé en autonomie sur ce dossier. Ta mission : produire un **playable ad HTML5 single-file** fidèle au jeu décrit dans les fichiers fournis. Lis ce doc d'abord, puis suis la pipeline ci-dessous **dans l'ordre**.

---

## Mission en une phrase

Construire `dist/playable.html` (single-file <5 MB, AppLovin/MRAID compliant) qui reproduit la mécanique core et le feeling du jeu décrit dans `input/`, **en utilisant la vidéo source comme arbitre final** quand les descriptions divergent.

---

## Contexte d'exécution

- **Stack imposée** : Canvas2D + ESM + esbuild → un seul HTML inline. Pas de framework. Voir [`reference/stack.md`](reference/stack.md).
- **Pattern d'architecture** : scene-split + 3 events lockés. Voir [`reference/scene-split-pattern.md`](reference/scene-split-pattern.md).
- **Outils dispos** : `tools/analyze_video.py` (Gemini 3.1 Pro Preview via OpenRouter), ffmpeg, Playwright, ImageMagick. Voir [`reference/tools-available.md`](reference/tools-available.md).
- **Sandbox libre** : crée et organise `SANDBOX/` à ta guise (gitignored). Convention suggérée : `SANDBOX/{scripts,extracts,frames,prompts,outputs,anchor,fanout}/`.
- **Suivi visuel par l'humain** : tu alimentes `shots/` au fil de l'eau (commitée). Convention obligatoire — voir [`pipeline/07-shots-convention.md`](pipeline/07-shots-convention.md).
- **Gemini = arbitre fiable et abordable** : `tools/analyze_video.py` route via OpenRouter (clé `OPENROUTER_API_KEY` dans `.env`). Coût indicatif ~0.07 $ par appel. **Pas de cap budgétaire strict** : utilise Gemini librement chaque fois qu'un point structurant peut être tranché par la vidéo plutôt que par ton œil ou par les descriptions. Premier appel **fortement recommandé en step 01** pour locker le rythme du jeu (tour-par-tour / temps-réel / hybride) avant de scaffold quoi que ce soit.

---

## Pipeline — étapes ordonnées

Travaille ces étapes **séquentiellement**. Lis chacun de ces fichiers au moment où tu attaques l'étape correspondante (pas tous d'un coup) :

1. [`pipeline/00-mission.md`](pipeline/00-mission.md) — livrable, contraintes, critères de succès
2. [`pipeline/01-skim-and-validate.md`](pipeline/01-skim-and-validate.md) — skim des descriptions + validation Gemini sur la vidéo
3. [`pipeline/01b-cinematic-spec.md`](pipeline/01b-cinematic-spec.md) — **lock cinématique** (caméra, rythme, opening) avant scaffold
4. [`pipeline/02-asset-anchor.md`](pipeline/02-asset-anchor.md) — choisir et produire l'asset directeur (DA verrouillée)
5. [`pipeline/03-asset-fanout.md`](pipeline/03-asset-fanout.md) — sub-agents parallèles sur les autres assets, briefés avec la DA
6. [`pipeline/04-implementation.md`](pipeline/04-implementation.md) — scaffold du jeu, scene-split, contrat events
7. [`pipeline/05-playwright-loop.md`](pipeline/05-playwright-loop.md) — boucle visuelle clip-vs-clip + **gate score Gemini ≥ 9/10**
8. [`pipeline/06-bundle-and-deliver.md`](pipeline/06-bundle-and-deliver.md) — esbuild → `dist/playable.html` + check compliance
9. [`pipeline/07-shots-convention.md`](pipeline/07-shots-convention.md) — **transverse** : conventions du dossier `shots/` à alimenter à chaque étape pour suivi humain

---

## Règles de fonctionnement

- **Branche git dédiée** : crée `pipeline-cc-Alexis-v0/run-1-<nom-du-jeu>` au démarrage. Tous tes commits y atterrissent.
- **Commits jalons** : minimum 1 commit par étape de pipeline (00-skim done / 02-anchor done / 04-scaffold done / etc.). Permet le rollback granulaire.
- **Gemini = arbitre final** : si une description Antoine contredit ce que tu vois ou ce que rapporte un appel Gemini sur la vidéo, **la vidéo gagne**. Documente la divergence.
- **Exigence > vitesse** : tu et tes sub-agents itérez tant que le résultat n'est pas conforme. Mieux vaut 5 itérations qu'un asset bâclé. Voir niveau de difficulté dans [`pipeline/03-asset-fanout.md`](pipeline/03-asset-fanout.md).
- **Tu n'inventes pas** : si une mécanique/asset n'est pas dans les sources et pas dans la vidéo, tu ne l'ajoutes pas.
- **Cinématique = mécanique** : caméra, rythme, transitions et frame d'opening sont des sous-systèmes load-bearing. Les locker en step 01b avant tout scaffold (sinon le pacing devient arbitraire et plombe la fidélité finale).
- **Gate score Gemini ≥ 9/10** : aucune livraison sous **9/10** sur le scoring segmenté de step 5.5 (intro / aim / fire-cinematic / impact / endcard). En-dessous → re-itération obligatoire. Vise le 10. La step 5 documente la procédure de critique itérative.
- **Validation finale = clip-vs-clip**, pas image-vs-image. L'image-only sert à itérer vite en step 04 ; jamais comme gate.
- **Re-lis `pipeline/` au fil du run** : avant d'attaquer chaque étape, re-lis le `.md` correspondant en entier. Si pendant une étape tu te poses une question méta-stratégique (*comment je m'organise ? puis-je paralléliser ? comment scorer ?*), reviens lire [`pipeline/03-asset-fanout.md`](pipeline/03-asset-fanout.md) (pattern sub-agents parallèles, **transférable hors-assets** — applicable dès que ton travail se partitionne par fichier/module) et [`pipeline/05-playwright-loop.md`](pipeline/05-playwright-loop.md) (boucle d'itération + gate score). Ces deux fichiers contiennent des patterns qui s'appliquent au-delà de leurs steps respectifs.

---

## Si tu te bloques

- Re-lance Gemini sur un extrait court (`ffmpeg -ss MM:SS -t 3` puis `analyze_video.py --prompt SANDBOX/prompts/focal.md`)
- Pose la question dans un commit body, continue, marque `[blocker]` dans le commit
- Le user reviendra sur les blockers à la fin

---

Vas-y. Commence par [`pipeline/00-mission.md`](pipeline/00-mission.md).
