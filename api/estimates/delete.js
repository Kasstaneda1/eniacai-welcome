const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Проверяем токен
    const decoded = verifyToken(req);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 2. Проверяем право удалять заявки
    const hasPermission = await checkPermission(decoded.user_id, 'delete_estimate');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'No permission to delete estimates' });
    }

    // 3. Получаем ID из query параметра или body
    const id = req.query.id || req.body?.id;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing estimate ID' });
    }

    // 4. Проверяем что заявка существует
    const checkResult = await query('SELECT id FROM estimates WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }

    // 5. Записываем в историю что заявка удалена (перед удалением)
    await query(
      `INSERT INTO estimate_history (estimate_id, user_id, field_changed, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, decoded.user_id, 'deleted', 'exists', 'deleted']
    );

    // 6. Удаляем заявку (CASCADE удалит связанные комментарии и историю)
    await query('DELETE FROM estimates WHERE id = $1', [id]);

    return res.status(200).json({ success: true, message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete estimate' });
  }
};