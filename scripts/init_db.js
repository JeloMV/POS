require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function init() {
  console.log('Connecting to MySQL at', process.env.DB_HOST, 'user:', process.env.DB_USER);
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'admin123',
      multipleStatements: true
    });

    console.log('Connected to MySQL successfully!');
    const sql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf-8');
    await connection.query(sql);
    console.log('Database db123 created and seeded successfully!');
    await connection.end();
  } catch (err) {
    console.error('Error initializing database:', err.message);
    process.exit(1);
  }
}

init();
