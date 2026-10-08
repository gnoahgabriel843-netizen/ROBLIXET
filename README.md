# Battle Royale — serveur multijoueur

Ce dossier contient un serveur qui héberge le jeu ET relaie les joueurs en temps réel.
Il fonctionne sans Claude.

## Lancer en local
    npm install
    npm start
Ouvre http://localhost:3000 (sur d'autres appareils : http://IP-DE-TON-PC:3000).

## Mettre en ligne (gratuit, exemple Render.com)
1. Mets ce dossier sur GitHub.
2. Sur render.com : New → Web Service → choisis ton dépôt.
3. Build Command : `npm install` — Start Command : `npm start`.
4. Ouvre l'adresse fournie (https://xxx.onrender.com) : le jeu est servi et le multijoueur se connecte tout seul.
(Fly.io, Railway, Glitch ou un VPS marchent aussi.)

## Utilisation
Lobby → Multijoueur → « Partie rapide » : si personne d'autre n'est là après 10 s, la partie démarre avec des bots.
« Créer une salle » donne un code à partager. Le premier arrivé lance la partie.
