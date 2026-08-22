import { useState, useEffect } from 'react'
import Login from './Login'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

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

const C = {
  bg: '#F7F7F5',
  white: '#FFFFFF',
  border: '#EBEBEB',
  text: '#1A1A1A',
  muted: '#888',
  mutedLight: '#BBB',
  accent: '#FF6B35',
  accentLight: '#FFF0EB',
  accentMid: '#FFB39A',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  yellow: '#F59E0B',
  yellowLight: '#FFFBEB',
  red: '#EF4444',
  redLight: '#FEF2F2',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
}

function getToken() { return localStorage.getItem('nutrilog_token') }
function getHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
}
function todayISO() { return new Date().toISOString().slice(0, 10) }
function round(n) { return Math.round((n + Number.EPSILON) * 10) / 10 }
function calcFactor(amount) { return amount / 100 }

const EMPTY_FOOD = {
  name: '', unit: 'g', category: 'otros', kcal100: '', protein100: '', satfat100: '',
  carbs100: '', sugar100: '', fiber100: '', salt100: '', vitamins: ''
}

function CircleProgress({ value, max, size = 180 }) {
  const pct = Math.min(1, value / max)
  const r = 70
  const cx = size / 2
  const cy = size / 2
  const startAngle = -210
  const endAngle = 30
  const totalAngle = endAngle - startAngle
  const currentAngle = startAngle + totalAngle * pct

  function polarToXY(angle, radius) {
    const rad = (angle * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function describeArc(startAng, endAng) {
    const s = polarToXY(startAng, r)
    const e = polarToXY(endAng, r)
    const largeArc = endAng - startAng > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  const over = value > max
  const color = over ? C.red : pct > 0.85 ? C.yellow : C.accent

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={describeArc(startAngle, endAngle)} fill="none" stroke={C.border} strokeWidth="12" strokeLinecap="round" />
      {pct > 0 && (
        <path d={describeArc(startAngle, currentAngle)} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />
      )}
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="32" fontWeight="700" fill={C.text}>{round(value)}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill={C.muted}>kcal</text>
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize="11" fill={color} fontWeight="600">
        {over ? `+${round(value - max)}` : `${round(max - value)} restantes`}
      </text>
    </svg>
  )
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
  const [activeMeal, setActiveMeal] = useState(null)
  const [showFoodForm, setShowFoodForm] = useState(false)
  const [savingGoal, setSavingGoal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [filterCategory, setFilterCategory] = useState('todos')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [editGoal, setEditGoal] = useState(false)

  function handleLogin(tkn, user) { setToken(tkn); setUsername(user) }
  function handleLogout() {
    localStorage.removeItem('nutrilog_token')
    localStorage.removeItem('nutrilog_user')
    setToken(null); setUsername('')
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
    await fetch(`${API}/foods/goal`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ date, kcal_goal: val }) })
    setSavingGoal(false)
  }

  async function addFood(e) {
    e.preventDefault()
    const res = await fetch(`${API}/foods`, {
      method: 'POST', headers: getHeaders(),
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
    if (res.ok) { setNewFood(EMPTY_FOOD); setShowFoodForm(false); loadFoods() }
  }

  async function addEntry(e) {
    e.preventDefault()
    if (!selectedFood || !amount) return
    if (editEntry) {
      await fetch(`${API}/foods/entries/${editEntry.id}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ food_id: selectedFood.id, amount: parseFloat(amount), meal: activeMeal, date, time: editEntry.time })
      })
      setEditEntry(null)
    } else {
      await fetch(`${API}/foods/entries`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ food_id: selectedFood.id, amount: parseFloat(amount), meal: activeMeal, date, time: new Date().toTimeString().slice(0, 5) })
      })
    }
    setSelectedFood(null); setAmount(''); setSearch(''); setActiveMeal(null)
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
    setActiveMeal(e.meal || 'comida')
    window.scrollTo(0, 0)
  }

  function openMealAdd(mealKey) {
    setActiveMeal(mealKey)
    setSelectedFood(null)
    setSearch('')
    setAmount('')
    setEditEntry(null)
    window.scrollTo(0, 0)
  }

  function cancelAdd() {
    setActiveMeal(null)
    setSelectedFood(null)
    setSearch('')
    setAmount('')
    setEditEntry(null)
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

  if (!token) return <Login onLogin={handleLogin} />

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 40 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: C.white, padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>NutriLog</div>
            <input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)}
              style={{ border: 'none', background: 'none', fontSize: 15, fontWeight: 600, color: C.text, padding: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>Salir</button>
          </div>
        </div>

        {/* Tarjeta principal con círculo */}
        <div style={{ background: C.white, margin: '16px 16px 0', borderRadius: 24, padding: '24px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
          
          {/* Círculo + objetivo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Consumidas</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{round(totals.kcal)}</div>
              <div style={{ fontSize: 11, color: C.muted }}>kcal</div>
            </div>

            <CircleProgress value={totals.kcal} max={goal} size={160} />

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Objetivo</div>
              {editGoal ? (
                <input type="number" value={goal} autoFocus
                  onChange={e => setGoal(parseFloat(e.target.value) || 0)}
                  onBlur={() => { setEditGoal(false); saveGoal(goal) }}
                  style={{ width: 70, border: `2px solid ${C.accent}`, borderRadius: 8, padding: '4px 6px', fontSize: 18, fontWeight: 800, textAlign: 'right', color: C.text }} />
              ) : (
                <div onClick={() => setEditGoal(true)} style={{ fontSize: 28, fontWeight: 800, color: C.text, cursor: 'pointer' }}>{goal}</div>
              )}
              <div style={{ fontSize: 11, color: C.muted }}>kcal · {savingGoal ? '💾' : <span onClick={() => setEditGoal(true)} style={{ color: C.accent, cursor: 'pointer' }}>editar</span>}</div>
            </div>
          </div>

          {/* Macros */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              ['Proteína', totals.protein, C.blue, C.blueLight],
              ['Hidratos', totals.carbs, C.yellow, C.yellowLight],
              ['Grasas sat.', totals.satfat, C.red, C.redLight],
              ['Sal', totals.salt, C.purple, C.purpleLight],
            ].map(([label, val, color, bg]) => (
              <div key={label} style={{ background: bg, borderRadius: 14, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color }}>{round(val)}g</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', margin: '16px 16px 0', background: C.white, borderRadius: 16, padding: 4, gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {[['registro', 'Registro'], ['catalogo', 'Catálogo']].map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} style={{
              flex: 1, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: 12,
              background: view === key ? C.accent : 'transparent',
              color: view === key ? '#fff' : C.muted, transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </div>

        {/* Panel añadir alimento */}
        {activeMeal && (
          <div style={{ margin: '12px 16px 0', background: C.white, borderRadius: 20, padding: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: `2px solid ${C.accentMid}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
                {editEntry ? 'Editando entrada' : `Añadir a ${MEALS.find(m => m.key === activeMeal)?.emoji} ${MEALS.find(m => m.key === activeMeal)?.label}`}
              </div>
              <button onClick={cancelAdd} style={{ border: 'none', background: C.accentLight, color: C.accent, borderRadius: 20, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✕ Cancelar</button>
            </div>

            <input placeholder="🔍 Buscar alimento..." value={search}
              onChange={e => { setSearch(e.target.value); if (!editEntry) setSelectedFood(null); setAmount('') }}
              style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '11px 14px', borderRadius: 12, fontSize: 14, boxSizing: 'border-box' }} />

            {search && !selectedFood && (
              <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.white }}>
                {filtered.length === 0
                  ? <div style={{ padding: '12px 14px', fontSize: 13, color: C.muted }}>No encontrado — añádelo en Catálogo</div>
                  : filtered.map(f => (
                    <div key={f.id} onClick={() => { setSelectedFood(f); setSearch(f.name) }}
                      style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{f.kcal100} kcal / 100{f.unit}</div>
                      </div>
                      <div style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{f.unit}</div>
                    </div>
                  ))
                }
              </div>
            )}

            {selectedFood && (
              <form onSubmit={addEntry} style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, padding: '8px 12px', background: C.accentLight, borderRadius: 10 }}>
                  <strong style={{ color: C.accent }}>{selectedFood.name}</strong> · {selectedFood.kcal100} kcal/100{selectedFood.unit}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                      Cantidad en {selectedFood.unit === 'ml' ? 'ml' : 'gramos'}
                    </div>
                    <input type="number" placeholder={selectedFood.unit === 'ml' ? 'Ej: 250' : 'Ej: 35'}
                      value={amount} onChange={e => setAmount(e.target.value)} autoFocus
                      style={{ width: '100%', border: `2px solid ${C.accent}`, background: C.white, color: C.text, padding: '12px 14px', borderRadius: 12, fontSize: 18, fontWeight: 800, boxSizing: 'border-box' }} />
                  </div>
                  <button type="submit" style={{ padding: '12px 20px', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', height: 50 }}>
                    {editEntry ? 'Guardar' : 'Añadir'}
                  </button>
                </div>

                {amount && parseFloat(amount) > 0 && (
                  <div style={{ marginTop: 10, background: C.bg, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>
                      {round(selectedFood.kcal100 * parseFloat(amount) / 100)} kcal
                    </div>
                    {[['P', selectedFood.protein100, C.blue], ['H', selectedFood.carbs100, C.yellow], ['Sat', selectedFood.satfat100, C.red], ['Sal', selectedFood.salt100, C.purple]].map(([label, val, color]) => (
                      <div key={label} style={{ fontSize: 12, color: C.muted }}>
                        {label}: <strong style={{ color }}>{round(val * parseFloat(amount) / 100)}g</strong>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* Vista Registro */}
        {view === 'registro' && (
          <div style={{ padding: '12px 16px 0' }}>
            {MEALS.map(meal => {
              const mealEntries = entries.filter(e => (e.meal || 'comida') === meal.key)
              const mealKcal = mealEntries.reduce((sum, e) => sum + e.kcal100 * calcFactor(e.amount), 0)
              return (
                <div key={meal.key} style={{ background: C.white, borderRadius: 20, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: mealEntries.length > 0 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{meal.emoji}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{meal.label}</div>
                        {mealKcal > 0 && <div style={{ fontSize: 11, color: C.muted }}>{round(mealKcal)} kcal</div>}
                      </div>
                    </div>
                    <button onClick={() => openMealAdd(meal.key)} style={{
                      width: 32, height: 32, borderRadius: '50%', background: activeMeal === meal.key ? C.accent : C.accentLight,
                      color: activeMeal === meal.key ? '#fff' : C.accent, border: 'none', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                    }}>+</button>
                  </div>

                  {mealEntries.map(e => {
                    const f = e.amount / 100
                    return (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{e.name}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            {e.amount}{e.unit} · P:{round(e.protein100 * f)}g · H:{round(e.carbs100 * f)}g · Sal:{round(e.salt100 * f)}g
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>{round(e.kcal100 * f)}</div>
                          <button onClick={() => startEdit(e)} style={{ border: 'none', background: C.blueLight, color: C.blue, cursor: 'pointer', borderRadius: 8, width: 28, height: 28, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                          <button onClick={() => deleteEntry(e.id)} style={{ border: 'none', background: C.redLight, color: C.red, cursor: 'pointer', borderRadius: 8, width: 28, height: 28, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Vista Catálogo */}
        {view === 'catalogo' && (
          <div style={{ padding: '12px 16px 0' }}>
            <button onClick={() => setShowFoodForm(!showFoodForm)} style={{
              width: '100%', padding: '14px', background: showFoodForm ? C.bg : C.accent, color: showFoodForm ? C.muted : '#fff',
              border: showFoodForm ? `1px solid ${C.border}` : 'none', borderRadius: 16, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 12
            }}>
              {showFoodForm ? '✕ Cancelar' : '+ Añadir nuevo alimento'}
            </button>

            {showFoodForm && (
              <form onSubmit={addFood} style={{ background: C.white, borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 14 }}>Nuevo alimento — valores por 100g/ml</div>

                <div style={{ marginBottom: 10 }}>
                  <Label>Nombre</Label>
                  <input type="text" value={newFood.name} placeholder="Ej: Leche entera"
                    onChange={e => setNewFood({ ...newFood, name: e.target.value })}
                    style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <Label>Categoría</Label>
                    <select value={newFood.category} onChange={e => setNewFood({ ...newFood, category: e.target.value })}
                      style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 13, height: 42 }}>
                      {CATEGORIES.filter(c => c.key !== 'todos').map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Unidad</Label>
                    <select value={newFood.unit} onChange={e => setNewFood({ ...newFood, unit: e.target.value })}
                      style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 13, height: 42 }}>
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
                        style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <Label>Vitaminas</Label>
                    <input type="text" value={newFood.vitamins} placeholder="Ej: A, C, D"
                      onChange={e => setNewFood({ ...newFood, vitamins: e.target.value })}
                      style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>

                <button type="submit" style={{ width: '100%', marginTop: 14, padding: '13px', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Guardar alimento
                </button>
              </form>
            )}

            <input placeholder="🔍 Buscar en el catálogo..." value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.white, color: C.text, padding: '12px 14px', borderRadius: 14, fontSize: 14, boxSizing: 'border-box', marginBottom: 10 }} />

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setFilterCategory(c.key)} style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: filterCategory === c.key ? C.accent : C.white,
                  color: filterCategory === c.key ? '#fff' : C.muted,
                  fontSize: 12, fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>{c.label}</button>
              ))}
            </div>

            {catalogFiltered.length === 0
              ? <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '40px 0' }}>
                  {foods.length === 0 ? 'El catálogo está vacío.' : 'No hay alimentos en esta categoría.'}
                </div>
              : catalogFiltered.map(f => (
                <div key={f.id} style={{ background: C.white, borderRadius: 16, padding: '14px 16px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{f.name}</div>
                      <span style={{ fontSize: 10, background: C.accentLight, color: C.accent, padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>{f.unit}</span>
                      {f.category && f.category !== 'otros' && (
                        <span style={{ fontSize: 10, color: C.muted }}>{CATEGORIES.find(c => c.key === f.category)?.label}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                      {f.kcal100} kcal · P:{f.protein100}g · H:{f.carbs100}g · Az:{f.sugar100}g · Sat:{f.satfat100}g · Sal:{f.salt100}g
                    </div>
                  </div>
                  <button onClick={() => deleteFood(f.id)} style={{ border: 'none', background: C.redLight, color: C.red, cursor: 'pointer', borderRadius: 8, width: 28, height: 28, fontSize: 14, marginLeft: 8 }}>✕</button>
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