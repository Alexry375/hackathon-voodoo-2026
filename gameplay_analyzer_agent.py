import os
import json
import google.generativeai as genai

def configurer_authentification() -> None:
    """Initialise le client API via la variable d'environnement."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Configuration de la clé API manquante.")
    genai.configure(api_key=api_key)

def instancier_agent_analyseur(identifiant_modele: str = "models/gemini-2.5-flash") -> genai.GenerativeModel:
    """
    Construit l'objet modèle avec les instructions système encapsulées et
    les hyperparamètres configurés pour la génération déterministe de JSON.
    """
    prompt_systeme = """Tu es un agent d’analyse de gameplay spécialisé dans la décomposition de vidéos de jeux mobiles casual.

Ton rôle est de lire une description globale ou partielle d’une vidéo de gameplay, puis d’identifier les aspects importants qui méritent une analyse plus précise lors d’un prochain passage sur la vidéo.

Tu ne dois pas générer de code HTML.
Tu ne dois pas inventer de mécaniques non visibles ou non mentionnées.
Tu dois uniquement proposer des axes d’analyse utiles pour mieux comprendre le jeu et produire ensuite un game_spec exploitable.

Pour chaque aspect identifié, tu dois produire :
1. un identifiant court en snake_case
2. une description claire de ce qu’il faut analyser
3. un prompt ciblé à réutiliser pour analyser la vidéo
4. une priorité entre 1 et 5
5. une raison expliquant pourquoi cet aspect est important

Les aspects doivent être :
- spécifiques
- non redondants
- utiles pour générer un playable ad HTML
- centrés sur un seul sujet à la fois

Tu dois privilégier les aspects suivants si présents :
- core_mechanic
- player_interaction
- objectives_and_win_condition
- entities_and_objects
- visual_style
- camera_and_scene_layout
- feedback_and_juice
- ui_and_hud
- progression_or_difficulty
- monetizable_or_viral_moments

Tu dois limiter la sortie à 3 à 6 aspects maximum.

Le format de sortie doit être strictement du JSON valide, sans Markdown, sans explication autour.

Format attendu :
{
  "aspects": [
    {
      "id": "core_mechanic",
      "description": "Ce qu’il faut analyser dans cet aspect.",
      "prompt": "Analyse la vidéo en te concentrant uniquement sur la mécanique principale. Décris les actions du joueur, les règles visibles, les interactions importantes et ce qui rend la boucle de gameplay compréhensible.",
      "priority": 5,
      "reason": "La mécanique principale est indispensable pour recréer un playable fidèle."
    }
  ]
}"""

    # Configuration contraignant la sortie au format JSON et limitant la stochasticité
    configuration_generation = genai.types.GenerationConfig(
        temperature=0.1, # Valeur basse pour favoriser le déterminisme
        response_mime_type="application/json"
    )

    return genai.GenerativeModel(
        model_name=identifiant_modele,
        system_instruction=prompt_systeme,
        generation_config=configuration_generation
    )

def executer_agent(agent: genai.GenerativeModel, description_video: str) -> dict:
    """
    Soumet la description d'entrée à l'agent et désérialise le JSON retourné.
    """
    reponse = agent.generate_content(description_video)
    
    try:
        # Transformation de la chaîne JSON en dictionnaire Python
        objet_donnees = json.loads(reponse.text)
        return objet_donnees
    except json.JSONDecodeError as erreur_parsing:
        raise RuntimeError(f"Échec de la désérialisation de la réponse du modèle : {erreur_parsing}\nContenu brut : {reponse.text}")

if __name__ == "__main__":
    configurer_authentification()
    
    # Instanciation de l'agent. Le modèle "flash" est recommandé ici car la tâche 
    # d'extraction textuelle est peu coûteuse en calcul par rapport à l'analyse vidéo directe.
    agent_orchestrateur = instancier_agent_analyseur("models/gemini-2.5-flash")
    
    # Variable d'entrée simulant la description textuelle d'un gameplay
    texte_entree = """**00:00 - 00:10**
*   **Entités détectées :** Deux forteresses montées sur chenilles (l'une bleue à gauche, l'autre rouge à droite), pourcentages de points de vie, un projectile sphérique sombre, un petit monstre rouge cyclope, un squelette armé d'un lance-roquettes, un gobelin vert, une icône de main virtuelle (curseur d'interaction).
*   **Transitions de scènes :**
    *   00:00 : Vue d'ensemble de l'affrontement entre les deux camps.
    *   00:03 : Passage à une vue en coupe de l'intérieur de la forteresse bleue.
    *   00:07 : Retour à une vue extérieure centrée sur l'impact reçu par la forteresse rouge.
*   **Actions principales :**
    *   La forteresse bleue encaisse des tirs ennemis, faisant chuter ses points de vie de 100 % à 67 % et endommageant sa tour droite.
    *   La main virtuelle sélectionne le monstre rouge à l'intérieur du château, vise et le projette vers l'extérieur.
    *   Le projectile rouge percute la forteresse ennemie, détruisant une partie de sa façade et abaissant sa vie à 56 %.

**00:10 - 00:24**
*   **Entités détectées :** Les deux forteresses dégradées, jauges de vie, le squelette lance-roquettes, la main virtuelle, une volée de petites roquettes.
*   **Transitions de scènes :**
    *   00:14 : Retour à la vue intérieure de la forteresse bleue.
    *   00:17 : Basculement sur la forteresse rouge subissant l'assaut.
*   **Actions principales :**
    *   De nouveaux boulets frappent la forteresse bleue, réduisant sa santé à 35 %.
    *   Le joueur (via la main virtuelle) sélectionne le squelette pour lancer une contre-attaque.
    *   Une rafale de roquettes s'abat sur la forteresse rouge, causant de lourds dégâts structurels et faisant descendre sa santé à 44 %.

**00:24 - 00:36**
*   **Entités détectées :** Forteresses bleue et rouge en ruines, jauges de vie, gobelin vert, main virtuelle, projectile de flammes, explosion.
*   **Transitions de scènes :**
    *   00:28 : Nouvelle vue intérieure de la forteresse bleue.
    *   00:32 : Vue sur la forteresse rouge au moment de l'impact.
*   **Actions principales :**
    *   La forteresse bleue est de nouveau touchée, tombant à 31 % de vie.
    *   La main sélectionne le gobelin, déclenchant un tir rectiligne enflammé.
    *   Le tir percute la base de la forteresse rouge, provoquant une violente explosion.

**00:36 - 00:54**
*   **Entités détectées :** Forteresses sévèrement endommagées, jauges de vie, squelette lance-roquettes, main virtuelle, pluie de missiles.
*   **Transitions de scènes :**
    *   00:40 : Dernier passage à l'intérieur de la forteresse bleue.
    *   00:44 : Vue large sur le pilonnage continu de la forteresse rouge.
*   **Actions principales :**
    *   La forteresse bleue reçoit un coup critique, sa santé s'effondre à 17 %.
    *   Le joueur utilise à nouveau le squelette pour un tir en cloche (vers le ciel).
    *   Une pluie dense de roquettes retombe inlassablement sur la forteresse rouge, l'affaiblissant jusqu'à 30 % de santé dans un nuage de fumée et de débris.

**00:54 - 00:57**
*   **Entités détectées :** Logo textuel "CASTLE CLASHERS", bouton interactif "PLAY", illustrations de trois personnages (un gobelin, un chevalier en armure, un elfe archer).
*   **Transitions de scènes :**
    *   00:54 : Transition nette de la séquence de gameplay vers un écran fixe promotionnel (End card).
*   **Actions principales :**
    *   Apparition de l'écran de fin de la publicité, invitant l'utilisateur à télécharger ou à jouer au jeu.
==============================="""
    
    print("Soumission de la charge utile à l'agent d'analyse...\n")
    dictionnaire_resultat = executer_agent(agent_orchestrateur, texte_entree)
    
    # Affichage formaté de la structure de données résultante
    print(json.dumps(dictionnaire_resultat, indent=4, ensure_ascii=False))