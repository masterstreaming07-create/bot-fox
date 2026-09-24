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

    // Bucle de 5 intentos (hasta 20 segundos) esperando el código
    for (let i = 0; i < 5; i++) {
        let latestMail = null;
        try { latestMail = await getLatestMailByEmailAddress(usuario); } catch(err) {}

        if (latestMail) {
            // Convertimos todo el correo a texto
            const correoCrudo = JSON.stringify(latestMail);

            // CAZADOR EXACTO: Buscamos 6 números seguidos
            const matchNumeros = correoCrudo.match(/\b\d{6}\b/g);

            if (matchNumeros && matchNumeros.length > 0) {
                codigoEncontrado = matchNumeros[0];
                break; // ¡Lo encontró! Salimos del bucle.
            }
        }
        
        // Si no encontró el código (porque era la bienvenida o no ha llegado), espera 4 segundos
        if (i < 4) await new Promise(r => setTimeout(r, 4000));
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

app.listen(PORT, () => console.log(`Servidor Fox API corriendo en puerto ${PORT}`));
