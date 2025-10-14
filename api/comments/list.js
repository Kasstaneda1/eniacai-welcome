    const { query } = require('../db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { estimate_id } = req.query;

    if (!estimate_id) {
      return res.status(400).json({ success: false, error: 'Missing estimate_id' });
    }

    const result = await query(
      'SELECT * FROM comments WHERE estimate_id = $1 ORDER BY created_at DESC',
      [estimate_id]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
};