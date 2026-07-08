const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

async function run() {
  try {
    const res = await pool.query('SELECT id, status, candidate_name, candidate_email, passcode FROM interviews');
    console.log("INTERVIEWS IN DB:", res.rows);
  } catch (err) {
    console.error("DB ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

run();
