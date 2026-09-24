const express = require('express');
const { getLatestMailByEmailAddress } = require('yopmail-helper');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta el correo" });
  
  // Yopmail solo necesita la parte antes del @
  const usuario = email.split('@')[0];

  try {
    console.log(`[FOX] Buscando en API Yopmail para: ${usuario}`);
    
    // Entramos por la puerta trasera (API) sin levantar el Captcha
    const latestMail = await getLatestMailByEmailAddress(usuario);
    
    if (!latestMail) {
      return res.json({ ok: false, error: "📭 Aún no llega el correo a Yopmail. Espera unos segundos y vuelve a presionar." });
    }

    // Unimos el cuerpo y el resumen del correo para asegurar que encontremos el código
    const contenido = (latestMail.body || "") + " " + (latestMail.summary || "");

    if (!contenido || contenido.trim() === "") {
        return res.json({ ok: false, error: "⚠️ El correo llegó pero está vacío." });
    }

    // Buscamos el código
    let codigoEncontrado = null;
    let matchEspecial = contenido.match(/(?:c[oó]digo|code|pin)[^\d\n\r]{0,30}(\b\d{4,6}\b)/i);
    
    if (matchEspecial) {
        codigoEncontrado = matchEspecial[1];
    } else {
        const todosLosNumeros = contenido.match(/\b\d{4,6}\b/g) || [];
        const candidatos = todosLosNumeros.filter(num => !["2023", "2024", "2025", "2026", "2027"].includes(num));
        if (candidatos.length > 0) codigoEncontrado = candidatos[0];
    }

    if (codigoEncontrado) {
        return res.json({ ok: true, code: codigoEncontrado });
    } else {
        return res.json({ ok: false, error: "👁️ Correo leído sin código numérico. Dice: " + contenido.substring(0, 80) });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error en API Yopmail: " + err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor Fox API corriendo en puerto ${PORT}`));
