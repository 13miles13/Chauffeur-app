require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// --- CONFIG ---
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const TWILIO_PHONE = process.env.TWILIO_PHONE;
const SENDGRID_FROM = process.env.SENDGRID_FROM;
const CHAUFFEUR_PHONE = process.env.CHAUFFEUR_PHONE;
const CHAUFFEUR_EMAIL = process.env.CHAUFFEUR_EMAIL;

// --- ROUTES ---
app.get('/', (req,res)=>{ res.sendFile(path.join(__dirname,'public/index.html')); });

// --- ENVOI SMS ---
app.post('/api/send-sms', async (req,res)=>{
  const { to, message } = req.body;
  try {
    const sms = await client.messages.create({ body: message, from: TWILIO_PHONE, to });
    console.log('SMS envoyé à', to, sms.sid);
    res.json({ success:true });
  } catch(err){
    console.error('Erreur SMS:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- ENVOI EMAIL ---
app.post('/api/send-email', async (req,res)=>{
  const { to, subject, html } = req.body;
  try {
    await sgMail.send({ to, from: SENDGRID_FROM, subject, html });
    console.log('Email envoyé à', to);
    res.json({ success:true });
  } catch(err){
    console.error('Erreur Email:', err.response?.body || err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- ENVOI CONFIRMATION CLIENT + CHAUFFEUR ---
app.post('/api/confirm-course', async (req,res)=>{
  const { nom, prenom, email, phone } = req.body;
  const course = req.body.course;

  if(!nom || !prenom || !email || !phone || !course){
    return res.status(400).json({ error:"Informations manquantes" });
  }

  try {
    // 1️⃣ SMS client
    const smsMessage = `Bonjour ${prenom}, votre course de ${course.depart} à ${course.arrivee} est confirmée. Prix: ${course.prix} €. Un chauffeur vous contactera bientôt.`;
    await client.messages.create({ body: smsMessage, from: TWILIO_PHONE, to: phone });
    console.log('SMS client envoyé à', phone);

    // 2️⃣ Email client
    await sgMail.send({
      to: email,
      from: SENDGRID_FROM,
      subject: "Confirmation de votre course",
      html: `
        Bonjour ${prenom} ${nom},<br>
        Votre course de <strong>${course.depart}</strong> à <strong>${course.arrivee}</strong> est confirmée.<br>
        Distance : ${course.distanceKm.toFixed(1)} km<br>
        Prix : ${course.prix} €<br>
        Heure : ${course.heure}
      `
    });
    console.log('Email client envoyé à', email);

    // 3️⃣ Email chauffeur
    await sgMail.send({
      to: CHAUFFEUR_EMAIL,
      from: SENDGRID_FROM,
      subject: "Nouvelle réservation à prendre en charge",
      html: `
        Nouvelle course à confirmer :<br>
        Client : ${prenom} ${nom}<br>
        Téléphone : ${phone}<br>
        Départ : ${course.depart}<br>
        Arrivée : ${course.arrivee}<br>
        Distance : ${course.distanceKm.toFixed(1)} km<br>
        Prix : ${course.prix} €<br>
        Heure : ${course.heure}
      `
    });
    console.log('Email chauffeur envoyé à', CHAUFFEUR_EMAIL);

    res.json({ success:true });

  } catch(err){
    console.error('Erreur confirmation course:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`✅ Serveur en ligne sur le port ${PORT}`));
