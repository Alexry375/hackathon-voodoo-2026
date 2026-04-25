# Aiming Dynamics

> Analyse du comportement dynamique et de l'ajustement de l'angle de tir en temps réel.

---

Dans cette vidéo, la mécanique de la ligne de visée fonctionne de manière similaire à celle d'un lance-pierre, en réagissant instantanément aux mouvements du joueur :

*   **Effet de pivot :** L'origine de la ligne de visée est ancrée sur le personnage sélectionné. Lorsque le joueur déplace son doigt sur l'écran, la ligne pivote autour de ce personnage, qui sert de point d'axe fixe.
*   **Inversion des axes :** L'orientation de la ligne est directement opposée au mouvement du doigt. Le système utilise des axes inversés :
    *   Lorsque le joueur glisse son doigt vers le bas, la ligne de visée s'oriente vers le haut.
    *   De même, un mouvement du doigt vers la gauche ou la droite orientera la ligne dans la direction opposée.
*   En résumé, le joueur doit "tirer" son doigt dans la direction opposée à la cible souhaitée, créant ainsi la tension et la direction de la trajectoire du tir.