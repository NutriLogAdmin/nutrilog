const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../database')

const SECRET = process.env.JWT_SECRET || 'nutrilog_dev_secret'

// Registro de usuario
router.post('/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña obligatorios' })
  }
  try {
    const hash = await bcrypt.hash(password, 10)
    const result = db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    ).run(username, hash)
    res.status(201).json({ id: result.lastInsertRowid, username })
  } catch (err) {
    res.status(409).json({ error: 'El usuario ya existe' })
  }
})

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
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