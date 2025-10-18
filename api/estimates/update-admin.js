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

    // 2. Проверяем что это SUPERADMIN
    if (decoded.role_name !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only superadmin can edit these fields' 
      });
    }

    // 3. Валидация данных
    const { id, work, parts, second_tech, total, part_number } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing estimate ID' });
    }

    // Преобразуем в числа (или 0 если пусто)
    const workValue = parseFloat(work) || 0;
    const partsValue = parseFloat(parts) || 0;
    const secondTechValue = parseFloat(second_tech) || 0;
    const partNumberValue = part_number || '';

    // ЛОГИКА TOTAL:
    // Если total передан (и не пустой) - используем его
    // Иначе считаем автоматически
    let totalValue;
    if (total !== null && total !== undefined && total !== '') {
      totalValue = parseFloat(total);
    } else {
      totalValue = workValue + partsValue + secondTechValue;
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
       SET work = $1, parts = $2, second_tech = $3, total = $4, part_number = $5
       WHERE id = $6
       RETURNING *`,
      [workValue, partsValue, secondTechValue, totalValue, partNumberValue, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }

    // 6. Записываем в историю все измененные поля
    const newEstimate = result.rows[0];
    const fieldsToCheck = ['work', 'parts', 'second_tech', 'total', 'part_number'];
    
    for (const field of fieldsToCheck) {
      if (oldEstimate[field] !== newEstimate[field]) {
        await query(
          `INSERT INTO estimate_history (estimate_id, user_id, field_changed, old_value, new_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id, 
            decoded.user_id, 
            field, 
            String(oldEstimate[field] || ''), 
            String(newEstimate[field] || '')
          ]
        );
      }
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update estimate' });
  }
};