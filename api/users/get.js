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
    // 1. Verify token
    const decoded = verifyToken(req);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 2. Check permission
    const hasPermission = await checkPermission(decoded.user_id, 'manage_users');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'No permission to manage users' });
    }

    // 3. Get user ID
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing user ID' });
    }

    // 4. Get user data
    const result = await query(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.role_id,
        r.name as role_name,
        u.is_active,
        u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};