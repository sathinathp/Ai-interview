const { Client, Pool, types } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Force pg to parse TIMESTAMP (OID 1114) as UTC rather than local time
types.setTypeParser(1114, function(stringValue) {
  return new Date(stringValue.replace(' ', 'T') + 'Z');
});

const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    console.log('Managed database connection detected via DATABASE_URL. Skipping dynamic database check.');
    return;
  }
  // Connect to default 'postgres' database to check/create target database if it doesn't exist
  const client = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [process.env.DB_NAME]);
    
    if (res.rowCount === 0) {
      console.log(`Database '${process.env.DB_NAME}' does not exist. Creating database...`);
      // Double quotes around DB name to handle any special characters or casing safely
      await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log(`Database '${process.env.DB_NAME}' created successfully.`);
    } else {
      console.log(`Database '${process.env.DB_NAME}' already exists.`);
    }
  } catch (err) {
    console.error('Error initializing target database in postgres:', err.message);
    console.log('Continuing connection to configured database. Assumes database already exists or will be created.');
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        ...dbConfig,
        database: process.env.DB_NAME,
      }
);

module.exports = {
  pool,
  initializeDatabase,
};
