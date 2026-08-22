const express = require('express')
const cors = require('cors')
const db = require('./database')
const foodsRouter = require('./routes/foods')
const authRouter = require('./routes/auth')
const authMiddleware = require('./middleware/auth')
const profileRouter = require('./routes/profile')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Rutas públicas
app.use('/api/auth', authRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NutriLog API funcionando' })
})

// Rutas protegidas
app.use('/api/foods', authMiddleware, foodsRouter)
app.use('/api/profile', authMiddleware, profileRouter)

app.listen(PORT, () => {
  console.log(`Servidor NutriLog arrancado en http://localhost:${PORT}`)
})