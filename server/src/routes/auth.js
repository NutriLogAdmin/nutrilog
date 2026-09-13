const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../database')
const authMiddleware = require('../middleware/auth')

const SECRET = process.env.JWT_SECRET || 'nutrilog_dev_secret'
// Debe coincidir con PLAN_USERS en client/src/App.jsx.
const ADMIN_USERS = ['Daniel', 'daniel']

// Registro de usuario
router.post('/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña obligatorios' })
  }
  const user = String(username).trim()
  const pass = String(password)
  if (user.length < 3 || /\s/.test(user)) {
    return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres y sin espacios' })
  }
  if (user.includes('@')) {
    return res.status(400).json({ error: 'El usuario no puede ser un correo electrónico' })
  }
  if (pass.length < 8 || !/[a-zA-Z]/.test(pass) || !/\d/.test(pass)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres, con una letra y un número' })
  }
  try {
    const hash = await bcrypt.hash(pass, 10)
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [user, hash]
    )
    res.status(201).json(result.rows[0])
  } catch {
    res.status(409).json({ error: 'El usuario ya existe' })
  }
})

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username])
  const user = result.rows[0]
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
  }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
  }
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' })
  res.json({ token, username: user.username })
})

// Obtener perfil del usuario
router.get('/profile', async (req, res) => {
  const authMiddleware = require('../middleware/auth')
  const result = await pool.query('SELECT id, username, avatar FROM users WHERE id = $1', [req.user?.id])
  res.json(result.rows[0] || {})
})

// Actualizar avatar
router.put('/avatar', async (req, res) => {
  const { avatar } = req.body
  await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, req.user?.id])
  res.json({ ok: true })
})

// Restablecer la contraseña de otro usuario — sin correo en el sistema, esta es la única
// vía de "contraseña olvidada": solo el admin (Daniel) puede llamarlo, y no pide la
// contraseña anterior porque el caso de uso es justo que el usuario no la tiene.
router.put('/admin-reset-password', authMiddleware, async (req, res) => {
  if (!ADMIN_USERS.includes(req.user.username)) {
    return res.status(403).json({ error: 'No autorizado' })
  }
  const { username, newPassword } = req.body
  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Usuario y contraseña nueva obligatorios' })
  }
  const pass = String(newPassword)
  if (pass.length < 8 || !/[a-zA-Z]/.test(pass) || !/\d/.test(pass)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres, con una letra y un número' })
  }
  const hash = await bcrypt.hash(pass, 10)
  const result = await pool.query(
    'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username',
    [hash, String(username).trim()]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'No existe ningún usuario con ese nombre' })
  }
  res.json({ ok: true })
})

module.exports = router