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
    const id = req.query.id || req.body?.id;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing user ID' });
    }

    // 4. Prevent self-deletion
    if (parseInt(id) === decoded.user_id) {
      return res.status(403).json({ success: false, error: 'You cannot delete yourself' });
    }

    // 5. Check if user exists
    const checkResult = await query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 6. Delete user
    await query('DELETE FROM users WHERE id = $1', [id]);

    return res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
};