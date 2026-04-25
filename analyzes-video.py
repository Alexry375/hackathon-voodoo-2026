import os
import time
import google.generativeai as genai
from google.generativeai.types import generation_types

def configurer_authentification() -> None:
    """Configure le client API en injectant la clé cryptographique."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Erreur : La variable d'environnement GEMINI_API_KEY est absente.")
    genai.configure(api_key=api_key)

def analyser_flux_video(identifiant_modele: str, chemin_fichier_video: str, requete_instruction: str) -> str:
    """
    Exécute une inférence multimodale sur une séquence vidéo.
    
    Paramètres :
        identifiant_modele (str): La chaîne de caractères désignant le modèle (ex: 'models/gemini-3.1-pro-preview').
        chemin_fichier_video (str): Le chemin absolu ou relatif vers le fichier MP4/MOV local.
        requete_instruction (str): La directive textuelle guidant l'analyse du réseau de neurones.
        
    Retourne :
        str: La chaîne de caractères générée par le modèle (réponse probabiliste).
    """
    fichier_api = None
    try:
        # 1. Ingestion : Téléversement du fichier binaire vers l'infrastructure Google
        print(f"Initialisation du transfert de la charge utile : {chemin_fichier_video}...")
        fichier_api = genai.upload_file(path=chemin_fichier_video)
        print(f"Fichier assigné à l'URI : {fichier_api.uri}")

        # 2. Scrutation : Boucle bloquante en attente du traitement serveur (extraction des tenseurs)
        print("Attente de la finalisation du traitement asynchrone par l'API...")
        while fichier_api.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(5)
            # Rafraîchissement des métadonnées de l'objet
            fichier_api = genai.get_file(fichier_api.name)
        print() # Saut de ligne après la boucle

        if fichier_api.state.name == "FAILED":
            raise RuntimeError("Le traitement du fichier vidéo par l'infrastructure distante a échoué.")

        # 3. Allocation et Inférence : Instanciation du modèle et exécution de la génération
        print(f"Exécution de l'inférence via l'architecture {identifiant_modele}...")
        modele = genai.GenerativeModel(model_name=identifiant_modele)
        
        reponse: generation_types.GenerateContentResponse = modele.generate_content(
            [fichier_api, requete_instruction]
        )
        
        return reponse.text

    except Exception as e:
        return f"Erreur d'exécution lors du pipeline d'analyse : {str(e)}"

    finally:
        # 4. Nettoyage : Désallocation des ressources de stockage (Requête HTTP DELETE)
        if fichier_api is not None:
            print(f"Libération des ressources serveur pour le fichier : {fichier_api.name}")
            genai.delete_file(fichier_api.name)

if __name__ == "__main__":
    # Paramètres d'exécution
    MODELE_CIBLE = "models/gemini-3.1-pro-preview"
    FICHIER_TEST = "Videos/B01.mp4" # Remplacez par le chemin strict d'un fichier existant
    INSTRUCTION_SYSTEME = "Exécute une analyse chronologique de cette séquence vidéo. Analyse la vidéo en te concentrant uniquement sur la mécanique principale. Décris les actions du joueur (sélection, visée, lancement), les règles visibles, les interactions importantes et ce qui rend la boucle de gameplay compréhensible et engageante."

    # Exécution du pipeline
    configurer_authentification()
    
    if os.path.exists(FICHIER_TEST):
        resultat_analyse = analyser_flux_video(
            identifiant_modele=MODELE_CIBLE,
            chemin_fichier_video=FICHIER_TEST,
            requete_instruction=INSTRUCTION_SYSTEME
        )
        print("\n=== RÉSULTAT DE L'INFÉRENCE ===")
        print(resultat_analyse)
        print("===============================\n")
    else:
        print(f"Erreur E/S système : Le chemin de fichier spécifié '{FICHIER_TEST}' est introuvable sur le disque local.")