export default function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    // Пароли на сервере
    const users = {
      '123456': { role: 'manager', redirect: '/dashboard.html' },
      '456789': { role: 'estimates', redirect: '/estimates.html' },
      '123789': { role: 'technician', redirect: '/technician.html' }
    };

    if (users[password]) {
      const token = Buffer.from(`${password}-${Date.now()}`).toString('base64');
      
      return res.status(200).json({
        success: true,
        token: token,
        role: users[password].role,
        redirect: users[password].redirect
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid password' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}