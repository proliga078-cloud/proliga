const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'Proliga <onboarding@resend.dev>'

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  if (!RESEND_API_KEY) return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY não configurada' }) }
  try {
    const { to, toName, fromName, preview, link } = JSON.parse(event.body || '{}')
    if (!to || !fromName) return { statusCode: 400, body: JSON.stringify({ error: 'Falta to ou fromName' }) }

    const safePreview = String(preview || '').slice(0, 300)

    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="font-size:22px;font-weight:800;color:#1d4ed8;margin-bottom:20px">Pro<span style="color:#f59e0b">liga</span></div>
      <h2 style="color:#0f172a;font-size:18px;margin-bottom:8px">Nova mensagem na Proliga</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6">Olá${toName ? ' ' + toName : ''},</p>
      <p style="color:#475569;font-size:14px;line-height:1.6"><strong>${fromName}</strong> enviou-te uma mensagem:</p>
      <div style="background:#f8fafc;padding:14px 16px;border-left:3px solid #1d4ed8;border-radius:6px;color:#0f172a;font-size:14px;margin:16px 0">${safePreview}</div>
      <a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700">Ver e responder</a>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Recebeste este email porque tens uma conta na Proliga. Responde diretamente pelo site.</p>
    </div>`

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `💬 Nova mensagem de ${fromName} na Proliga`,
        html
      })
    })

    const data = await resp.json()
    if (!resp.ok) {
      console.error('Resend error:', data)
      return { statusCode: resp.status, body: JSON.stringify(data) }
    }
    return { statusCode: 200, body: JSON.stringify(data) }
  } catch (err) {
    console.error('notify-message error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
