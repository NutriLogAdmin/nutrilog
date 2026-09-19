const express = require('express')
const router = express.Router()
const pool = require('../database')

// Secciones que admiten tarjetas propias. Se amplía cuando se añada una nueva pantalla.
const SECTIONS = ['horarios', 'ejercicio', 'pesas', 'piernas', 'tabla', 'suplementos', 'cantidades']
const COLORS = ['green', 'blue', 'amber', 'red', 'purple', 'gray']

function cleanCard(c) {
  return {
    color: COLORS.includes(c.color) ? c.color : 'gray',
    time_label: String(c.time_label || '').slice(0, 40),
    title: String(c.title || '').trim().slice(0, 200),
    body: String(c.body || '').slice(0, 4000),
  }
}

// Tarjetas del usuario en una sección, en su orden
router.get('/', async (req, res) => {
  const { section } = req.query
  if (!SECTIONS.includes(section)) return res.status(400).json({ error: 'sección no válida' })
  try {
    const result = await pool.query(`
      SELECT id, section, position, color, time_label, title, body
      FROM content_cards WHERE user_id = $1 AND section = $2
      ORDER BY position ASC, id ASC
    `, [req.user.id, section])
    res.json(result.rows)
  } catch (err) {
    console.error('Error en GET /content:', err)
    res.status(500).json({ error: err.message })
  }
})

// Importar varias tarjetas de golpe. Solo si la sección está vacía, para no duplicar
// si se pulsa dos veces.
router.post('/import', async (req, res) => {
  const { section, cards } = req.body
  if (!SECTIONS.includes(section)) return res.status(400).json({ error: 'sección no válida' })
  if (!Array.isArray(cards) || cards.length === 0 || cards.length > 200) {
    return res.status(400).json({ error: 'cards debe ser una lista de 1 a 200 tarjetas' })
  }
  const clean = cards.map(cleanCard)
  if (clean.some(c => !c.title)) return res.status(400).json({ error: 'todas las tarjetas necesitan título' })
  try {
    const existing = await pool.query('SELECT 1 FROM content_cards WHERE user_id = $1 AND section = $2 LIMIT 1', [req.user.id, section])
    if (existing.rows.length > 0) return res.status(409).json({ error: 'ya tienes tarjetas en esta sección; bórralas antes de importar' })
    for (let i = 0; i < clean.length; i++) {
      const c = clean[i]
      await pool.query(`
        INSERT INTO content_cards (user_id, section, position, color, time_label, title, body)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [req.user.id, section, i, c.color, c.time_label, c.title, c.body])
    }
    res.status(201).json({ ok: true, imported: clean.length })
  } catch (err) {
    console.error('Error en POST /content/import:', err)
    res.status(500).json({ error: err.message })
  }
})

// Importar varias secciones a la vez: { sections: { horarios: [...], pesas: [...] } }.
// Cada sección solo se importa si está vacía; las que ya tienen tarjetas se saltan.
router.post('/import-all', async (req, res) => {
  const { sections } = req.body
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    return res.status(400).json({ error: 'sections debe ser un objeto {sección: [tarjetas]}' })
  }
  const names = Object.keys(sections)
  if (names.length === 0 || names.some(n => !SECTIONS.includes(n))) {
    return res.status(400).json({ error: `secciones válidas: ${SECTIONS.join(', ')}` })
  }
  const prepared = {}
  for (const name of names) {
    const list = sections[name]
    if (!Array.isArray(list) || list.length === 0 || list.length > 200) {
      return res.status(400).json({ error: `«${name}» debe ser una lista de 1 a 200 tarjetas` })
    }
    prepared[name] = list.map(cleanCard)
    if (prepared[name].some(c => !c.title)) return res.status(400).json({ error: `«${name}»: todas las tarjetas necesitan título` })
  }
  try {
    const imported = {}
    const skipped = []
    for (const name of names) {
      const existing = await pool.query('SELECT 1 FROM content_cards WHERE user_id = $1 AND section = $2 LIMIT 1', [req.user.id, name])
      if (existing.rows.length > 0) { skipped.push(name); continue }
      for (let i = 0; i < prepared[name].length; i++) {
        const c = prepared[name][i]
        await pool.query(`
          INSERT INTO content_cards (user_id, section, position, color, time_label, title, body)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [req.user.id, name, i, c.color, c.time_label, c.title, c.body])
      }
      imported[name] = prepared[name].length
    }
    res.status(201).json({ ok: true, imported, skipped })
  } catch (err) {
    console.error('Error en POST /content/import-all:', err)
    res.status(500).json({ error: err.message })
  }
})

// Reordenar: recibe la lista de ids en el orden nuevo. Antes de '/:id' para que 'order'
// no se interprete como un id.
router.put('/order', async (req, res) => {
  const { section, ids } = req.body
  if (!SECTIONS.includes(section) || !Array.isArray(ids)) return res.status(400).json({ error: 'datos no válidos' })
  try {
    for (let i = 0; i < ids.length; i++) {
      await pool.query('UPDATE content_cards SET position = $1 WHERE id = $2 AND user_id = $3 AND section = $4',
        [i, parseInt(ids[i], 10), req.user.id, section])
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en PUT /content/order:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  const { section } = req.body
  if (!SECTIONS.includes(section)) return res.status(400).json({ error: 'sección no válida' })
  const c = cleanCard(req.body)
  if (!c.title) return res.status(400).json({ error: 'el título es obligatorio' })
  try {
    const result = await pool.query(`
      INSERT INTO content_cards (user_id, section, position, color, time_label, title, body)
      VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM content_cards WHERE user_id = $1 AND section = $2), 0), $3, $4, $5, $6)
      RETURNING id, section, position, color, time_label, title, body
    `, [req.user.id, section, c.color, c.time_label, c.title, c.body])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error en POST /content:', err)
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  const c = cleanCard(req.body)
  if (!c.title) return res.status(400).json({ error: 'el título es obligatorio' })
  try {
    await pool.query(`
      UPDATE content_cards SET color = $1, time_label = $2, title = $3, body = $4
      WHERE id = $5 AND user_id = $6
    `, [c.color, c.time_label, c.title, c.body, req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en PUT /content/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM content_cards WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en DELETE /content/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
