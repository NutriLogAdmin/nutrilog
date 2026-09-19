const express = require('express')
const cors = require('cors')
const db = require('./database')
const foodsRouter = require('./routes/foods')
const authRouter = require('./routes/auth')
const authMiddleware = require('./middleware/auth')
const profileRouter = require('./routes/profile')
const activityRouter = require('./routes/activity')
const contentRouter = require('./routes/content')
const shoppingRouter = require('./routes/shopping')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
// Límite subido de 100kb (por defecto) a 10mb: la foto de la etiqueta viaja en base64
// dentro del JSON de /api/foods/scan.
app.use(express.json({ limit: '10mb' }))

// Rutas públicas
app.use('/api/auth', authRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NutriLog API funcionando' })
})

// Rutas protegidas
app.use('/api/foods', authMiddleware, foodsRouter)
app.use('/api/profile', authMiddleware, profileRouter)
app.use('/api/activity', authMiddleware, activityRouter)
app.use('/api/content', authMiddleware, contentRouter)
app.use('/api/shopping', authMiddleware, shoppingRouter)

app.listen(PORT, () => {
  console.log(`Servidor NutriLog arrancado en http://localhost:${PORT}`)
})