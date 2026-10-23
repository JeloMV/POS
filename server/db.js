const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDirectory = path.join(__dirname, '../data');
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath = process.env.SQLITE_DB_PATH || path.join(dataDirectory, 'pos.sqlite');
const sqlite = new Database(databasePath);

sqlite.pragma('foreign_keys = ON');

function query(sql, params = []) {
  const statement = sqlite.prepare(sql);
  const sqliteParams = params.map(value => typeof value === 'boolean' ? (value ? 1 : 0) : value);

  if (/^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql)) {
    return Promise.resolve([statement.all(...sqliteParams), undefined]);
  }

  const result = statement.run(...sqliteParams);
  return Promise.resolve([{
    insertId: Number(result.lastInsertRowid),
    affectedRows: result.changes
  }, undefined]);
}

module.exports = {
  query,
  getConnection: async () => ({
    query,
    beginTransaction: async () => sqlite.exec('BEGIN'),
    commit: async () => sqlite.exec('COMMIT'),
    rollback: async () => {
      if (sqlite.inTransaction) {
        sqlite.exec('ROLLBACK');
      }
    },
    release: () => {}
  })
};