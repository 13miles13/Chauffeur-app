require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

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
  const message = `🚗 Votre course de ${depart} à ${arrivee} est confirmée.\nPrix estimé: ${prix} €`;

  try {
    // SMS client
    if (to) await client.messages.create({ body: message, from: process.env.TWILIO_PHONE, to });

    // Email client
    if (email) await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM,
      subject: "Confirmation de votre course",
      text: message
    });

    // Email chauffeur
    await sgMail.send({
      to: process.env.CHAUFFEUR_EMAIL,
      from: process.env.SENDGRID_FROM,
      subject: "Nouvelle réservation",
      text: `📍 Nouveau client : ${email || to}\nDépart : ${depart}\nArrivée : ${arrivee}\nPrix estimé : ${prix} €`
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur en ligne sur le port ${PORT}`));
