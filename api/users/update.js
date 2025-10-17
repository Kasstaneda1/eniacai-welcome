const bcrypt = require('bcrypt');
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

    // 3. Validate input
    const { id, username, full_name, password, role_name } = req.body;

    if (!id || !username || !full_name || !role_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 4. Check if username is taken by another user
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 AND id != $2', 
      [username, id]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    // 5. Get role_id from role_name
    const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    const role_id = roleResult.rows[0].id;

    // 6. Update user (with or without password)
    let result;
    if (password && password.trim() !== '') {
      // Update with new password
      const password_hash = await bcrypt.hash(password, 10);
      result = await query(
        `UPDATE users 
         SET username = $1, full_name = $2, password_hash = $3, role_id = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, username, full_name, role_id, is_active`,
        [username, full_name, password_hash, role_id, id]
      );
    } else {
      // Update without changing password
      result = await query(
        `UPDATE users 
         SET username = $1, full_name = $2, role_id = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, username, full_name, role_id, is_active`,
        [username, full_name, role_id, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updatedUser = result.rows[0];

    return res.status(200).json({ 
      success: true, 
      data: {
        ...updatedUser,
        role_name: role_name
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update user' });
  }
};