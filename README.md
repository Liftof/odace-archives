# Odace Archives - Gestionnaire de fichiers GCS

Interface de gestion de fichiers pour Google Cloud Storage avec un style néobrutalism.

## Fonctionnalités

- Authentification sécurisée
- Upload de fichiers par drag & drop ou sélection
- Gestion de dossiers (création, navigation, suppression)
- Téléchargement de fichiers
- Renommage de fichiers
- Suppression de fichiers/dossiers
- Affichage des tailles de fichiers
- Interface responsive en style néobrutalism

## Prérequis

- Node.js (>=14)
- Compte Google Cloud Storage
- Bucket GCS configuré en classe Archives

## Installation

1. Les dépendances sont déjà installées. Si besoin, réinstallez :
   ```bash
   npm install
   ```

2. Le fichier `.env` est déjà configuré avec vos credentials

## Démarrage

Démarrez le serveur :
```bash
npm start
```

Ou en mode développement (avec rechargement automatique) :
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3001`

## Connexion

**Email :** admin@odace.media
**Mot de passe :** Audeac32025-@25CM

## Utilisation

1. Connectez-vous avec les identifiants fournis
2. Glissez-déposez des fichiers dans la zone prévue ou cliquez sur "Upload fichier"
3. Créez des dossiers avec le bouton "Nouveau dossier"
4. Naviguez dans les dossiers en cliquant dessus
5. Téléchargez, renommez ou supprimez des fichiers via les boutons d'action

## Structure du projet

```
.
├── server.js           # Serveur Express + API GCS
├── .env                # Configuration et credentials
├── package.json        # Dépendances npm
└── public/
    ├── index.html      # Interface HTML
    ├── style.css       # Styles néobrutalism
    └── app.js          # Logique frontend
```

## Architecture

- **Backend :** Node.js + Express + Google Cloud Storage SDK
- **Frontend :** HTML/CSS/JavaScript vanilla
- **Style :** Néobrutalism (bordures épaisses, couleurs vives, ombres dures)
- **Authentification :** Sessions Express
- **Storage :** Google Cloud Storage (classe Archives)

## Sécurité

- Authentification obligatoire pour toutes les opérations
- Credentials stockés dans `.env` (ne pas commiter)
- Sessions serveur avec cookies
- Upload limité à 5GB par fichier

## Développement

Pour modifier le style, éditez `public/style.css`.
Pour ajouter des fonctionnalités, modifiez `server.js` (backend) et `public/app.js` (frontend).

---

Développé pour Odace Production
