const express = require('express');
const cors = require('cors');
const db = require('./database');
const foodsRouter = require('./routes/foods');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/foods', foodsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NutriLog API funcionando' });
});

app.listen(PORT, () => {
  console.log(`Servidor NutriLog arrancado en http://localhost:${PORT}`);
});