const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

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
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Entramos a la página principal (la "puerta delantera") para que Cloudflare no sospeche
    await page.goto('https://yopmail.com/es/', { waitUntil: 'domcontentloaded' });
    
    // 2. Esperamos hasta 10 segundos a que pase la pantalla de Cloudflare y cargue la caja
    try {
        await page.waitForSelector('#login', { timeout: 10000 });
    } catch(e) {
        return { ok: false, error: "⛔ Cloudflare bloqueó la IP de Render desde la página principal." };
    }

    // 3. Simulación humana: Hacemos clic, vaciamos la caja, y tecleamos LETRA POR LETRA
    await page.click('#login');
    // Borramos por si hay texto
    await page.evaluate(() => document.getElementById('login').value = '');
    await page.type('#login', usuario, { delay: 100 }); // 100 milisegundos entre cada letra
    await page.keyboard.press('Enter');

    // 4. Damos 4 segundos para que cargue la bandeja de entrada
    await new Promise(r => setTimeout(r, 4000));

    const mailFrameElement = await page.$('#ifmail');
    if (!mailFrameElement) {
        return { ok: false, error: "⚠️ No se pudo abrir la bandeja de entrada de Yopmail." };
    }

    const mailFrame = await mailFrameElement.contentFrame();
    const contenido = await mailFrame.evaluate(() => document.body.innerText);

    if (!contenido || contenido.trim() === "" || contenido.toLowerCase().includes("vacío") || contenido.toLowerCase().includes("empty")) {
        return { ok: false, error: "📭 Aún no llega el correo a Yopmail. Espera unos segundos y vuelve a presionar." };
    }

    // 5. Buscar código
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
