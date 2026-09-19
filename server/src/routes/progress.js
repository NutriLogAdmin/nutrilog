const express = require('express')
const router = express.Router()
const pool = require('../database')

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : null
}

function cleanEntry(e) {
  return {
    date: String(e.date || ''),
    weight: num(e.weight),
    waist: num(e.waist),
    chest: num(e.chest),
    under_chest: num(e.under_chest),
    arm: num(e.arm),
    note: String(e.note || '').trim().slice(0, 300),
  }
}

const hasValue = e => [e.weight, e.waist, e.chest, e.under_chest, e.arm].some(v => v !== null)

// Todos los registros del usuario, del más antiguo al más reciente
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, date, weight, waist, chest, under_chest, arm, note
      FROM body_measurements WHERE user_id = $1 ORDER BY date ASC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error('Error en GET /progress:', err)
    res.status(500).json({ error: err.message })
  }
})

// Importar el histórico de golpe. Solo si aún no hay registros, para no duplicar.
router.post('/import', async (req, res) => {
  const { entries } = req.body
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 500) {
    return res.status(400).json({ error: 'entries debe ser una lista de 1 a 500 registros' })
  }
  const clean = entries.map(cleanEntry)
  if (clean.some(e => !DATE_RE.test(e.date) || !hasValue(e))) {
    return res.status(400).json({ error: 'cada registro necesita fecha AAAA-MM-DD y al menos una medida' })
  }
  try {
    const existing = await pool.query('SELECT 1 FROM body_measurements WHERE user_id = $1 LIMIT 1', [req.user.id])
    if (existing.rows.length > 0) return res.status(409).json({ error: 'ya tienes registros; bórralos antes de importar' })
    for (const e of clean) {
      await pool.query(`
        INSERT INTO body_measurements (user_id, date, weight, waist, chest, under_chest, arm, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, date) DO NOTHING
      `, [req.user.id, e.date, e.weight, e.waist, e.chest, e.under_chest, e.arm, e.note])
    }
    res.status(201).json({ ok: true, imported: clean.length })
  } catch (err) {
    console.error('Error en POST /progress/import:', err)
    res.status(500).json({ error: err.message })
  }
})

// Crear el registro de una fecha, o actualizarlo si ya existía
router.put('/', async (req, res) => {
  const e = cleanEntry(req.body)
  if (!DATE_RE.test(e.date)) return res.status(400).json({ error: 'fecha no válida' })
  if (!hasValue(e)) return res.status(400).json({ error: 'pon al menos una medida' })
  try {
    await pool.query(`
      INSERT INTO body_measurements (user_id, date, weight, waist, chest, under_chest, arm, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, date)
      DO UPDATE SET weight=$3, waist=$4, chest=$5, under_chest=$6, arm=$7, note=$8
    `, [req.user.id, e.date, e.weight, e.waist, e.chest, e.under_chest, e.arm, e.note])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en PUT /progress:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM body_measurements WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en DELETE /progress/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
