const express = require('express');
const { getLatestMailByEmailAddress } = require('yopmail-helper');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta el correo" });
  
  const usuario = email.split('@')[0];

  try {
    let codigoEncontrado = null;
    let correoCrudo = "";

    // Bucle de 5 intentos esperando a que Fox envíe el correo
    for (let i = 0; i < 5; i++) {
        let latestMail = null;
        try { latestMail = await getLatestMailByEmailAddress(usuario); } catch(err) {}

        if (latestMail) {
            // Convertimos TODO el objeto del correo a texto puro
            correoCrudo = JSON.stringify(latestMail);

            // Si es el correo de bienvenida de Yopmail, lo ignoramos
            if (correoCrudo.toLowerCase().includes("yopmail")) {
                await new Promise(r => setTimeout(r, 4000));
                continue;
            }

            // CAZADOR EXACTO: Buscamos 6 números juntos en cualquier parte del código
            const matchNumeros = correoCrudo.match(/\b\d{6}\b/g);

            if (matchNumeros && matchNumeros.length > 0) {
                codigoEncontrado = matchNumeros[0];
                break;
            }
        }
        
        if (i < 4) await new Promise(r => setTimeout(r, 4000));
    }

    if (codigoEncontrado) {
        return res.json({ ok: true, code: codigoEncontrado });
    } else {
        if (correoCrudo === "" || correoCrudo.toLowerCase().includes("yopmail")) {
             return res.json({ ok: false, error: "📭 Aún no llega el correo de Fox. (Solicítalo de nuevo)." });
        }
        // Si fallara, nos escupirá el texto puro para ver en qué formato extraño llegó
        return res.json({ ok: false, error: "👁️ Correo sin 6 dígitos. Datos: " + correoCrudo.substring(0, 100) });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error en API: " + err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor Fox corriendo en puerto ${PORT}`));
