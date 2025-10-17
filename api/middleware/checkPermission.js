const { query } = require('../db');

/**
 * Проверяет есть ли у пользователя право на действие
 * 
 * @param {number} userId - ID пользователя
 * @param {string} permissionName - Название права (например: 'create_estimate')
 * @returns {Promise<boolean>} - true если право есть, false если нет
 */
async function checkPermission(userId, permissionName) {
  try {
    const result = await query(`
      SELECT COUNT(*) as has_permission
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1 
        AND p.name = $2 
        AND u.is_active = true
    `, [userId, permissionName]);

    // Если COUNT > 0, значит право есть
    return parseInt(result.rows[0].has_permission) > 0;
    
  } catch (error) {
    console.error('Permission check failed:', error.message);
    return false;
  }
}

module.exports = { checkPermission };