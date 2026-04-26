#!/bin/bash

# 1. Vérification : un argument a-t-il été fourni ?
if [ -z "$1" ]; then
    echo "Erreur : Tu dois spécifier un dossier."
    echo "Utilisation : $0 <nom_du_dossier>"
    exit 1
fi

DOSSIER_CIBLE="$1"

# 2. Vérification : le dossier existe-t-il ?
if [ ! -d "$DOSSIER_CIBLE" ]; then
    echo "Erreur : Le dossier '$DOSSIER_CIBLE' n'existe pas."
    exit 1
fi

# 3. Préparation du nom de fichier de sortie
# On récupère le nom propre du dossier (sans les chemins ou slashs finaux)
nom_propre=$(basename "$DOSSIER_CIBLE")
OUTPUT="analyse_${nom_propre}.md"

# On vide/crée le fichier final
> "$OUTPUT"

echo "Recherche des fichiers JS dans '$DOSSIER_CIBLE'..."

# 4. Recherche des fichiers JS
fichiers_js=$(find "$DOSSIER_CIBLE" -type f -name "*.js")

# S'il n'y a pas de fichiers JS, on annule proprement
if [ -z "$fichiers_js" ]; then
    echo "Aucun fichier .js n'a été trouvé dans '$DOSSIER_CIBLE'."
    rm "$OUTPUT" # On supprime le fichier vide créé
    exit 0
fi

# 5. Écriture de l'en-tête
echo "# ==========================================" >> "$OUTPUT"
echo "# DOSSIER : $nom_propre" >> "$OUTPUT"
echo "# ==========================================" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# 6. Extraction et formatage du code
for fichier in $fichiers_js; do
    echo " -> Ajout de : $fichier"
    echo "## Fichier : $fichier" >> "$OUTPUT"
    echo '```javascript' >> "$OUTPUT"
    cat "$fichier" >> "$OUTPUT"
    echo -e '\n```\n' >> "$OUTPUT"
done

echo "✅ Extraction terminée ! Ton code est prêt dans le fichier '$OUTPUT'."