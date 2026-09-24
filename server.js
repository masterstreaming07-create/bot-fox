const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta el correo" });
  
  const usuario = email.split('@')[0];
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Disfrazamos al bot de Vercel como un iPhone para evitar bloqueos
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    
    await page.goto(`https://yopmail.com/es/?login=${usuario}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Intentamos extraer el texto de la bandeja o del iframe de los mensajes
    let contenido = "";
    try {
        const frameElement = await page.$('#ifmail');
        if (frameElement) {
            const frame = await frameElement.contentFrame();
            contenido = await frame.evaluate(() => document.body.innerText);
        } else {
            contenido = await page.evaluate(() => document.body.innerText);
        }
    } catch (e) {
        contenido = await page.evaluate(() => document.body.innerText);
    }

    // Buscamos exactamente los 6 números del código de Fox
    let match = contenido.match(/\b\d{6}\b/);

    if (match) {
        return res.json({ ok: true, code: match[0] });
    } else {
        return res.json({ ok: false, error: "📭 Aún no llega el correo de Fox. (Solicítalo de nuevo)." });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error: " + err.message });
  }
});

module.exports = app;
