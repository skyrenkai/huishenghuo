// Must use same global store as send-code.js
const codeStore = global._codeStore || (global._codeStore = {});

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const entry = codeStore[email];

  if (!entry) {
    return res.status(400).json({ error: '验证码不存在，请重新发送' });
  }

  if (Date.now() > entry.expiresAt) {
    delete codeStore[email];
    return res.status(400).json({ error: '验证码已过期，请重新发送' });
  }

  if (code !== entry.code) {
    return res.status(400).json({ error: '验证码错误' });
  }

  // Code is correct — clear it so it can't be reused
  delete codeStore[email];

  return res.status(200).json({ success: true });
}
