const { query } = require('../db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date, manager, resource, technician, client, comment } = req.body;

    if (!date || !manager || !resource || !technician || !client) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await query(
      `INSERT INTO estimates (date, manager, resource, technician, client, comment, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [date, manager, resource, technician, client, comment || '', 'pending']
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to add estimate' });
  }
};