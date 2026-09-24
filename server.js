const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
// Render asigna dinámicamente el puerto en process.env.PORT
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
        '--disable-blink-features=AutomationControlled' // Evasión de anti-bots
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Entrar como humano a la página de inicio de Yopmail
    await page.goto('https://yopmail.com/es/', { waitUntil: 'networkidle2' });

    // 2. Escribir el correo en la caja de texto y dar Enter
    await page.waitForSelector('#login', { timeout: 10000 });
    await page.type('#login', usuario);
    await page.keyboard.press('Enter');

    // 3. Darle 3 segundos fijos para que Yopmail cargue la bandeja
    await new Promise(r => setTimeout(r, 3000));

    // 4. Intentar capturar el iframe del correo (ifmail)
    const mailFrameElement = await page.$('#ifmail');
    if (!mailFrameElement) {
      return { ok: false, error: "Bandeja vacía o no cargó el correo." };
    }
    const mailFrame = await mailFrameElement.contentFrame();

    // 5. Extraer el texto
    const contenido = await mailFrame.evaluate(() => document.body.innerText);

    if (!contenido || contenido.trim() === "") {
        return { ok: false, error: "El correo está vacío." };
    }

    // 6. Búsqueda inteligente de códigos
    let codigoEncontrado = null;

    // Buscar código exacto de FOX
    let matchEspecial = contenido.match(/(?:c[oó]digo|code|pin)[^\d\n\r]{0,30}(\b\d{4,6}\b)/i);
    if (matchEspecial) {
        codigoEncontrado = matchEspecial[1];
    } else {
        const todosLosNumeros = contenido.match(/\b\d{4,6}\b/g) || [];
        const añosAIgnorar = ["2023", "2024", "2025", "2026", "2027"];
        const candidatos = todosLosNumeros.filter(num => !añosAIgnorar.includes(num));
        if (candidatos.length > 0) {
            codigoEncontrado = candidatos[0];
        }
    }

    if (codigoEncontrado) {
      return { ok: true, code: codigoEncontrado };
    } else {
      return { ok: false, error: "No se encontró ningún código reciente en el correo de Fox." };
    }

  } catch (err) {
    return { ok: false, error: "Error interno Puppeteer: " + err.message };
  } finally {
    if (browser) await browser.close();
  }
}

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ ok: false, error: "Falta el parámetro email" });
  }

  console.log(`[FOX] Buscando código para: ${email}`);
  const resultado = await obtenerCodigoFox(email);
  return res.json(resultado);
});

app.listen(PORT, () => {
  console.log(`Servidor Fox One corriendo en puerto ${PORT}`);
});
