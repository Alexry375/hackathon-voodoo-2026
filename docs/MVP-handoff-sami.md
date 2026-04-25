# MVP Handoff — pour Sami

> Doc passé par Alexis. Tout ce dont tu as besoin pour reprendre le MVP en autonomie.
> Spec officielle de référence : [`docs/game-spec.md`](./game-spec.md) (transcrit de `RESSOURCES/message.txt`).

---

## 1. Ce qu'Alexis et toi NE faites pas

**Alexis bascule sur autre chose** (à venir). Tu prends le MVP fidèle à `docs/game-spec.md` **end-to-end** : scene_exterior réel, caméra unifiée, armes différenciées, enemy AI, juice, audio. Mon scaffold (bundle, scene_interior, shared, playable narrative) est figé sauf bug.

---

## 2. Pipeline bundle — comment builder

Tout est en place. Depuis `hackathon_voodoo/` :

```bash
npm install              # une fois — installe esbuild + playwright
npm run embed            # régénère assets-inline.js depuis RESSOURCES/ (si tu ajoutes un asset)
npm run build            # → dist/playable.html (~2.08 MB actuellement)
npm run dev              # python3 -m http.server 8765
```

**Ce que `npm run build` fait** (`tools/build.mjs`) :
1. Régénère `assets-inline.js` si une source RESSOURCES/ est plus récente.
2. `esbuild` bundle `playable/entry.js` → IIFE minifié, target es2020, `write=false`.
3. Lit `dist/_template.html`, inline `vsdk_shim.js` + `assets-inline.js` + bundle JS via `String.prototype.replace(needle, () => replacement)` **callback form — pas la string form**, voir gotcha §3.
4. Minify HTML naïf (strip commentaires + whitespace).
5. Écrit `dist/playable.html`. **Fail si > 4.8 MB**.

Le mode (dev / prod) est auto-détecté dans `playable/entry.js` :
- URL contient `/dist/` → prod (devbar caché, runScript actif)
- sinon → dev (devbar visible, free-play, pas de scripted ad)
- override manuel : `?mode=prod` ou `?mode=dev` sur n'importe quelle URL

---

## 3. Gotchas pipeline (à connaître avant de toucher `tools/build.mjs`)

### 3.a. `$&` backreference corruption — CRITIQUE

`String.prototype.replace(needle, replacement)` avec `replacement` en **string** interprète `$&` (et `$1`, `$$`, etc.) comme backreferences regex. Comme le bundle minifié esbuild contient régulièrement `t!==$&&...` (== compare à `$`), ces 3 caractères se font remplacer par `&` → SyntaxError "Unexpected token '&'" au runtime.

**Fix** : passer la replacement comme **callback** :

```js
html = template
  .replace('<!--VSDK_SHIM-->', () => `<script>\n${vsdk}\n</script>`)
  .replace('<!--ASSETS-->',    () => `<script>\n${assets}\n</script>`)
  .replace('<!--BUNDLE-->',    () => `<script>\n${bundle}\n</script>`);
```

Ne change PAS pour de la string form, même "pour simplifier".

### 3.b. Order of `start()` vs mode override

Dans `playable/entry.js` : `start()` (scene_manager) écrase l'état initial. Donc **`start()` doit être appelé AVANT** que `runScript()` (prod) ou que `_devForceState('INTERIOR_AIM')` (dev) override l'état. Si tu refactors entry.js, garde cet ordre.

### 3.c. RESSOURCES/ est gitignoré

`.gitignore` exclut `RESSOURCES/` (volumineux). Si tu ajoutes un asset, tu dois :
1. Le poser dans `RESSOURCES/...`
2. Ajouter une entrée dans `tools/embed-assets.mjs` (clé MAJ, chemin relatif, mime)
3. `npm run embed` régénère `assets-inline.js` (committé)
4. Use via `getImage('TON_ASSET')` côté code (lazy `Image()` cache, voir `shared/assets.js`)

`assets-inline.js` est committé (~2.1 MB base64). Bundle = template HTML + `assets-inline.js` + `vsdk_shim.js` + bundle ESM.

---

## 4. Architecture du code — ce qui est figé

### 4.a. Contrat events 3-locked (`shared/events.js`)

**NE PAS CHANGER** sans `[decision]` dans HANDOFF :

```js
emit('player_fire',     { unit_id, angle_deg, power })
emit('cut_to_interior', { hp_self_after, hp_enemy_after, units_destroyed_ids })
emit('unit_killed',     { unit_id })
```

→ Si tu veux différencier les armes (cyclop = roquette / squelette = rafale / orc = laser), **tu peux étendre** le payload `player_fire` (ajouter `weapon_type` ou autre). Les nouveaux champs sont safe — c'est la **suppression** qui casserait scene_interior. À documenter dans le payload JSDoc.

### 4.b. Render order locked dans les 2 scènes

Chaque scene loop **doit** finir par :
```js
drawTopHud(ctx);                          // shared/hud_top.js — HP bars
drawScriptOverlay(ctx, performance.now()/1000);  // playable/script.js — narrative overlays
```
Sans ça, l'intro overlay / hand cursor / forcewin flash / endcard ne s'affichent pas pendant ta scène.

Mon stub `scene_exterior/index.js` (40 lignes) fait déjà ça correctement — tu peux le merger avec ton vrai code, ou le supprimer si tu pars de zéro mais garde les 2 lignes de fin.

### 4.c. `state` mutable centralisé (`shared/state.js`)

```js
state.hp_self_pct, state.hp_enemy_pct  // 0..100, sources de vérité HP
state.turn_index                       // incrémenté par turn.js sur cut_to_interior
state.units = [...]                    // roster joueur, ordered by floor
```

Helpers : `applyDamageToSelf(delta)`, `applyDamageToEnemy(delta)`, `killUnit(id)`, `aliveUnits()`. **Tu dois passer par eux** (pas de mutation directe).

### 4.d. Scene manager (`shared/scene_manager.js`)

États : `INTERIOR_AIM` | `EXTERIOR_OBSERVE` | `EXTERIOR_RESOLVE` (et `_devForceState` exposé).

Côté flow caméra ping-pong (voir §5 ci-dessous), tu auras peut-être besoin d'ajouter des sub-states ou un module séparé `shared/camera.js`.

---

## 5. Le PROBLÈME GLOBAL DU FLOW CAMÉRA — contexte qu'on n'avait jamais écrit

Discussion verbalisée mais jamais codée. Élément central pour le MVP fidèle.

**Le souci :** le jeu est en portrait 540×960, et les 2 châteaux sont **trop éloignés** pour tenir tous les deux à l'écran. Le jeu officiel résout ça avec une caméra qui ping-pong :

1. **Vue 1** : zoom serré sur **notre** château (interior cross-section, c'est ma scene_interior) — phase de visée
2. **Suivi du projectile en vol** depuis notre château vers l'autre — pan latéral
3. **Vue 2** : centrée sur le château ennemi qui encaisse l'impact
4. **Riposte** : projectile ennemi part, **cut brutal** (pas de pan) revient sur notre château
5. **Boucle**

→ Le projectile sert de **lien narratif/caméra** entre les 2 vues.

**Ce que la spec dit (§6 game-spec.md, "Comportement Caméra (Crucial)") :**
- Plan initial : overview 2 châteaux
- Visée : zoom serré attaquant
- Vol : dézoom léger + pan calé sur vitesse projectile
- Impact : caméra s'arrête, centre sur cible
- Riposte : **snap cut** retour, sans suivre le projectile ennemi

**État actuel** : zéro système caméra. Toutes les coords sont raw canvas. `scene_manager` switche entre 2 scènes mais c'est binaire (pas d'interpolation, pas de pan). Le scene_interior est en cross-section (pas une vue extérieure du château), donc la transition interior↔exterior n'est même pas géométriquement continue.

**Recommandation Alexis** : ajoute `shared/camera.js` exposant `{x, y, zoom}` + easing. Les 2 scènes appellent `applyCameraTransform(ctx)` avant de dessiner et `ctx.restore()` après. Sub-states scene_manager : `EXTERIOR_OVERVIEW` / `EXTERIOR_FOLLOW_PROJECTILE` / `EXTERIOR_IMPACT_FOCUS` / `EXTERIOR_SNAP_BACK`. Voir aussi §6.b ci-dessous (incohérences spec).

---

## 6. Audit MVP — récap de ce qui manque

Voir [`docs/MVP-audit.md`](./MVP-audit.md) pour le détail. Synthèse :

**Bloquant ad** :
- Scene exterior réelle (2 châteaux + chenilles + projectile en vol + impact)
- Système caméra ping-pong (cf. §5)
- 3 armes différenciées (cyclop tendu, skeleton parabolique en rafale, orc laser instantané)
- Enemy AI (timer entre tirs ennemis + projectile noir)
- Destruction par blocs du château (briques disparaissent, cavité noire révélée)

**Important fidélité** :
- Damage numbers flottants ("-140" rouge montant)
- VFX : explosions jaune (joueur) vs flash violet+ondes (ennemi)
- "VS" logo entre les 2 HP bars
- Background.png (paysage hivernal) à inliner — clé suggérée `BACKGROUND_EXTERIOR`
- Bascule physique château (impulsion sur impact, pas juste fonction du HP)

**Polish** :
- Audio (Music.ogg loop + Sfx.wav inlinés mais pas joués)
- Cible rouge sous le perso pendant tutoriel

---

## 7. Comment tester

### 7.a. Dev local
```bash
npm run dev                    # serveur :8765
xdg-open http://localhost:8765/index.html              # dev free-play, devbar visible
xdg-open http://localhost:8765/dist/playable.html      # prod scripted, comme AppLovin
xdg-open http://localhost:8765/index.html?mode=prod    # force prod sur source dev
```

### 7.b. Devbar (mode dev uniquement)
- `state` : voir l'état scene_manager
- `hp+` / `hp-` : ajuster HP joueur
- `enemy+` / `enemy-` : ajuster HP ennemi
- `NEXT TURN` : émet `cut_to_interior` factice → fait tourner turn.js
- `KILL ACTIVE` : tue l'unité active (test RIP)

### 7.c. Hooks de scrub Playwright (mode prod)
- `window.__forcePhase('intro'|'tutorial'|'freeplay'|'forcewin'|'endcard')` — saute à une phase
- `window.__game.phase` — phase courante
- Voir `tools/screenshot_phases.mjs` pour exemple sweep des 5 phases

### 7.d. AppLovin compliance
- Cap dur **5 MB** — actuellement 2.08 MB, marge 2.92 MB
- Zéro requête réseau (vérifier DevTools Network tab vide)
- VSDK shim `playable/vsdk_shim.js` : fournit `Voodoo.playable.{win,lose,redirectToInstallPage,on}` avec fallback `mraid.open()`
- À tester dans `RESSOURCES/AppLovin Playable Preview.html` une fois prêt

---

## 8. Conventions HANDOFF

`HANDOFF-sami.md` (le tien) et `HANDOFF-alexis.md` (le mien) sont **append-only**, format :

```
## [HH:MM] [tag] titre

corps 2-3 lignes
```

Tags : `[status]` `[done]` `[decision]` `[blocker]` `[question]` `[help]` `[info]`.

`.gitattributes` a `merge=union` sur ces 2 fichiers → pas de conflit même si on push en parallèle.

---

## 9. Repérage rapide des fichiers

| Quoi | Où |
|---|---|
| Spec officielle | `docs/game-spec.md` |
| Audit MVP + divergences | `docs/MVP-audit.md` |
| Ce doc | `docs/MVP-handoff-sami.md` |
| Entry point bundle | `playable/entry.js` |
| Build script | `tools/build.mjs` |
| Embed assets | `tools/embed-assets.mjs` |
| Scripted state machine (5 phases) | `playable/script.js` |
| State partagé | `shared/state.js` |
| Events 3-locked | `shared/events.js` |
| Scene manager | `shared/scene_manager.js` |
| HUD top (HP bars) | `shared/hud_top.js` |
| Mon stub à virer/merger | `scene_exterior/index.js` |
| Livrable AppLovin | `dist/playable.html` |
