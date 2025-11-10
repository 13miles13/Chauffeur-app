// api/send-email.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { clientEmail, clientName, depart, arrivee, distance, prix } = req.body;

  if (!clientEmail || !depart || !arrivee || !prix) {
    return res.status(400).json({ error: "Informations manquantes" });
  }

  try {
    // Message au client
    const clientMsg = {
      to: clientEmail,
      from: "no-reply@votre-site.com", // remplace par ton adresse validée sur SendGrid
      subject: "Confirmation de votre réservation",
      html: `
        <h2>Votre réservation a bien été confirmée ✅</h2>
        <p><strong>Départ :</strong> ${depart}</p>
        <p><strong>Arrivée :</strong> ${arrivee}</p>
        <p><strong>Distance :</strong> ${distance} km</p>
        <p><strong>Prix total :</strong> ${prix} €</p>
        <br>
        <p>Un chauffeur va bientôt vous contacter. 📱</p>
        <p style="font-style: italic;">Merci de votre confiance !</p>
      `,
    };

    // Message au chauffeur
    const chauffeurMsg = {
      to: "selimmeguennitani@gmail.com",
      from: "no-reply@votre-site.com",
      subject: "Nouvelle réservation reçue 🚗",
      html: `
        <h2>Nouvelle réservation client</h2>
        <p><strong>Nom :</strong> ${clientName || "Inconnu"}</p>
        <p><strong>Email :</strong> ${clientEmail}</p>
        <p><strong>Départ :</strong> ${depart}</p>
        <p><strong>Arrivée :</strong> ${arrivee}</p>
        <p><strong>Distance :</strong> ${distance} km</p>
        <p><strong>Prix estimé :</strong> ${prix} €</p>
      `,
    };

    // Envoi simultané des deux emails
    await sgMail.send(clientMsg);
    await sgMail.send(chauffeurMsg);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erreur d'envoi d'email:", error);
    res.status(500).json({ error: "Erreur d'envoi d'email" });
  }
}
