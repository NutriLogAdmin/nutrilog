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

    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      session_type TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      weight REAL,
      duration_min REAL,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Resumen de una sesión completa (torso/piernas/core): el reloj mide kcal/FC/esfuerzo
    -- para todo el entrenamiento, no por ejercicio suelto, así que va aparte de activity_log.
    CREATE TABLE IF NOT EXISTS activity_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      session_type TEXT NOT NULL,
      kcal_active REAL,
      kcal_total REAL,
      hr_avg INTEGER,
      effort INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, date, session_type)
    );
  `)
  console.log('Base de datos PostgreSQL inicializada')
}

initDB().catch(console.error)

async function migrateDB() {
  try {
    await pool.query(`ALTER TABLE entries ADD COLUMN IF NOT EXISTS meal TEXT DEFAULT 'comida'`)
    await pool.query(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'otros'`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS weight REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS height REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_kcal REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_protein REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_carbs REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_satfat REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_salt REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_fiber REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_sugar REAL DEFAULT NULL`)
    // Datos del reloj/app de fitness — comunes a cualquier ejercicio.
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS kcal_active REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS kcal_total REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS hr_avg INTEGER DEFAULT NULL`)
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS effort INTEGER DEFAULT NULL`)
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS intervals TEXT DEFAULT NULL`)
    // Solo para "Andar": el resto de ejercicios no llevan estos tres.
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS distance_km REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS pace_avg TEXT DEFAULT NULL`)
    await pool.query(`ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS elevation_m REAL DEFAULT NULL`)
    await pool.query(`ALTER TABLE activity_sessions ADD COLUMN IF NOT EXISTS duration_min REAL DEFAULT NULL`)
    console.log('Migración OK')
  } catch (err) {
    console.error('Error en migración:', err)
  }
}

migrateDB()

module.exports = pool