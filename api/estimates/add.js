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

    // 2. Проверяем право создавать заявки
    const hasPermission = await checkPermission(decoded.user_id, 'create_estimate');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'No permission to create estimates' });
    }

    // 3. Валидация данных
    const { date, manager, resource, technician, client, comment } = req.body;

    if (!date || !manager || !resource || !technician || !client) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 4. Создаем заявку
    const result = await query(
      `INSERT INTO estimates (date, manager, resource, technician, client, comment, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [date, manager, resource, technician, client, comment || '', 'diagnostic']
    );

    const newEstimate = result.rows[0];

    // 5. Записываем в историю (кто создал)
    await query(
      `INSERT INTO estimate_history (estimate_id, user_id, field_changed, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [newEstimate.id, decoded.user_id, 'created', null, 'diagnostic']
    );

    return res.status(201).json({ success: true, data: newEstimate });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to add estimate' });
  }
};