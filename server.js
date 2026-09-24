const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

async function obtenerCodigoFox(correoCompleto) {
  const usuario = correoCompleto.split('@')[0];
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Va directo a la bandeja
    await page.goto(`https://yopmail.com/es/?login=${usuario}`, { waitUntil: 'networkidle2' });
    
    // Esperamos 4 segundos para que cargue
    await new Promise(r => setTimeout(r, 4000));

    // Leemos TODA la página para ver si Yopmail nos bloqueó
    const mainText = await page.evaluate(() => document.body.innerText);

    if (mainText.toLowerCase().includes("captcha") || mainText.toLowerCase().includes("cloudflare") || mainText.toLowerCase().includes("robot")) {
        return { ok: false, error: "⛔ Yopmail bloqueó el bot de Render (Pide Captcha o IP bloqueada)." };
    }

    // Buscamos el cuadro del correo
    const mailFrameElement = await page.$('#ifmail');
    if (!mailFrameElement) {
        return { ok: false, error: "⚠️ No hay correos. La pantalla dice: " + mainText.substring(0, 80).replace(/\n/g, ' ') };
    }

    const mailFrame = await mailFrameElement.contentFrame();
    const contenido = await mailFrame.evaluate(() => document.body.innerText);

    if (!contenido || contenido.trim() === "" || contenido.toLowerCase().includes("vacío")) {
        return { ok: false, error: "📭 Fox One no ha enviado el correo. La bandeja está completamente vacía." };
    }

    // Si hay texto, buscamos el código
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
        return { ok: true, code: codigoEncontrado };
    } else {
        return { ok: false, error: "👁️ Correo leído pero sin código. Dice: " + contenido.substring(0, 90).replace(/\n/g, ' ') };
    }

  } catch (err) {
    return { ok: false, error: "🔥 Error interno del Bot en Render: " + err.message };
  } finally {
    if (browser) await browser.close();
  }
}

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta correo" });
  const resultado = await obtenerCodigoFox(email);
  return res.json(resultado);
});

app.listen(PORT, () => console.log(`Servidor Fox corriendo en puerto ${PORT}`));
