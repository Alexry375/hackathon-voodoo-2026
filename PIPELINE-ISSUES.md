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
