# Voodoo Hack — Insights live du kickoff

**Source** : transcription audio en direct du kickoff (samedi 25/04, 10:58 → 11:22).
**Statut** : à combiner avec les slides officielles + la Notion track page (https://voodoo.notion.site/Voodoo-Hack-Tracks-34ca0b481db4803ab1f7e035e5b4b094).
**Note** : la transcription auto est par moments en bouillie (anglais/français mélangés, mots manqués). Les passages décodés ci-dessous reflètent le sens, pas le mot-à-mot.

---

## 1. Voodoo — état du business

### Gaming (90-95% du CA, marges > 100%)

- Décollage en 2023 avec **Mob Control** (toujours leur #1 à date).
- Catalogue actuel cité : Cup Heroes, Monster Survivors, Castle Crashers, Marvel Snap-like.
- **Pivot 2026** : sortie progressive de l'hyper-casual pur vers du **casual + mid-core monétisé**.
  - **Casual puzzle premium** : Mobile Sword, Deceit Class, Sand Loop. 80%+ revenus via IAP. Concurrencent Candy Crush.
  - **Mid-core competitive** : Castle Flashers, Draft Throwdown. Concurrencent Clash Royale / Brawl Stars.
- Logique du pivot : passer de "rétention en minutes" (hyper-casual) à rétention longue.

### Apps (5-10%, stratégique)

- **Wizz** (lancé 2021) — réseau social ados. Gros succès business, tourne bien.
- **BeReal** — racheté il y a ~2 ans. A saigné financièrement, base utilisateurs en déclin. Mais : depuis 2 semaines la base recroît pour la première fois, et profitable l'an dernier.

### Modèle global

Marges gaming permettent d'absorber les paris apps. Construction produit "en mode innovant".

---

## 2. Voodoo — DNA & philosophie produit

### Production data-driven (DNA)

- Production de jeux **data-based** = testée sur signaux réels marché, pas sur intuition.
- Pour gagner sur mobile aujourd'hui : être leader = être innovateur. Sinon = bataille frontale Candy Crush / Clash Royale = perdu d'avance.
- Stratégie **blue ocean** : être premier sur une mécanique → CPI bas + engagement fort.

### Vélocité = clé

- Tester un max de jeux le plus vite possible.
- Si tu mets 1 semaine au lieu de 2 jours à itérer → tu rates des cycles de test entiers.

### Échelle actuelle

- **30 000+ jeux testés** à date.
- **2 000+ studios partenaires** globalement.
- Guillaume (studio cité en exemple) en a testé 100+ avec eux à lui seul.

### Funnel produit

```
Idéation → concept identifié
    ↓
Test 3 jours sur pub iOS US → données réelles (CPI, retention D1, IPM)
    ↓
Décision binaire :
    • 90% → KILL
    • 10% → ITÈRE
    ↓
Si itération confirme l'engagement → LAUNCH + SCALE
```

### Quality bar

- Trouver un bon jeu ≠ scaler un bon jeu.
- Pour battre Candy Crush / Clash Royale ils ont relevé la barre qualité.

### Petites équipes + IA = thèse stratégique Voodoo

- Sur mobile gaming : **petite équipe > grande équipe**.
- Raison : les founders doivent **posséder** le jeu. Obsession sur les pixels, les règles, le level design. Impossible à 30 personnes.
- Equipes idéales : **small, lean, obsédées par tous les aspects du produit**.
- Avec **2-3 personnes + IA**, tu peux faire le boulot d'une équipe **10-20-30× plus grande**.
- Pique aux grandes équipes : 45-50 artistes qui refusent l'IA (menace métier/identité) → adoption bloquée → ces équipes vont se faire dépasser.
- Voodoo bet sur **petites équipes IA-natives** vs gros studios résistants.
- *"Les outils IA deviennent meilleurs que les humains sur certaines tâches."*

---

## 3. Hackathon — Planning et logistique

### Timing

- **Samedi 25/04 ~11:00** : kickoff terminé → idéation + formation team + choix track.
- **Samedi journée** : idéation, mentors dispos pour valider le track avant blocage.
- **Samedi 13:00** : lunch.
- **Samedi 19:30** : dinner.
- **Samedi nuit** : venue ouvert 24/7, on peut dormir sur place.
- **Dimanche 26/04 matin** : coding (mentors toujours dispos).
- **Dimanche 14:30** : finalisation produit + prépa démo.
- **Dimanche 14:30 → 15:00** : démos (transcription floue, peut-être 14:30→15:30 — à reconfirmer sur place).
- **Dimanche 16:00 → 17:00** : closing + remise des prix.
- **Après** : apéro/fête.

### Math timing réel

- **End du dev = ~14:30 dimanche** = **H+27h30 depuis kickoff**, pas H+48.
- Donc timebox réelle = **~27h de dev**, dont une nuit de sommeil minimale.

### Logistique

- Coffee + snacks toute la journée.
- Mentors disponibles tout le long. **Aller les voir AVANT d'être bloqué**, pas après.
- Venue ouvert 24/7.

---

## 4. Track 1 — Mobile Game Production

### Brief

⚠️ **Pas une machine à créer des jeux génériques. Recréer UN jeu précis : Marble Sort.**

- **Marble Sort** = puzzle de tri de billes colorées dans des tubes (genre qui cartonne actuellement).
- Le jeu **existe déjà en live** chez Voodoo → contrainte IP : impossible de publier votre version.
- Pas de game design original à inventer : la compétition se joue sur **comment vous le construisez**.

### Pourquoi cette épreuve

Depuis 2-3 mois Voodoo intègre les **nouveaux workflows IA** dans toute leur prod. Le track 1 sert à voir **comment vous travaillez avec l'IA** pour produire vite ET bien.

### 3 axes que le jury va regarder

1. **Mécanique principale** — implémentation du core gameplay (logique tri, contrôles, feedback "juicy").
2. **Génération de niveaux** — outils custom pour pondre des niveaux à la chaîne (= démo workflow IA).
3. **Pipeline assembly/installation** — comment vous packagez et déployez le jeu.

### Stack autorisée

- **Web frameworks** OK : Phaser, PIXI, Three.js, plain canvas.
- **Godot** OK aussi.
- Pas de restriction stricte.
- **Scenario** recommandé pour les assets visuels via IA.
- Hosting démo : **itch.io** (la transcription a dit "twitch.io" = erreur d'auto-transcription).

### Mantra qualité

> *"Il faut sentir le love quand on joue."*
> *"Le but est de faire le plus vite possible, mais la qualité est très importante."*

### Contrainte IP

- Pas de publication de votre version pendant ou après le hackathon.
- Si vous voulez **continuer après** le hackathon, Voodoo est ouvert à discuter — mais pas sur ce jeu précis (Marble Sort), parce que c'est leur IP en live. Sur d'autres jeux : *"on serait heureux de tester avec vous dans le futur."*

---

## 5. Track 2 — Playable Ad Pipeline

### C'est quoi un playable ad

- Mini-jeu interactif **~30 secondes**, jouable directement dans une pub (avant la vidéo, dans le feed social).
- Pas un vrai jeu — un **teaser experiential** qui transmet la "juiciness" du gameplay en quelques secondes pour donner envie d'installer.
- Format technique standard : **single HTML file** (HTML5 + JS, jouable sans install).

### Pourquoi c'est crucial pour Voodoo

- Moteur d'acquisition principal : meilleurs playables → users de meilleure qualité → meilleure LTV → moins cher en acquisition.
- Aujourd'hui leur prod de playables passe par des **vendors externes** → time-to-deliver lent et cher.
- Ils sortent **~50 jeux par an** = chaque semaine il faut un playable neuf. Pas tenable d'attendre 1-3 semaines un vendor à chaque fois.

### Ce qu'ils veulent au hackathon

⚠️ **PAS un beau playable. Un PIPELINE IA reproductible qui produit des playables.**

C'est le piège mortel à éviter : tomber dans la trappe "on construit un seul beau playable bien polish". Voodoo ne veut pas un playable, ils veulent **un outil qu'ils peuvent réutiliser derrière**.

### Pipeline attendu (filé par le speaker)

```
Vidéo gameplay (input, fournie par Voodoo via Google Drive)
    ↓
Analyse via Gemini API (vidéo + son + mécanique)
    ↓
Génération du code HTML/JS du playable
    ↓
Génération des assets visuels via Scenario
    ↓
Single HTML file (output)
    ↓
Variations rapides (force du pipeline)
```

### Délivrables

1. **Le pipeline lui-même** (le vrai produit du hackathon).
2. **Au moins 1 single HTML file** = playable jouable, démo concrète.
3. Idéalement **plusieurs variations** générées par le même pipeline → preuve que c'est reproductible.

### Bonus jury (gros levier)

> *"Si ton pipeline peut fonctionner pour ce que Voodoo a en interne, c'est un bon point."*

→ Si le pipeline est utilisable derrière par leurs équipes pour leurs vrais jeux → atout majeur. Potentiel partenariat post-hackathon.

### Stack technique recommandée

| Composant | Outil | Usage |
|---|---|---|
| Analyse vidéo | **Gemini API** (clé fournie par Voodoo) | Best-in-class vidéo + son |
| Code playable | **Claude Code** | Génération HTML/JS |
| Assets visuels | **Scenario** (MCP dispo) | Sprites, fonds, persos cohérents |
| Hosting démo | **itch.io** | Single HTML file |

---

## 6. Track 3 — Market Intelligence + Génération créa

### Le track a 2 composantes

#### Composante 1 — Outil de market intelligence

- Scraper / analyser ce qui se passe sur le marché mobile gaming.
- Comprendre la concurrence : ce qui marche, ce qui ne marche pas.
- Output : analyse marché → **dashboard** (ou format préformat, détaillé dans la Notion page).
- **Stack libre** : tu scrappes ce que tu veux, comme tu veux.

#### Composante 2 — Pipeline créatif IA

- Prendre les insights → les appliquer à un jeu (réécrit dans ton tool) → générer des **créatifs publicitaires** avec **Scenario MCP**.

### Pipeline complet attendu

```
Jeu input (un jeu Voodoo)
    ↓
Comprendre le genre
    ↓
Trouver les performances de jeux similaires sur le marché
    ↓
Trouver les principaux créatifs (pubs / playables) qui marchent pour ces jeux
    ↓
Déconstruire ces créatifs : qu'est-ce qui les fait fonctionner ?
    ↓
Appliquer ces learnings
    ↓
Générer des créatifs pour TON jeu via Scenario MCP
```

### Format

Workflow **input simple → output simple** (et reproductible).

### Présentation jury

1. Comment vous avez approché la task.
2. Quel jeu vous avez choisi.
3. Votre dashboard.
4. Comment vous utilisez les insights pour comprendre le marché.
5. Le pipeline single-input / single-output.

---

## 7. Outils, modèles, budget tokens (transversal aux 3 tracks)

### Stratégie modèle Claude (token budget = limité)

Le speaker est explicite :

| Modèle | Bon pour | Mauvais pour |
|---|---|---|
| **Opus 4.7 + max reasoning** | Building plans, specs, architecture | Implémentation (cher pour rien) |
| **Sonnet 4.6 implementation** | Implémentation pure, **mieux qu'Opus ici** | Plans complexes |
| **Sonnet** (général) | API calls, data processing | Décisions architecturales |

⚠️ *"Si vous faites 'hello world' en Opus 4.7 max reasoning, vous burn tout votre budget en 1h."*

→ À poser explicitement dans le `CLAUDE.md` partagé : **plan en Opus, implem en Sonnet**.

### Notion page Voodoo

- Voodoo va partager une **page Notion** avec leurs best practices internes Claude Code.
- À lire **avant** de commencer à coder.
- Lien : https://voodoo.notion.site/Voodoo-Hack-Tracks-34ca0b481db4803ab1f7e035e5b4b094

### API keys fournies

- **Gemini** (clé fournie par Voodoo) — analyse vidéo best-in-class.
- **Claude Code** (token de code fourni) — votre budget LLM.

### Scenario (MCP)

- Outil de génération d'assets visuels par IA (graphismes, fonds, persos).
- Mentionné comme **MCP** → installable directement dans Claude Code via le serveur MCP.
- *"Très incroyable, avec grand pouvoir grande responsabilité."*
- Pertinent pour **les 3 tracks** (assets jeu, créa playable, créa publicitaire).
- Encouragé à le tester par les organisateurs.

---

## 8. Notes diverses

### Sur le profil game design

> *"La plupart des gens dans la salle ne sont pas game designers — c'est un handicap partagé. Mais si vous avez des skills spécifiques (marketing, dev classique), vous pouvez les jouer à fond et impressionner. Y'a beaucoup d'angles."*

→ Profil dev pur (Next.js, Claude Code, intégrations API) = valide sur tous les tracks. Pas une faiblesse.

### Mantra global

- **Vélocité + qualité** (les deux ensemble, pas l'un sans l'autre).
- **Pipeline > produit unique** (sur Track 2 et 3 surtout).
- **Aller voir les mentors AVANT** d'être bloqué.

---

## 9. Ressources et liens

- Notion track page : https://voodoo.notion.site/Voodoo-Hack-Tracks-34ca0b481db4803ab1f7e035e5b4b094
- Hosting démo : https://itch.io
- Scenario : https://www.scenario.com/
- Hackathon repo (à créer) : ___

---

*Fichier généré samedi 25/04 ~12:25 à partir des transcriptions audio live des messages 10:58 → 11:22. Toute zone "transcription floue" est marquée explicitement.*
