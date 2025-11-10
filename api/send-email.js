// /api/send-email.js
import sgMail from "@sendgrid/mail";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { to, subject, html, chauffeurInfo } = req.body;

    // Configuration SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // --- Envoi email au client ---
    const msgClient = {
      to,
      from: "contact@chauffeur-prive.fr", // ton email d’envoi vérifié SendGrid
      subject,
      html,
    };

    // --- Envoi email au chauffeur ---
    const msgChauffeur = {
      to: "selimmeguennitani@gmail.com", // <== ton email chauffeur
      from: "contact@chauffeur-prive.fr",
      subject: "🆕 Nouvelle réservation client",
      html: `
        <h3>Nouvelle course réservée</h3>
        <p><strong>Nom :</strong> ${chauffeurInfo?.nom} ${chauffeurInfo?.prenom}</p>
        <p><strong>Email :</strong> ${chauffeurInfo?.email}</p>
        <p><strong>Téléphone :</strong> ${chauffeurInfo?.phone}</p>
        <hr>
        <p><strong>Départ :</strong> ${chauffeurInfo?.depart}</p>
        <p><strong>Arrivée :</strong> ${chauffeurInfo?.arrivee}</p>
        <p><strong>Distance :</strong> ${chauffeurInfo?.distanceKm} km</p>
        <p><strong>Prix :</strong> ${chauffeurInfo?.prix} €</p>
        <p><strong>Heure :</strong> ${chauffeurInfo?.heure}</p>
      `,
    };

    // Envoi simultané
    await Promise.all([sgMail.send(msgClient), sgMail.send(msgChauffeur)]);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erreur SendGrid:", err);
    res.status(500).json({ error: "Erreur d’envoi d’email" });
  }
}
