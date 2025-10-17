const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('./db');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password }); // ВРЕМЕННО для дебага

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find user in database
    const result = await query(`
      SELECT u.id, u.username, u.password_hash, u.full_name, u.is_active, u.role_id, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.username = $1
    `, [username]);

    // User not found
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        role_id: user.role_id,
        role_name: user.role_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '15h' }
    );

    // Determine redirect based on role
    let redirect = '/estimates.html'; // Default for operators
    
    if (user.role_name === 'superadmin') {
      redirect = '/dashboard.html';
    } else if (user.role_name === 'technician') {
      redirect = '/technician.html';
    }

    // Success response
    return res.status(200).json({
      success: true,
      token: token,
      role: user.role_name,
      redirect: redirect,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};