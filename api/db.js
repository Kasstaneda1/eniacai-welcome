const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL or DATABASE_PUBLIC_URL not found in environment variables');
    }

    pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

async function query(text, params) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result;
}

module.exports = { getPool, query };