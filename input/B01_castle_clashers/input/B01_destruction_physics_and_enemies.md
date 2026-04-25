# Destruction Physics And Enemies

> Analyse de la destruction des châteaux et du comportement des corbeaux ennemis.

---

Voici une analyse de la vidéo axée sur les éléments demandés :

**1. Destruction des structures des châteaux**
*   **Réaction aux impacts :** À chaque attaque (qu'elle provienne des corbeaux ou d'armes lourdes), les murs des châteaux réagissent de manière dynamique. Les zones frappées explosent, projetant des éclats et des blocs de maçonnerie dans les airs.
*   **Dégradation visuelle :** Les parties détruites des bâtiments deviennent instantanément noires et calcinées, perdant leur texture de pierre d'origine. Des brèches béantes se forment, révélant parfois des pièces intérieures (comme celles abritant des tombes).
*   **Effondrement structurel :** Au fil des dégâts, la stabilité des châteaux est gravement compromise. Le château bleu, en particulier, s'incline fortement vers l'arrière au fur et à mesure que ses fondations et ses murs sont rongés par les explosions. Le château rouge voit ses deux tours principales s'effriter et s'effondrer progressivement sous les salves répétées, réduisant considérablement sa taille.

**2. Indicateurs textuels de dégâts**
*   **Apparition :** Lors d'impacts directs sur les murs (notamment visibles lors des dernières attaques de corbeaux sur le château bleu ou de missiles sur le château rouge), des chiffres rouges apparaissent à l'écran.
*   **Comportement :** Ces indicateurs, formatés avec un signe négatif (par exemple, "-140" ou "-44"), jaillissent exactement du point d'impact de l'explosion. Ils flottent ensuite verticalement vers le haut pendant quelques instants avant de s'estomper.

**3. Modèle de vol et d'attaque des corbeaux ennemis**
*   **Trajectoire et ciblage :** Des corbeaux noirs, reconnaissables à la traînée de fumée grise qu'ils laissent dans leur sillage, sont **lancés par le château rouge à chaque tour ennemi** dans la boucle tour-par-tour, en miroir du tir balistique du joueur. Leur trajectoire est systématiquement orientée vers le château bleu, par vagues de deux qui se croisent ou se répartissent en cours de vol pour frapper deux points d'impact distincts.
*   **Attaque suicidaire :** Ils n'effectuent aucune manœuvre d'esquive ou d'attaque à distance. Leur seul mode d'action est de voler à toute vitesse pour s'écraser délibérément contre la structure du château bleu. À l'instant du choc, ils explosent, se détruisant eux-mêmes tout en infligeant des dégâts matériels importants à la forteresse. Une vague de deux (parfois un seul à faible vie ennemie) est tirée à chaque tour ennemi.

---

## Sous-analyses

- [Visual Degradation Effects](B01_destruction_physics_and_enemies__visual_degradation_effects.md) — Analyse des effets visuels immédiats lors des impacts sur les châteaux (explosions, éclats
- [Structural Collapse Physics](B01_destruction_physics_and_enemies__structural_collapse_physics.md) — Analyse de la physique d'effondrement et de la déformation globale des châteaux au fil des
- [Kamikaze Crows Behavior](B01_destruction_physics_and_enemies__kamikaze_crows_behavior.md) — Analyse du comportement, de la trajectoire et des effets visuels des corbeaux kamikazes.
- [Damage Indicators Ui](B01_destruction_physics_and_enemies__damage_indicators_ui.md) — Analyse des indicateurs textuels de dégâts (UI flottante).