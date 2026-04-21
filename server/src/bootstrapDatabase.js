const { Client } = require('pg');

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function bootstrapDatabase() {
  const host = getRequiredEnv('DB_HOST');
  const port = Number(getRequiredEnv('DB_PORT'));
  const user = getRequiredEnv('DB_USER');
  const password = getRequiredEnv('DB_PASSWORD');
  const targetDatabase = getRequiredEnv('DB_NAME');

  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  await adminClient.connect();

  try {
    const existsResult = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDatabase]
    );

    if (existsResult.rowCount === 0) {
      const quotedDbName = quoteIdentifier(targetDatabase);
      await adminClient.query(`CREATE DATABASE ${quotedDbName}`);
      console.log(`Database created: ${targetDatabase}`);
    } else {
      console.log(`Database already exists: ${targetDatabase}`);
    }
  } finally {
    await adminClient.end();
  }

  const appClient = new Client({
    host,
    port,
    user,
    password,
    database: targetDatabase,
  });

  await appClient.connect();

  try {
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    await appClient.end();
  }
}

module.exports = { bootstrapDatabase };
