# Shooting Mechanics And Controls

> Analyse du système de visée et de tir (drag & drop, ligne de trajectoire).

---

En se concentrant exclusivement sur les mécaniques de tir présentées dans la vidéo, voici l'analyse détaillée des contrôles :

**L'interaction du joueur (Glisser-déposer / "Slingshot")**
Le système de contrôle repose sur une mécanique de recul (type lance-pierre). Le joueur initie l'action en posant son doigt sur le personnage qu'il souhaite faire attaquer. Pour viser, il doit ensuite effectuer un mouvement de glissement ("drag") vers l'arrière, c'est-à-dire dans la direction opposée à la cible visée. 

**Apparence de la ligne de trajectoire**
Dès que le mouvement de recul est amorcé, une aide à la visée apparaît à l'écran. Il s'agit d'une ligne droite composée de pointillés blancs. Cette ligne prend sa source au niveau du personnage sélectionné et se projette vers l'avant, en direction du château ennemi.

**Dynamique et comportement de la ligne**
La ligne en pointillés est dynamique et réagit en temps réel aux mouvements du doigt du joueur. Tant que le joueur maintient son doigt appuyé sur l'écran et le déplace (vers le haut ou vers le bas), l'angle de la ligne en pointillés s'ajuste en conséquence. Le système agit comme un axe pivotant autour du personnage : plus le joueur baisse son doigt vers le bas de l'écran, plus la ligne de trajectoire pointe vers le haut, et inversement.

**Le déclenchement du tir**
Le tir n'est pas automatique. Le déclenchement exact du tir se produit à la fraction de seconde où le joueur relâche la pression sur l'écran (le "déposer" de l'action glisser-déposer). C'est le fait de lever le doigt qui valide l'angle choisi par la ligne en pointillés et provoque le départ instantané du projectile.

---

## Sous-analyses

- [Slingshot Interaction](B01_shooting_mechanics_and_controls__slingshot_interaction.md) — Analyse de l'interaction tactile initiale de type lance-pierre (glisser vers l'arrière).
- [Trajectory Line Visuals](B01_shooting_mechanics_and_controls__trajectory_line_visuals.md) — Analyse de l'apparence visuelle de l'aide à la visée (ligne en pointillés).
- [Aiming Dynamics](B01_shooting_mechanics_and_controls__aiming_dynamics.md) — Analyse du comportement dynamique et de l'ajustement de l'angle de tir en temps réel.
- [Shooting Trigger](B01_shooting_mechanics_and_controls__shooting_trigger.md) — Analyse du moment exact du déclenchement du tir et du départ du projectile.