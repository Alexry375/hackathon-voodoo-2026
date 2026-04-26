# Analyse focale — Recoil physique du château adverse Castle Clashers

Tu reçois un clip vidéo (segment 6-10s d'une partie de Castle Clashers) qui contient l'impact d'un missile joueur sur le château adverse (à droite de l'écran).

Décris en détail le comportement physique du château adverse juste après l'impact, en répondant précisément à chacun des 7 points ci-dessous. Donne des **chiffres** (pixels, pourcentages, ms) — pas de "rapide" / "lent".

## 1. Direction du déplacement
Le château se déplace-t-il vers la gauche, vers la droite, ou ne bouge-t-il pas ? Précise la direction par rapport à l'écran.

## 2. Distance approximative du recul
En pourcentage de la largeur visible du château (par exemple "10% de la largeur du château"), de combien recule-t-il au pic du mouvement ?

## 3. Durée du déplacement
Combien de millisecondes entre la frame d'impact et la frame où le château atteint sa position de recul maximal ? Et combien de ms entre le pic et le retour à la position d'équilibre (s'il y a retour) ?

## 4. Retour à la position initiale ?
Le château revient-il complètement à sa position d'origine, partiellement, ou reste-t-il dans sa position reculée ? Si retour, décris l'oscillation (rebond, easing).

## 5. Comportement des chenilles
Les chenilles (bandes de roulement noires sous le château) tournent-elles pendant le déplacement ? Sont-elles cohérentes avec le sens et la vitesse du recul (les dents défilent vers l'avant si recule) ? Ou sont-elles statiques ?

## 6. Synchronisation avec l'impact
Le mouvement de recul commence-t-il à la frame d'impact exact, ou avec un décalage de quelques frames (combien) ? Y a-t-il un mini-délai dû à la chaîne d'impact (compression, puis recul) ?

## 7. Easing perçu
Le déplacement démarre-t-il brutalement (vitesse maximale dès le départ, puis décélère = ease-out) ou progressivement (accélération puis décélération = ease-in-out) ? Décris la courbe perçue.

## Synthèse finale (obligatoire)

Termine par 4 lignes au format suivant pour copier-coller direct dans du code :

```
recoilDistance:    XX  // px (estimation pour un château de largeur 340px)
recoilDur:         XXX // ms (impact → pic recul)
recoilReturnDur:   XXX // ms (pic recul → retour, ou 0 si pas de retour)
recoilEasing:      "ease-out" | "ease-in-out" | "ease-in" | "linear"
treadsScrollSpeed: <ratio velocité chenille / vitesse castle, typiquement ~1>
```
