const express = require('express')
const router = express.Router()
const pool = require('../database')

// Obtener el registro de actividad de un rango de fechas — filtrado por usuario
router.get('/', async (req, res) => {
  const { from, to } = req.query
  const userId = req.user.id
  if (!from || !to) {
    return res.status(400).json({ error: 'from y to son obligatorios' })
  }
  const result = await pool.query(`
    SELECT id, date, session_type, exercise_name, sets, reps, weight, duration_min, notes
    FROM activity_log
    WHERE user_id = $1 AND date BETWEEN $2 AND $3
    ORDER BY date ASC, id ASC
  `, [userId, from, to])
  res.json(result.rows)
})

// Registrar una entrada de actividad (un ejercicio o una sesión de cardio)
router.post('/', async (req, res) => {
  const { date, session_type, exercise_name, sets, reps, weight, duration_min, notes } = req.body
  const userId = req.user.id
  if (!date || !session_type || !exercise_name) {
    return res.status(400).json({ error: 'date, session_type y exercise_name son obligatorios' })
  }
  const result = await pool.query(`
    INSERT INTO activity_log (user_id, date, session_type, exercise_name, sets, reps, weight, duration_min, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [userId, date, session_type, exercise_name, sets || null, reps || null, weight || null, duration_min || null, notes || ''])
  res.status(201).json(result.rows[0])
})

// Editar una entrada de actividad — solo si es del usuario
router.put('/:id', async (req, res) => {
  const { session_type, exercise_name, sets, reps, weight, duration_min, notes } = req.body
  const userId = req.user.id
  await pool.query(`
    UPDATE activity_log SET session_type=$1, exercise_name=$2, sets=$3, reps=$4, weight=$5, duration_min=$6, notes=$7
    WHERE id=$8 AND user_id=$9
  `, [session_type, exercise_name, sets || null, reps || null, weight || null, duration_min || null, notes || '', req.params.id, userId])
  res.json({ ok: true })
})

// Eliminar una entrada de actividad — solo si es del usuario
router.delete('/:id', async (req, res) => {
  const userId = req.user.id
  await pool.query('DELETE FROM activity_log WHERE id = $1 AND user_id = $2', [req.params.id, userId])
  res.json({ ok: true })
})

module.exports = router
