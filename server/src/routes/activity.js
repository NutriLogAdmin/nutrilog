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
    SELECT id, date, session_type, exercise_name, sets, reps, weight, duration_min, notes,
           kcal_active, kcal_total, hr_avg, effort, intervals, distance_km, pace_avg, elevation_m
    FROM activity_log
    WHERE user_id = $1 AND date BETWEEN $2 AND $3
    ORDER BY date ASC, id ASC
  `, [userId, from, to])
  res.json(result.rows)
})

// Registrar una entrada de actividad (un ejercicio o una sesión de cardio)
router.post('/', async (req, res) => {
  const {
    date, session_type, exercise_name, sets, reps, weight, duration_min, notes,
    kcal_active, kcal_total, hr_avg, effort, intervals, distance_km, pace_avg, elevation_m,
  } = req.body
  const userId = req.user.id
  if (!date || !session_type || !exercise_name) {
    return res.status(400).json({ error: 'date, session_type y exercise_name son obligatorios' })
  }
  const result = await pool.query(`
    INSERT INTO activity_log (
      user_id, date, session_type, exercise_name, sets, reps, weight, duration_min, notes,
      kcal_active, kcal_total, hr_avg, effort, intervals, distance_km, pace_avg, elevation_m
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *
  `, [
    userId, date, session_type, exercise_name.trim(),
    sets || null, reps || null, weight || null, duration_min || null, notes || '',
    kcal_active || null, kcal_total || null, hr_avg || null, effort || null, intervals || null,
    distance_km || null, pace_avg || null, elevation_m || null,
  ])
  res.status(201).json(result.rows[0])
})

// Resumen de sesión (torso/piernas/core): un dato de reloj para todo el entrenamiento,
// no uno por cada ejercicio suelto.
router.get('/sessions', async (req, res) => {
  const { from, to } = req.query
  const userId = req.user.id
  if (!from || !to) {
    return res.status(400).json({ error: 'from y to son obligatorios' })
  }
  const result = await pool.query(`
    SELECT date, session_type, kcal_active, kcal_total, hr_avg, effort
    FROM activity_sessions
    WHERE user_id = $1 AND date BETWEEN $2 AND $3
  `, [userId, from, to])
  res.json(result.rows)
})

// Guardar/actualizar el resumen de una sesión — un registro por usuario+fecha+tipo
router.put('/sessions', async (req, res) => {
  const { date, session_type, kcal_active, kcal_total, hr_avg, effort } = req.body
  const userId = req.user.id
  if (!date || !session_type) {
    return res.status(400).json({ error: 'date y session_type son obligatorios' })
  }
  const result = await pool.query(`
    INSERT INTO activity_sessions (user_id, date, session_type, kcal_active, kcal_total, hr_avg, effort)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, date, session_type)
    DO UPDATE SET kcal_active=$4, kcal_total=$5, hr_avg=$6, effort=$7
    RETURNING *
  `, [userId, date, session_type, kcal_active || null, kcal_total || null, hr_avg || null, effort || null])
  res.json(result.rows[0])
})

// Editar una entrada de actividad — solo si es del usuario
router.put('/:id', async (req, res) => {
  const {
    session_type, exercise_name, sets, reps, weight, duration_min, notes,
    kcal_active, kcal_total, hr_avg, effort, intervals, distance_km, pace_avg, elevation_m,
  } = req.body
  const userId = req.user.id
  await pool.query(`
    UPDATE activity_log SET
      session_type=$1, exercise_name=$2, sets=$3, reps=$4, weight=$5, duration_min=$6, notes=$7,
      kcal_active=$8, kcal_total=$9, hr_avg=$10, effort=$11, intervals=$12, distance_km=$13, pace_avg=$14, elevation_m=$15
    WHERE id=$16 AND user_id=$17
  `, [
    session_type, exercise_name, sets || null, reps || null, weight || null, duration_min || null, notes || '',
    kcal_active || null, kcal_total || null, hr_avg || null, effort || null, intervals || null,
    distance_km || null, pace_avg || null, elevation_m || null,
    req.params.id, userId,
  ])
  res.json({ ok: true })
})

// Eliminar una entrada de actividad — solo si es del usuario
router.delete('/:id', async (req, res) => {
  const userId = req.user.id
  await pool.query('DELETE FROM activity_log WHERE id = $1 AND user_id = $2', [req.params.id, userId])
  res.json({ ok: true })
})

module.exports = router
