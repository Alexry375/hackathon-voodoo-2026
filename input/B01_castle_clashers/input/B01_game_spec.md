# Game Spec — [Castle Siege / Slingshot Brawler]

## Résumé exécutif
Ce titre est un jeu de tir balistique et de destruction physique 1v1 au tour-par-tour. Le joueur doit défendre sa forteresse mobile (château bleu sur chenilles) contre une forteresse ennemie (rouge) qui riposte à chaque tour avec ses propres projectiles : des corbeaux explosifs lancés en vagues, laissant des traînées de fumée. Le gameplay repose sur l'exploitation des faiblesses structurelles de l'adversaire via des tirs ciblés, offrant une forte satisfaction visuelle grâce à la destruction dynamique des bâtiments.

## Mécanique principale
La boucle de gameplay repose sur une **mécanique de tir "Slingshot" (Glisser-déposer)**.
Le joueur sélectionne un personnage en bas de l'écran, glisse son doigt vers l'arrière pour tendre le tir (visualisé par une ligne de trajectoire en pointillés), puis relâche pour déclencher l'attaque. L'objectif est d'ajuster l'angle (tir tendu ou en cloche) en fonction du type de projectile choisi pour maximiser les dégâts structurels sur le château adverse.

## Points clés
*   **Contrôles :** Tir intuitif par recul (drag-and-release) avec aide à la visée balistique. *(Détails dans `shooting_mechanics_and_controls`)*
*   **Armement & VFX :** Arsenal varié selon le personnage (ex: missile direct du Diablotin, pluie balistique du Squelette). *(Détails dans `projectile_types_and_vfx`)*
*   **Physique & Destruction :** Dégradation dynamique des forteresses (explosions, éclats, carbonisation) impactant les hitboxes. *(Détails dans `destruction_physics_and_enemies`)*
*   **Interface (HUD) :** Lisibilité immédiate des enjeux via un système de jauge de vie asymétrique (VS Bleu/Rouge en %). *(Détails dans `ui_and_end_card`)*

## Recommandations pour l'ad HTML jouable
En tant que Playable Ad, l'expérience doit être compressée pour maximiser l'engagement en moins de 15 secondes :

1.  **Créer l'urgence (The Hook) :** Démarrer avec le château bleu tombant rapidement à 30% de vie sous les premières contre-attaques du château rouge (vagues de corbeaux explosifs), affichant un curseur "main" animé invitant le joueur à agir immédiatement pour se sauver.
2.  **Juiciness et Feedback visuel :** Amplifier le "Screen Shake" (tremblement d'écran) et exagérer les effets de destruction physiques lors du premier impact pour garantir une gratification instantanée (effet *satisfying*).
3.  **Guidage tolérant :** Épaissir la ligne de trajectoire en pointillés et ajouter un léger "aim-assist" (magnétisme) sur les points faibles du château rouge pour éviter la frustration du joueur.
4.  **A/B Testing sur la condition de fin :** 
    *   *Scénario Win :* Le joueur détruit le château rouge en un tir (Squelette recommandé pour l'effet visuel) -> Apparition du bouton "Download".
    *   *Scénario Fail :* Le joueur rate, le château rouge achève la destruction du sien -> Écran "Try Again" menant au store.

---

## Index

- [Shooting Mechanics And Controls](B01_shooting_mechanics_and_controls.md) — Analyse du système de visée et de tir (drag & drop, ligne de trajectoire).
- [Projectile Types And Vfx](B01_projectile_types_and_vfx.md) — Étude des différents personnages, de leurs projectiles et des effets visuels d'e
- [Destruction Physics And Enemies](B01_destruction_physics_and_enemies.md) — Analyse de la destruction des châteaux et du comportement des corbeaux ennemis.
- [Ui And End Card](B01_ui_and_end_card.md) — Disposition de l'interface utilisateur en jeu et écran de fin promotionnel (CTA)
