import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import fetch from "node-fetch";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(express.static("public"));

// --- CONFIG ---
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || "selimmeguennitani@gmail.com";
const ORS_API_KEY = process.env.ORS_API_KEY;

sgMail.setApiKey(SENDGRID_API_KEY);
const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// --- ROUTE ACCUEIL ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- ROUTE API DISTANCE (via OpenRouteService) ---
app.post("/api/distance", async (req, res) => {
  try {
    const { coords } = req.body;
    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ORS_API_KEY
      },
      body: JSON.stringify({ coordinates: coords })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Erreur distance:", err);
    res.status(500).json({ error: "Erreur lors du calcul de la distance." });
  }
});

// --- ROUTE SMS ---
app.post("/api/send-sms", async (req, res) => {
  const { to, message } = req.body;
  try {
    await client.messages.create({ body: message, from: TWILIO_PHONE, to });
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur SMS:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTE EMAIL ---
app.post("/api/send-email", async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    await sgMail.send({ to, from: SENDGRID_FROM, subject, html });
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur email:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur en ligne sur le port ${PORT}`));
