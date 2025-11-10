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

// --- CONFIGURATION SENDGRID ---
if (!process.env.SENDGRID_API_KEY) {
  console.error("❌ Erreur : clé SENDGRID_API_KEY manquante !");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CONFIGURATION TWILIO ---
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

// === ROUTE CONFIRMATION DE COURSE ===
app.post("/api/confirm-course", async (req, res) => {
  try {
    const { nom, prenom, email, phone, course } = req.body;
    if (!nom || !prenom || !email || !phone || !course) {
      return res
        .status(400)
        .json({ error: "Champs manquants dans la requête" });
    }

    // --- Message HTML pour le client ---
    const htmlClient = `
      <h3>Bonjour ${prenom} ${nom},</h3>
      <p>Votre course est confirmée ✅</p>
      <p><strong>Départ :</strong> ${course.depart}</p>
      <p><strong>Arrivée :</strong> ${course.arrivee}</p>
      <p><strong>Distance :</strong> ${course.distanceKm.toFixed(1)} km</p>
      <p><strong>Prix :</strong> ${course.prix} €</p>
      <p><strong>Heure :</strong> ${course.heure}</p>
      <p>Un chauffeur vous contactera très bientôt.<br>Merci d'avoir réservé sur <strong>Chauffeur Privé</strong>.</p>
    `;

    // --- Envoi email au client ---
    await sgMail.send({
      to: email,
      from: "contact@chauffeur-prive.fr", // ⚠️ Email vérifié sur SendGrid
      subject: "Confirmation de votre course - Chauffeur Privé",
      html: htmlClient,
    });

    // --- Envoi email au chauffeur (toi) ---
    await sgMail.send({
      to: "selimmeguennitani@gmail.com",
      from: "contact@chauffeur-prive.fr",
      subject: "🚗 Nouvelle réservation confirmée",
      html: `
        <h3>Nouvelle course confirmée</h3>
        <p><strong>Client :</strong> ${prenom} ${nom}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Téléphone :</strong> ${phone}</p>
        <p><strong>Départ :</strong> ${course.depart}</p>
        <p><strong>Arrivée :</strong> ${course.arrivee}</p>
        <p><strong>Distance :</strong> ${course.distanceKm.toFixed(1)} km</p>
        <p><strong>Prix :</strong> ${course.prix} €</p>
        <p><strong>Heure :</strong> ${course.heure}</p>
      `,
    });

    // --- Envoi du SMS au client ---
    if (twilioClient) {
      await twilioClient.messages.create({
        from: TWILIO_PHONE,
        to: phone,
        body: `Bonjour ${prenom}, votre course de ${course.depart} à ${course.arrivee} est confirmée. Prix: ${course.prix} €. Un chauffeur vous contactera bientôt.`,
      });
    }

    console.log(`✅ Confirmation envoyée à ${email} et SMS à ${phone}`);
    res.setHeader("Content-Type", "application/json");
    res.json({
      success: true,
      message: "Emails et SMS envoyés avec succès",
    });
  } catch (err) {
    console.error("Erreur /api/confirm-course :", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erreur lors de la confirmation",
    });
  }
});

// === ROUTE DE SECOURS (404) ===
app.use((req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur en ligne sur le port ${PORT}`));
