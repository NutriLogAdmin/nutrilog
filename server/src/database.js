const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/nutrilog.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'g',
    kcal100 REAL NOT NULL,
    protein100 REAL NOT NULL DEFAULT 0,
    satfat100 REAL NOT NULL DEFAULT 0,
    carbs100 REAL NOT NULL DEFAULT 0,
    sugar100 REAL NOT NULL DEFAULT 0,
    fiber100 REAL NOT NULL DEFAULT 0,
    salt100 REAL NOT NULL DEFAULT 0,
    vitamins TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    FOREIGN KEY (food_id) REFERENCES foods(id)
  );

  CREATE TABLE IF NOT EXISTS daily_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    kcal_goal REAL NOT NULL DEFAULT 2500
  );
`);

module.exports = db;