require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.')); // Sert index.html + assets

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
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SMS ---
app.post('/api/send-sms', async (req, res) => {
  const { to, message } = req.body;
  try {
    await client.messages.create({ body: message, from: TWILIO_PHONE, to });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EMAIL ---
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    await sgMail.send({ to, from: SENDGRID_FROM, subject, html });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur en ligne sur le port ${PORT}`));
