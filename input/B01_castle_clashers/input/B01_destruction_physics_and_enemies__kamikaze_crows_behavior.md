# Kamikaze Crows Behavior

> Analyse du comportement, de la trajectoire et des effets visuels des corbeaux ennemis.

---

En se concentrant exclusivement sur les corbeaux visibles dans la vidéo, voici la description de leur comportement et de leurs mécaniques :

*   **Origine et déclenchement :** Les corbeaux sont les **projectiles d'attaque du château rouge**, lancés à chaque tour de l'adversaire dans la boucle tour-par-tour. Chaque tour ennemi déclenche systématiquement leur tir, généralement par vagues de deux corbeaux simultanés (parfois un seul lorsque la vie de l'ennemi est faible), en miroir du tir balistique du joueur depuis le château bleu.
*   **Trajectoire ciblée :** Une fois lancés depuis le château rouge, ils adoptent un vol direct et déterminé vers le château bleu (la forteresse de gauche), ciblant différentes parties de la structure (les tours, puis les décombres restants). Quand deux corbeaux sont tirés en même temps, leurs trajectoires se croisent ou se séparent en cours de vol pour répartir l'impact sur deux zones distinctes.
*   **Traînée de fumée grise :** Pendant tout leur vol, les corbeaux agissent comme des projectiles propulsés, laissant dans leur sillage une traînée continue et ondulante de fumée grise.
*   **Mécanique d'attaque suicidaire et explosive :** Dès qu'ils entrent en collision avec une quelconque partie du château bleu, ils s'autodétruisent en déclenchant une violente explosion. Cette mécanique kamikaze pulvérise l'armature de la forteresse en morceaux et fait chuter drastiquement la barre de vie (pourcentage) du château bleu à chaque vague d'impact. La cadence des corbeaux est rythmée par la boucle tour-par-tour (un déclenchement par tour ennemi), et non par un timer indépendant.
