const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDirectory = path.join(__dirname, '../data');
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath = path.join(dataDirectory, 'pos.sqlite');
const db = new Database(databasePath);

db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(
  path.join(__dirname, '../schema.sql'),
  'utf8'
);

db.exec(schema);
db.close();

console.log(`SQLite database initialized at ${databasePath}`);