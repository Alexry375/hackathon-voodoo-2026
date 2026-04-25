# Audit MVP — état vs `docs/game-spec.md`

> Décision Alexis : **la spec fait foi** (pas de débat sur les divergences).
> Ce doc liste uniquement **ce qui manque** dans le code actuel pour atteindre la spec.

---

## Déjà fait (scene_interior + bundle)

- Drag-AWAY visée fronde (`scene_interior/aim.js`)
- Ligne droite gris + points blancs (`scene_interior/arrow.js`)
- 3 perso jouables + rotation tour par tour (`units.js` + `turn.js`)
- Cards HUD bottom + active outline jaune (`hud_cards.js`)
- HP bars top Bleu/Rouge avec icônes château (`shared/hud_top.js`)
- Château interior cross-section + damage levels + tilt réactif au HP
- Tutoriel hand cursor pulsant (`playable/hand_cursor.js`)
- Endcard CTA + redirect MRAID (`playable/endcard.js`)
- Bundle <5 MB single-file AppLovin-compliant (`dist/playable.html` 2.08 MB)
- Tap-to-start intro + 5-phase narrative state machine (`playable/script.js`)

---

## Bloquant ad — ordre suggéré pour Sami

### B1. Système caméra ping-pong (§6 spec)

**Aucun système caméra dans le code.** La spec impose une caméra qui :
- démarre overview 2 châteaux
- zoom serré sur attaquant pendant la visée
- pan suit le projectile en vol (player only)
- snap cut sur défenseur à l'impact
- snap cut retour quand l'ennemi tire (sans suivre projectile ennemi)

**Implication :** créer `shared/camera.js` (`{x, y, zoom}` + easing), wrapper `applyCameraTransform(ctx)` appelé par les 2 scènes avant draw. Sub-states scene_manager : `EXTERIOR_OVERVIEW` / `EXTERIOR_FOLLOW_PROJECTILE` / `EXTERIOR_IMPACT_FOCUS` / `EXTERIOR_SNAP_BACK`.

### B2. Scene exterior réelle (§3, §6)

Stub vert actuel à virer. Demande :
- 2 châteaux complets sur **chenilles à roues dentées** (procédural, voir `castle-clasher-v2/draws-inline.js:1735` pour la version v2 `drawTracks(ctx, cx, cy, w, h, phase)`)
- Background.png (paysage hivernal) — à inliner via `tools/embed-assets.mjs` (clé `BACKGROUND_EXTERIOR`)
- Projectile en vol (sprite + trajectoire balistique)
- Destruction par blocs du château cible (briques disparaissent, cavité noire révélée)

### B3. 3 armes différenciées (§3)

Actuellement les 3 unités tirent identique. Spec :
- **Cyclope** : roquette lourde, trajectoire **tendue**, fumée **rouge**, explosion concentrée
- **Squelette** : **rafale** de petites roquettes, trajectoire **parabolique en cloche**, fumée **blanche**, dégâts dispersés
- **Orc** (= "Gobelin" dans la spec — sprites officiels = orc) : **rayon continu jaune/orange** (laser), instantané ligne droite, brûle en continu

**Étendre payload `player_fire`** avec `weapon_type: 'rocket'|'volley'|'beam'`. Trois comportements côté exterior.

### B4. Enemy AI (§3, §7)

- Timer 6-10s entre tirs ennemis pendant freeplay
- Projectile noir rond + traînée fumée grise spirale
- À l'impact côté joueur : dégâts -10 à -25, snap-cut interior, damage number "-XXX" rouge flottant
- Spec montre HP joueur chutant 100% → 17%

### B5. Destruction physique (§3)

- Blocs/briques disparaissant individuellement au-dessus du HP threshold
- Bascule physique sur impact (impulsion + spring), pas juste tilt fonction du HP

---

## Important fidélité

- Damage numbers flottants ("-140" rouge montant) côté impact
- VFX différenciés : explosions **jaune/orange vif** pour tirs joueur ; **flash violet/noir + ondes de choc** pour tirs ennemis
- Logo "VS" entre les 2 HP bars (`shared/hud_top.js` à enrichir)
- Éclaboussures rouges sur coups critiques + morceaux de pierre projetés

---

## Polish

- Audio : `MUSIC` (Music.ogg, loop, démarre au premier tap) + `SFX` (Sfx.wav, sur shots/impacts) — assets déjà inlinés dans `window.ASSETS`, pas joués
- Cible rouge sous le perso pendant le tutoriel (§5)
- Cyclope **rouge** spec (sprite officiel n'est pas rouge — tinter via `globalCompositeOperation` ou OK tel quel)
- Endcard fidèle spec (§5 demande logo bois clouté + 3 perso 3D Chibi différents du gameplay) — actuel = `frame_55s.jpg` + bouton vert. Divergence assumable.

---

## Note sur le naming

Sprites officiels Voodoo : `Character_Cyclop.psb` / `Character_Skeleton.psb` / **`Character_Orc.psb`**. La spec écrit "Gobelin" mais l'asset est Orc. **Garde Orc côté code** (`unit_id: 'orc'`) — c'est ce qu'on a en PNG.
