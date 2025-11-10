require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(express.static('public'));

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.post('/api/confirmation', async (req, res) => {
  const { to, email, depart, arrivee, prix } = req.body;
  const message = `Votre course de ${depart} à ${arrivee} est confirmée.\nPrix estimé: ${prix} €`;
  
  try {
    if (to) await client.messages.create({ body: message, from: process.env.TWILIO_PHONE, to });
    if (email) await sgMail.send({ to: email, from: process.env.SENDGRID_FROM, subject: "Confirmation de course", text: message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur en ligne sur le port ${PORT}`));
