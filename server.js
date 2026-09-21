const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000;

// Función para raspar el código de Yopmail
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

    // 1. Ir directo a la bandeja de entrada del usuario en Yopmail
    await page.goto(`https://yopmail.com/es/?login=${encodeURIComponent(usuario)}`, { waitUntil: 'networkidle2' });

    // 2. Esperar al iframe del correo
    await page.waitForSelector('#ifmail', { timeout: 15000 });
    const mailFrameElement = await page.$('#ifmail');
    const mailFrame = await mailFrameElement.contentFrame();

    if (!mailFrame) {
      return { ok: false, error: "No se pudo cargar el contenedor del correo." };
    }

    // 3. Extraer el texto completo del cuerpo del correo
    const contenido = await mailFrame.evaluate(() => document.body.innerText);

    // 4. Búsqueda prioritaria: número de 4 a 6 dígitos cerca de la palabra "código" o "code"
    let match = contenido.match(/(?:c[oó]digo|code)[^\d\n\r]{0,30}(\b\d{4,6}\b)/i);
    let codigoEncontrado = match ? match[1] : null;

    // 5. Si no vino con la palabra "código", buscar todos los números de 4 a 6 dígitos ignorando años
    if (!codigoEncontrado) {
      const todosLosNumeros = contenido.match(/\b\d{4,6}\b/g) || [];
      const añosAIgnorar = ["2023", "2024", "2025", "2026", "2027"];
      
      // Filtrar números que no sean años comunes
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
    return { ok: false, error: "Error al consultar Yopmail: " + err.message };
  } finally {
    if (browser) await browser.close();
  }
}

// Endpoint para que Apps Script consulte el código
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
  console.log(`\n Servidor Fox One corriendo en http://localhost:${PORT}`);
  console.log(` Listo para procesar correos de Fox One.\n`);
});
