const express = require('express')
const router = express.Router()
const pool = require('../database')

// Obtener todos los alimentos del catálogo (compartido)
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM foods ORDER BY name ASC')
  res.json(result.rows)
})

// Buscar alimentos por nombre
router.get('/search', async (req, res) => {
  const { q } = req.query
  const result = await pool.query(
    'SELECT * FROM foods WHERE name ILIKE $1 ORDER BY name ASC',
    [`%${q}%`]
  )
  res.json(result.rows)
})

// Añadir alimento al catálogo (compartido)
router.post('/', async (req, res) => {
  const { name, unit, kcal100, protein100, satfat100, carbs100, sugar100, fiber100, salt100, vitamins, category } = req.body
  if (!name || kcal100 === undefined) {
    return res.status(400).json({ error: 'Nombre y calorías son obligatorios' })
  }
  const result = await pool.query(`
    INSERT INTO foods (name, unit, kcal100, protein100, satfat100, carbs100, sugar100, fiber100, salt100, vitamins, category)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
  `, [name, unit || 'g', kcal100, protein100 || 0, satfat100 || 0, carbs100 || 0, sugar100 || 0, fiber100 || 0, salt100 || 0, vitamins || '', category || 'otros'])
  res.status(201).json(result.rows[0])
})

// Eliminar alimento del catálogo
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM foods WHERE id = $1', [req.params.id])
  res.json({ ok: true })
})

// Editar alimento del catálogo
router.put('/:id', async (req, res) => {
  const { name, unit, kcal100, protein100, satfat100, carbs100, sugar100, fiber100, salt100, vitamins, category } = req.body
  await pool.query(`
    UPDATE foods SET name=$1, unit=$2, kcal100=$3, protein100=$4, satfat100=$5,
    carbs100=$6, sugar100=$7, fiber100=$8, salt100=$9, vitamins=$10, category=$11
    WHERE id=$12
  `, [name, unit, kcal100, protein100, satfat100, carbs100, sugar100, fiber100, salt100, vitamins, category, req.params.id])
  res.json({ ok: true })
})

// Obtener entradas de un día — filtradas por usuario
router.get('/entries', async (req, res) => {
  const { date } = req.query
  const userId = req.user.id
  const result = await pool.query(`
    SELECT e.id, e.amount, e.date, e.time, e.meal,
           f.name, f.unit, f.kcal100, f.protein100, f.satfat100,
           f.carbs100, f.sugar100, f.fiber100, f.salt100, f.vitamins
    FROM entries e
    JOIN foods f ON e.food_id = f.id
    WHERE e.date = $1 AND e.user_id = $2
    ORDER BY e.time ASC
  `, [date, userId])
  res.json(result.rows)
})

// Registrar ingesta — asociada al usuario
router.post('/entries', async (req, res) => {
  const { food_id, amount, date, time, meal } = req.body
  const userId = req.user.id
  if (!food_id || !amount || !date) {
    return res.status(400).json({ error: 'food_id, amount y date son obligatorios' })
  }
  const result = await pool.query(
    'INSERT INTO entries (user_id, food_id, amount, date, time, meal) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [userId, food_id, amount, date, time || new Date().toTimeString().slice(0, 5), meal || 'comida']
  )
  res.status(201).json({ id: result.rows[0].id })
})

// Editar entrada
router.put('/entries/:id', async (req, res) => {
  const { food_id, amount, meal, date, time } = req.body
  const userId = req.user.id
  await pool.query(
    'UPDATE entries SET food_id=$1, amount=$2, meal=$3, date=$4, time=$5 WHERE id=$6 AND user_id=$7',
    [food_id, amount, meal, date, time, req.params.id, userId]
  )
  res.json({ ok: true })
})

// Eliminar entrada — solo si es del usuario
router.delete('/entries/:id', async (req, res) => {
  const userId = req.user.id
  await pool.query('DELETE FROM entries WHERE id = $1 AND user_id = $2', [req.params.id, userId])
  res.json({ ok: true })
})

// Obtener objetivo calórico del usuario
router.get('/goal', async (req, res) => {
  const { date } = req.query
  const userId = req.user.id
  const result = await pool.query(
    'SELECT * FROM daily_goals WHERE date = $1 AND user_id = $2',
    [date, userId]
  )
  res.json({ kcal_goal: result.rows[0] ? result.rows[0].kcal_goal : 2500 })
})

// Guardar objetivo calórico del usuario
router.post('/goal', async (req, res) => {
  const { date, kcal_goal } = req.body
  const userId = req.user.id
  await pool.query(`
    INSERT INTO daily_goals (user_id, date, kcal_goal) VALUES ($1, $2, $3)
    ON CONFLICT (user_id, date) DO UPDATE SET kcal_goal = EXCLUDED.kcal_goal
  `, [userId, date, kcal_goal])
  res.json({ ok: true })
})

module.exports = router