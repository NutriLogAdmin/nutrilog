const express = require('express')
const router = express.Router()
const pool = require('../database')

const COLORS = ['green', 'blue', 'amber', 'red', 'purple', 'gray']
const NUTRITION = ['serving_g', 'kcal', 'protein', 'carbs', 'satfat', 'sugar', 'fiber', 'salt']
// Foto ya reducida por el cliente (~640 px, JPEG): unos 60-100 KB. El tope evita que alguien
// llene la base de datos con imágenes enormes.
const MAX_IMAGE_CHARS = 260000

function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : null
}

function cleanRecipe(r) {
  const out = {
    title: String(r.title || '').trim().slice(0, 200),
    badge: String(r.badge || '').trim().slice(0, 60),
    color: COLORS.includes(r.color) ? r.color : 'gray',
    intro: String(r.intro || '').slice(0, 2000),
    steps: String(r.steps || '').slice(0, 8000),
    tip: String(r.tip || '').slice(0, 2000),
    macros: String(r.macros || '').slice(0, 1000),
    is_public: r.is_public === true,
  }
  for (const k of NUTRITION) out[k] = num(r[k])
  return out
}

// Devuelve { ok, value } para un campo de foto: null/'' borra, un data URL de imagen se guarda.
function cleanImage(v) {
  if (v === null || v === '') return { ok: true, value: null }
  if (typeof v !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(v)) return { ok: false }
  if (v.length > MAX_IMAGE_CHARS) return { ok: false, tooBig: true }
  return { ok: true, value: v }
}

const COLUMNS = ['title', 'badge', 'color', 'intro', 'steps', 'tip', 'macros', ...NUTRITION, 'is_public']
const valuesOf = r => COLUMNS.map(c => r[c])

// Recetas propias + las que otros usuarios han marcado como compartidas. Sin las fotos, salvo
// que se pidan con ?images=1 (el carrusel de Registro): así la lista no arrastra megas.
router.get('/', async (req, res) => {
  const withImages = req.query.images === '1'
  try {
    const result = await pool.query(`
      SELECT r.id, r.title, r.badge, r.color, r.intro, r.steps, r.tip, r.macros, r.is_public,
             r.serving_g, r.kcal, r.protein, r.carbs, r.satfat, r.sugar, r.fiber, r.salt,
             (r.image IS NOT NULL) AS has_image, ${withImages ? 'r.image' : 'NULL::text AS image'},
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

// Foto de una receta, si el usuario puede verla (propia o compartida)
router.get('/:id/image', async (req, res) => {
  try {
    const result = await pool.query('SELECT image FROM recipes WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)', [req.params.id, req.user.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'receta no encontrada' })
    res.json({ image: result.rows[0].image })
  } catch (err) {
    console.error('Error en GET /recipes/:id/image:', err)
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
    const placeholders = COLUMNS.map((_, i) => `$${i + 2}`).join(', ')
    for (const r of clean) {
      await pool.query(`INSERT INTO recipes (user_id, ${COLUMNS.join(', ')}) VALUES ($1, ${placeholders})`, [req.user.id, ...valuesOf(r)])
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
  const img = 'image' in req.body ? cleanImage(req.body.image) : { ok: true, value: null }
  if (!img.ok) return res.status(400).json({ error: img.tooBig ? 'la foto es demasiado grande' : 'la foto no es válida' })
  try {
    const placeholders = COLUMNS.map((_, i) => `$${i + 2}`).join(', ')
    const result = await pool.query(
      `INSERT INTO recipes (user_id, ${COLUMNS.join(', ')}, image) VALUES ($1, ${placeholders}, $${COLUMNS.length + 2}) RETURNING id`,
      [req.user.id, ...valuesOf(r), img.value]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Error en POST /recipes:', err)
    res.status(500).json({ error: err.message })
  }
})

// Solo el autor puede editar o borrar una receta. La foto solo cambia si viene el campo
// `image` (null la quita); si no viene, se conserva la que hubiera.
router.put('/:id', async (req, res) => {
  const r = cleanRecipe(req.body)
  if (!r.title || !r.steps.trim()) return res.status(400).json({ error: 'título y pasos son obligatorios' })
  const changesImage = 'image' in req.body
  const img = changesImage ? cleanImage(req.body.image) : null
  if (changesImage && !img.ok) return res.status(400).json({ error: img.tooBig ? 'la foto es demasiado grande' : 'la foto no es válida' })
  try {
    const sets = COLUMNS.map((c, i) => `${c}=$${i + 1}`).join(', ')
    await pool.query(`UPDATE recipes SET ${sets} WHERE id=$${COLUMNS.length + 1} AND user_id=$${COLUMNS.length + 2}`, [...valuesOf(r), req.params.id, req.user.id])
    if (changesImage) await pool.query('UPDATE recipes SET image=$1 WHERE id=$2 AND user_id=$3', [img.value, req.params.id, req.user.id])
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
