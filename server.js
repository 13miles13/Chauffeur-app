import express from "express";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import twilio from "twilio";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- CONFIG SENDGRID ---
if (!process.env.SENDGRID_API_KEY) {
  console.error("❌ Erreur : SENDGRID_API_KEY manquant !");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CONFIG TWILIO ---
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
if (TWILIO_SID && TWILIO_TOKEN) {
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
} else {
  console.warn("⚠️ Twilio désactivé (variables manquantes)");
}

// === ROUTE TEST ===
app.get("/api/test", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({ status: "ok", message: "API fonctionnelle ✅" });
});

// === ROUTE ENVOI EMAIL ===
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    const msg = {
      to,
      from: "contact@chauffeur-prive.fr", // ⚠️ ton email SendGrid vérifié
      subject,
      html,
    };

    await sgMail.send(msg);

    console.log(`📧 Email envoyé à ${to}`);
    res.setHeader("Content-Type", "application/json");
    res.json({ success: true, message: "Email envoyé" });
  } catch (err) {
    console.error("Erreur SendGrid:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Erreur envoi email" });
  }
});

// === ROUTE ENVOI SMS ===
app.post("/api/send-sms", async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({ error: "Twilio non configuré" });
    }

    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "Numéro ou message manquant" });
    }

    const msg = await twilioClient.messages.create({
      from: TWILIO_PHONE,
      to,
      body: message,
    });

    console.log(`📱 SMS envoyé à ${to}`);
    res.setHeader("Content-Type", "application/json");
    res.json({ success: true, sid: msg.sid });
  } catch (err) {
    console.error("Erreur Twilio:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Erreur envoi SMS" });
  }
});

// === CATCH ALL (pour Vercel ou Render) ===
app.use((req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur actif sur le port ${PORT}`));
