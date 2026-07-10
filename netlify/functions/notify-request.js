const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM || 'Proliga <onboarding@resend.dev>'

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  if (!RESEND_API_KEY) return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY não configurada' }) }
  try {
    const { to, toName, title, category, location, budget, link } = JSON.parse(event.body || '{}')
    if (!to || !title) return { statusCode: 400, body: JSON.stringify({ error: 'Falta to ou title' }) }

    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="font-size:22px;font-weight:800;color:#1E4FD6;margin-bottom:20px">Pro<span style="color:#B4650A">liga</span></div>
      <h2 style="color:#14181F;font-size:18px;margin-bottom:8px">📢 Novo pedido em ${category}</h2>
      <p style="color:#5B6270;font-size:14px;line-height:1.6">Olá${toName ? ' ' + toName : ''},</p>
      <p style="color:#5B6270;font-size:14px;line-height:1.6">Alguém publicou um pedido que pode ser para ti:</p>
      <div style="background:#F7F8FA;padding:14px 16px;border-left:3px solid #1E4FD6;border-radius:6px;color:#14181F;font-size:14px;margin:16px 0">
        <strong>${title}</strong><br/>
        📍 ${location || 'Portugal'}${budget ? ' · 💰 ' + budget : ''}
      </div>
      <a href="${link}" style="display:inline-block;background:#1E4FD6;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700">Ver pedido e responder</a>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Recebeste este email porque tens um perfil na categoria "${category}" na Proliga.</p>
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
        subject: `📢 Novo pedido de ${category} perto de ti`,
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
    console.error('notify-request error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
