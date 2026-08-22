const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'nutrilog_dev_secret'

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization']
  if (!header) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }
  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}