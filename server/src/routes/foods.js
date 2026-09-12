const express = require('express')
const router = express.Router()
const pool = require('../database')

// Obtener todos los alimentos del catálogo (compartido)
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM foods ORDER BY name ASC')
  res.json(result.rows)
})

// Buscar alimentos por nombre
router.get('/search', async (req, res) => {
  const { q } = req.query
  const result = await pool.query(
    'SELECT * FROM foods WHERE name ILIKE $1 ORDER BY name ASC',
    [`%${q}%`]
  )
  res.json(result.rows)
})

// Añadir alimento al catálogo (compartido)
router.post('/', async (req, res) => {
  const { name, unit, kcal100, protein100, satfat100, carbs100, sugar100, fiber100, salt100, vitamins, category } = req.body
  if (!name || kcal100 === undefined) {
    return res.status(400).json({ error: 'Nombre y calorías son obligatorios' })
  }
  const result = await pool.query(`
    INSERT INTO foods (name, unit, kcal100, protein100, satfat100, carbs100, sugar100, fiber100, salt100, vitamins, category)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
  `, [name, unit || 'g', kcal100, protein100 || 0, satfat100 || 0, carbs100 || 0, sugar100 || 0, fiber100 || 0, salt100 || 0, vitamins || '', category || 'otros'])
  res.status(201).json(result.rows[0])
})

// Eliminar alimento del catálogo
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM foods WHERE id = $1', [req.params.id])
  res.json({ ok: true })
})

// Editar alimento del catálogo
router.put('/:id', async (req, res) => {
  const { name, unit, kcal100, protein100, satfat100, carbs100, sugar100, fiber100, salt100, vitamins, category } = req.body
  await pool.query(`
    UPDATE foods SET name=$1, unit=$2, kcal100=$3, protein100=$4, satfat100=$5,
    carbs100=$6, sugar100=$7, fiber100=$8, salt100=$9, vitamins=$10, category=$11
    WHERE id=$12
  `, [name, unit, kcal100, protein100, satfat100, carbs100, sugar100, fiber100, salt100, vitamins, category, req.params.id])
  res.json({ ok: true })
})

// Obtener entradas de un día — filtradas por usuario
router.get('/entries', async (req, res) => {
  const { date } = req.query
  const userId = req.user.id
  const result = await pool.query(`
    SELECT e.id, e.amount, e.date, e.time, e.meal,
           f.name, f.unit, f.category, f.kcal100, f.protein100, f.satfat100,
           f.carbs100, f.sugar100, f.fiber100, f.salt100, f.vitamins
    FROM entries e
    JOIN foods f ON e.food_id = f.id
    WHERE e.date = $1 AND e.user_id = $2
    ORDER BY e.time ASC
  `, [date, userId])
  res.json(result.rows)
})

// Registrar ingesta — asociada al usuario
router.post('/entries', async (req, res) => {
  const { food_id, amount, date, time, meal } = req.body
  const userId = req.user.id
  if (!food_id || !amount || !date) {
    return res.status(400).json({ error: 'food_id, amount y date son obligatorios' })
  }
  const result = await pool.query(
    'INSERT INTO entries (user_id, food_id, amount, date, time, meal) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [userId, food_id, amount, date, time || new Date().toTimeString().slice(0, 5), meal || 'comida']
  )
  res.status(201).json({ id: result.rows[0].id })
})

// Editar entrada
router.put('/entries/:id', async (req, res) => {
  const { food_id, amount, meal, date, time } = req.body
  const userId = req.user.id
  await pool.query(
    'UPDATE entries SET food_id=$1, amount=$2, meal=$3, date=$4, time=$5 WHERE id=$6 AND user_id=$7',
    [food_id, amount, meal, date, time, req.params.id, userId]
  )
  res.json({ ok: true })
})

// Eliminar entrada — solo si es del usuario
router.delete('/entries/:id', async (req, res) => {
  const userId = req.user.id
  await pool.query('DELETE FROM entries WHERE id = $1 AND user_id = $2', [req.params.id, userId])
  res.json({ ok: true })
})

// Obtener objetivo calórico del usuario
router.get('/goal', async (req, res) => {
  const { date } = req.query
  const userId = req.user.id
  const result = await pool.query(
    'SELECT * FROM daily_goals WHERE date = $1 AND user_id = $2',
    [date, userId]
  )
  res.json({ kcal_goal: result.rows[0] ? result.rows[0].kcal_goal : 2500 })
})

// Guardar objetivo calórico del usuario
router.post('/goal', async (req, res) => {
  const { date, kcal_goal } = req.body
  const userId = req.user.id
  await pool.query(`
    INSERT INTO daily_goals (user_id, date, kcal_goal) VALUES ($1, $2, $3)
    ON CONFLICT (user_id, date) DO UPDATE SET kcal_goal = EXCLUDED.kcal_goal
  `, [userId, date, kcal_goal])
  res.json({ ok: true })
})

// Límite barato contra un uso descontrolado del escaneo con IA (cuesta dinero real por
// llamada). En memoria: se reinicia con cada despliegue, y para el uso real de esta app
// eso es más que suficiente.
const SCAN_LIMIT_PER_DAY = 30
const scanLog = new Map()
function scanAllowed(userId) {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const recientes = (scanLog.get(userId) || []).filter(t => now - t < dayMs)
  if (recientes.length >= SCAN_LIMIT_PER_DAY) return false
  recientes.push(now)
  scanLog.set(userId, recientes)
  return true
}

const SCAN_PROMPT = `Analiza esta foto de una etiqueta de información nutricional de un producto alimenticio.
Devuelve ÚNICAMENTE un objeto JSON (sin texto antes ni después, sin bloques de código \`\`\`), con esta forma exacta:
{
  "name": "nombre del producto tal como aparece en el envase, o cadena vacía si no se ve",
  "category": "una de estas, la que mejor encaje: frutas, verduras, carnes, pescados, lacteos, cereales, legumbres, bebidas, snacks, salsas, otros",
  "unit": "g si es sólido, ml si es líquido",
  "kcal100": número — kcal por 100g o 100ml. Si la etiqueta solo trae kJ, convierte dividiendo entre 4.184,
  "protein100": número — proteínas por 100g/ml,
  "carbs100": número — hidratos de carbono por 100g/ml,
  "sugar100": número — de los cuales azúcares, por 100g/ml,
  "satfat100": número — de las cuales saturadas, por 100g/ml,
  "fiber100": número — fibra por 100g/ml,
  "salt100": número — sal por 100g/ml
}
Usa siempre la columna "por 100g" o "por 100ml" de la tabla, nunca la de "por ración". Si un dato no aparece en la etiqueta, pon 0. Los números en formato decimal con punto, sin unidades ni texto dentro del valor.`

// Analizar foto de etiqueta con Claude (vision) y devolver los campos ya estructurados
router.post('/scan', async (req, res) => {
  const { image, mediaType } = req.body
  const userId = req.user.id

  if (!image) {
    return res.status(400).json({ error: 'Falta la imagen' })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor' })
  }
  if (!scanAllowed(userId)) {
    return res.status(429).json({ error: `Límite de ${SCAN_LIMIT_PER_DAY} escaneos por día alcanzado. Inténtalo mañana.` })
  }

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: SCAN_PROMPT }
          ]
        }]
      })
    })
    const data = await aiRes.json()
    if (!aiRes.ok) {
      console.error('Error de Anthropic API:', data)
      return res.status(502).json({ error: data?.error?.message || 'Error al llamar a la IA' })
    }
    const raw = data.content?.[0]?.text || ''
    const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    res.json(parsed)
  } catch (err) {
    console.error('Error analizando etiqueta:', err)
    res.status(500).json({ error: 'No se pudo analizar la imagen. Prueba con una foto más clara.' })
  }
})

module.exports = router