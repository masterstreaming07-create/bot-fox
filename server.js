const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta el correo" });
  
  const usuario = email.split('@')[0];
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    // Nos disfrazamos de un iPhone para evadir el CAPTCHA
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    await page.setViewport({ width: 390, height: 844, isMobile: true });

    await page.goto(`https://yopmail.com/es/?login=${usuario}`, { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 4000));

    const mailFrameElement = await page.$('#ifmail');
    if (!mailFrameElement) {
        return res.json({ ok: false, error: "⚠️ No pude cargar la bandeja." });
    }

    const mailFrame = await mailFrameElement.contentFrame();
    const contenido = await mailFrame.evaluate(() => document.body.innerText);

    if (contenido.includes("CAPTCHA") || contenido.includes("robot")) {
        return res.json({ ok: false, error: "⛔ Yopmail lanzó el CAPTCHA incluso en modo móvil. Render está muy bloqueado hoy." });
    }

    // Buscamos exactamente el código de 6 dígitos
    let match = contenido.match(/\b\d{6}\b/);
    
    if (match) {
        return res.json({ ok: true, code: match[0] });
    } else {
        if (contenido.trim() === "" || contenido.toLowerCase().includes("vacío")) {
            return res.json({ ok: false, error: "📭 Aún no llega el correo. (Intenta de nuevo)." });
        }
        return res.json({ ok: false, error: "👁️ Correo sin código. Dice: " + contenido.substring(0, 50) });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error: " + err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Servidor Fox API corriendo en puerto ${PORT}`));
