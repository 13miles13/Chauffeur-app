require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Sert index.html et confirmation.html + assets

// --- CONFIG ---
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || 'selimmeguennitani@gmail.com';

sgMail.setApiKey(SENDGRID_API_KEY);
const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// --- ROUTE PRINCIPALE ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- PAGE CONFIRMATION ---
app.get('/confirmation', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','confirmation.html'));
});

// --- SMS ---
app.post('/api/send-sms', async (req, res) => {
  const { to, message } = req.body;
  try {
    if(!to || !message) return res.status(400).json({ error: "Numéro ou message manquant" });
    await client.messages.create({ body: message, from: TWILIO_PHONE, to });
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur SMS:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- EMAIL ---
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    if(!to || !subject || !html) return res.status(400).json({ error: "Données email manquantes" });
    await sgMail.send({ to, from: SENDGRID_FROM, subject, html });
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur email:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- DISTANCE OPTIONNELLE via ORS si futur ---
/*
app.post('/api/distance', async (req,res)=>{
  // Ici si on veut utiliser un vrai service type OpenRouteService
});
*/

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`✅ Serveur en ligne sur le port ${PORT}`));
