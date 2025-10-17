const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Проверяем токен
    const decoded = verifyToken(req);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 2. Проверяем право просматривать заявки
    const hasPermission = await checkPermission(decoded.user_id, 'view_estimate');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'No permission to view estimates' });
    }

    // 3. Получаем все заявки
    const result = await query('SELECT * FROM estimates ORDER BY created_at DESC');
    
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch estimates' });
  }
};