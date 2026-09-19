const express = require('express')
const router = express.Router()
const pool = require('../database')

const COLORS = ['green', 'blue', 'amber', 'red', 'purple', 'gray']

function cleanRecipe(r) {
  return {
    title: String(r.title || '').trim().slice(0, 200),
    badge: String(r.badge || '').trim().slice(0, 60),
    color: COLORS.includes(r.color) ? r.color : 'gray',
    intro: String(r.intro || '').slice(0, 2000),
    steps: String(r.steps || '').slice(0, 8000),
    tip: String(r.tip || '').slice(0, 2000),
    macros: String(r.macros || '').slice(0, 1000),
    is_public: r.is_public === true,
  }
}

const COLUMNS = 'title, badge, color, intro, steps, tip, macros, is_public'

// Recetas propias + las que otros usuarios han marcado como compartidas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.title, r.badge, r.color, r.intro, r.steps, r.tip, r.macros, r.is_public,
             (r.user_id = $1) AS mine, u.username AS author
      FROM recipes r JOIN users u ON u.id = r.user_id
      WHERE r.user_id = $1 OR r.is_public = TRUE
      ORDER BY r.id ASC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error('Error en GET /recipes:', err)
    res.status(500).json({ error: err.message })
  }
})

// Importar varias recetas de golpe. Solo si el usuario aún no tiene ninguna propia,
// salvo que el JSON lleve `replace: true`: entonces borra las propias y las sustituye.
router.post('/import', async (req, res) => {
  const { recipes, replace } = req.body
  if (!Array.isArray(recipes) || recipes.length === 0 || recipes.length > 200) {
    return res.status(400).json({ error: 'recipes debe ser una lista de 1 a 200 recetas' })
  }
  const clean = recipes.map(cleanRecipe)
  if (clean.some(r => !r.title || !r.steps.trim())) return res.status(400).json({ error: 'cada receta necesita título y pasos' })
  try {
    if (replace === true) {
      await pool.query('DELETE FROM recipes WHERE user_id = $1', [req.user.id])
    } else {
      const existing = await pool.query('SELECT 1 FROM recipes WHERE user_id = $1 LIMIT 1', [req.user.id])
      if (existing.rows.length > 0) return res.status(409).json({ error: 'ya tienes recetas propias; bórralas antes de importar' })
    }
    for (const r of clean) {
      await pool.query(`
        INSERT INTO recipes (user_id, ${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [req.user.id, r.title, r.badge, r.color, r.intro, r.steps, r.tip, r.macros, r.is_public])
    }
    res.status(201).json({ ok: true, imported: clean.length })
  } catch (err) {
    console.error('Error en POST /recipes/import:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  const r = cleanRecipe(req.body)
  if (!r.title || !r.steps.trim()) return res.status(400).json({ error: 'título y pasos son obligatorios' })
  try {
    const result = await pool.query(`
      INSERT INTO recipes (user_id, ${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [req.user.id, r.title, r.badge, r.color, r.intro, r.steps, r.tip, r.macros, r.is_public])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error en POST /recipes:', err)
    res.status(500).json({ error: err.message })
  }
})

// Solo el autor puede editar o borrar una receta
router.put('/:id', async (req, res) => {
  const r = cleanRecipe(req.body)
  if (!r.title || !r.steps.trim()) return res.status(400).json({ error: 'título y pasos son obligatorios' })
  try {
    await pool.query(`
      UPDATE recipes SET title=$1, badge=$2, color=$3, intro=$4, steps=$5, tip=$6, macros=$7, is_public=$8
      WHERE id=$9 AND user_id=$10
    `, [r.title, r.badge, r.color, r.intro, r.steps, r.tip, r.macros, r.is_public, req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en PUT /recipes/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM recipes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en DELETE /recipes/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
