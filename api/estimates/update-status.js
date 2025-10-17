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

    // 2. Проверяем право менять статус
    const hasPermission = await checkPermission(decoded.user_id, 'change_status');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'No permission to change status' });
    }

    // 3. Валидация данных
    const { id, status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 4. Получаем старый статус
    const oldData = await query('SELECT status FROM estimates WHERE id = $1', [id]);
    if (oldData.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }
    const oldStatus = oldData.rows[0].status;

    // 5. Маппинг: Sold → Search (как было в старой системе)
    const statusToSave = status === 'sold' ? 'search' : status;

    // 6. Обновляем статус
    const result = await query(
      'UPDATE estimates SET status = $1 WHERE id = $2 RETURNING *',
      [statusToSave, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }

    // 7. Записываем в историю
    await query(
      `INSERT INTO estimate_history (estimate_id, user_id, field_changed, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, decoded.user_id, 'status', oldStatus, statusToSave]
    );

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
};