"""
Pipeline Agentic - Analyse Vidéo Gameplay en 4 Phases

Usage:
    python pipeline_agentic.py Videos/B01.mp4
    python pipeline_agentic.py Videos/B01.mp4 --output results/
"""
import os
import json
import time
import argparse
import concurrent.futures
import google.generativeai as genai

# --- Modèles ---
MODELE_VISION   = "models/gemini-3.1-pro-preview"  # Phases 1 & 3 (multimodal)
MODELE_TEXTE    = "models/gemini-3.1-pro-preview"               # Phases 2 & 4 (text-only, rapide)


def configurer_authentification() -> None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Variable d'environnement GEMINI_API_KEY manquante.")
    genai.configure(api_key=api_key)


# ──────────────────────────────────────────────
# Upload unique — réutilisé en phases 1 et 3
# ──────────────────────────────────────────────

def televerser_video(chemin_video: str):
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
    modele = genai.GenerativeModel(model_name=modele_id)
    reponse = modele.generate_content([fichier_video, prompt])
    print(f"  Description obtenue ({len(reponse.text)} caractères)")
    return reponse.text


# ──────────────────────────────────────────────
# Phase 2 — Le Planificateur
# ──────────────────────────────────────────────

SYSTEME_PLANIFICATEUR = """\
Tu es un agent d'analyse de gameplay spécialisé dans la décomposition de vidéos de jeux mobiles casual.

Lis la description fournie et identifie les aspects qui méritent une analyse approfondie \
lors d'un prochain passage sur la vidéo.

Contraintes :
- Entre 3 et 6 aspects maximum
- Chaque aspect porte sur un seul sujet
- Pas de redondance entre les aspects
- Orienté vers la création d'un playable ad HTML

Aspects prioritaires si présents :
core_mechanic, player_interaction, objectives_and_win_condition, entities_and_objects,
visual_style, camera_and_scene_layout, feedback_and_juice, ui_and_hud, progression_or_difficulty

Format de sortie : JSON valide strict, sans markdown ni texte autour.
{
  "aspects": [
    {
      "id": "snake_case_id",
      "description": "Ce qu'il faut analyser.",
      "prompt": "Prompt ciblé pour réanalyser la vidéo sur cet aspect uniquement.",
      "priority": 5,
      "reason": "Pourquoi cet aspect est important."
    }
  ]
}\
"""

def phase2_planificateur(description: str, modele_id: str) -> dict:
    print("\n[Phase 2] Génération du plan d'analyse ciblé...")
    config = genai.types.GenerationConfig(
        temperature=0.1,
        response_mime_type="application/json"
    )
    modele = genai.GenerativeModel(
        model_name=modele_id,
        system_instruction=SYSTEME_PLANIFICATEUR,
        generation_config=config
    )
    reponse = modele.generate_content(description)
    plan = json.loads(reponse.text)
    aspects = plan.get("aspects", [])
    print(f"  {len(aspects)} aspects identifiés :")
    for a in sorted(aspects, key=lambda x: x.get("priority", 0), reverse=True):
        print(f"    [P{a['priority']}] {a['id']} — {a['description'][:65]}")
    return plan


# ──────────────────────────────────────────────
# Phase 3 — La Boucle d'Expertise
# ──────────────────────────────────────────────

def _analyser_aspect(fichier_video, aspect: dict, modele_id: str) -> dict:
    aspect_id = aspect["id"]
    print(f"  → {aspect_id} démarré")
    modele = genai.GenerativeModel(model_name=modele_id)
    reponse = modele.generate_content([fichier_video, aspect["prompt"]])
    print(f"  ✓ {aspect_id} terminé ({len(reponse.text)} caractères)")
    return {
        "id":          aspect_id,
        "description": aspect["description"],
        "reason":      aspect.get("reason", ""),
        "priority":    aspect.get("priority", 0),
        "analyse":     reponse.text
    }

def phase3_boucle_expertise(fichier_video, aspects: list, modele_id: str) -> dict:
    print(f"\n[Phase 3] Boucle d'expertise — {len(aspects)} analyses en parallèle...")
    rapports = {}

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {
            executor.submit(_analyser_aspect, fichier_video, aspect, modele_id): aspect["id"]
            for aspect in aspects
        }
        for future in concurrent.futures.as_completed(futures):
            rapport = future.result()
            rapports[rapport["id"]] = rapport

    return rapports


# ──────────────────────────────────────────────
# Phase 4 — Le Synthétiseur
# ──────────────────────────────────────────────

def phase4_synthetiseur(description_brute: str, rapports: dict, modele_id: str) -> str:
    print("\n[Phase 4] Synthèse du document final...")

    blocs_rapports = ""
    for rapport in sorted(rapports.values(), key=lambda r: r.get("priority", 0), reverse=True):
        blocs_rapports += (
            f"\n\n### {rapport['id'].upper()}\n"
            f"**Sujet :** {rapport['description']}\n"
            f"**Analyse :**\n{rapport['analyse']}"
        )

    prompt = f"""\
Tu es un expert en game design mobile. À partir des analyses suivantes d'une vidéo de gameplay, \
génère un game_spec structuré, précis et immédiatement exploitable par un développeur.

---
DESCRIPTION CHRONOLOGIQUE BRUTE :
{description_brute[:3000]}

---
RAPPORTS D'EXPERTISE :
{blocs_rapports}

---
Génère un document Markdown avec les sections suivantes :

# Game Spec — [Nom du jeu]

## 1. Résumé (2-3 phrases)
## 2. Mécanique principale
## 3. Entités et objets (liste avec comportements)
## 4. Règles et conditions de victoire/défaite
## 5. Interface utilisateur (HUD, feedback visuel, animations)
## 6. Style visuel et ambiance
## 7. Moments clés pour un ad HTML jouable

Sois précis, factuel, et évite toute spéculation. Ne décris que ce qui est visible.\
"""

    modele = genai.GenerativeModel(model_name=modele_id)
    reponse = modele.generate_content(prompt)
    print("  Synthèse terminée.")
    return reponse.text


# ──────────────────────────────────────────────
# Pipeline principal
# ──────────────────────────────────────────────

def executer_pipeline(chemin_video: str, output_dir: str = ".") -> None:
    configurer_authentification()
    os.makedirs(output_dir, exist_ok=True)
    nom_base = os.path.splitext(os.path.basename(chemin_video))[0]

    fichier_video = None
    try:
        fichier_video = televerser_video(chemin_video)

        # Phase 1
        description_brute = phase1_debroussailleur(fichier_video, MODELE_VISION)
        _sauvegarder(f"{output_dir}/{nom_base}_phase1_description.txt", description_brute)

        # Phase 2
        plan = phase2_planificateur(description_brute, MODELE_TEXTE)
        _sauvegarder(f"{output_dir}/{nom_base}_phase2_plan.json", json.dumps(plan, indent=2, ensure_ascii=False))

        # Phase 3
        rapports = phase3_boucle_expertise(fichier_video, plan["aspects"], MODELE_VISION)
        _sauvegarder(f"{output_dir}/{nom_base}_phase3_reports.json", json.dumps(rapports, indent=2, ensure_ascii=False))

        # Phase 4
        document_final = phase4_synthetiseur(description_brute, rapports, MODELE_TEXTE)
        chemin_final = f"{output_dir}/{nom_base}_game_spec.md"
        _sauvegarder(chemin_final, document_final)

        print(f"\n{'='*60}")
        print(f"[OK] Pipeline terminé.")
        print(f"     Game spec : {chemin_final}")
        print(f"{'='*60}")

    finally:
        if fichier_video is not None:
            print(f"\n[Nettoyage] Suppression du fichier serveur : {fichier_video.name}")
            genai.delete_file(fichier_video.name)


def _sauvegarder(chemin: str, contenu: str) -> None:
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(contenu)
    print(f"  Sauvegardé : {chemin}")


# ──────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipeline Agentic — Analyse vidéo gameplay en 4 phases")
    parser.add_argument("video",           help="Chemin vers le fichier vidéo (MP4/MOV)")
    parser.add_argument("--output", "-o",  default=".", help="Dossier de sortie (défaut: .)")
    args = parser.parse_args()

    if not os.path.exists(args.video):
        raise SystemExit(f"Erreur : fichier introuvable — {args.video}")

    executer_pipeline(args.video, args.output)
