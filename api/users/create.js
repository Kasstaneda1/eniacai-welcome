const bcrypt = require('bcrypt');
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
    const { username, full_name, password, role_name } = req.body;

    if (!username || !full_name || !password || !role_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    // 4. Check if username already exists
    const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    // 5. Get role_id from role_name
    const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    const role_id = roleResult.rows[0].id;

    // 6. Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // 7. Create user
    const result = await query(
      `INSERT INTO users (username, password_hash, full_name, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role_id, is_active, created_at`,
      [username, password_hash, full_name, role_id, true]
    );

    const newUser = result.rows[0];

    return res.status(201).json({ 
      success: true, 
      data: {
        ...newUser,
        role_name: role_name
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create user' });
  }
};