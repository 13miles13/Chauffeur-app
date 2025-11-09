require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Sert index.html

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/reserver', async (req, res) => {
  const { n, t, e, d, a, date, p, prix } = req.body;
  try {
    await client.messages.create({
      body: `Réservation: ${d}→${a} ${date} ${prix}€`,
      from: process.env.TWILIO_PHONE,
      to: t
    });
    await sgMail.send({
      to: e,
      from: process.env.SENDGRID_FROM,
      subject: 'Confirmation Chauffeur',
      html: `<p>Réservation confirmée: ${d}→${a}, ${prix}€</p>`
    });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
