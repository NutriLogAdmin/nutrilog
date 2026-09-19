const express = require('express')
const router = express.Router()
const pool = require('../database')

// Obtener perfil completo
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, avatar, weight, height, activity_level, goal_type, goal_kcal, goal_protein, goal_carbs, goal_satfat, goal_salt, goal_fiber, goal_sugar, takes_supplements, birth_year, gender FROM users WHERE id = $1',
    [req.user.id]
  )
  const row = result.rows[0]
  if (!row) return res.json({})
  const { birth_year, ...rest } = row
  res.json({ ...rest, age: birth_year ? new Date().getFullYear() - birth_year : null })
})

// Actualizar avatar
router.put('/avatar', async (req, res) => {
  const { avatar } = req.body
  await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, req.user.id])
  res.json({ ok: true })
})

// Actualizar solo el objetivo de kcal (edición rápida desde la principal)
router.put('/goal-kcal', async (req, res) => {
  const { goal_kcal } = req.body
  await pool.query('UPDATE users SET goal_kcal = $1 WHERE id = $2', [goal_kcal, req.user.id])
  res.json({ ok: true })
})

// Mostrar u ocultar la subpestaña de suplementos en Entreno
router.put('/supplements', async (req, res) => {
  try {
    await pool.query('UPDATE users SET takes_supplements = $1 WHERE id = $2', [req.body.takes === true, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en PUT /profile/supplements:', err)
    res.status(500).json({ error: err.message })
  }
})

const ACTIVITY_KEYS = ['sedentary', 'light', 'moderate', 'active', 'very_active']
const GOAL_KEYS = ['deficit', 'recomp', 'maintenance', 'bulk']

// Número dentro de un rango, o null si falta o no vale (null = «no cambiar este campo»).
function inRange(v, min, max) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

// Guardar datos corporales y/o objetivos. Solo se cambia lo que llega en la petición:
// antes cada campo ausente se guardaba como NULL, y guardar solo los objetivos desde el
// perfil borraba peso, altura, nivel de actividad y tipo de objetivo.
router.put('/goals', async (req, res) => {
  const b = req.body
  const age = inRange(b.age, 10, 110)
  const values = [
    inRange(b.weight, 20, 400), inRange(b.height, 80, 250),
    ACTIVITY_KEYS.includes(b.activity_level) ? b.activity_level : null,
    GOAL_KEYS.includes(b.goal_type) ? b.goal_type : null,
    inRange(b.goal_kcal, 500, 10000), inRange(b.goal_protein, 0, 1000), inRange(b.goal_carbs, 0, 2000),
    inRange(b.goal_satfat, 0, 500), inRange(b.goal_salt, 0, 100), inRange(b.goal_fiber, 0, 500), inRange(b.goal_sugar, 0, 1000),
    age === null ? null : new Date().getFullYear() - Math.round(age),
    b.gender === 'male' || b.gender === 'female' ? b.gender : null,
  ]
  try {
    await pool.query(`
      UPDATE users SET
        weight=COALESCE($1, weight), height=COALESCE($2, height),
        activity_level=COALESCE($3, activity_level), goal_type=COALESCE($4, goal_type),
        goal_kcal=COALESCE($5, goal_kcal), goal_protein=COALESCE($6, goal_protein), goal_carbs=COALESCE($7, goal_carbs),
        goal_satfat=COALESCE($8, goal_satfat), goal_salt=COALESCE($9, goal_salt), goal_fiber=COALESCE($10, goal_fiber),
        goal_sugar=COALESCE($11, goal_sugar), birth_year=COALESCE($12, birth_year), gender=COALESCE($13, gender)
      WHERE id=$14
    `, [...values, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en PUT /profile/goals:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router