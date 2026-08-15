const express = require('express');
const router = express.Router();
const db = require('../database');

// Obtener todos los alimentos del catálogo
router.get('/', (req, res) => {
  const foods = db.prepare('SELECT * FROM foods ORDER BY name ASC').all();
  res.json(foods);
});

// Buscar alimentos por nombre
router.get('/search', (req, res) => {
  const { q } = req.query;
  const foods = db.prepare(
    'SELECT * FROM foods WHERE name LIKE ? ORDER BY name ASC'
  ).all(`%${q}%`);
  res.json(foods);
});

// Añadir alimento al catálogo
router.post('/', (req, res) => {
  const { name, kcal100, protein100, satfat100, carbs100 } = req.body;
  if (!name || kcal100 === undefined) {
    return res.status(400).json({ error: 'Nombre y calorías son obligatorios' });
  }
  const result = db.prepare(
    'INSERT INTO foods (name, kcal100, protein100, satfat100, carbs100) VALUES (?, ?, ?, ?, ?)'
  ).run(name, kcal100, protein100 || 0, satfat100 || 0, carbs100 || 0);
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(food);
});

// Obtener entradas de un día concreto
router.get('/entries', (req, res) => {
  const { date } = req.query;
  const entries = db.prepare(`
    SELECT e.id, e.grams, e.date, e.time,
           f.name, f.kcal100, f.protein100, f.satfat100, f.carbs100
    FROM entries e
    JOIN foods f ON e.food_id = f.id
    WHERE e.date = ?
    ORDER BY e.time ASC
  `).all(date);
  res.json(entries);
});

// Registrar ingesta
router.post('/entries', (req, res) => {
  const { food_id, grams, date, time } = req.body;
  if (!food_id || !grams || !date) {
    return res.status(400).json({ error: 'food_id, grams y date son obligatorios' });
  }
  const result = db.prepare(
    'INSERT INTO entries (food_id, grams, date, time) VALUES (?, ?, ?, ?)'
  ).run(food_id, grams, date, time || new Date().toTimeString().slice(0, 5));
  res.status(201).json({ id: result.lastInsertRowid });
});

// Eliminar entrada
router.delete('/entries/:id', (req, res) => {
  db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;