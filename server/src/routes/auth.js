const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../database')

const SECRET = process.env.JWT_SECRET || 'nutrilog_dev_secret'

// Registro de usuario
router.post('/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña obligatorios' })
  }
  try {
    const hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
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

module.exports = router