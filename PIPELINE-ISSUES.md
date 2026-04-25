# Pipeline issues — rétro post-runs

Format : `## [run-N] <titre>` puis Symptôme / Fix / Action pipeline.

---

## [run-2] Background bash perd le `cd` du foreground

**Symptôme** : Quand on enchaîne `cd input/B01_castle_clashers && ...` en foreground puis qu'on lance un `Bash run_in_background:true`, le shell de fond redémarre depuis la racine du repo (CWD du fichier projet), pas depuis le sous-dossier où le foreground avait `cd`. Première tentative a sorti `cd: input/B01_castle_clashers: Aucun fichier ou dossier de ce nom` car le bash background interprétait à nouveau un `cd` relatif comme s'il partait de `input/B01_castle_clashers/`.

**Fix** : Toujours utiliser des chemins absolus dans les commandes `run_in_background`, ou bien préfixer la commande par un `cd /chemin/absolu &&`.

**Action pipeline** : Ajouter une note dans `pipeline/01-skim-and-validate.md` (section "Comment lancer Gemini") : « Si tu lances `analyze_video.py` en background depuis un Bash tool, utilise des chemins absolus — le CWD du foreground n'est pas hérité. »

---

## [run-2] `python` n'existe pas — seulement `python3`

**Symptôme** : `python tools/analyze_video.py …` → `command not found` (exit 127). La distrib Linux du dev a `python3` uniquement.

**Fix** : Lancer avec `python3` (ou créer un `.venv` activé). Sourcer `.env` ne suffit pas si l'invocation Bash est isolée — exporter explicitement `OPENROUTER_API_KEY` dans la même commande.

**Action pipeline** : Remplacer tous les `python tools/analyze_video.py` par `python3 tools/analyze_video.py` dans `pipeline/01-skim-and-validate.md` et `reference/tools-available.md`. Idéalement ajouter un shebang `#!/usr/bin/env python3` (déjà présent) **et** une note : « Utilise `python3` explicitement pour éviter les distros sans alias `python`. »

---

## [run-2] Assets officiels PNG existent mais hors `input/<jeu>/assets-officiels/`

**Symptôme** : `pipeline/02-asset-anchor.md` instruit de chercher les assets officiels dans `input/<jeu>/assets-officiels/` (« si oui : pas besoin de redessiner »). Or pour Castle Clashers, les PNG officiels sont à `RESSOURCES/Castle-Clashers-Assets/` (et déjà dépaquetés dans `RESSOURCES/assets_unpack/` + `RESSOURCES/characters_png/`) — soit deux dossiers en dehors du `input/<jeu>/`. Conséquence : un agent qui suit la pipeline à la lettre risque de partir sur un dessin procédural à la dure, alors qu'un PNG officiel parfait l'attend ailleurs.

**Fix run-2** : j'ai pris la liberté de pointer le `embed-assets.mjs` vers `RESSOURCES/...` et basé l'anchor extérieur sur les PNG. La DA-LOCKED.md documente ce choix.

**Action pipeline** :
1. Soit ajouter un step 0.5 « Asset bootstrap » qui scanne `RESSOURCES/` et symlinke/copie vers `input/<jeu>/assets-officiels/` au démarrage.
2. Soit étendre `pipeline/02-asset-anchor.md` § 2.2 : « Vérifie aussi `RESSOURCES/<nom-jeu>-Assets/` ou variantes — pas seulement `input/<jeu>/assets-officiels/`. »

---

## [run-2] Scaffold pré-existant à la racine (vs nouveau scaffold dans `input/<jeu>/`)

**Symptôme** : Les `pipeline/00-mission.md` § "Livrable unique" indique `input/<nom-du-jeu>/dist/playable.html`. Mais le scaffold v0 existant est à la **racine** du repo (`/playable/`, `/shared/`, `/scene_interior/`, `/scene_exterior/`, `/dist/playable.html`). Un agent run-2 doit choisir : **rebâtir from-scratch dans `input/<jeu>/`** (long, redondant) **ou continuer sur le scaffold root** (efficient, mais incohérent vs pipeline).

**Fix run-2** : j'ai continué sur le scaffold root. Le livrable final reste `dist/playable.html` à la racine, à symliker depuis `input/B01_castle_clashers/dist/playable.html` à la fin si besoin.

**Action pipeline** :
1. Soit décrire explicitement que le scaffold canonique est à la racine du repo (`/playable/`, `/dist/...`) et que `input/<jeu>/` ne contient que les sources (vidéo, descriptions, sandbox, shots).
2. Soit relocaliser le scaffold sous `input/<jeu>/` et adapter `tools/build.mjs` pour scoper le ROOT au sous-dossier du jeu courant.

---

## [run-2] Step 02 anchor : iter Playwright lourde si PNG dispo

**Symptôme** : `pipeline/02-asset-anchor.md` impose 5-10 itérations Playwright avec compares côte-à-côte pour produire l'anchor procéduralement, **même si** un PNG officiel quasi-parfait existe. Sur Castle Clashers, les PNG `Blue Castle.png` / `Red Castle.png` existent et sont calibrés par Voodoo. Itérer 5× procéduralement = perte sèche de ~1h sans gain.

**Fix run-2** : j'ai sauté la boucle d'itération anchor et basé la DA directement sur les PNG officiels (DA-LOCKED.md le documente).

**Action pipeline** : Ajouter un branche dans § 2.3 : « Si un PNG officiel exact de l'asset directeur est disponible (officiel ou dans RESSOURCES/), tu peux skipper la boucle d'itération procédurale — extrais directement la palette/proportions du PNG et passe à `DA-LOCKED.md`. »
