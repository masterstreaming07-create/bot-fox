const express = require('express');
const { getLatestMailByEmailAddress } = require('yopmail-helper');

const app = express();

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta el correo" });
  
  const usuario = email.split('@')[0];

  try {
    let codigoEncontrado = null;

    // Solo 4 intentos muy rápidos para no superar los 10 segundos de Vercel
    for (let i = 0; i < 4; i++) {
        let latestMail = null;
        try { latestMail = await getLatestMailByEmailAddress(usuario); } catch(err) {}

        if (latestMail) {
            const correoCrudo = JSON.stringify(latestMail);
            const matchNumeros = correoCrudo.match(/\b\d{6}\b/g);

            if (matchNumeros && matchNumeros.length > 0) {
                codigoEncontrado = matchNumeros[0];
                break;
            }
        }
        if (i < 3) await new Promise(r => setTimeout(r, 2000));
    }

    if (codigoEncontrado) {
        return res.json({ ok: true, code: codigoEncontrado });
    } else {
        return res.json({ ok: false, error: "📭 Aún no llega el correo de Fox. (Solicítalo de nuevo)." });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error en API: " + err.message });
  }
});

module.exports = app;
