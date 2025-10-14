const { query } = require('../db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, date, manager, resource, technician, client, comment } = req.body;

    if (!id || !date || !manager || !resource || !technician || !client) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await query(
      `UPDATE estimates 
       SET date = $1, manager = $2, resource = $3, technician = $4, client = $5, comment = $6
       WHERE id = $7
       RETURNING *`,
      [date, manager, resource, technician, client, comment || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update estimate' });
  }
};