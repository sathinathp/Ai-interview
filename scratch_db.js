const { Pool } = require('pg');
require('dotenv').config({ path: 'e:/Ai-interview/backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function run() {
  try {
    const res = await pool.query("SELECT * FROM interviews WHERE id = 'int-atl6ess1r'");
    console.log("INTERVIEW DATA:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}

run();
