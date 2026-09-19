const express = require('express')
const router = express.Router()
const pool = require('../database')

function cleanItem(i) {
  return {
    category: String(i.category || '').trim().slice(0, 80) || 'Otros',
    name: String(i.name || '').trim().slice(0, 200),
    checked: i.checked === true,
  }
}

// Lista de la compra del usuario, en su orden
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, category, name, checked FROM shop_items
      WHERE user_id = $1 ORDER BY position ASC, id ASC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error('Error en GET /shopping:', err)
    res.status(500).json({ error: err.message })
  }
})

// Importar la lista de golpe. Solo si está vacía, para no duplicar.
router.post('/import', async (req, res) => {
  const { items } = req.body
  if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
    return res.status(400).json({ error: 'items debe ser una lista de 1 a 500 elementos' })
  }
  const clean = items.map(cleanItem)
  if (clean.some(i => !i.name)) return res.status(400).json({ error: 'todos los elementos necesitan nombre' })
  try {
    const existing = await pool.query('SELECT 1 FROM shop_items WHERE user_id = $1 LIMIT 1', [req.user.id])
    if (existing.rows.length > 0) return res.status(409).json({ error: 'ya tienes una lista; bórrala antes de importar' })
    for (let i = 0; i < clean.length; i++) {
      await pool.query(`
        INSERT INTO shop_items (user_id, position, category, name, checked) VALUES ($1, $2, $3, $4, $5)
      `, [req.user.id, i, clean[i].category, clean[i].name, clean[i].checked])
    }
    res.status(201).json({ ok: true, imported: clean.length })
  } catch (err) {
    console.error('Error en POST /shopping/import:', err)
    res.status(500).json({ error: err.message })
  }
})

// Desmarcar todo. Antes de '/:id' para que 'reset' no se interprete como un id.
router.post('/reset', async (req, res) => {
  try {
    await pool.query('UPDATE shop_items SET checked = FALSE WHERE user_id = $1', [req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en POST /shopping/reset:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  const item = cleanItem(req.body)
  if (!item.name) return res.status(400).json({ error: 'el nombre es obligatorio' })
  try {
    const result = await pool.query(`
      INSERT INTO shop_items (user_id, position, category, name, checked)
      VALUES ($1, COALESCE((SELECT MAX(position) + 1 FROM shop_items WHERE user_id = $1), 0), $2, $3, FALSE)
      RETURNING id, category, name, checked
    `, [req.user.id, item.category, item.name])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error en POST /shopping:', err)
    res.status(500).json({ error: err.message })
  }
})

// Marcar/desmarcar un elemento
router.put('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE shop_items SET checked = $1 WHERE id = $2 AND user_id = $3',
      [req.body.checked === true, req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en PUT /shopping/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM shop_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en DELETE /shopping/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
