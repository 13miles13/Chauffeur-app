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
app.get('/', (req,res)=>{ res.sendFile(path.join(__dirname,'public/index.html')); });

// --- SMS ---
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

// --- EMAIL ---
app.post('/api/send-email', async (req,res)=>{
  const { to, subject, html } = req.body;
  try {
    const email = await sgMail.send({ to, from: SENDGRID_FROM, subject, html });
    console.log('Email envoyé à', to);
    res.json({ success:true });
  } catch(err){
    console.error('Erreur Email:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`✅ Serveur en ligne sur le port ${PORT}`));
