const express = require('express');
const { getLatestMailByEmailAddress } = require('yopmail-helper');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta el correo" });
  
  const usuario = email.split('@')[0];

  try {
    const latestMail = await getLatestMailByEmailAddress(usuario);
    
    if (!latestMail) {
      return res.json({ ok: false, error: "📭 Aún no llega el correo a Yopmail. Espera unos segundos y vuelve a presionar." });
    }

    // TRUCO MAESTRO: Convertimos TODO el correo (asunto, cuerpo, HTML, todo) a texto puro.
    const contenidoCrudo = JSON.stringify(latestMail);
    // Limpiamos etiquetas HTML, saltos de línea y comillas para que los números queden expuestos
    const contenidoLimpio = contenidoCrudo.replace(/<[^>]+>/g, ' ').replace(/[\\n\\r"'{}]/g, ' ');

    let codigoEncontrado = null;
    
    // 1. Buscamos números de 4 a 8 dígitos en todo el correo
    const todosLosNumeros = contenidoLimpio.match(/\b\d{4,8}\b/g) || [];
    const aIgnorar = ["2023", "2024", "2025", "2026", "2027", "2028"];
    
    const candidatosNumeros = todosLosNumeros.filter(num => !aIgnorar.includes(num));
    
    if (candidatosNumeros.length > 0) {
        codigoEncontrado = candidatosNumeros[0];
    } else {
        // 2. Soporte extra: Si Fox One envió un código de letras y números (ej. A1B2C3)
        let matchAlfa = contenidoLimpio.match(/\b[A-Z0-9]{5,8}\b/g) || [];
        if(matchAlfa.length > 0) {
            codigoEncontrado = matchAlfa[0];
        }
    }

    if (codigoEncontrado) {
        return res.json({ ok: true, code: codigoEncontrado });
    } else {
        let asunto = latestMail.subject || "Sin asunto";
        return res.json({ ok: false, error: "👁️ Correo leído sin código. Asunto: " + asunto });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error en API Yopmail: " + err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor Fox API corriendo en puerto ${PORT}`));
