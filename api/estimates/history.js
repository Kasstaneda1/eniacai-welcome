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

    // 2. Проверяем право просматривать заявки (для истории тоже нужно право на просмотр)
    const hasPermission = await checkPermission(decoded.user_id, 'view_estimate');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'No permission to view history' });
    }

    // 3. Получаем estimate_id
    const { estimate_id } = req.query;

    if (!estimate_id) {
      return res.status(400).json({ success: false, error: 'Missing estimate_id' });
    }

    // 4. Получаем историю изменений с информацией о пользователях
    const result = await query(
      `SELECT 
        eh.id,
        eh.estimate_id,
        eh.field_changed,
        eh.old_value,
        eh.new_value,
        eh.changed_at,
        u.username,
        u.full_name
       FROM estimate_history eh
       LEFT JOIN users u ON eh.user_id = u.id
       WHERE eh.estimate_id = $1
       ORDER BY eh.changed_at DESC`,
      [estimate_id]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
};