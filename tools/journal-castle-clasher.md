# Journal de bord — Castle Clasher (playable ad reverse-engineering)

> Cas concret d'application du pipeline « creative video → playable HTML5 single-file » via Gemini + agents Claude.
> Jeu cible : **Castle Clasher** (éditeur Voodoo).
> Démarré le 2026-04-25.

---

## Pipeline cible

```
Vidéo creative (playable ad)
   │
   ▼
[1] Prompt Gemini (web app pour l'instant, API plus tard)
   │
   ▼
[2] Sortie Gemini → rapport game design structuré
   │
   ▼
[3] Agent principal (Claude Opus) construit le PREMIER ASSET
       → fixe la direction artistique (palette, style, proportions, niveau de détail)
   │
   ▼
[4] Sous-agents en parallèle, un asset chacun, en suivant la DA fixée à l'étape 3
   │
   ▼
[5] Intégration dans un playable HTML5 single-file
```

---

## Itération 1 — Prompt Gemini v1

**Date** : 2026-04-25
**Outil** : Gemini (web app)
**Vidéo source** : creative publicitaire Castle Clasher (Voodoo)

### Stratégie du prompt v1

Prompt orienté **game design** : 14 sections numérotées (synopsis, core loop, phases, caméra, entités, HUD, victoire/défaite, progression, identité visuelle, audio, fake/misleading, hook, checklist dev, doutes).

Objectif : produire un rapport directement exploitable par un dev pour reproduire le playable.

Texte intégral du prompt → archivé en bas de ce doc, section [Annexe A — Prompt v1](#annexe-a--prompt-v1).

### Sortie Gemini v1

> _À coller ici dès récupération._

### Observations / écueils v1

- **Hypothèse forte (~80%)** : Gemini a sauté ou sous-décrit certains cadrages — typiquement les vues alternées (extérieur ↔ intérieur du château) qui révèlent des mécaniques de placement non visibles autrement.
- Conséquence : la section « Entités » et la section « Caméra » ne reflètent pas la vraie mise en scène ; le dev qui implémente sans avoir vu la vidéo manque une mécanique cœur.
- **Cause probable** : le prompt v1 demande directement de l'analyse synthétique → Gemini interprète avant d'observer, et compresse les détails de cadrage qui sont pourtant déterminants.

### Décision

Refondre le prompt pour **forcer une passe descriptive seconde-par-seconde** avant toute synthèse.

---

## Itération 2 — Prompt Gemini v2

**Date** : 2026-04-25

### Stratégie du prompt v2

Deux passes obligatoires :

1. **Passe 1 — Journal seconde par seconde**
   Pour chaque seconde [mm:ss] : cadrage caméra, entités visibles, action joueur simulée, événements, texte affiché. Aucune seconde omise. Règle stricte : décrire ce qu'on voit, pas ce qu'on déduit.

2. **Passe 2 — Synthèse game design**
   Mêmes 14 sections que v1, MAIS chaque affirmation non triviale doit citer la ou les secondes qui la justifient (`cf. [00:07], [00:14]`). Une affirmation qui ne peut pas être ancrée dans la passe 1 doit être marquée `[non observé — déduction]`.

3. **Auto-vérification finale** ciblée sur 4 erreurs typiques :
   - Cohérence cadrage (tous les cuts listés ?)
   - Cohérence entités (rien d'oublié entre passes 1 et 2 ?)
   - Mécaniques révélées par un cadrage spécifique (documentées comme mécaniques, pas comme détails visuels ?)
   - Input réel vs animation autoplay

Le prompt reste **générique** — applicable à n'importe quel playable, jamais nommer Castle Clasher dans le prompt.

Texte intégral → [Annexe B — Prompt v2](#annexe-b--prompt-v2).

### Sortie Gemini v2

> _À coller ici dès récupération._

### Observations / écueils v2

> _À remplir après lecture de la sortie._

Critères de succès attendus :
- [ ] Tous les changements de cadrage sont listés en section 4 avec timestamps
- [ ] Si la vidéo contient une vue intérieure / coupe / cadrage alterné, elle apparaît comme une vue distincte et pas un détail
- [ ] Chaque mécanique de la section 5 est traçable à une seconde précise de la passe 1
- [ ] Les éléments « autoplay » sont distingués des inputs joueur réels

---

## Itération 3 — Premier asset (direction artistique)

**Date** : _à venir_
**Acteur** : agent principal (Claude Opus, cette session)

### Asset choisi comme directeur

> _À définir une fois la sortie Gemini v2 stabilisée._
>
> Critère de choix : l'asset le plus structurant pour la DA — typiquement le **personnage joueur** ou l'**entité héro** (le château ici), parce qu'il fixe simultanément :
> - la palette dominante
> - le style (cartoon flat, low-poly stylisé, pixel, etc.)
> - le niveau de détail (silhouette only vs. shading vs. textures)
> - les proportions de référence pour tous les autres assets

### Décisions DA verrouillées

| Dimension | Choix | Justification |
|---|---|---|
| Palette (4-6 hex) | _à remplir_ | _à remplir_ |
| Style | _à remplir_ | _à remplir_ |
| Niveau de détail | _à remplir_ | _à remplir_ |
| Format de sortie | _SVG inline / Canvas procédural / sprite PNG ?_ | _à remplir_ |
| Échelle de référence | _à remplir_ | _à remplir_ |

### Brief transmissible aux sous-agents

> _Sera extrait de cette section sous forme de bloc copiable._

---

## Itération 4 — Sous-agents en parallèle

**Date** : _à venir_

### Liste des assets à produire

> _Dérivée de la section « Reproduction technique » de la sortie Gemini v2 (P0 d'abord)._

| Asset | Sous-agent | Statut | Notes |
|---|---|---|---|
| _ex: château extérieur_ | _Explore/general-purpose_ | _todo_ | _ |
| _ex: mob attaquant type A_ | | _todo_ | |
| _ex: projectile_ | | _todo_ | |
| _ex: VFX impact_ | | _todo_ | |
| _ex: HUD jauge HP_ | | _todo_ | |

### Règles de coordination

- Chaque sous-agent reçoit **le brief DA verrouillé en itération 3** + sa fiche asset.
- Sortie attendue : code self-contained (SVG inline ou fonction de rendu Canvas), testable en isolation.
- Pas d'autonomie sur la DA — toute dérive doit remonter à l'agent principal.

---

## Itération 5 — Intégration playable HTML5 single-file

**Date** : _à venir_

> _Section à remplir lors de l'assemblage._

---

## Méta-leçons (à enrichir au fil des itérations)

- **L1** _Castle Clasher, 2026-04-25_ : un prompt orienté synthèse fait sauter Gemini directement à l'interprétation et perd les détails de cadrage. La passe descriptive seconde-par-seconde est probablement nécessaire dès qu'une vidéo contient plus d'un cadrage.
- _(suivantes à venir)_

---

## Annexe A — Prompt v1

```
Tu es un game designer senior chargé de reverse-engineer un jeu mobile à partir d'une creative publicitaire (playable ad / video ad). Le jeu s'appelle "Castle Clasher" (éditeur Voodoo). Ta sortie servira à un développeur pour reproduire un playable HTML5 single-file fidèle.

Analyse la vidéo fournie en profondeur, frame par frame si nécessaire, et produis un rapport structuré en français. Sois EXHAUSTIF — n'invente rien, mais ne survole rien non plus. Si un élément est ambigu, dis-le explicitement avec ton degré de confiance.

# 1. Synopsis (3-5 phrases)
Décris ce que voit un joueur de A à Z : situation de départ, action principale, fin.

# 2. Boucle de gameplay (core loop)
- Quelle est l'action atomique répétée par le joueur ?
- Quel est l'input exact (tap, swipe, drag, hold, double-tap, swipe directionnel, tracé continu) ?
- Quel est le feedback immédiat (visuel, audio, haptique simulé) ?
- Combien de fois cette boucle se répète-t-elle dans la vidéo, et dans quel rythme ?

# 3. Phases / structure
La vidéo enchaîne-t-elle plusieurs phases distinctes (ex: phase A → phase B → boss) ? Pour chaque phase :
- Timestamp début/fin
- Objectif du joueur
- Mécanique différente de la phase précédente ?
- Transition (cinématique, fondu, zoom caméra…)

# 4. Caméra & mise en scène
- Vue (top-down, side-scroller, 2.5D, perspective isométrique, plan rapproché, plan large) ?
- La caméra bouge-t-elle (zoom, pan, shake) ? À quels moments ?
- Orientation : portrait ou landscape ?

# 5. Entités à l'écran
Pour CHAQUE type d'entité visible (joueur, ennemis types A/B/C, projectiles, particules, décor interactif, HUD…) :
- Nom descriptif
- Apparence (forme, couleur dominante, taille relative)
- Comportement (statique, mouvement linéaire, suivi du joueur, spawn périodique…)
- Interaction avec le joueur (touche, est touché, bloque, donne points…)
- Vie/HP apparent ?

# 6. HUD & feedback
- Quels indicateurs sont affichés en permanence (score, vies, timer, jauges de progression, mini-map) ?
- Position à l'écran de chacun
- Comment évoluent-ils pendant la partie ?

# 7. Conditions de victoire / défaite
- Comment gagne-t-on ? (kill count, atteindre une zone, vider une jauge…)
- Comment perd-on ? (HP à 0, timer écoulé, ennemi atteint un seuil…)
- Y a-t-il un game over montré dans la vidéo ?

# 8. Progression / difficulté
- La difficulté augmente-t-elle dans la vidéo ? Comment (vitesse, nombre, types d'ennemis, boss) ?
- Y a-t-il des power-ups, upgrades, choix offerts au joueur ?

# 9. Identité visuelle
- Palette de couleurs dominantes (cite 4-6 hex approximatifs)
- Style art (cartoon, pixel, low-poly, photoréaliste, flat) ?
- Effets récurrents (particules, shake, slow-mo, screen flash) ?

# 10. Audio (si bande-son présente)
- Musique : style, tempo, instrumentation
- SFX clés : à chaque action quel son ? (impacts, slash, explosion, voix, jingle victoire)

# 11. Tromperie publicitaire (fake / misleading) ?
Beaucoup de creatives Voodoo montrent un gameplay différent du jeu réel pour le hook. Y a-t-il des éléments qui semblent "trop" satisfaisants, jouables seulement à l'écran (autoplay), ou physiquement impossibles à reproduire en input mobile classique ? Liste-les.

# 12. Hook publicitaire
Quel est le moment "wow" précis de la vidéo (timestamp) qui doit absolument être préservé dans un playable ad ?

# 13. Reproduction technique — checklist pour le dev
Liste les 8-12 éléments MINIMUM à implémenter pour qu'un playable ressemble fidèlement au gameplay montré. Classe par priorité (P0 indispensable, P1 important, P2 polish).

# 14. Doutes & questions ouvertes
Ce que la vidéo ne montre PAS clairement et qu'il faudrait clarifier (ex: que se passe-t-il si on ne touche rien ? l'input est-il continu ou discret ? etc.).

Format de sortie : Markdown propre, sections numérotées, listes à puces, timestamps en [mm:ss] quand pertinent.
```

---

## Annexe B — Prompt v2

```
Tu es un game designer senior chargé de reverse-engineer un jeu mobile à partir d'une creative publicitaire (playable ad / video ad). Ta sortie servira à un développeur pour reproduire un playable HTML5 single-file fidèle.

Analyse la vidéo fournie en deux passes complémentaires. La passe 1 est un journal seconde par seconde — c'est le socle factuel. La passe 2 est l'analyse de game design — elle DOIT s'appuyer explicitement sur ce que tu as noté en passe 1, pas sur des intuitions. Si une affirmation en passe 2 ne peut pas être ancrée dans une seconde précise du journal, tu dois soit la retirer, soit la marquer "[non observé — déduction]".

Sois EXHAUSTIF mais n'invente rien. Si un élément est ambigu, dis-le avec ton degré de confiance (faible/moyen/fort).

═══════════════════════════════════════════════
# PASSE 1 — Journal seconde par seconde

Pour CHAQUE seconde de la vidéo de [00:00] jusqu'à la fin, produis une entrée. Aucune seconde ne doit être omise, même si "rien ne change" (dans ce cas écris "identique à la seconde précédente sauf …").

Pour chaque seconde, décris :

- **Cadrage caméra** : vue (intérieure/extérieure/large/rapprochée), angle, zoom, pan en cours, shake. Si la caméra coupe ou transitionne pendant cette seconde, dis-le ("cut à mi-seconde de vue A → vue B").
- **Entités visibles** : tout ce qui est à l'écran (personnages, structures, projectiles, particules, UI, curseur/main publicitaire). Pour chaque entité dis où elle est (zone écran : haut-gauche, centre, etc.) et ce qu'elle fait.
- **Action joueur simulée** : si une main/curseur publicitaire est visible, décris précisément le geste (drag depuis X vers Y, tap sur Z, hold…). Sinon "aucune action joueur".
- **Événements** : ce qui démarre, change, ou se termine pendant cette seconde (un projectile part, un mur s'effondre, une barre baisse de N%, un son démarre, l'UI apparaît/disparaît, transition de phase…).
- **Texte affiché** : tout texte visible verbatim (UI, dégâts flottants, CTA, tutoriel).

Format strict :
[mm:ss]
- Cadrage : …
- Entités : …
- Action : …
- Événements : …
- Texte : …

⚠️ Règles de la passe 1 :
1. Si la caméra change de cadrage (cut, zoom, transition de vue), c'est l'information la plus importante de la seconde — mets-la en premier.
2. Si l'action du joueur révèle une mécanique (ex : un mob est déposé à un endroit qui devient visible seulement après le drop), décris ce qui apparaît OÙ, pas juste "mob placé".
3. Décris ce que tu VOIS, pas ce que tu déduis. "Le château s'incline de 15°" est observable. "Le château perd de la stabilité physique" est une interprétation — réserve-la à la passe 2.
4. Note explicitement les transitions entre vues différentes (intérieur ↔ extérieur, perso ↔ perso, gameplay ↔ end-card). Ces transitions sont souvent la clé de la mise en scène.

═══════════════════════════════════════════════
# PASSE 2 — Synthèse game design

Maintenant, et SEULEMENT en t'appuyant sur le journal de la passe 1, produis le rapport ci-dessous. Chaque affirmation non triviale doit citer la ou les secondes qui la justifient, sous la forme `(cf. [00:07], [00:14])`.

## 1. Synopsis (3-5 phrases)
## 2. Boucle de gameplay
- Action atomique, input exact, feedback, nombre de répétitions et rythme.
## 3. Phases / structure
- Découpage temporel en phases avec timestamps début/fin et transitions.
## 4. Caméra & mise en scène
- Type(s) de vue(s) utilisé(s). **Si la vidéo alterne plusieurs cadrages (ex: vue A puis vue B puis retour vue A), liste-les explicitement avec les timestamps de chaque cut.** C'est souvent l'élément le plus mal compris d'une analyse — sois précis.
- Mouvements de caméra (pan, zoom, shake) avec timestamps.
- Orientation (portrait/landscape).
## 5. Entités à l'écran
Pour chaque type d'entité : nom, apparence, comportement, interaction joueur, HP apparent. Distingue les entités vues en vue extérieure de celles vues en vue rapprochée/intérieure si applicable.
## 6. HUD & feedback
Indicateurs permanents, position, évolution.
## 7. Conditions de victoire / défaite
## 8. Progression / difficulté
## 9. Identité visuelle
Palette (4-6 hex), style art, effets récurrents.
## 10. Audio
Musique et SFX clés par action (si bande-son présente).
## 11. Tromperie publicitaire (fake / misleading)
Éléments qui semblent non-jouables, automatisés, ou physiquement impossibles à reproduire en input mobile.
## 12. Hook publicitaire
Timestamp précis du moment "wow".
## 13. Reproduction technique — checklist pour le dev
8-12 éléments minimum classés P0/P1/P2.
## 14. Doutes & questions ouvertes
Ce que la vidéo NE montre PAS clairement.

═══════════════════════════════════════════════
# Auto-vérification finale (obligatoire)

Avant de rendre, relis ton rapport et réponds explicitement à ces questions :

1. **Cohérence cadrage** : ai-je listé en section 4 TOUS les cuts/changements de vue notés en passe 1 ? Si la passe 1 mentionne une vue qui n'apparaît qu'à certains moments (intérieur d'un bâtiment, gros plan d'un perso, vue alternée entre deux zones), est-ce que la section 4 le reflète ?
2. **Cohérence entités** : chaque entité de la section 5 a-t-elle été observée dans la passe 1 ? Y a-t-il des entités vues en passe 1 mais oubliées en section 5 ?
3. **Mécaniques cachées** : y a-t-il des mécaniques qui n'apparaissent que parce qu'un cadrage spécifique les révèle (ex: une coupe transversale révèle des emplacements internes) ? Si oui, sont-elles documentées comme mécaniques à part entière, et pas juste comme un détail visuel ?
4. **Input vs autoplay** : pour chaque action joueur en passe 1, est-elle bien classée en passe 2 comme input réel ou comme animation scriptée ?

Si une de ces vérifications échoue, corrige le rapport avant de le rendre.

Format de sortie : Markdown propre, sections numérotées, listes à puces, timestamps en [mm:ss].
```
