# Étape 6 — Bundle final + check compliance

> Dernière étape. Tu génères le livrable, vérifies qu'il respecte toutes les contraintes AppLovin/MRAID, et tu commits.

> **Gate d'entrée** : la step 5.5 doit être verte — tous les segments du clip-vs-clip Gemini scorent **≥ 9/10**. Si tu arrives ici avec un segment < 9, retourne en 5.5. Seule exception : commit `[blocker-cinematic]` documenté après 5 itérations infructueuses sur le même segment.

---

## 6.1. Build final

```bash
npm run embed   # régénère assets-inline.js depuis les sources binaires si tu en as
npm run build   # esbuild → dist/playable.html
```

Le script `tools/build.mjs` doit log la taille finale. Si > 4.8 MB → fail. Si entre 4.5 et 4.8 → warning, tente une réduction.

### Optimisations possibles si trop volumineux

1. **Audio** : Music.ogg est souvent le gros morceau. Si tu n'as pas eu le temps de le wirer, **vire-le** de `embed-assets.mjs`. Sinon, baisse le bitrate (ffmpeg : `-c:a libvorbis -q:a 2`) avant d'embed.
2. **Frames de fond endcard** : si tu utilises une frame extraite de la vidéo en JPG, baisse la qualité (`-q:v 6` pour ffmpeg → ~70% size). Évite PNG pour les backgrounds photo.
3. **Sprites PNG officiels** : converte en WebP (`cwebp -q 80 in.png -o out.webp`). Vérifie compatibilité Canvas2D (toutes browsers AppLovin sont OK).
4. **Bundle JS** : esbuild minify est déjà appliqué. Tu peux ajouter `--mangle-props=^_` si tu as exposé pas mal de méthodes privées.

## 6.2. Compliance check — checklist

Lance le playable depuis `dist/playable.html` (file:// ou http://) et vérifie **chaque** point :

- [ ] **Taille** : `ls -la dist/playable.html` < 5 MB
- [ ] **Single file** : aucune ressource externe (`grep -E '<link|<script src=|fetch(|XMLHttpRequest|new Image\(' dist/playable.html` doit retourner uniquement les data: URIs et scripts inline)
- [ ] **Console clean** : Chromium DevTools → 0 erreur, 0 warning critique
- [ ] **Network clean** : DevTools Network tab → 0 requête sortante après chargement initial
- [ ] **Pas de boucle infinie** : la 5-phase narrative se déroule en < 60s et atteint l'endcard
- [ ] **Endcard tap fonctionne** : tap sur le bouton CTA → `window.Voodoo.playable.redirectToInstallPage()` est appelé (vérifie via `console.log` dans le shim)
- [ ] **MRAID fallback** : si `window.mraid` existe → `mraid.open()` est appelé ; sinon `window.open` ; sinon log d'erreur propre
- [ ] **Tap-to-start** : le 1er tap démarre l'audio (si wiré) — éviter autoplay block
- [ ] **Portrait OK** : 540×960 (ou ratio respecté en responsive si tu as fait ça)
- [ ] **Pas d'erreur sur device emulation iOS Safari + Android Chrome** (Playwright supporte les deux)

## 6.3. Test AppLovin Preview (si dispo dans le repo)

Si `RESSOURCES/AppLovin Playable Preview.html` (ou équivalent) existe au niveau parent :

1. Ouvre le preview HTML
2. Upload `dist/playable.html`
3. Vérifie que le playable tourne dans l'iframe MRAID sans erreur
4. Tap CTA → preview log "mraid.open(...) called" (interception)

Si pas dispo, skip cette étape.

## 6.4. Récap final

Écris `SANDBOX/outputs/RUN-REPORT.md` avec :

```markdown
# Run report — <date>

## Livrable
- Path : `input/<jeu>/dist/playable.html`
- Taille : <X> MB
- Build time : <Y>s

## Pipeline executed
- Étape 1 (skim + validate) : <durée>, <N divergences>, fichier `divergences.md`
- Étape 2 (anchor) : asset = <nom>, <N> itérations
- Étape 3 (fanout) : <N> assets produits, <N> sub-agents lancés, durée total <D>
- Étape 4 (impl) : <N> commits jalons
- Étape 5 (playwright loop) : <N> pairs validés, <X> écarts bloquants corrigés, <Y> écarts acceptables résiduels
- Étape 6 (bundle) : taille finale <Z> MB

## Critères de succès
- [x] Taille < 5 MB
- [x] 0 erreur console
- [x] 0 requête réseau
- [x] Mécanique cœur conforme
- [x] **Tous segments clip-vs-clip ≥ 9/10** (intro / aim / fire_cinematic / impact / endcard)
- [x] Camera state machine conforme à `SANDBOX/outputs/cinematic-spec.md`
- [x] Opening anchor à ±100 ms de la 1ère frame source
- [x] redirectToInstallPage() OK
- [x] Aucune feature inventée

## Score final par segment (depuis `critique-clipclip-final.md`)
- intro : <X>/10
- aim : <X>/10
- fire_cinematic : <X>/10
- impact : <X>/10
- endcard : <X>/10
- **score min** : <X>/10 (doit être ≥ 9)

## Écarts résiduels
<liste des écarts qui n'ont pas pu être corrigés, avec justification>

## Blockers ouverts pour le user
<liste des points où tu as eu besoin de trancher dans le doute>

## Prochaines itérations suggérées
<si tu vois des améliorations possibles avec plus de temps>
```

## 6.5. Commit final + push

```bash
git add input/<jeu>/
git commit -m "$(cat <<'EOF'
pipeline: run done — playable.html shipped

Voir input/<jeu>/SANDBOX/outputs/RUN-REPORT.md pour le rapport complet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin pipeline-cc-Alexis-v0/run-1-<nom-du-jeu>
```

## 6.6. Sortie attendue

- `input/<jeu>/dist/playable.html` < 5 MB, compliance checklist verte
- `input/<jeu>/SANDBOX/outputs/RUN-REPORT.md` complet
- Branche poussée sur origin
- **Commit jalon final** : `pipeline(06): playable shipped — <X> MB`

---

**Fin de pipeline.** Le user prendra la main pour comparer ton run avec d'autres runs / valider la fidélité finale.
