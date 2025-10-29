# Odace Archives - Gestionnaire de fichiers GCS

Interface de gestion de fichiers pour Google Cloud Storage avec un style Le Corbusier 70s brutalist.

## Fonctionnalités

- **Upload direct vers GCS** - Supporte fichiers de toutes tailles (même 30GB+) sans passer par le serveur
- **Upload parallèle** - 5 fichiers en simultané pour vitesse maximale (5x plus rapide)
- **Protection anti-écrasement** - Renomme automatiquement si fichier existe (ex: photo.jpg → photo (1).jpg)
- Authentification sécurisée
- Upload de fichiers par drag & drop ou sélection
- Upload de dossiers complets avec structure préservée
- Gestion de dossiers (création, navigation, suppression)
- Téléchargement de fichiers
- Renommage de fichiers
- Suppression de fichiers/dossiers
- Affichage des tailles de fichiers et dossiers
- Barre de progression avec vitesse d'upload et temps restant
- Logs serveur consultables
- Affichage du poids total du bucket
- Interface responsive en style Le Corbusier 70s brutalist

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
- **Upload :** Direct vers GCS via URLs signées (bypass serveur)
- **Style :** Le Corbusier 70s brutalist (bordures épaisses, couleurs chaudes, ombres dures)
- **Authentification :** Sessions Express
- **Storage :** Google Cloud Storage (classe Archives)
- **Hébergement :** Render (Starter plan)

## Sécurité

- Authentification obligatoire pour toutes les opérations
- Credentials stockés dans `.env` (ne pas commiter)
- Sessions serveur avec cookies
- URLs signées GCS avec expiration (1 heure)
- Aucune limite de taille de fichier (gérée par GCS)
- Protection automatique contre écrasement de fichiers

## Développement

Pour modifier le style, éditez `public/style.css`.
Pour ajouter des fonctionnalités, modifiez `server.js` (backend) et `public/app.js` (frontend).

---

Développé pour Odace Production
