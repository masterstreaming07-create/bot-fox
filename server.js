const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Activamos el modo sigilo para evadir Cloudflare y Captchas
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

async function obtenerCodigoFox(correoCompleto) {
  const usuario = correoCompleto.split('@')[0];
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    // Simulamos ser un navegador común
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto(`https://yopmail.com/es/?login=${usuario}`, { waitUntil: 'networkidle2' });
    
    // Le damos 5 segundos fijos para que el escudo Stealth resuelva el Captcha si aparece
    await new Promise(r => setTimeout(r, 5000));

    const mailFrameElement = await page.$('#ifmail');
    if (!mailFrameElement) {
        return { ok: false, error: "⚠️ La bandeja no cargó. Yopmail está tardando demasiado." };
    }

    const mailFrame = await mailFrameElement.contentFrame();
    const contenido = await mailFrame.evaluate(() => document.body.innerText);

    if (!contenido || contenido.trim() === "" || contenido.toLowerCase().includes("vacío") || contenido.toLowerCase().includes("empty")) {
        return { ok: false, error: "📭 Aún no llega el correo a Yopmail. Espera unos segundos y vuelve a presionar." };
    }

    // Si aún sale el Captcha
    if (contenido.toLowerCase().includes("captcha") || contenido.toLowerCase().includes("cloudflare")) {
        return { ok: false, error: "⛔ El Captcha de Yopmail fue demasiado fuerte esta vez. Intenta de nuevo." };
    }

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
        return { ok: false, error: "👁️ Correo leído pero sin código numérico. Dice: " + contenido.substring(0, 80).replace(/\n/g, ' ') };
    }

  } catch (err) {
    return { ok: false, error: "🔥 Error en Render: " + err.message };
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
