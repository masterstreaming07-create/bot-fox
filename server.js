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
    let contenidoVisible = "";

    for (let i = 0; i < 5; i++) {
        let latestMail = null;
        try { latestMail = await getLatestMailByEmailAddress(usuario); } catch(err) {}
        
        if (latestMail) {
            tituloCorreo = latestMail.title || latestMail.subject || "Sin asunto";
            const contenidoCrudo = JSON.stringify(latestMail);
            // Limpieza extrema para ver solo texto y números
            const contenidoLimpio = contenidoCrudo.replace(/<[^>]+>/g, ' ').replace(/[^\w\s]/g, ' ');
            contenidoVisible = contenidoLimpio; // Guardamos lo que vio para mostrarlo en el panel

            // Búsqueda muy agresiva: Cualquier bloque de 4 a 8 números seguidos, aunque estén pegados a letras
            let matchAgresivo = contenidoLimpio.match(/\d{4,8}/g) || [];
            const aIgnorar = ["2023", "2024", "2025", "2026", "2027", "2028"];
            const candidatosNumeros = matchAgresivo.filter(num => !aIgnorar.includes(num));
            
            if (candidatosNumeros.length > 0) {
                codigoEncontrado = candidatosNumeros[0];
            } else {
                // Por si el código es alfanumérico (ej: FOX12345)
                let matchAlfa = contenidoLimpio.match(/\b[A-Z0-9]{5,8}\b/gi) || [];
                if(matchAlfa.length > 0) codigoEncontrado = matchAlfa[0];
            }

            if (codigoEncontrado && !tituloCorreo.toLowerCase().includes("yopmail")) {
                break; // ¡Encontró el código en el correo de Fox! Salimos.
            } else {
                codigoEncontrado = null; 
            }
        }

        if (i < 4) await new Promise(r => setTimeout(r, 4000));
    }

    if (codigoEncontrado) {
        return res.json({ ok: true, code: codigoEncontrado });
    } else {
        if (tituloCorreo.toLowerCase().includes("yopmail")) {
             return res.json({ ok: false, error: "📭 Aún no llega el correo de Fox. Intenta de nuevo." });
        }
        // AQUI ESTÁ EL TRUCO: Nos mostrará las primeras palabras del correo para ver el código con nuestros ojos
        return res.json({ ok: false, error: "👁️ Correo FOX leído: " + contenidoVisible.substring(0, 150) });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error en API: " + err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor Fox API corriendo en puerto ${PORT}`));
