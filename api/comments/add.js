const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Проверяем токен
    const decoded = verifyToken(req);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 2. Проверяем право добавлять комментарии
    const hasPermission = await checkPermission(decoded.user_id, 'add_comment');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'No permission to add comments' });
    }

    // 3. Валидация данных
    const { estimate_id, comment_text } = req.body;

    if (!estimate_id || !comment_text) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 4. Добавляем комментарий
    const result = await query(
      'INSERT INTO comments (estimate_id, comment_text) VALUES ($1, $2) RETURNING *',
      [estimate_id, comment_text]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
};