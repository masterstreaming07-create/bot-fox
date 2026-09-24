const express = require('express');

const app = express();

app.get('/codigo-fox', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, error: "Falta el correo" });
  
  const usuario = email.split('@')[0];

  try {
    // 1. Obtenemos el acceso nativo a Yopmail
    const homeRes = await fetch('https://yopmail.com/es/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    const cookieHeader = homeRes.headers.get('set-cookie');
    let ypCookie = '';
    if (cookieHeader) {
      const match = cookieHeader.split(';').find(c => c.trim().startsWith('yp='));
      if (match) ypCookie = match.trim();
    }

    let codigoEncontrado = null;

    // 2. Extraemos los 6 dígitos a la fuerza bruta 4 veces
    for (let i = 0; i < 4; i++) {
        const inboxRes = await fetch(`https://yopmail.com/es/inbox?login=${usuario}&p=1&d=&ctrl=&scrl=&spam=true`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Cookie': ypCookie,
                'Accept': 'text/html'
            }
        });

        const html = await inboxRes.text();
        
        // Buscamos directamente cualquier patrón de 6 números seguidos
        const matchNumeros = html.match(/\b\d{6}\b/g);
        
        if (matchNumeros && matchNumeros.length > 0) {
            codigoEncontrado = matchNumeros[0];
            break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    if (codigoEncontrado) {
        return res.json({ ok: true, code: codigoEncontrado });
    } else {
        return res.json({ ok: false, error: "📭 Aún no llega el correo de Fox. (Solicítalo de nuevo)." });
    }

  } catch (err) {
    return res.json({ ok: false, error: "🔥 Error de conexión: " + err.message });
  }
});

module.exports = app;
