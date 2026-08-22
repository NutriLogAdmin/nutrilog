const express = require('express')
const router = express.Router()
const pool = require('../database')

// Obtener perfil
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, avatar FROM users WHERE id = $1',
    [req.user.id]
  )
  res.json(result.rows[0] || {})
})

// Actualizar avatar
router.put('/avatar', async (req, res) => {
  const { avatar } = req.body
  await pool.query(
    'UPDATE users SET avatar = $1 WHERE id = $2',
    [avatar, req.user.id]
  )
  res.json({ ok: true })
})

module.exports = router