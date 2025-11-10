require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIG ---
const { TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE, SENDGRID_API_KEY, SENDGRID_FROM } = process.env;

sgMail.setApiKey(SENDGRID_API_KEY);
const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// --- Validation Middleware ---
function validateFields(requiredFields) {
  return (req, res, next) => {
    for (const field of requiredFields) {
      if (!req.body[field] || typeof req.body[field] !== 'string') {
        return res.status(400).json({ error: `Champ invalide ou manquant: ${field}` });
      }
    }
    next();
  };
}

// --- ROUTE PRINCIPALE ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SMS ---
app.post('/api/send-sms', validateFields(['to', 'message']), async (req, res) => {
  try {
    const { to, message } = req.body;
    await client.messages.create({ body: message, from: TWILIO_PHONE, to });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur Twilio:', err.message);
    res.status(500).json({ error: 'Erreur d\'envoi du SMS.' });
  }
});

// --- EMAIL ---
app.post('/api/send-email', validateFields(['to', 'subject', 'html']), async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    await sgMail.send({ to, from: SENDGRID_FROM, subject, html });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur SendGrid:', err.message);
    res.status(500).json({ error: 'Erreur d\'envoi de l\'email.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur en ligne sur le port ${PORT}`));
