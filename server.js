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
    let tituloCorreo = "Desconocido";

    // Bucle de paciencia: 5 intentos (hasta 20 segundos) esperando a Fox
    for (let i = 0; i < 5; i++) {
        let latestMail = null;
        try {
            latestMail = await getLatestMailByEmailAddress(usuario);
        } catch(err) {
            // Ignoramos micro-cortes de conexión
        }
        
        if (latestMail) {
            tituloCorreo = latestMail.title || latestMail.subject || "Sin asunto";
            const contenidoCrudo = JSON.stringify(latestMail);
            const contenidoLimpio = contenidoCrudo.replace(/<[^>]+>/g, ' ').replace(/[\\n\\r"'{}]/g, ' ');

            // Buscamos el código
            const todosLosNumeros = contenidoLimpio.match(/\b\d{4,8}\b/g) || [];
            const aIgnorar = ["2023", "2024", "2025", "2026", "2027", "2028"];
            const candidatosNumeros = todosLosNumeros.filter(num => !aIgnorar.includes(num));
            
            let matchEspecial = contenidoLimpio.match(/(?:c[oó]digo|code|pin)[^\d\n\r]{0,30}(\b\d{4,6}\b)/i);
            
            if (matchEspecial) {
                codigoEncontrado = matchEspecial[1];
            } else if (candidatosNumeros.length > 0) {
                codigoEncontrado = candidatosNumeros[0];
            }

            // TRUCO: Si vemos el correo de Bienvenida de Yopmail, lo ignoramos y seguimos esperando
            if (codigoEncontrado && !tituloCorreo.toLowerCase().includes("yopmail")) {
                break; // ¡Llegó el correo de Fox! Salimos del bucle.
            } else {
                codigoEncontrado = null; 
            }
        }

        // Si no ha llegado, esperamos 4 segundos antes de volver a revisar la bandeja
        if (i < 4) {
            await new Promise(r => setTimeout(r, 4000));
        }
    }

    if (codigoEncontrado) {
        return res.json({ ok: true, code: codigoEncontrado });
    } else {
        // Si pasaron los 20 segundos y Fox nunca mandó el correo
        if (tituloCorreo.toLowerCase().includes("yopmail")) {
             return res.json({ ok: false, error: "📭 Aún no llega el correo de Fox a la bandeja. Intenta de nuevo." });
        }
        return res.json({ ok: false, error: "👁️ Correo leído sin código. Título: " + tituloCorreo.substring(0, 30) });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error en API Yopmail: " + err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor Fox API corriendo en puerto ${PORT}`));
