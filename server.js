const express = require('express');
const { getLatestMailByEmailAddress } = require('yopmail-helper');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta el correo" });
  
  const usuario = email.split('@')[0];

  try {
    // Aumentamos a 6 intentos (24 segundos de paciencia)
    for (let i = 0; i < 6; i++) { 
        let latestMail = null;
        try {
            latestMail = await getLatestMailByEmailAddress(usuario);
        } catch(err) {
            // Si Yopmail bloquea la API con Cloudflare, lo atrapamos aquí
            if (i === 5) return res.json({ ok: false, error: "⛔ Bloqueo de API Yopmail: " + err.message });
        }

        if (latestMail) {
            const correoCrudo = JSON.stringify(latestMail);

            // Si es el mensaje por defecto de Yopmail, lo ignoramos y seguimos esperando
            if (correoCrudo.includes("Bienvenido a YOPmail") || correoCrudo.includes("Welcome to YOPmail")) {
                await new Promise(r => setTimeout(r, 4000));
                continue;
            }

            // Buscamos de 4 a 8 dígitos por si Fox cambió el formato
            const matchNumeros = correoCrudo.match(/\b\d{4,8}\b/g);
            if (matchNumeros) {
                const candidatos = matchNumeros.filter(n => !["2023", "2024", "2025", "2026", "2027"].includes(n));
                if (candidatos.length > 0) {
                    return res.json({ ok: true, code: candidatos[0] });
                }
            }

            // Si llegó un correo de Fox pero no sacó los números, mostramos el texto crudo para verlo
            return res.json({ ok: false, error: "👁️ Correo detectado sin código: " + correoCrudo.substring(0, 100) });
        }

        if (i < 5) await new Promise(r => setTimeout(r, 4000));
    }

    // Si pasaron los 24 segundos y la API siempre devolvió vacío
    return res.json({ ok: false, error: "📭 Bandeja totalmente vacía tras 24 segundos. El correo no ha llegado." });

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error interno del servidor: " + err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor Fox corriendo en puerto ${PORT}`));
