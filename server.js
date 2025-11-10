// server.js (ESM)
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import twilio from "twilio";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Config SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY missing");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const SENDGRID_FROM = process.env.SENDGRID_FROM || "contact@chauffeur-prive.fr";

// Config Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (e) {
    console.error("Twilio init error:", e.message);
  }
} else {
  console.warn("⚠️ Twilio not configured (env vars missing)");
}

// Chauffeur contact
const CHAUFFEUR_EMAIL = process.env.CHAUFFEUR_EMAIL || "selimmeguennitani@gmail.com";
const CHAUFFEUR_PHONE = process.env.CHAUFFEUR_PHONE || "+33763133397";

// Helper for JSON error responses + logging
function handleError(res, where, err) {
  console.error(where, err);
  const message = err?.message || String(err);
  res.status(500).json({ success: false, where, error: message });
}

// Test route
app.get("/api/test", (req, res) => {
  res.json({ status: "ok", message: "API fonctionnelle ✅" });
});

// Debug routes (send-email, send-sms)
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) return res.status(400).json({ error: "to/subject/html required" });

    const msg = { to, from: SENDGRID_FROM, subject, html };
    const result = await sgMail.send(msg);
    console.log("Email sent to", to);
    res.json({ success: true, result: "sent" });
  } catch (err) {
    handleError(res, "/api/send-email", err);
  }
});

app.post("/api/send-sms", async (req, res) => {
  try {
    if (!twilioClient) return res.status(500).json({ error: "Twilio not configured" });
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: "to/message required" });
    const sent = await twilioClient.messages.create({ from: TWILIO_PHONE_NUMBER, to, body: message });
    console.log("SMS sent to", to, sent.sid);
    res.json({ success: true, sid: sent.sid });
  } catch (err) {
    handleError(res, "/api/send-sms", err);
  }
});

// Main confirmation route (client + chauffeur + sms)
app.post("/api/confirm-course", async (req, res) => {
  try {
    const { nom, prenom, emailClient, phoneClient, course } = req.body;
    if (!nom || !prenom || !emailClient || !phoneClient || !course) {
      return res.status(400).json({ error: "nom/prenom/emailClient/phoneClient/course required" });
    }

    // Prepare email to client
    const htmlClient = `
      <h3>Bonjour ${prenom} ${nom},</h3>
      <p>Votre course est confirmée ✅</p>
      <p><strong>Départ :</strong> ${course.depart}</p>
      <p><strong>Arrivée :</strong> ${course.arrivee}</p>
      <p><strong>Distance :</strong> ${Number(course.distanceKm).toFixed(1)} km</p>
      <p><strong>Prix :</strong> ${course.prix} €</p>
      <p><strong>Heure :</strong> ${course.heure}</p>
      <p>Un chauffeur vous contactera très bientôt.</p>
    `;

    // Send email to client
    try {
      await sgMail.send({ to: emailClient, from: SENDGRID_FROM, subject: "Confirmation de votre course", html: htmlClient });
      console.log("Email client sent:", emailClient);
    } catch (e) {
      console.error("SendGrid error (client):", e);
      // we don't stop: collect error and continue
      // but return detailed error at end if everything fails
    }

    // Email to chauffeur
    const htmlChauffeur = `
      <h3>Nouvelle réservation</h3>
      <p><strong>Client :</strong> ${prenom} ${nom}</p>
      <p><strong>Email :</strong> ${emailClient}</p>
      <p><strong>Téléphone :</strong> ${phoneClient}</p>
      <p><strong>Départ :</strong> ${course.depart}</p>
      <p><strong>Arrivée :</strong> ${course.arrivee}</p>
      <p><strong>Distance :</strong> ${Number(course.distanceKm).toFixed(1)} km</p>
      <p><strong>Prix :</strong> ${course.prix} €</p>
      <p><strong>Heure :</strong> ${course.heure}</p>
    `;
    try {
      await sgMail.send({ to: CHAUFFEUR_EMAIL, from: SENDGRID_FROM, subject: "🚗 Nouvelle réservation", html: htmlChauffeur });
      console.log("Email chauffeur sent to", CHAUFFEUR_EMAIL);
    } catch (e) {
      console.error("SendGrid error (chauffeur):", e);
    }

    // SMS to client
    let smsResult = null;
    if (twilioClient) {
      try {
        smsResult = await twilioClient.messages.create({
          from: TWILIO_PHONE_NUMBER,
          to: phoneClient,
          body: `Bonjour ${prenom}, votre course de ${course.depart} à ${course.arrivee} est confirmée. Prix: ${course.prix} €. Un chauffeur vous contactera bientôt.`
        });
        console.log("SMS client sent:", smsResult.sid);
      } catch (e) {
        console.error("Twilio error:", e);
      }
    } else {
      console.warn("Twilio client not initialized - no SMS sent");
    }

    // respond success (we tried all, if some failed, logs show it)
    res.json({
      success: true,
      note: "Attempted to send emails and sms; check server logs for any provider errors",
      smsSid: smsResult?.sid || null
    });
  } catch (err) {
    handleError(res, "/api/confirm-course", err);
  }
});

// Fallback for unknown routes -> JSON
app.use((req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
