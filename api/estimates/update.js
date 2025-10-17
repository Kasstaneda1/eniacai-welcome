const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Проверяем токен
    const decoded = verifyToken(req);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 2. Проверяем право редактировать заявки
    const hasPermission = await checkPermission(decoded.user_id, 'edit_estimate');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'No permission to edit estimates' });
    }

    // 3. Валидация данных
    const { id, date, manager, resource, technician, client, comment } = req.body;

    if (!id || !date || !manager || !resource || !technician || !client) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 4. Получаем старые данные для истории
    const oldData = await query('SELECT * FROM estimates WHERE id = $1', [id]);
    if (oldData.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }
    const oldEstimate = oldData.rows[0];

    // 5. Обновляем заявку
    const result = await query(
      `UPDATE estimates 
       SET date = $1, manager = $2, resource = $3, technician = $4, client = $5, comment = $6
       WHERE id = $7
       RETURNING *`,
      [date, manager, resource, technician, client, comment || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }

    // 6. Записываем в историю все измененные поля
    const newEstimate = result.rows[0];
    const fieldsToCheck = ['date', 'manager', 'resource', 'technician', 'client', 'comment'];
    
    for (const field of fieldsToCheck) {
      if (oldEstimate[field] !== newEstimate[field]) {
        await query(
          `INSERT INTO estimate_history (estimate_id, user_id, field_changed, old_value, new_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, decoded.user_id, field, oldEstimate[field], newEstimate[field]]
        );
      }
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update estimate' });
  }
};