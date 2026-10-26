# 📸 Guide d'Utilisation - Photo Cérémonie

Bienvenue sur votre plateforme personnalisée de gestion et de partage d'albums de cérémonies avec **reconnaissance faciale automatique par selfie** et **téléchargement haute définition**.

---

## ⚡ 1. Démarrer l'application en 1 clic

Pour lancer la plateforme sur votre ordinateur :
1. Rendez-vous dans le dossier :
   `C:\Users\GAMING MSI\.gemini\antigravity\scratch\photo-ceremonie`
2. Double-cliquez sur le fichier :
   👉 **`demarrer.bat`**
3. Votre navigateur s'ouvrira automatiquement à l'adresse :
   🌐 **`http://localhost:8000`**

---

## 🛠️ 2. Comment utiliser la plateforme (Côté Photographe)

### Étape 1 : Créer une cérémonie
1. Cliquez sur le bouton **"Nouvelle Cérémonie"** en haut à droite.
2. Entrez le nom de l'événement (ex: *Mariage de Sarah & Thomas*, *Gala des Lauréats 2026*, etc.).
3. Ajoutez la date, le lieu et éventuellement un code PIN secret si vous souhaitez restreindre l'accès.
4. Cliquez sur **"Créer l'album"**.

### Étape 2 : Téléverser vos photos
1. Cliquez sur **"Uploader photos"** sur la carte de la cérémonie.
2. Glissez-déposez l'ensemble de vos photos retouchées (JPG ou PNG).
3. Cliquez sur **"Lancer le traitement"** :
   - Le moteur d'intelligence artificielle (exécuté 100 % sur votre machine en local, sans coût de serveur) analyse chaque cliché.
   - Il génère des vignettes Web ultra-légères pour un chargement instantané sur mobile.
   - Il conserve vos photos originales en pleine résolution pour les téléchargements HD.
   - Il enregistre l'empreinte mathématique de chaque visage détecté.

### Étape 3 : Partager avec les invités
1. Cliquez sur l'icône **QR Code** sur la cérémonie.
2. Vous avez deux options :
   - **Copier le lien direct** pour l'envoyer par WhatsApp, SMS ou email.
   - **Afficher / Imprimer le QR Code** pour le disposer sur les tables, le photocall ou le panneau d'accueil de la salle.

---

## 🤳 3. Ce que voient les invités (L'expérience magique)

1. **Arrivée sur la page** : L'invité scanne le QR code ou clique sur le lien depuis son smartphone.
2. **Recherche instantanée** :
   - Il clique sur **"Prendre un selfie"** : sa caméra s'ouvre avec un guide d'alignement de visage.
   - Ou il clique sur **"Choisir une photo"** s'il a déjà une photo de lui dans sa galerie.
3. **Résultat en moins d'une seconde** :
   - Une pluie de confettis s'affiche ! 🎉
   - La galerie affiche uniquement les photos où son visage apparaît, avec le pourcentage de ressemblance (ex: *98% de ressemblance*).
4. **Téléchargement HD** :
   - Il peut cliquer sur une photo pour la visionner en plein écran et la télécharger.
   - Ou cliquer sur **"Tout télécharger en HD (.ZIP)"** pour obtenir d'un coup toutes ses photos en qualité originale.
5. **Galerie générale (Optionnel)** :
   - Un bouton discret permet aussi d'explorer toutes les photos d'ambiance de la cérémonie s'il le souhaite.

---

## 🔒 4. Vie privée & Sécurité (RGPD)

- Le selfie pris par l'invité sert **uniquement** à extraire son empreinte faciale en mémoire pour filtrer la galerie.
- Le selfie de l'invité n'est **jamais stocké** sur votre disque ni partagé.
- Vos données et vos photos restent sous votre contrôle exclusif.

---

## 🌐 5. Comment partager sur Internet (En dehors de chez vous)

Actuellement, l'application tourne en local sur votre machine. Pour la rendre accessible aux invités partout dans le monde via Internet :
- **Option 1 (Gratuite & Immédiate avec Tunnel)** : Utiliser un outil gratuit comme **Cloudflare Tunnel** ou **ngrok** pour générer un lien public sécurisé (`https://mariage-sarah.ton-domaine.com`) pointant directement sur votre machine.
- **Option 2 (Hébergement Cloud Gratuit)** : Déployer le backend sur un service gratuit comme Render / Railway et stocker les photos sur **Cloudflare R2** (10 Go gratuits, 0 € de frais de téléchargement).
