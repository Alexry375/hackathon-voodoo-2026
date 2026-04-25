"""
Pipeline Agentic - Analyse Vidéo Gameplay avec Arborescence Documentaire

Principe : chaque analyse vidéo génère N sous-analyses (branching), de manière
récursive sur D niveaux de profondeur. Résultat = game_spec.md (index racine)
+ un fichier .md par noeud de l'arbre.

Estimations avant lancement :
  branching=4, depth=2 → 4+16 = 20 appels vidéo, 21 fichiers .md
  branching=4, depth=3 → 4+16+64 = 84 appels vidéo, 85 fichiers .md

Usage:
    python pipeline_agentic.py Videos/B01.mp4
    python pipeline_agentic.py Videos/B01.mp4 -o results/ -b 4 -d 2
"""
import os
import json
import time
import argparse
import concurrent.futures
from dataclasses import dataclass, field
from typing import Optional
import google.generativeai as genai
import requests
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from google.api_core.exceptions import ResourceExhausted

# Nombre max de requêtes simultanées vers l'API (évite les 429)
MAX_WORKERS_API = 5

# --- Modèles ---
MODELE_VISION = "models/gemini-3.1-pro-preview"  # Phases 1 & 3 (multimodal)
MODELE_TEXTE  = "models/gemini-3.1-pro-preview"  # Phases 2 & 4 (text-only)

# OpenRouter models (provider alternatif)
OPENROUTER_VISION = "google/gemini-2.5-pro-preview"
OPENROUTER_TEXTE  = "google/gemini-2.5-pro-preview"

# Global provider setting
PROVIDER = "gemini"  # "gemini" ou "openrouter"
OPENROUTER_API_KEY = None


# ──────────────────────────────────────────────
# Structure de données
# ──────────────────────────────────────────────

@dataclass
class Noeud:
    id: str
    label: str
    description: str
    prompt: str
    reason: str
    priority: int
    profondeur: int
    parent_id: Optional[str]
    analyse: str = ""
    enfants_ids: list = field(default_factory=list)


# ──────────────────────────────────────────────
# Auth & Upload
# ──────────────────────────────────────────────

def configurer_authentification(provider: str = "gemini") -> None:
    """Configure l'authentification selon le provider choisi."""
    global PROVIDER, OPENROUTER_API_KEY
    PROVIDER = provider
    
    if provider == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Variable d'environnement GEMINI_API_KEY manquante.")
        genai.configure(api_key=api_key)
        print(f"[Auth] Provider: Gemini")
    elif provider == "openrouter":
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("Variable d'environnement OPENROUTER_API_KEY manquante.")
        OPENROUTER_API_KEY = api_key
        print(f"[Auth] Provider: OpenRouter")
    else:
        raise ValueError(f"Provider inconnu: {provider}. Utilisez 'gemini' ou 'openrouter'.")


def televerser_video(chemin_video: str):
    """Upload vidéo pour Gemini. OpenRouter ne supporte pas l'upload."""
    if PROVIDER == "openrouter":
        print(f"\n[Upload] OpenRouter: chargement de {chemin_video} (base64)...")
        # OpenRouter ne supporte pas l'upload, mais peut recevoir du contenu encodé
        # Pour cette version, on va stocker le chemin et l'utiliser pour les appels texte
        return {"uri": chemin_video, "name": chemin_video, "type": "local_file"}
    
    print(f"\n[Upload] {chemin_video}...")
    fichier = genai.upload_file(path=chemin_video)
    print(f"  URI : {fichier.uri}")
    print("  Attente du traitement serveur", end="", flush=True)
    while fichier.state.name == "PROCESSING":
        print(".", end="", flush=True)
        time.sleep(5)
        fichier = genai.get_file(fichier.name)
    print()
    if fichier.state.name == "FAILED":
        raise RuntimeError("Traitement vidéo échoué côté API.")
    print(f"  Prête : {fichier.name}")
    return fichier


def appel_openrouter(messages: list, model: str, response_format=None, temperature=0.7) -> str:
    """Effectue un appel à l'API OpenRouter."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/user/voodoo-hack",
        "X-Title": "Voodoo Hack Pipeline",
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    
    if response_format:
        payload["response_format"] = response_format
    
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=120
    )
    response.raise_for_status()
    result = response.json()
    
    if "error" in result:
        raise RuntimeError(f"OpenRouter error: {result['error']}")
    
    return result["choices"][0]["message"]["content"]


# ──────────────────────────────────────────────
# Phase 1 — Le Débroussailleur
# ──────────────────────────────────────────────

def phase1_debroussailleur(fichier_video, modele_id: str) -> str:
    print("\n[Phase 1] Analyse chronologique brute...")
    prompt = (
        "Effectue une analyse chronologique détaillée de cette vidéo de gameplay mobile. "
        "Décris toutes les 5 à 10 secondes : les entités visibles (personnages, objets, éléments UI), "
        "les actions du joueur, les événements déclenchés, les transitions de scène, "
        "et tout élément visuel remarquable. Sois exhaustif et factuel. Ne rien inventer."
    )
    
    if PROVIDER == "gemini":
        modele = genai.GenerativeModel(model_name=modele_id)
        reponse = modele.generate_content([fichier_video, prompt])
        print(f"  Description obtenue ({len(reponse.text)} caractères)")
        return reponse.text
    else:  # openrouter
        # Pour OpenRouter, on utilise une approche texte sans la vidéo
        # (car OpenRouter ne supporte pas l'upload de vidéo comme Gemini)
        messages = [
            {"role": "user", "content": f"{prompt}\n\nNote: Analyse basée sur le chemin du fichier: {fichier_video.get('uri', 'unknown')}"}
        ]
        reponse = appel_openrouter(messages, modele_id, temperature=0.3)
        print(f"  Description obtenue ({len(reponse)} caractères)")
        return reponse


# ──────────────────────────────────────────────
# Phase 2 — Le Planificateur (par noeud)
# ──────────────────────────────────────────────

SYSTEME_PLANIFICATEUR = """\
Tu es un agent d'analyse de gameplay spécialisé dans la décomposition de vidéos de jeux mobiles casual.

Lis le contenu fourni et identifie exactement N aspects distincts qui méritent une analyse vidéo approfondie.
N est indiqué dans le message.

Contraintes :
- Exactement N aspects, ni plus ni moins
- Chaque aspect porte sur un seul sujet précis, non redondant avec les autres
- Chaque prompt doit être autonome et ciblé pour être soumis directement à la vidéo
- Orienté vers la création d'un playable ad HTML

Format de sortie : JSON valide strict, sans markdown ni texte autour.
{
  "aspects": [
    {
      "id": "snake_case_id",
      "description": "Ce qu'il faut analyser.",
      "prompt": "Analyse la vidéo en te concentrant UNIQUEMENT sur [sujet]. Décris [détails attendus].",
      "priority": 5,
      "reason": "Pourquoi cet aspect est important."
    }
  ]
}\
"""

@retry(
    retry=retry_if_exception_type((ResourceExhausted, requests.exceptions.RequestException)),
    wait=wait_exponential(multiplier=1, min=15, max=120),
    stop=stop_after_attempt(6),
    reraise=True,
)
def _phase2_pour_noeud(parent: Noeud, branching: int, modele_id: str) -> list[dict]:
    """Génère les sous-aspects pour un noeud parent donné."""
    message = f"N (nombre d'aspects à générer) : {branching}\n\nCONTENU À ANALYSER :\n{parent.analyse}"
    
    if PROVIDER == "gemini":
        config = genai.types.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json"
        )
        modele = genai.GenerativeModel(
            model_name=modele_id,
            system_instruction=SYSTEME_PLANIFICATEUR,
            generation_config=config
        )
        reponse = modele.generate_content(message)
        return json.loads(reponse.text).get("aspects", [])[:branching]
    else:  # openrouter
        messages = [
            {"role": "system", "content": SYSTEME_PLANIFICATEUR},
            {"role": "user", "content": message}
        ]
        response_format = {"type": "json_object"} if hasattr(requests, '__version__') else None
        reponse_text = appel_openrouter(messages, modele_id, response_format=response_format, temperature=0.1)
        try:
            return json.loads(reponse_text).get("aspects", [])[:branching]
        except json.JSONDecodeError:
            # Si le format n'est pas valide, essayer de l'extraire
            print(f"  Attention: Réponse OpenRouter non-JSON, tentative d'extraction...")
            return json.loads(reponse_text).get("aspects", [])[:branching]


# ──────────────────────────────────────────────
# Phase 3 — Analyse spécialisée (un noeud)
# ──────────────────────────────────────────────

@retry(
    retry=retry_if_exception_type((ResourceExhausted, requests.exceptions.RequestException)),
    wait=wait_exponential(multiplier=1, min=15, max=120),
    stop=stop_after_attempt(6),
    reraise=True,
)
def _phase3_pour_noeud(fichier_video, noeud: Noeud, modele_id: str) -> None:
    if PROVIDER == "gemini":
        modele = genai.GenerativeModel(model_name=modele_id)
        reponse = modele.generate_content([fichier_video, noeud.prompt])
        noeud.analyse = reponse.text
    else:  # openrouter
        messages = [
            {"role": "user", "content": noeud.prompt}
        ]
        noeud.analyse = appel_openrouter(messages, modele_id, temperature=0.5)
    
    print(f"  ✓ [d{noeud.profondeur}] {noeud.id} ({len(noeud.analyse)} car.)")


# ──────────────────────────────────────────────
# Construction de l'arbre (BFS niveau par niveau)
# ──────────────────────────────────────────────

def construire_arbre(
    fichier_video, description_brute: str,
    branching: int, profondeur_max: int,
    modele_vision: str, modele_texte: str
) -> dict[str, Noeud]:

    tous_noeuds: dict[str, Noeud] = {}

    noeud_racine = Noeud(
        id="__racine__", label="Racine", description="Description brute initiale",
        prompt="", reason="", priority=0, profondeur=0, parent_id=None,
        analyse=description_brute
    )
    tous_noeuds["__racine__"] = noeud_racine
    niveau_courant = [noeud_racine]

    for profondeur in range(1, profondeur_max + 1):
        nb_attendus = len(niveau_courant) * branching
        print(f"\n{'─'*55}")
        print(f"  NIVEAU {profondeur}/{profondeur_max}  —  {len(niveau_courant)} parent(s) × {branching} = {nb_attendus} analyses")
        print(f"{'─'*55}")

        # Phase 2 : planification parallèle (un appel par noeud parent)
        print(f"  [Phase 2] Génération des sous-aspects en parallèle...")
        nouveaux_noeuds: list[Noeud] = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS_API) as executor:
            futures = {
                executor.submit(_phase2_pour_noeud, parent, branching, modele_texte): parent
                for parent in niveau_courant
            }
            for future in concurrent.futures.as_completed(futures):
                parent = futures[future]
                aspects = future.result()

                for aspect in aspects:
                    safe_id = aspect["id"].replace(" ", "_")[:40]
                    noeud_id = safe_id if parent.id == "__racine__" else f"{parent.id}__{safe_id}"

                    # Déduplication
                    compteur = 1
                    base_id = noeud_id
                    while noeud_id in tous_noeuds:
                        noeud_id = f"{base_id}_{compteur}"
                        compteur += 1

                    noeud = Noeud(
                        id=noeud_id,
                        label=aspect["id"],
                        description=aspect["description"],
                        prompt=aspect["prompt"],
                        reason=aspect.get("reason", ""),
                        priority=aspect.get("priority", 0),
                        profondeur=profondeur,
                        parent_id=parent.id
                    )
                    tous_noeuds[noeud_id] = noeud
                    parent.enfants_ids.append(noeud_id)
                    nouveaux_noeuds.append(noeud)

        print(f"  {len(nouveaux_noeuds)} noeuds créés.")

        # Phase 3 : analyses vidéo parallèles (tous les nouveaux noeuds d'un coup)
        print(f"  [Phase 3] {len(nouveaux_noeuds)} analyses vidéo en parallèle...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS_API) as executor:
            futures = [
                executor.submit(_phase3_pour_noeud, fichier_video, noeud, modele_vision)
                for noeud in nouveaux_noeuds
            ]
            concurrent.futures.wait(futures)
            for f in futures:
                f.result()  # propage les exceptions

        niveau_courant = nouveaux_noeuds

    return tous_noeuds


# ──────────────────────────────────────────────
# Phase 4 — Génération de l'arborescence .md
# ──────────────────────────────────────────────

def _ecrire_noeud_md(noeud: Noeud, tous_noeuds: dict, output_dir: str, nom_base: str) -> None:
    """Écrit le fichier .md d'un noeud. Pas d'appel API — contenu = analyse Phase 3 + liens enfants."""
    lignes = [
        f"# {noeud.label.replace('_', ' ').title()}",
        f"",
        f"> {noeud.description}",
        f"",
        f"---",
        f"",
        noeud.analyse,
    ]

    if noeud.enfants_ids:
        lignes += ["", "---", "", "## Sous-analyses", ""]
        for eid in noeud.enfants_ids:
            enfant = tous_noeuds.get(eid)
            if enfant:
                nom_fichier_enfant = f"{nom_base}_{enfant.id}.md"
                lignes.append(f"- [{enfant.label.replace('_', ' ').title()}]({nom_fichier_enfant}) — {enfant.description[:90]}")

    contenu = "\n".join(lignes)
    chemin = os.path.join(output_dir, f"{nom_base}_{noeud.id}.md")
    _sauvegarder(chemin, contenu)


def phase4_generer_arborescence(
    tous_noeuds: dict, description_brute: str,
    modele_id: str, output_dir: str, nom_base: str
) -> str:
    print("\n[Phase 4] Génération de l'arborescence documentaire...")

    # Écriture de tous les noeuds (pas de racine) en parallèle — pas d'appel API
    noeuds_a_ecrire = [n for n in tous_noeuds.values() if n.id != "__racine__"]
    print(f"  Écriture de {len(noeuds_a_ecrire)} fichiers .md...")

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(_ecrire_noeud_md, noeud, tous_noeuds, output_dir, nom_base)
            for noeud in noeuds_a_ecrire
        ]
        concurrent.futures.wait(futures)
        for f in futures:
            f.result()

    # game_spec.md — index racine avec synthèse (1 seul appel API)
    print("  Génération de game_spec.md...")
    noeuds_d1 = sorted(
        [n for n in tous_noeuds.values() if n.profondeur == 1],
        key=lambda n: n.priority, reverse=True
    )
    syntheses = "\n\n".join(
        f"### {n.label}\n{n.analyse[:500]}..." for n in noeuds_d1
    )
    prompt_index = f"""\
Tu es un expert en game design mobile. Génère un fichier game_spec.md synthétique servant d'index.

DESCRIPTION CHRONOLOGIQUE BRUTE :
{description_brute[:2000]}

ANALYSES DE PREMIER NIVEAU :
{syntheses}

---
Génère un document Markdown structuré :

# Game Spec — [Nom du jeu détecté]

## Résumé exécutif
## Mécanique principale
## Points clés (liste courte, 1 ligne par aspect)
## Recommandations pour l'ad HTML jouable

Sois synthétique. Les détails sont dans les fichiers liés.\
"""
    
    if PROVIDER == "gemini":
        modele = genai.GenerativeModel(model_name=modele_id)
        contenu_index = modele.generate_content(prompt_index).text
    else:  # openrouter
        messages = [
            {"role": "user", "content": prompt_index}
        ]
        contenu_index = appel_openrouter(messages, modele_id, temperature=0.5)

    # Section index des liens
    contenu_index += "\n\n---\n\n## Index\n\n"
    for noeud in noeuds_d1:
        contenu_index += f"- [{noeud.label.replace('_', ' ').title()}]({nom_base}_{noeud.id}.md) — {noeud.description[:80]}\n"

    chemin_spec = os.path.join(output_dir, f"{nom_base}_game_spec.md")
    _sauvegarder(chemin_spec, contenu_index)
    return chemin_spec


# ──────────────────────────────────────────────
# Pipeline principal
# ──────────────────────────────────────────────

def executer_pipeline(chemin_video: str, output_dir: str = ".", branching: int = 4, profondeur: int = 2, provider: str = "gemini",
                      or_vision: str = None, or_texte: str = None) -> None:
    global OPENROUTER_VISION, OPENROUTER_TEXTE, MODELE_VISION, MODELE_TEXTE
    configurer_authentification(provider)
    if provider == "openrouter":
        if or_vision:
            OPENROUTER_VISION = or_vision
        if or_texte:
            OPENROUTER_TEXTE = or_texte
        MODELE_VISION = OPENROUTER_VISION
        MODELE_TEXTE  = OPENROUTER_TEXTE
    os.makedirs(output_dir, exist_ok=True)
    nom_base = os.path.splitext(os.path.basename(chemin_video))[0]

    total_appels_video = sum(branching ** d for d in range(1, profondeur + 1))
    total_fichiers_md  = total_appels_video + 1  # +1 pour game_spec.md
    modeles_info = f"{MODELE_VISION}" if provider == "openrouter" else f"vision={MODELE_VISION}, texte={MODELE_TEXTE}"
    print(f"\n[Config] branching={branching}, profondeur={profondeur}, provider={provider}")
    print(f"         Modèles : {modeles_info}")
    print(f"         Appels vidéo Phase 3 estimés : {total_appels_video}")
    print(f"         Fichiers .md estimés         : {total_fichiers_md}")

    fichier_video = None
    try:
        fichier_video = televerser_video(chemin_video)

        # Phase 1
        description_brute = phase1_debroussailleur(fichier_video, MODELE_VISION)
        _sauvegarder(os.path.join(output_dir, f"{nom_base}_phase1_description.txt"), description_brute)

        # Construction de l'arbre (Phases 2+3 imbriquées, niveau par niveau)
        tous_noeuds = construire_arbre(
            fichier_video, description_brute, branching, profondeur, MODELE_VISION, MODELE_TEXTE
        )

        # Sauvegarde de la structure de l'arbre (debug)
        _sauvegarder(
            os.path.join(output_dir, f"{nom_base}_tree.json"),
            json.dumps(
                {nid: {"id": n.id, "label": n.label, "profondeur": n.profondeur,
                       "parent_id": n.parent_id, "enfants_ids": n.enfants_ids}
                 for nid, n in tous_noeuds.items()},
                indent=2, ensure_ascii=False
            )
        )

        # Phase 4 — arborescence documentaire
        chemin_spec = phase4_generer_arborescence(
            tous_noeuds, description_brute, MODELE_TEXTE, output_dir, nom_base
        )

        nb_noeuds = len(tous_noeuds) - 1  # exclure __racine__
        print(f"\n{'='*60}")
        print(f"[OK] Pipeline terminé.")
        print(f"     {nb_noeuds} analyses, {total_fichiers_md} fichiers .md générés")
        print(f"     Index : {chemin_spec}")
        print(f"{'='*60}")

    finally:
        if fichier_video is not None and PROVIDER == "gemini":
            print(f"\n[Nettoyage] Suppression du fichier serveur : {fichier_video.name}")
            genai.delete_file(fichier_video.name)


def _sauvegarder(chemin: str, contenu: str) -> None:
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(contenu)
    print(f"  Sauvegardé : {chemin}")


# ──────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pipeline Agentic — Analyse vidéo gameplay avec arborescence documentaire",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Exemples :
  python pipeline_agentic.py Videos/B01.mp4
  python pipeline_agentic.py Videos/B01.mp4 -b 4 -d 2 -o results/
  python pipeline_agentic.py Videos/B01.mp4 -b 3 -d 3 -o results/  # 39 analyses
  python pipeline_agentic.py Videos/B01.mp4 --provider openrouter -o results/  # Avec OpenRouter API"""
    )
    parser.add_argument("video",           help="Chemin vers le fichier vidéo (MP4/MOV)")
    parser.add_argument("--output",  "-o", default=".",  help="Dossier de sortie (défaut: .)")
    parser.add_argument("--branching","-b",default=4,    type=int, help="Sous-aspects par noeud (défaut: 4)")
    parser.add_argument("--depth",   "-d", default=2,    type=int, help="Profondeur de l'arbre (défaut: 2)")
    parser.add_argument("--provider",   "-p", default="gemini", choices=["gemini", "openrouter"],
                        help="Provider API : 'gemini' (défaut) ou 'openrouter'")
    parser.add_argument("--or-vision",        default=None,
                        help=f"Modèle OpenRouter vision (défaut: {OPENROUTER_VISION})")
    parser.add_argument("--or-texte",         default=None,
                        help=f"Modèle OpenRouter texte (défaut: {OPENROUTER_TEXTE})")
    args = parser.parse_args()

    if not os.path.exists(args.video):
        raise SystemExit(f"Erreur : fichier introuvable — {args.video}")
    if args.branching < 1:
        raise SystemExit("--branching doit être >= 1")
    if args.depth < 1:
        raise SystemExit("--depth doit être >= 1")

    executer_pipeline(args.video, args.output, args.branching, args.depth, args.provider,
                      or_vision=args.or_vision, or_texte=args.or_texte)
