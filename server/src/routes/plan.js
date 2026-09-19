const express = require('express')
const router = express.Router()
const pool = require('../database')
const { generatePlan, weeksInMonth, MAIN_KINDS } = require('../planGenerator')

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const WEEK_SECTIONS = ['s1', 's2', 's3', 's4', 's5']

// Estado del plan para el mes que manda el cliente (AAAA-MM): si hay plan, de qué mes es y
// si toca rotarlo. El mes lo da el cliente para que coincida con la fecha que ve el usuario.
router.get('/status', async (req, res) => {
  const { month } = req.query
  if (!MONTH_RE.test(month || '')) return res.status(400).json({ error: 'month debe ser AAAA-MM' })
  try {
    const [cards, dishes, user] = await Promise.all([
      pool.query('SELECT 1 FROM content_cards WHERE user_id = $1 AND section = ANY($2) LIMIT 1', [req.user.id, WEEK_SECTIONS]),
      pool.query('SELECT COUNT(*)::int AS n FROM dishes WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT plan_month FROM users WHERE id = $1', [req.user.id]),
    ])
    const hasPlan = cards.rows.length > 0
    let planMonth = user.rows[0]?.plan_month || null
    // Un plan que ya existía sin mes anotado (importado antes de esta función) se da por
    // bueno para el mes actual: así no se ofrece rotarlo justo el primer día.
    if (hasPlan && !planMonth) {
      planMonth = month
      await pool.query('UPDATE users SET plan_month = $1 WHERE id = $2', [month, req.user.id])
    }
    res.json({
      hasPlan,
      planMonth,
      dishCount: dishes.rows[0].n,
      weeks: weeksInMonth(month),
      needsRotation: !!planMonth && planMonth < month,
    })
  } catch (err) {
    console.error('Error en GET /plan/status:', err)
    res.status(500).json({ error: err.message })
  }
})

// Genera las semanas del mes con los platos del usuario y sustituye las anteriores (s1..s5).
router.post('/rotate', async (req, res) => {
  const { month } = req.body
  if (!MONTH_RE.test(month || '')) return res.status(400).json({ error: 'month debe ser AAAA-MM' })
  const client = await pool.connect()
  try {
    const dishes = (await client.query('SELECT id, name, kind, meal FROM dishes WHERE user_id = $1 ORDER BY id', [req.user.id])).rows
    if (!dishes.some(d => MAIN_KINDS.includes(d.kind))) {
      return res.status(400).json({ error: 'Añade al menos un plato principal en «Mis platos» para poder rotar' })
    }
    const rows = (await client.query(`
      SELECT section, color, time_label, title, body FROM content_cards
      WHERE user_id = $1 AND section = ANY($2) ORDER BY section, position, id
    `, [req.user.id, WEEK_SECTIONS])).rows
    const previous = {}
    for (const r of rows) (previous[r.section] = previous[r.section] || []).push(r)

    const weeks = weeksInMonth(month)
    const generated = generatePlan({ dishes, previous, weeks })

    await client.query('BEGIN')
    await client.query('DELETE FROM content_cards WHERE user_id = $1 AND section = ANY($2)', [req.user.id, WEEK_SECTIONS])
    for (const [section, cards] of Object.entries(generated)) {
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i]
        await client.query(`
          INSERT INTO content_cards (user_id, section, position, color, time_label, title, body)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [req.user.id, section, i, c.color, c.time_label || '', c.title.slice(0, 200), c.body.slice(0, 4000)])
      }
    }
    await client.query('UPDATE users SET plan_month = $1 WHERE id = $2', [month, req.user.id])
    await client.query('COMMIT')
    res.json({ ok: true, weeks })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error en POST /plan/rotate:', err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
