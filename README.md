# Chauffeur App - ready to deploy

## Installer localement
1. Copier `.env.example` en `.env` et remplir les valeurs.
2. `npm install`
3. `npm run dev` (ou `npm start`)

## Déploiement
- Vercel: déposer repo, ajouter les mêmes env variables dans Project > Settings > Environment Variables.
- Render: créer service Node, ajouter les env variables.

## Routes importantes (JSON)
- POST `/api/confirm-course` -> confirme et envoie emails+SMS
- POST `/api/send-email` -> envoi email (pour debug)
- POST `/api/send-sms` -> envoi sms (pour debug)
- GET `/api/test` -> { status: "ok" }
