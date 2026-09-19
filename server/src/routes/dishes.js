const express = require('express')
const router = express.Router()
const pool = require('../database')
const { ALL_KINDS } = require('../planGenerator')

const MEALS = ['comida', 'cena']

function cleanDish(d) {
  return {
    name: String(d.name || '').trim().slice(0, 200),
    kind: ALL_KINDS.includes(d.kind) ? d.kind : null,
    meal: MEALS.includes(d.meal) ? d.meal : null,
  }
}

// Platos del usuario: la lista de la que sale la rotación mensual
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, kind, meal FROM dishes WHERE user_id = $1 ORDER BY meal, kind, name', [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error('Error en GET /dishes:', err)
    res.status(500).json({ error: err.message })
  }
})

// Importar varios platos de golpe, solo si el usuario aún no tiene ninguno
router.post('/import', async (req, res) => {
  const { dishes } = req.body
  if (!Array.isArray(dishes) || dishes.length === 0 || dishes.length > 500) {
    return res.status(400).json({ error: 'dishes debe ser una lista de 1 a 500 platos' })
  }
  const clean = dishes.map(cleanDish)
  if (clean.some(d => !d.name || !d.kind || !d.meal)) return res.status(400).json({ error: 'cada plato necesita nombre, tipo y comida válidos' })
  try {
    const existing = await pool.query('SELECT 1 FROM dishes WHERE user_id = $1 LIMIT 1', [req.user.id])
    if (existing.rows.length > 0) return res.status(409).json({ error: 'ya tienes platos; bórralos antes de importar' })
    for (const d of clean) {
      await pool.query('INSERT INTO dishes (user_id, name, kind, meal) VALUES ($1, $2, $3, $4)', [req.user.id, d.name, d.kind, d.meal])
    }
    res.status(201).json({ ok: true, imported: clean.length })
  } catch (err) {
    console.error('Error en POST /dishes/import:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  const d = cleanDish(req.body)
  if (!d.name || !d.kind || !d.meal) return res.status(400).json({ error: 'nombre, tipo y comida son obligatorios' })
  try {
    const result = await pool.query('INSERT INTO dishes (user_id, name, kind, meal) VALUES ($1, $2, $3, $4) RETURNING id, name, kind, meal', [req.user.id, d.name, d.kind, d.meal])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error en POST /dishes:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM dishes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en DELETE /dishes/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
