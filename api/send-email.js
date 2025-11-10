// /api/send-email.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { to, subject, html } = req.body;

    // Configure ton transporteur SMTP Brevo (ou Gmail, si tu veux)
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com", // ou smtp.gmail.com
      port: 587,
      auth: {
        user: "TON_EMAIL_BREVO", // remplace par ton email Brevo
        pass: "TA_CLE_API_BREVO", // clé API Brevo (dans ton compte)
      },
    });

    await transporter.sendMail({
      from: "contact@chauffeur-prive.fr",
      to,
      subject,
      html,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erreur envoi email :", err);
    res.status(500).json({ error: "Erreur envoi email" });
  }
}
