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
    let textoParaMostrar = "";

    // Bucle de paciencia: 5 intentos esperando a Fox
    for (let i = 0; i < 5; i++) {
        let latestMail = null;
        try { latestMail = await getLatestMailByEmailAddress(usuario); } catch(err) {}
        
        if (latestMail) {
            tituloCorreo = latestMail.title || latestMail.subject || "Sin asunto";
            
            // SOLUCIÓN: Sumamos el Asunto + Cuerpo de texto + Cuerpo HTML (Aquí suele esconderse el código)
            const contenidoCrudo = tituloCorreo + " " + (latestMail.body || "") + " " + (latestMail.html || "");
            
            // Limpiamos etiquetas HTML para que solo queden letras y números
            const contenidoLimpio = contenidoCrudo.replace(/<[^>]+>/g, ' ').replace(/[^\w\s]/g, ' ');
            textoParaMostrar = contenidoLimpio;

            // Buscamos estrictamente números de 4 a 8 dígitos
            const todosLosNumeros = contenidoLimpio.match(/\b\d{4,8}\b/g) || [];
            const aIgnorar = ["2023", "2024", "2025", "2026", "2027", "2028"];
            const candidatosNumeros = todosLosNumeros.filter(num => !aIgnorar.includes(num));
            
            if (candidatosNumeros.length > 0) {
                codigoEncontrado = candidatosNumeros[0];
            }

            // Si encontró un número y no es la bienvenida de Yopmail
            if (codigoEncontrado && !tituloCorreo.toLowerCase().includes("yopmail")) {
                break; 
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
        // AQUI ESTÁ EL TRUCO: Nos mostrará las palabras reales del correo
        return res.json({ ok: false, error: "👁️ Texto: " + textoParaMostrar.substring(0, 100) });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error en API: " + err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor Fox API corriendo en puerto ${PORT}`));
