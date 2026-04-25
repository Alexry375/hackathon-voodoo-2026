Voici le document de spécifications de game design (Game Spec) généré à partir de l'analyse fournie, structuré pour être directement exploitable par une équipe de développement.

***

# Game Spec — Castle Clashers

## 1. Résumé
**Castle Clashers** est un jeu mobile d'artillerie et de destruction physique en vue latérale 2D. Le joueur contrôle une forteresse montée sur chenilles et utilise une mécanique de fronde (drag-and-aim inverse) pour lancer différents types de projectiles sur le château adverse, avec pour objectif de détruire sa structure physique et de vider sa barre de vie avant que le sien ne succombe.

## 2. Mécanique principale
**Tir balistique par "Fronde" (Slingshot) :**
*   **Sélection :** Une flèche blanche indique l'unité active. Le joueur sélectionne le personnage en appuyant dessus (tap & hold).
*   **Visée (Drag inverse) :** Le joueur glisse son doigt dans la direction *opposée* à la cible. 
*   **Indicateur de visée :** Une ligne droite (composée d'un trait gris et de points blancs) apparaît. 
    *   *Vecteur :* La ligne s'allonge proportionnellement à la distance d'étirement du doigt (indiquant la puissance).
    *   *Comportement strict :* La ligne est toujours **droite** et indique l'angle/puissance initial. Elle *ne dessine pas* la courbe balistique finale (gravité gérée par le moteur physique post-lancement).
*   **Déclenchement :** Le tir est exécuté à l'angle défini dès que le joueur relâche la pression sur l'écran.

## 3. Entités et objets
**Les Châteaux (Cibles et Bases) :**
*   *Structure :* Base montée sur deux chenilles de char (mobiles). Édifice supérieur en pierre/briques avec toits coniques (Bleu pour le joueur, Rouge pour l'ennemi).
*   *Physique :* Les murs se détruisent par blocs, révélant l'intérieur noir. Le château bascule physiquement vers l'arrière sous la force cinétique des impacts lourds (déplacement du centre de gravité).

**Les Personnages Jouables (Château Bleu) :**
*   **Cyclope rouge :** Tire une *roquette simple et lourde*. Trajectoire tendue (ligne droite ou très légère courbe), laisse une traînée de fumée rouge, provoque une explosion concentrée.
*   **Squelette :** Armé d'un lance-roquettes multiple. Tire une *rafale de petites roquettes*. Trajectoire parabolique (en cloche), laisse des traînées de fumée blanche, cause des dégâts dispersés.
*   **Gobelin :** Armé d'un tube vert. Tire un *rayon continu* (feu/énergie jaune/orange). Trajectoire instantanée en ligne droite, brûle la cible en continu tant que le tir dure.

**Les Projectiles Ennemis :**
*   Projectiles noirs, lourds et ronds. Laissent une traînée de fumée grise épaisse en forme de spirale.

## 4. Règles et conditions de victoire/défaite
*   **Règle de combat :** Les affrontements se font sous forme d'échanges de tirs (tour par tour ou asynchrones).
*   **Santé (HP) :** Chaque château commence à 100% de vie.
*   **Objectif :** Réduire le pourcentage de vie du château rouge en touchant sa structure physique, tout en survivant aux attaques (la vidéo montre la vie du joueur chuter jusqu'à 17%).

## 5. Interface utilisateur (HUD, feedback visuel, animations)
**HUD (Heads-Up Display) :**
*   *Barres de vie :* Fixées en haut (Bleu à gauche, Rouge à droite), séparées par un logo "VS". 
*   *Composition HP :* Jauge de couleur se rétractant pour révéler un fond blanc, icône de château stylisée, et pourcentage de vie restant en texte blanc avec contour noir. Mise à jour instantanée aux impacts.

**Tutoriel in-game :**
*   Un curseur en forme de main (cartoon, peau claire) simule l'interaction du joueur : appuie sur le personnage (faisant apparaître une cible rouge en dessous), recule pour étirer la ligne en pointillés, puis disparaît au relâchement.

**Feedbacks (Juice) :**
*   *Dégâts numériques :* Affichage flottant en rouge du montant des dégâts au point d'impact (ex: "-140"), montant vers le haut.
*   *Particules :* Éclaboussures rouges (sang/impact) sur les coups critiques. Morceaux de pierre projetés en l'air.
*   *Explosions :* Jaune/orange vif pour les tirs du joueur ; Flash violet/noir avec ondes de choc pour les tirs ennemis.

**Écran de fin (End Screen) :**
*   *Fond :* Champ de bataille au crépuscule.
*   *Logo (Haut-centre) :* "CASTLE CLASHERS" en 3D (texture bois clouté).
*   *Personnages (Centre) :* Modèles 3D Chibi courants vers l'avant (Gobelin à massue, Chevalier en armure lourde violette, Elfe archère verte).
*   *CTA (Bas-centre) :* Grand bouton rectangulaire arrondi, texture bois clair, texte "PLAY" en marron foncé.

## 6. Style visuel et ambiance
*   **Perspective :** Plan latéral strict en 2D (Side-scroller) pour le gameplay.
*   **Direction artistique :** Mélange de Medieval-Fantasy et de machinerie (chars), style cartoon coloré.
*   **Comportement Caméra (Crucial) :** 
    *   *Plan initial :* Vue d'ensemble montrant les deux châteaux.
    *   *Visée :* Zoom serré sur le château attaquant.
    *   *Vol :* Dézoom léger et Panoramique/Travelling latéral calé sur la vitesse du projectile (la caméra suit le tir).
    *   *Impact :* La caméra s'arrête et se centre sur le château cible.
    *   *Riposte (Effet Ping-Pong) :* Coupure brusque (snap cut) pour ramener la caméra sur le château du joueur lors des tirs ennemis, sans suivre le projectile ennemi en vol.

## 7. Moments clés pour un ad HTML jouable
Pour concevoir la version *Playable Ad* basée sur ce gameplay :

1.  **Ouverture (0s) :** Plan large (100% vs 100%). Zoom sur le château bleu endommagé.
2.  **Appel à l'action 1 :** La main tuto apparaît, sélectionne le Squelette et montre l'étirement vers le bas (visée vers le haut). Attente de l'interaction du joueur.
3.  **Action du Joueur & Récompense :** Le joueur reproduit l'action. La caméra suit la rafale de roquettes en cloche (panoramique) jusqu'à l'explosion sur le château rouge. La barre de vie ennemie chute à ~44% avec effondrement des murs.
4.  **Retour de bâton (Ping-Pong) :** Cut brutal sur le château bleu subissant l'impact ennemi. Le château recule fortement, le "-140" rouge apparaît, la vie chute à 17%.
5.  **Appel à l'action 2 (Final) :** La main pointe le Gobelin pour un tir en ligne droite décisif sur la base fragilisée de l'adversaire.
6.  **Fin d'ad :** Au moment de l'explosion finale (ou juste avant l'impact), apparition de l'écran de fin avec le logo 3D, les trois personnages et le gros bouton "PLAY" texturé bois.