// Persist across warm invocations using global
const codeStore = global._codeStore || (global._codeStore = {});

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '请输入有效邮箱' });
  }

  const code = genCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Store server-side — never sent to browser
  codeStore[email] = { code, expiresAt };

  // Send via EmailJS REST API (server-side, no browser SDK)
  const payload = {
    service_id:  process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id:     process.env.EMAILJS_PUBLIC_KEY,
    accessToken: process.env.EMAILJS_PRIVATE_KEY,
    template_params: {
      to_email: email,
      to_name:  name || email,
      code:     code,
      name:     name || email,
      email:    email,
    },
  };

  console.log('Sending to EmailJS, service:', process.env.EMAILJS_SERVICE_ID);

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log('EmailJS status:', response.status, 'body:', text);

    if (!response.ok) {
      return res.status(500).json({ error: '邮件发送失败：' + text });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send code error:', err.message);
    return res.status(500).json({ error: '服务器错误：' + err.message });
  }
}
