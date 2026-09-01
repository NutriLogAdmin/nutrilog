const express = require('express')
const router = express.Router()
const pool = require('../database')

// Obtener perfil completo
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, avatar, weight, height, activity_level, goal_type, goal_kcal, goal_protein, goal_carbs, goal_satfat, goal_salt, goal_fiber FROM users WHERE id = $1',
    [req.user.id]
  )
  res.json(result.rows[0] || {})
})

// Actualizar avatar
router.put('/avatar', async (req, res) => {
  const { avatar } = req.body
  await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, req.user.id])
  res.json({ ok: true })
})

// Guardar objetivos del usuario
router.put('/goals', async (req, res) => {
  const { weight, height, activity_level, goal_type, goal_kcal, goal_protein, goal_carbs, goal_satfat, goal_salt, goal_fiber } = req.body
  await pool.query(`
    UPDATE users SET
      weight=$1, height=$2, activity_level=$3, goal_type=$4,
      goal_kcal=$5, goal_protein=$6, goal_carbs=$7,
      goal_satfat=$8, goal_salt=$9, goal_fiber=$10
    WHERE id=$11
  `, [weight, height, activity_level, goal_type, goal_kcal, goal_protein, goal_carbs, goal_satfat, goal_salt, goal_fiber, req.user.id])
  res.json({ ok: true })
})

module.exports = router