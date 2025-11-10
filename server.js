require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// --- CONFIG ---
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE;

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || 'noreply@chauffeur-prive.fr';

const CHAUFFEUR_PHONE = process.env.CHAUFFEUR_PHONE; // optionnel si on veut SMS
const CHAUFFEUR_EMAIL = process.env.CHAUFFEUR_EMAIL;

sgMail.setApiKey(SENDGRID_API_KEY);
const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// --- ROUTES ---
app.get('/', (req,res)=>{ res.sendFile(path.join(__dirname,'public/index.html')); });
app.get('/confirmation.html', (req,res)=>{ res.sendFile(path.join(__dirname,'public/confirmation.html')); });

// --- CONFIRMATION COURSE ---
app.post('/api/confirm-course', async (req,res)=>{
    const { nom, prenom, emailClient, phoneClient } = req.body;
    const course = req.body.course; // depart, arrivee, distanceKm, prix, heure

    if(!nom || !prenom || !emailClient || !phoneClient || !course){
        return res.status(400).json({ error: "Champs manquants" });
    }

    try {
        // 1️⃣ Envoi email client
        await sgMail.send({
            to: emailClient,
            from: SENDGRID_FROM,
            subject: "Confirmation de votre course",
            html: `
                Bonjour ${prenom} ${nom},<br><br>
                Votre course de <strong>${course.depart}</strong> à <strong>${course.arrivee}</strong> est confirmée.<br>
                Distance : ${course.distanceKm.toFixed(1)} km<br>
                Prix : ${course.prix} €<br>
                Heure : ${course.heure}<br><br>
                ✅ Un chauffeur vous contactera dans un instant, restez proche de votre téléphone.
            `
        });

        // 2️⃣ Envoi SMS client
        await client.messages.create({
            body: `Bonjour ${prenom}, votre course de ${course.depart} à ${course.arrivee} est confirmée. Prix: ${course.prix} €. Un chauffeur vous contactera bientôt.`,
            from: TWILIO_PHONE,
            to: phoneClient
        });

        // 3️⃣ Envoi email chauffeur
        await sgMail.send({
            to: CHAUFFEUR_EMAIL,
            from: SENDGRID_FROM,
            subject: "Nouvelle réservation",
            html: `
                Nouvelle course réservée :<br>
                Client : ${prenom} ${nom}<br>
                Email : ${emailClient}<br>
                Téléphone : ${phoneClient}<br>
                Départ : ${course.depart}<br>
                Arrivée : ${course.arrivee}<br>
                Distance : ${course.distanceKm.toFixed(1)} km<br>
                Prix : ${course.prix} €<br>
                Heure : ${course.heure}
            `
        });

        res.json({ success:true });

    } catch(err){
        console.error("Erreur confirmation:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`✅ Serveur en ligne sur le port ${PORT}`));
