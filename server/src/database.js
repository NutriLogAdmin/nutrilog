const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS foods (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      food_id INTEGER NOT NULL REFERENCES foods(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      kcal_goal REAL NOT NULL DEFAULT 2500,
      UNIQUE(user_id, date)
    );
  `)
  console.log('Base de datos PostgreSQL inicializada')
}

initDB().catch(console.error)

async function migrateDB() {
  try {
    await pool.query(`ALTER TABLE entries ADD COLUMN IF NOT EXISTS meal TEXT DEFAULT 'comida'`)
    console.log('Migración OK')
  } catch (err) {
    console.error('Error en migración:', err)
  }
}

migrateDB()

module.exports = pool