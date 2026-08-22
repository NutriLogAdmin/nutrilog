import { useState, useEffect } from 'react'
import Login from './Login'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

const C = {
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surface2: '#242424',
  border: '#2E2E2E',
  accent: '#6C63FF',
  accentLight: '#8B85FF',
  green: '#22C55E',
  red: '#EF4444',
  yellow: '#F59E0B',
  text: '#F5F5F5',
  muted: '#888',
  mutedLight: '#AAA',
}

const MEALS = [
  { key: 'desayuno', label: 'Desayuno', emoji: '☀️' },
  { key: 'almuerzo', label: 'Almuerzo', emoji: '🍎' },
  { key: 'comida', label: 'Comida', emoji: '🍽️' },
  { key: 'merienda', label: 'Merienda', emoji: '🥪' },
  { key: 'cena', label: 'Cena', emoji: '🌙' },
]

const CATEGORIES = [
  { key: 'todos', label: '🔍 Todos' },
  { key: 'frutas', label: '🍎 Frutas' },
  { key: 'verduras', label: '🥦 Verduras' },
  { key: 'carnes', label: '🥩 Carnes' },
  { key: 'pescados', label: '🐟 Pescados' },
  { key: 'lacteos', label: '🥛 Lácteos' },
  { key: 'cereales', label: '🌾 Cereales' },
  { key: 'legumbres', label: '🫘 Legumbres' },
  { key: 'bebidas', label: '🥤 Bebidas' },
  { key: 'snacks', label: '🍿 Snacks' },
  { key: 'salsas', label: '🫙 Salsas' },
  { key: 'otros', label: '📦 Otros' },
]

function getToken() {
  return localStorage.getItem('nutrilog_token')
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10
}

function calcFactor(amount) {
  return amount / 100
}

const EMPTY_FOOD = {
  name: '', unit: 'g', category: 'otros', kcal100: '', protein100: '', satfat100: '',
  carbs100: '', sugar100: '', fiber100: '', salt100: '', vitamins: ''
}

export default function App() {
  const [token, setToken] = useState(getToken())
  const [username, setUsername] = useState(localStorage.getItem('nutrilog_user') || '')
  const [date, setDate] = useState(todayISO())
  const [entries, setEntries] = useState([])
  const [foods, setFoods] = useState([])
  const [goal, setGoal] = useState(2500)
  const [view, setView] = useState('registro')
  const [newFood, setNewFood] = useState(EMPTY_FOOD)
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState(null)
  const [amount, setAmount] = useState('')
  const [selectedMeal, setSelectedMeal] = useState('desayuno')
  const [showFoodForm, setShowFoodForm] = useState(false)
  const [savingGoal, setSavingGoal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [filterCategory, setFilterCategory] = useState('todos')
  const [catalogSearch, setCatalogSearch] = useState('')

  function handleLogin(tkn, user) {
    setToken(tkn)
    setUsername(user)
  }

  function handleLogout() {
    localStorage.removeItem('nutrilog_token')
    localStorage.removeItem('nutrilog_user')
    setToken(null)
    setUsername('')
  }

  useEffect(() => { if (token) loadEntries() }, [date, token])
  useEffect(() => { if (token) loadFoods() }, [token])
  useEffect(() => { if (token) loadGoal() }, [date, token])

  async function loadEntries() {
    const res = await fetch(`${API}/foods/entries?date=${date}`, { headers: getHeaders() })
    if (res.status === 401) { handleLogout(); return }
    const data = await res.json()
    setEntries(Array.isArray(data) ? data : [])
  }

  async function loadFoods() {
    const res = await fetch(`${API}/foods`, { headers: getHeaders() })
    if (res.status === 401) { handleLogout(); return }
    const data = await res.json()
    setFoods(Array.isArray(data) ? data : [])
  }

  async function loadGoal() {
    const res = await fetch(`${API}/foods/goal?date=${date}`, { headers: getHeaders() })
    if (res.status === 401) { handleLogout(); return }
    const data = await res.json()
    setGoal(data.kcal_goal)
  }

  async function saveGoal(val) {
    setSavingGoal(true)
    await fetch(`${API}/foods/goal`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ date, kcal_goal: val })
    })
    setSavingGoal(false)
  }

  async function addFood(e) {
    e.preventDefault()
    const res = await fetch(`${API}/foods`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...newFood,
        kcal100: parseFloat(newFood.kcal100) || 0,
        protein100: parseFloat(newFood.protein100) || 0,
        satfat100: parseFloat(newFood.satfat100) || 0,
        carbs100: parseFloat(newFood.carbs100) || 0,
        sugar100: parseFloat(newFood.sugar100) || 0,
        fiber100: parseFloat(newFood.fiber100) || 0,
        salt100: parseFloat(newFood.salt100) || 0,
      })
    })
    if (res.ok) {
      setNewFood(EMPTY_FOOD)
      setShowFoodForm(false)
      loadFoods()
    }
  }

  async function addEntry(e) {
    e.preventDefault()
    if (!selectedFood || !amount) return
    if (editEntry) {
      await fetch(`${API}/foods/entries/${editEntry.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ food_id: selectedFood.id, amount: parseFloat(amount), meal: selectedMeal, date, time: editEntry.time })
      })
      setEditEntry(null)
    } else {
      await fetch(`${API}/foods/entries`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ food_id: selectedFood.id, amount: parseFloat(amount), meal: selectedMeal, date, time: new Date().toTimeString().slice(0, 5) })
      })
    }
    setSelectedFood(null)
    setAmount('')
    setSearch('')
    loadEntries()
  }

  async function deleteEntry(id) {
    await fetch(`${API}/foods/entries/${id}`, { method: 'DELETE', headers: getHeaders() })
    loadEntries()
  }

  async function deleteFood(id) {
    await fetch(`${API}/foods/${id}`, { method: 'DELETE', headers: getHeaders() })
    loadFoods()
  }

  function startEdit(e) {
    setEditEntry(e)
    setSelectedFood({ id: e.food_id, name: e.name, unit: e.unit, kcal100: e.kcal100, protein100: e.protein100, satfat100: e.satfat100, carbs100: e.carbs100, sugar100: e.sugar100, fiber100: e.fiber100, salt100: e.salt100 })
    setAmount(String(e.amount))
    setSearch(e.name)
    setSelectedMeal(e.meal || 'comida')
    setView('registro')
    window.scrollTo(0, 0)
  }

  const filtered = foods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  const catalogFiltered = foods.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(catalogSearch.toLowerCase())
    const matchCategory = filterCategory === 'todos' || f.category === filterCategory
    return matchSearch && matchCategory
  })

  const totals = entries.reduce((acc, e) => {
    const f = calcFactor(e.amount)
    acc.kcal += e.kcal100 * f
    acc.protein += e.protein100 * f
    acc.satfat += e.satfat100 * f
    acc.carbs += e.carbs100 * f
    acc.sugar += e.sugar100 * f
    acc.fiber += e.fiber100 * f
    acc.salt += e.salt100 * f
    return acc
  }, { kcal: 0, protein: 0, satfat: 0, carbs: 0, sugar: 0, fiber: 0, salt: 0 })

  const pct = Math.min(100, (totals.kcal / goal) * 100)
  const remaining = round(goal - totals.kcal)
  const over = totals.kcal > goal
  const nearGoal = !over && pct > 85

  if (!token) return <Login onLogin={handleLogin} />

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px' }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>Nutrilog</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>Seguimiento</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '8px 12px', borderRadius: 10, fontSize: 13 }} />
            <span style={{ fontSize: 12, color: C.muted }}>{username}</span>
            <button onClick={handleLogout} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Salir</button>
          </div>
        </div>

        {/* Tarjeta de calorías */}
        <div style={{ margin: '20px 16px 0', background: C.surface, borderRadius: 20, padding: '20px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Calorías consumidas</div>
              <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: over ? C.red : nearGoal ? C.yellow : C.text }}>{round(totals.kcal)}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>de {goal} kcal</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Objetivo</div>
              <input type="number" value={goal}
                onChange={e => { const v = parseFloat(e.target.value) || 0; setGoal(v); saveGoal(v) }}
                style={{ width: 80, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '6px 10px', borderRadius: 8, fontSize: 15, fontWeight: 700, textAlign: 'right' }} />
              <div style={{ fontSize: 11, color: savingGoal ? C.accent : 'transparent', marginTop: 3 }}>guardando...</div>
            </div>
          </div>
          <div style={{ height: 8, background: C.surface2, borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width 0.4s', background: over ? C.red : nearGoal ? C.yellow : C.accent }} />
          </div>
          <div style={{ fontSize: 13, color: over ? C.red : nearGoal ? C.yellow : C.green, fontWeight: 600 }}>
            {over ? `${Math.abs(remaining)} kcal por encima del objetivo` : `${remaining} kcal restantes`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
            {[['Proteína', totals.protein, C.accent], ['Hidratos', totals.carbs, '#F59E0B'], ['Azúcares', totals.sugar, '#EC4899'], ['Grasas sat.', totals.satfat, C.red]].map(([label, val, color]) => (
              <div key={label} style={{ background: C.surface2, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color }}>{round(val)}g</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
            {[['Fibra', totals.fiber, 'g'], ['Sal', totals.salt, 'g']].map(([label, val, u]) => (
              <div key={label} style={{ background: C.surface2, borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.mutedLight }}>{round(val)}{u}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', margin: '20px 16px 0', background: C.surface, borderRadius: 12, padding: 4, gap: 4 }}>
          {[['registro', 'Registro'], ['catalogo', 'Catálogo']].map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} style={{
              flex: 1, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: 9,
              background: view === key ? C.accent : 'transparent', color: view === key ? '#fff' : C.muted, transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </div>

        {/* Vista Registro */}
        {view === 'registro' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {MEALS.map(m => (
                <button key={m.key} onClick={() => setSelectedMeal(m.key)} style={{
                  padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: selectedMeal === m.key ? C.accent : C.surface, color: selectedMeal === m.key ? '#fff' : C.muted, fontSize: 13, fontWeight: 600
                }}>{m.emoji} {m.label}</button>
              ))}
            </div>

            <div style={{ background: C.surface, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.mutedLight, marginBottom: 10 }}>
                {editEntry ? 'Editando entrada' : `Añadir a ${MEALS.find(m => m.key === selectedMeal)?.label}`}
              </div>
              <input placeholder="🔍 Buscar alimento..." value={search}
                onChange={e => { setSearch(e.target.value); if (!editEntry) setSelectedFood(null); setAmount('') }}
                style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '12px 14px', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }} />

              {search && !selectedFood && (
                <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  {filtered.length === 0
                    ? <div style={{ padding: '12px 14px', fontSize: 13, color: C.muted }}>No encontrado — añádelo en Catálogo</div>
                    : filtered.map(f => (
                      <div key={f.id} onClick={() => { setSelectedFood(f); setSearch(f.name) }}
                        style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, background: C.surface2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{f.kcal100} kcal / 100{f.unit} · P:{f.protein100}g · H:{f.carbs100}g</div>
                        </div>
                        <div style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>{f.unit}</div>
                      </div>
                    ))
                  }
                </div>
              )}

              {selectedFood && (
                <form onSubmit={addEntry} style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                    Seleccionado: <strong style={{ color: C.text }}>{selectedFood.name}</strong> · {selectedFood.kcal100} kcal/100{selectedFood.unit}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>CANTIDAD EN {selectedFood.unit === 'ml' ? 'ML' : 'GRAMOS'}</div>
                      <input type="number" placeholder={selectedFood.unit === 'ml' ? 'Ej: 250' : 'Ej: 35'}
                        value={amount} onChange={e => setAmount(e.target.value)} autoFocus
                        style={{ width: '100%', background: C.surface2, border: `1px solid ${C.accent}`, color: C.text, padding: '12px 14px', borderRadius: 10, fontSize: 16, fontWeight: 700, boxSizing: 'border-box' }} />
                    </div>
                    <button type="submit" style={{ padding: '12px 20px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      {editEntry ? 'Guardar' : 'Añadir'}
                    </button>
                    {editEntry && (
                      <button type="button" onClick={() => { setEditEntry(null); setSelectedFood(null); setSearch(''); setAmount('') }}
                        style={{ padding: '12px 16px', background: C.surface2, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                  {amount && parseFloat(amount) > 0 && (
                    <div style={{ marginTop: 10, background: C.surface2, borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Preview — {amount}{selectedFood.unit}:</div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{round(selectedFood.kcal100 * parseFloat(amount) / 100)} kcal</div>
                        {[['P', selectedFood.protein100], ['H', selectedFood.carbs100], ['Az', selectedFood.sugar100], ['Sat', selectedFood.satfat100], ['Sal', selectedFood.salt100]].map(([label, val]) => (
                          <div key={label} style={{ fontSize: 13, color: C.mutedLight }}>{label}: <strong>{round(val * parseFloat(amount) / 100)}g</strong></div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

            {MEALS.map(meal => {
              const mealEntries = entries.filter(e => (e.meal || 'comida') === meal.key)
              if (mealEntries.length === 0) return null
              const mealKcal = mealEntries.reduce((sum, e) => sum + e.kcal100 * calcFactor(e.amount), 0)
              return (
                <div key={meal.key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.mutedLight }}>{meal.emoji} {meal.label}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{round(mealKcal)} kcal</div>
                  </div>
                  {mealEntries.map(e => {
                    const f = e.amount / 100
                    return (
                      <div key={e.id} style={{ background: C.surface, borderRadius: 14, padding: '14px 16px', marginBottom: 8, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{e.name}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                            {e.amount}{e.unit} · {e.time} · P:{round(e.protein100 * f)}g · H:{round(e.carbs100 * f)}g · Sal:{round(e.salt100 * f)}g
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: C.accentLight }}>{round(e.kcal100 * f)}</div>
                          <button onClick={() => startEdit(e)} style={{ background: C.surface2, border: 'none', color: C.accent, cursor: 'pointer', borderRadius: 8, width: 30, height: 30, fontSize: 14 }}>✏️</button>
                          <button onClick={() => deleteEntry(e.id)} style={{ background: C.surface2, border: 'none', color: C.muted, cursor: 'pointer', borderRadius: 8, width: 30, height: 30, fontSize: 14 }}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {entries.length === 0 && (
              <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '40px 0' }}>
                Nada registrado hoy.<br />Busca un alimento arriba para empezar.
              </div>
            )}
          </div>
        )}

        {/* Vista Catálogo */}
        {view === 'catalogo' && (
          <div style={{ padding: '16px' }}>
            <button onClick={() => setShowFoodForm(!showFoodForm)} style={{
              width: '100%', padding: '14px', background: showFoodForm ? C.surface2 : C.accent, color: '#fff',
              border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16
            }}>
              {showFoodForm ? '✕ Cancelar' : '+ Añadir nuevo alimento'}
            </button>

            {showFoodForm && (
              <form onSubmit={addFood} style={{ background: C.surface, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.mutedLight, marginBottom: 14 }}>Nuevo alimento — valores por 100g/ml</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Label>Nombre</Label>
                    <input type="text" value={newFood.name} placeholder="Ej: Leche entera"
                      onChange={e => setNewFood({ ...newFood, name: e.target.value })}
                      style={{ width: '100%', background: '#1A1A1A', border: '1px solid #2E2E2E', color: '#F5F5F5', padding: '10px 12px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <select value={newFood.category} onChange={e => setNewFood({ ...newFood, category: e.target.value })}
                      style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '10px 12px', borderRadius: 8, fontSize: 14, height: 42 }}>
                      {CATEGORIES.filter(c => c.key !== 'todos').map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Unidad</Label>
                    <select value={newFood.unit} onChange={e => setNewFood({ ...newFood, unit: e.target.value })}
                      style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '10px 12px', borderRadius: 8, fontSize: 14, height: 42 }}>
                      <option value="g">g (sólido)</option>
                      <option value="ml">ml (líquido)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {[['Kcal / 100g·ml', 'kcal100'], ['Proteína (g)', 'protein100'], ['Hidratos (g)', 'carbs100'], ['Azúcares (g)', 'sugar100'], ['Grasas sat. (g)', 'satfat100'], ['Fibra (g)', 'fiber100'], ['Sal (g)', 'salt100']].map(([label, key]) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <input type="number" value={newFood[key]} placeholder="0"
                        onChange={e => setNewFood({ ...newFood, [key]: e.target.value })}
                        style={{ width: '100%', background: '#1A1A1A', border: '1px solid #2E2E2E', color: '#F5F5F5', padding: '10px 12px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <Label>Vitaminas</Label>
                    <input type="text" value={newFood.vitamins} placeholder="Ej: A, C, D"
                      onChange={e => setNewFood({ ...newFood, vitamins: e.target.value })}
                      style={{ width: '100%', background: '#1A1A1A', border: '1px solid #2E2E2E', color: '#F5F5F5', padding: '10px 12px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button type="submit" style={{ width: '100%', marginTop: 14, padding: '13px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Guardar alimento
                </button>
              </form>
            )}

            {/* Buscador y filtro de categorías */}
            <input placeholder="🔍 Buscar en el catálogo..." value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '12px 14px', borderRadius: 10, fontSize: 15, boxSizing: 'border-box', marginBottom: 10 }} />

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setFilterCategory(c.key)} style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: filterCategory === c.key ? C.accent : C.surface,
                  color: filterCategory === c.key ? '#fff' : C.muted, fontSize: 12, fontWeight: 600
                }}>{c.label}</button>
              ))}
            </div>

            {catalogFiltered.length === 0
              ? <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '40px 0' }}>
                  {foods.length === 0 ? 'El catálogo está vacío.' : 'No hay alimentos en esta categoría.'}
                </div>
              : catalogFiltered.map(f => (
                <div key={f.id} style={{ background: C.surface, borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {f.name}
                      <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginLeft: 6 }}>{f.unit}</span>
                      {f.category && f.category !== 'otros' && (
                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 6 }}>
                          {CATEGORIES.find(c => c.key === f.category)?.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                      {f.kcal100} kcal · P:{f.protein100}g · H:{f.carbs100}g · Az:{f.sugar100}g · Sat:{f.satfat100}g · Sal:{f.salt100}g
                      {f.vitamins && ` · Vit: ${f.vitamins}`}
                    </div>
                  </div>
                  <button onClick={() => deleteFood(f.id)} style={{ background: C.surface2, border: 'none', color: C.muted, cursor: 'pointer', borderRadius: 8, width: 30, height: 30, fontSize: 14 }}>✕</button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{children}</div>
}