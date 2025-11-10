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

const CHAUFFEUR_PHONE = process.env.CHAUFFEUR_PHONE;
const CHAUFFEUR_EMAIL = process.env.CHAUFFEUR_EMAIL;

sgMail.setApiKey(SENDGRID_API_KEY);
const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// --- ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/confirmation.html', (req, res) => res.sendFile(path.join(__dirname, 'public/confirmation.html')));

// --- ENVOI SMS ---
app.post('/api/send-sms', async (req, res) => {
  const { to, message } = req.body;
  try {
    const sms = await client.messages.create({ body: message, from: TWILIO_PHONE, to });
    console.log('SMS envoyé à', to, sms.sid);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur SMS:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- ENVOI EMAIL ---
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    await sgMail.send({ to, from: SENDGRID_FROM, subject, html });
    console.log('Email envoyé à', to);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur Email:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- CONFIRMATION COURSE ---
app.post('/api/confirm-course', async (req, res) => {
  const { nom, prenom, emailClient, phoneClient, course } = req.body;

  if (!nom || !prenom || !emailClient || !phoneClient || !course) {
    return res.status(400).json({ error: 'Informations manquantes' });
  }

  try {
    // Email client
    const htmlClient = `
      Bonjour ${prenom} ${nom},<br>
      Votre course de <strong>${course.depart}</strong> à <strong>${course.arrivee}</strong> est confirmée.<br>
      Distance : ${course.distanceKm.toFixed(1)} km<br>
      Prix : ${course.prix} €<br>
      Heure : ${course.heure}<br>
      📱 Un chauffeur vous contactera dans un instant.
    `;
    await sgMail.send({ to: emailClient, from: SENDGRID_FROM, subject: 'Confirmation de votre course', html: htmlClient });
    console.log('Email client envoyé à', emailClient);

    // Email chauffeur
    const htmlChauffeur = `
      Nouvelle course à confirmer :<br>
      Client : ${prenom} ${nom}<br>
      Téléphone : ${phoneClient}<br>
      Email : ${emailClient}<br>
      Départ : ${course.depart}<br>
      Arrivée : ${course.arrivee}<br>
      Distance : ${course.distanceKm.toFixed(1)} km<br>
      Prix : ${course.prix} €<br>
      Heure : ${course.heure}
    `;
    await sgMail.send({ to: CHAUFFEUR_EMAIL, from: SENDGRID_FROM, subject: 'Nouvelle course à effectuer', html: htmlChauffeur });
    console.log('Email chauffeur envoyé à', CHAUFFEUR_EMAIL);

    // SMS client
    const smsMessage = `Bonjour ${prenom}, votre course de ${course.depart} à ${course.arrivee} est confirmée. Prix: ${course.prix} €. Un chauffeur vous contactera bientôt.`;
    await client.messages.create({ body: smsMessage, from: TWILIO_PHONE, to: phoneClient });
    console.log('SMS client envoyé à', phoneClient);

    res.json({ success: true });

  } catch (err) {
    console.error('Erreur confirmation course :', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur en ligne sur le port ${PORT}`));
