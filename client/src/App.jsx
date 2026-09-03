import { useState, useEffect } from 'react'
import Login from './Login'
import OcrScanner from './OcrScanner'
import Profile from './Profile'
import Onboarding from './Onboarding'
import { exportDayPDF, exportWeekPDF } from './PdfExport'
import WhatsNew from './WhatsNew'
import { unseenEntries, LATEST_VERSION } from './changelog'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

const MEALS = [
  { key: 'desayuno', label: 'Desayuno', emoji: '☀️' },
  { key: 'almuerzo', label: 'Almuerzo', emoji: '🍎' },
  { key: 'comida', label: 'Comida', emoji: '🍽️' },
  { key: 'merienda', label: 'Merienda', emoji: '🥪' },
  { key: 'cena', label: 'Cena', emoji: '🌙' },
]

const CATEGORIES = [
  { key: 'todos', label: '🔍 Todos', emoji: '🔍' },
  { key: 'frutas', label: '🍎 Frutas', emoji: '🍎' },
  { key: 'verduras', label: '🥦 Verduras', emoji: '🥦' },
  { key: 'carnes', label: '🥩 Carnes', emoji: '🥩' },
  { key: 'pescados', label: '🐟 Pescados', emoji: '🐟' },
  { key: 'lacteos', label: '🥛 Lácteos', emoji: '🥛' },
  { key: 'cereales', label: '🌾 Cereales', emoji: '🌾' },
  { key: 'legumbres', label: '🫘 Legumbres', emoji: '🫘' },
  { key: 'bebidas', label: '🥤 Bebidas', emoji: '🥤' },
  { key: 'snacks', label: '🍿 Snacks', emoji: '🍿' },
  { key: 'salsas', label: '🫙 Salsas', emoji: '🫙' },
  { key: 'platos', label: '🥘 Platos completos', emoji: '🥘' },
  { key: 'suplementos', label: '💊 Suplementos', emoji: '💊' },
  { key: 'otros', label: '📦 Otros', emoji: '📦' },
]

const PRESET_AVATARS = [
  {id:'av1',e:'🧑‍💻'},{id:'av2',e:'🏋️'},{id:'av3',e:'🥗'},{id:'av4',e:'🧘'},
  {id:'av5',e:'🚴'},{id:'av6',e:'🏃'},{id:'av7',e:'🎯'},{id:'av8',e:'💪'},
  {id:'av9',e:'🌟'},{id:'av10',e:'🦁'}
]

const DEFAULT_GOALS = { protein: 163, carbs: 230, satfat: 12, salt: 4, fiber: 30, kcal: 2400 }
const PLAN_USERS = ['Daniel', 'daniel']

function getColors(dark) {
  return dark ? {
    bg: '#0F0F0F', white: '#1A1A1A', border: '#2E2E2E', text: '#F5F5F5',
    muted: '#888', mutedLight: '#555', accent: '#FF6B35', accentLight: '#2A1A12',
    accentMid: '#7A3A1A', green: '#22C55E', greenLight: '#0A2A15',
    blue: '#60A5FA', blueLight: '#0A1628', yellow: '#FBBF24', yellowLight: '#1A1500',
    red: '#F87171', redLight: '#1A0808', purple: '#A78BFA', purpleLight: '#120A28',
    teal: '#2DD4BF', tealLight: '#0A1A18', surface2: '#242424',
  } : {
    bg: '#F7F7F5', white: '#FFFFFF', border: '#EBEBEB', text: '#1A1A1A',
    muted: '#888', mutedLight: '#BBB', accent: '#FF6B35', accentLight: '#FFF0EB',
    accentMid: '#FFB39A', green: '#22C55E', greenLight: '#DCFCE7',
    blue: '#3B82F6', blueLight: '#EFF6FF', yellow: '#F59E0B', yellowLight: '#FFFBEB',
    red: '#EF4444', redLight: '#FEF2F2', purple: '#8B5CF6', purpleLight: '#F5F3FF',
    teal: '#14B8A6', tealLight: '#F0FDFA', surface2: '#F0F0EE',
  }
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

function AvatarDisplay({ avatarData, username, size = 32 }) {
  const isPreset = avatarData && avatarData.startsWith('av')
  const emoji = PRESET_AVATARS.find(a => a.id === avatarData)?.e
  const C = getColors(false)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: C.accent, overflow: 'hidden', border: `2px solid ${C.accent}`, flexShrink: 0 }}>
      {!avatarData && <span style={{ fontSize: size * 0.4 }}>{username?.charAt(0).toUpperCase()}</span>}
      {isPreset && <span style={{ fontSize: size * 0.55 }}>{emoji}</span>}
      {avatarData && !isPreset && <img src={avatarData} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </div>
  )
}

function CircleProgress({ value, max, size = 160, C }) {
  const pct = Math.min(1, value / max)
  const r = 68, cx = size / 2, cy = size / 2
  const startAngle = -210, endAngle = 30
  const currentAngle = startAngle + (endAngle - startAngle) * pct
  function polarToXY(angle, radius) {
    const rad = (angle * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }
  function describeArc(s, e) {
    const sp = polarToXY(s, r), ep = polarToXY(e, r)
    return `M ${sp.x} ${sp.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ep.x} ${ep.y}`
  }
  const over = value > max
  const color = over ? C.red : pct > 0.85 ? C.yellow : C.accent
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={describeArc(startAngle, endAngle)} fill="none" stroke={C.border} strokeWidth="12" strokeLinecap="round" />
      {pct > 0 && <path d={describeArc(startAngle, currentAngle)} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="30" fontWeight="700" fill={C.text}>{round(value)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill={C.muted}>kcal</text>
      <text x={cx} y={cy + 30} textAnchor="middle" fontSize="10" fill={color} fontWeight="600">
        {over ? `+${round(value - max)} exceso` : `${round(max - value)} restantes`}
      </text>
    </svg>
  )
}

function MacroBar({ label, value, goal, color, bg, C }) {
  const pct = Math.min(100, (value / goal) * 100)
  const over = value > goal
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: over ? C.red : color }}>{round(value)}g</div>
      </div>
      <div style={{ height: 4, background: 'rgba(128,128,128,0.2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: over ? C.red : color, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
      <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
        obj. {goal}g · {over ? <span style={{ color: C.red }}>+{round(value - goal)}g</span> : `${round(goal - value)}g restantes`}
      </div>
    </div>
  )
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nutrilog_dark') === 'true')
  const C = getColors(darkMode)

  const [token, setToken] = useState(getToken())
  const [username, setUsername] = useState(localStorage.getItem('nutrilog_user') || '')
  const [avatarData, setAvatarData] = useState(null)
  const [macroGoals, setMacroGoals] = useState(DEFAULT_GOALS)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [entries, setEntries] = useState([])
  const [foods, setFoods] = useState([])
  const [goal, setGoal] = useState(2400)
  const [view, setView] = useState('registro')
  const [newFood, setNewFood] = useState(EMPTY_FOOD)
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState(null)
  const [amount, setAmount] = useState('')
  const [activeMeal, setActiveMeal] = useState(null)
  const [expandedMeals, setExpandedMeals] = useState({})
  const [showFoodForm, setShowFoodForm] = useState(false)
  const [showOcr, setShowOcr] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [savingGoal, setSavingGoal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [editFood, setEditFood] = useState(null)
  const [filterCategory, setFilterCategory] = useState('todos')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [editGoal, setEditGoal] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 900)
  const [whatsNew, setWhatsNew] = useState(null)
  const [inlineCreate, setInlineCreate] = useState(false)

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 900)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('nutrilog_dark', String(next))
  }

  const canSeePlan = PLAN_USERS.includes(username)
  const tabs = [['registro', 'Registro'], ['catalogo', 'Catálogo'], ...(canSeePlan ? [['plan', 'Mi Plan']] : [])]

  function handleLogin(tkn, user) { setToken(tkn); setUsername(user) }
  function handleLogout() {
    localStorage.removeItem('nutrilog_token')
    localStorage.removeItem('nutrilog_user')
    setToken(null); setUsername(''); setAvatarData(null); setNeedsOnboarding(false)
  }

  function handleOnboardingComplete(macros) {
    setMacroGoals({ protein: macros.goal_protein, carbs: macros.goal_carbs, satfat: macros.goal_satfat, salt: macros.goal_salt, fiber: macros.goal_fiber, kcal: macros.goal_kcal })
    setGoal(macros.goal_kcal)
    // Usuario recién creado: se marca al día para que no le salga el pop-up de novedades.
    localStorage.setItem('nutrilog_changelog_seen', LATEST_VERSION)
    setNeedsOnboarding(false)
  }

  function toggleMeal(mealKey) {
    setExpandedMeals(prev => ({ ...prev, [mealKey]: !prev[mealKey] }))
  }

  useEffect(() => {
    if (!token) return
    let timer = setTimeout(() => { handleLogout() }, 30 * 60 * 1000)
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => { handleLogout() }, 30 * 60 * 1000) }
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, reset))
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)) }
  }, [token])

  useEffect(() => {
    if (!token) return
    async function loadProfile() {
      const res = await fetch(`${API}/profile`, { headers: getHeaders() })
      const data = await res.json()
      if (data.avatar) setAvatarData(data.avatar)
      if (data.goal_kcal) {
        setMacroGoals({ protein: data.goal_protein, carbs: data.goal_carbs, satfat: data.goal_satfat, salt: data.goal_salt, fiber: data.goal_fiber, kcal: data.goal_kcal })
        setGoal(data.goal_kcal)
      } else {
        setNeedsOnboarding(true)
      }
    }
    loadProfile()
  }, [token])

  useEffect(() => {
    if (!token || needsOnboarding) return
    const pending = unseenEntries(localStorage.getItem('nutrilog_changelog_seen'))
    if (pending.length > 0) setWhatsNew(pending)
  }, [token, needsOnboarding])

  useEffect(() => { if (token) loadEntries() }, [date, token])
  useEffect(() => { if (token) loadFoods() }, [token])

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

  async function saveGoal(val) {
    setSavingGoal(true)
    await fetch(`${API}/profile/goal-kcal`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ goal_kcal: val }) })
    setMacroGoals(prev => ({ ...prev, kcal: val }))
    setSavingGoal(false)
  }

  async function addFood(e) {
    e.preventDefault()
    const payload = { ...newFood, kcal100: parseFloat(newFood.kcal100)||0, protein100: parseFloat(newFood.protein100)||0, satfat100: parseFloat(newFood.satfat100)||0, carbs100: parseFloat(newFood.carbs100)||0, sugar100: parseFloat(newFood.sugar100)||0, fiber100: parseFloat(newFood.fiber100)||0, salt100: parseFloat(newFood.salt100)||0 }
    if (editFood) {
      await fetch(`${API}/foods/${editFood.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) })
      setEditFood(null)
    } else {
      await fetch(`${API}/foods`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) })
    }
    setNewFood(EMPTY_FOOD); setShowFoodForm(false); loadFoods()
  }

  // Crear un alimento desde el panel de "Añadir a comida" sin ir al Catálogo.
  // Solo INSERT (POST /api/foods), el mismo endpoint que el botón del Catálogo.
  async function createFoodInline(e) {
    e.preventDefault()
    if (!newFood.name.trim()) return
    const payload = { ...newFood, name: newFood.name.trim(),
      kcal100: parseFloat(newFood.kcal100) || 0, protein100: parseFloat(newFood.protein100) || 0,
      satfat100: parseFloat(newFood.satfat100) || 0, carbs100: parseFloat(newFood.carbs100) || 0,
      sugar100: parseFloat(newFood.sugar100) || 0, fiber100: parseFloat(newFood.fiber100) || 0,
      salt100: parseFloat(newFood.salt100) || 0 }
    const res = await fetch(`${API}/foods`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) })
    if (!res.ok) return
    const created = await res.json()
    await loadFoods()
    setSelectedFood(created)
    setSearch(created.name)
    setInlineCreate(false)
    setNewFood(EMPTY_FOOD)
  }

  async function addEntry(e) {
    e.preventDefault()
    if (!selectedFood || !amount) return
    if (editEntry) {
      await fetch(`${API}/foods/entries/${editEntry.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ food_id: selectedFood.id, amount: parseFloat(amount), meal: activeMeal, date, time: editEntry.time }) })
      setEditEntry(null)
    } else {
      await fetch(`${API}/foods/entries`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ food_id: selectedFood.id, amount: parseFloat(amount), meal: activeMeal, date, time: new Date().toTimeString().slice(0, 5) }) })
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

  async function handleOcrResult(data) {
    const { name, category, unit, ...nutrition } = data
    const res = await fetch(`${API}/foods`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, unit: unit||'g', category: category||'otros', kcal100: parseFloat(nutrition.kcal100)||0, protein100: parseFloat(nutrition.protein100)||0, satfat100: parseFloat(nutrition.satfat100)||0, carbs100: parseFloat(nutrition.carbs100)||0, sugar100: parseFloat(nutrition.sugar100)||0, fiber100: parseFloat(nutrition.fiber100)||0, salt100: parseFloat(nutrition.salt100)||0 }) })
    if (res.ok) { setShowOcr(false); loadFoods() }
  }

  function startEditFood(f) {
    setEditFood(f)
    setNewFood({ name: f.name, unit: f.unit, category: f.category||'otros', kcal100: String(f.kcal100), protein100: String(f.protein100), satfat100: String(f.satfat100), carbs100: String(f.carbs100), sugar100: String(f.sugar100), fiber100: String(f.fiber100), salt100: String(f.salt100), vitamins: f.vitamins||'' })
    setShowFoodForm(true); setShowOcr(false); window.scrollTo(0, 0)
  }

  function startEdit(e) {
    setEditEntry(e)
    setSelectedFood({ id: e.food_id, name: e.name, unit: e.unit, kcal100: e.kcal100, protein100: e.protein100, satfat100: e.satfat100, carbs100: e.carbs100, sugar100: e.sugar100, fiber100: e.fiber100, salt100: e.salt100 })
    setAmount(String(e.amount)); setSearch(e.name); setActiveMeal(e.meal||'comida')
    window.scrollTo(0, 0)
  }

  function openMealAdd(mealKey) {
    setActiveMeal(mealKey); setSelectedFood(null); setSearch(''); setAmount(''); setEditEntry(null); setInlineCreate(false)
    setExpandedMeals(prev => ({ ...prev, [mealKey]: true }))
    window.scrollTo(0, 0)
  }

  function cancelAdd() {
    setActiveMeal(null); setSelectedFood(null); setSearch(''); setAmount(''); setEditEntry(null); setInlineCreate(false)
  }

  const filtered = foods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
  const catalogFiltered = foods.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(catalogSearch.toLowerCase())
    const matchCategory = filterCategory === 'todos' || f.category === filterCategory
    return matchSearch && matchCategory
  })

  const totals = entries.reduce((acc, e) => {
    const f = calcFactor(e.amount)
    acc.kcal += e.kcal100*f; acc.protein += e.protein100*f; acc.satfat += e.satfat100*f
    acc.carbs += e.carbs100*f; acc.sugar += e.sugar100*f; acc.fiber += e.fiber100*f; acc.salt += e.salt100*f
    return acc
  }, { kcal:0, protein:0, satfat:0, carbs:0, sugar:0, fiber:0, salt:0 })

  if (!token) return <Login onLogin={handleLogin} darkMode={darkMode} />
  if (needsOnboarding) return <Onboarding username={username} onComplete={handleOnboardingComplete} />

  const inputStyle = { width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }

  // Layout responsive
  const mainMaxWidth = isDesktop ? 1200 : 480
  const contentLayout = isDesktop ? { display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: 24, alignItems: 'start' } : {}

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 40 }}>
      <div style={{ maxWidth: mainMaxWidth, width: '100%', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: C.white, padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>NutriLog</div>
            <input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)}
              style={{ border: 'none', background: 'none', fontSize: 15, fontWeight: 600, color: C.text, padding: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => exportDayPDF(date, username)} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.accent, padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📄 Día</button>
            <button onClick={() => exportWeekPDF(username)} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.accent, padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📊 Semana</button>
            <button onClick={toggleDark} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, padding: '5px 10px', borderRadius: 20, fontSize: 13, cursor: 'pointer' }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
              <AvatarDisplay avatarData={avatarData} username={username} size={34} />
            </div>
            <button onClick={handleLogout} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, padding: '5px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>Salir</button>
          </div>
        </div>

        <div style={{ padding: isDesktop ? '20px 24px' : '0 0 0' }}>
          <div style={contentLayout}>

            {/* Columna izquierda — Resumen */}
            <div>
              {/* Tarjeta principal */}
              <div style={{ background: C.white, margin: isDesktop ? '0' : '16px 16px 0', borderRadius: 24, padding: '24px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: isDesktop ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Consumidas</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{round(totals.kcal)}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>kcal</div>
                  </div>
                  <CircleProgress value={totals.kcal} max={goal} size={160} C={C} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Objetivo</div>
                    {editGoal ? (
                      <input type="number" value={goal} autoFocus onChange={e => setGoal(parseFloat(e.target.value)||0)} onBlur={() => { setEditGoal(false); saveGoal(goal) }}
                        style={{ width: 70, border: `2px solid ${C.accent}`, borderRadius: 8, padding: '4px 6px', fontSize: 18, fontWeight: 800, textAlign: 'right', color: C.text, background: C.bg }} />
                    ) : (
                      <div onClick={() => setEditGoal(true)} style={{ fontSize: 28, fontWeight: 800, color: C.text, cursor: 'pointer' }}>{goal}</div>
                    )}
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {savingGoal ? '💾' : <span onClick={() => setEditGoal(true)} style={{ color: C.accent, cursor: 'pointer' }}>editar</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <MacroBar label="Proteína" value={totals.protein} goal={macroGoals.protein} color={C.blue} bg={C.blueLight} C={C} />
                  <MacroBar label="Hidratos" value={totals.carbs} goal={macroGoals.carbs} color={C.yellow} bg={C.yellowLight} C={C} />
                  <MacroBar label="Grasas sat." value={totals.satfat} goal={macroGoals.satfat} color={C.red} bg={C.redLight} C={C} />
                  <MacroBar label="Sal" value={totals.salt} goal={macroGoals.salt} color={C.purple} bg={C.purpleLight} C={C} />
                </div>

                <div style={{ marginTop: 8, background: C.tealLight, borderRadius: 14, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: C.teal, fontWeight: 700 }}>Fibra</div>
                  <div style={{ flex: 1, margin: '0 10px', height: 4, background: 'rgba(128,128,128,0.2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (totals.fiber/macroGoals.fiber)*100)}%`, background: C.teal, borderRadius: 99, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>{round(totals.fiber)}g <span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>/ {macroGoals.fiber}g</span></div>
                </div>
              </div>

              {/* Tabs — en desktop solo en columna izquierda */}
              {isDesktop && (
                <div style={{ background: C.white, borderRadius: 16, padding: 4, display: 'flex', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  {tabs.map(([key, label]) => (
                    <button key={key} onClick={() => setView(key)} style={{ flex: 1, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: 12, background: view === key ? C.accent : 'transparent', color: view === key ? '#fff' : C.muted, transition: 'all 0.2s' }}>{label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Columna derecha — Contenido */}
            <div>
              {/* Tabs — en móvil */}
              {!isDesktop && (
                <div style={{ display: 'flex', margin: '16px 16px 0', background: C.white, borderRadius: 16, padding: 4, gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  {tabs.map(([key, label]) => (
                    <button key={key} onClick={() => setView(key)} style={{ flex: 1, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: 12, background: view === key ? C.accent : 'transparent', color: view === key ? '#fff' : C.muted, transition: 'all 0.2s' }}>{label}</button>
                  ))}
                </div>
              )}

              {/* Panel añadir alimento */}
              {activeMeal && (
                <div style={{ margin: isDesktop ? '0 0 16px' : '12px 16px 0', background: C.white, borderRadius: 20, padding: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: `2px solid ${C.accentMid}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
                      {editEntry ? 'Editando entrada' : `Añadir a ${MEALS.find(m => m.key === activeMeal)?.emoji} ${MEALS.find(m => m.key === activeMeal)?.label}`}
                    </div>
                    <button onClick={cancelAdd} style={{ border: 'none', background: C.accentLight, color: C.accent, borderRadius: 20, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✕ Cancelar</button>
                  </div>
                  <input placeholder="🔍 Buscar alimento..." value={search}
                    onChange={e => { setSearch(e.target.value); if (!editEntry) setSelectedFood(null); setAmount('') }}
                    style={{ ...inputStyle, marginBottom: 0 }} />
                  {search && !selectedFood && !inlineCreate && (
                    <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.white, maxHeight: 250, overflowY: 'auto' }}>
                      {filtered.length === 0
                        ? (
                          <div style={{ padding: '12px 14px', fontSize: 13, color: C.muted, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                            <span>No hay ningún alimento con ese nombre.</span>
                            <button type="button" onClick={() => { setNewFood({ ...EMPTY_FOOD, name: search }); setInlineCreate(true) }}
                              style={{ border: 'none', background: C.accent, color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                              + Crear "{search}"
                            </button>
                          </div>
                        )
                        : filtered.map(f => (
                          <div key={f.id} onClick={() => { setSelectedFood(f); setSearch(f.name) }}
                            style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.white }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 20 }}>{CATEGORIES.find(c => c.key === f.category)?.emoji || '📦'}</span>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{f.name}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{f.kcal100} kcal / 100{f.unit}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{f.unit}</div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  {inlineCreate && (
                    <form onSubmit={createFoodInline} style={{ marginTop: 12, background: C.bg, borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 8 }}>Nuevo alimento</div>
                      <input type="text" value={newFood.name} placeholder="Nombre" onChange={e => setNewFood({ ...newFood, name: e.target.value })} style={{ ...inputStyle, marginBottom: 8 }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <select value={newFood.category} onChange={e => setNewFood({ ...newFood, category: e.target.value })} style={{ ...inputStyle, height: 42 }}>
                          {CATEGORIES.filter(c => c.key !== 'todos').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                        <select value={newFood.unit} onChange={e => setNewFood({ ...newFood, unit: e.target.value })} style={{ ...inputStyle, height: 42 }}>
                          <option value="g">g (sólido)</option>
                          <option value="ml">ml (líquido)</option>
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {[['Kcal/100', 'kcal100'], ['Proteína (g)', 'protein100'], ['Hidratos (g)', 'carbs100'], ['Azúcares (g)', 'sugar100'], ['Grasas sat. (g)', 'satfat100'], ['Fibra (g)', 'fiber100'], ['Sal (g)', 'salt100']].map(([label, key]) => (
                          <div key={key}>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                            <input type="number" value={newFood[key]} placeholder="0" onChange={e => setNewFood({ ...newFood, [key]: e.target.value })} style={inputStyle} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button type="submit" style={{ flex: 1, padding: '11px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Crear y seleccionar</button>
                        <button type="button" onClick={() => { setInlineCreate(false); setNewFood(EMPTY_FOOD) }} style={{ padding: '11px 14px', background: C.white, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                      </div>
                    </form>
                  )}
                  {selectedFood && (
                    <form onSubmit={addEntry} style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, padding: '8px 12px', background: C.accentLight, borderRadius: 10 }}>
                        <strong style={{ color: C.accent }}>{selectedFood.name}</strong> · {selectedFood.kcal100} kcal/100{selectedFood.unit}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Cantidad en {selectedFood.unit === 'ml' ? 'ml' : 'gramos'}</div>
                          <input type="number" placeholder={selectedFood.unit === 'ml' ? 'Ej: 250' : 'Ej: 35'} value={amount} onChange={e => setAmount(e.target.value)} autoFocus
                            style={{ width: '100%', border: `2px solid ${C.accent}`, background: C.white, color: C.text, padding: '12px 14px', borderRadius: 12, fontSize: 18, fontWeight: 800, boxSizing: 'border-box' }} />
                        </div>
                        <button type="submit" style={{ padding: '12px 20px', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', height: 50 }}>
                          {editEntry ? 'Guardar' : 'Añadir'}
                        </button>
                      </div>
                      {amount && parseFloat(amount) > 0 && (
                        <div style={{ marginTop: 10, background: C.bg, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>{round(selectedFood.kcal100 * parseFloat(amount) / 100)} kcal</div>
                          {[['P', selectedFood.protein100, C.blue], ['H', selectedFood.carbs100, C.yellow], ['Sat', selectedFood.satfat100, C.red], ['Sal', selectedFood.salt100, C.purple]].map(([label, val, color]) => (
                            <div key={label} style={{ fontSize: 12, color: C.muted }}>{label}: <strong style={{ color }}>{round(val * parseFloat(amount) / 100)}g</strong></div>
                          ))}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* Vista Registro */}
              {view === 'registro' && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  {MEALS.map(meal => {
                    const mealEntries = entries.filter(e => (e.meal || 'comida') === meal.key)
                    const mealKcal = mealEntries.reduce((sum, e) => sum + e.kcal100 * calcFactor(e.amount), 0)
                    const isExpanded = !!expandedMeals[meal.key]
                    return (
                      <div key={meal.key} style={{ background: C.white, borderRadius: 20, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        {/* Cabecera de comida — siempre visible */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', cursor: 'pointer' }} onClick={() => toggleMeal(meal.key)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 11, background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{meal.emoji}</div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{meal.label}</div>
                              <div style={{ fontSize: 11, color: C.muted }}>
                                {mealEntries.length > 0 ? `${mealEntries.length} alimento${mealEntries.length > 1 ? 's' : ''} · ${round(mealKcal)} kcal` : 'Sin registros'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={e => { e.stopPropagation(); openMealAdd(meal.key) }} style={{ width: 30, height: 30, borderRadius: '50%', background: activeMeal === meal.key ? C.accent : C.accentLight, color: activeMeal === meal.key ? '#fff' : C.accent, border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                            <span style={{ fontSize: 12, color: C.muted }}>{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {/* Entradas — solo si expandido */}
                        {isExpanded && mealEntries.map(e => {
                          const f = e.amount / 100
                          return (
                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderTop: `1px solid ${C.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                <span style={{ fontSize: 22, flexShrink: 0 }}>{CATEGORIES.find(c => c.key === e.category)?.emoji || '📦'}</span>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{e.name}</div>
                                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                    {e.amount}{e.unit} · P:{round(e.protein100*f)}g · H:{round(e.carbs100*f)}g · Sal:{round(e.salt100*f)}g
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>{round(e.kcal100*f)}</div>
                                <button onClick={() => startEdit(e)} style={{ border: 'none', background: C.blueLight, color: C.blue, cursor: 'pointer', borderRadius: 8, width: 28, height: 28, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                                <button onClick={() => deleteEntry(e.id)} style={{ border: 'none', background: C.redLight, color: C.red, cursor: 'pointer', borderRadius: 8, width: 28, height: 28, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                              </div>
                            </div>
                          )
                        })}
                        {isExpanded && mealEntries.length === 0 && (
                          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted, textAlign: 'center' }}>
                            Nada registrado · Pulsa + para añadir
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Vista Catálogo */}
              {view === 'catalogo' && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={() => { setShowFoodForm(!showFoodForm); setShowOcr(false); setEditFood(null); setNewFood(EMPTY_FOOD) }} style={{ flex: 1, padding: '13px', background: showFoodForm ? C.bg : C.accent, color: showFoodForm ? C.muted : '#fff', border: showFoodForm ? `1px solid ${C.border}` : 'none', borderRadius: 16, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {showFoodForm ? '✕ Cancelar' : '+ Añadir alimento'}
                    </button>
                    <button onClick={() => { setShowOcr(!showOcr); setShowFoodForm(false) }} style={{ flex: 1, padding: '13px', background: showOcr ? C.bg : C.white, color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 16, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {showOcr ? '✕ Cancelar' : '📷 Escanear'}
                    </button>
                  </div>

                  {showOcr && <OcrScanner onResult={handleOcrResult} onClose={() => setShowOcr(false)} />}

                  {showFoodForm && (
                    <form onSubmit={addFood} style={{ background: C.white, borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 14 }}>{editFood ? `Editando: ${editFood.name}` : 'Nuevo alimento — valores por 100g/ml'}</div>
                      <div style={{ marginBottom: 10 }}>
                        <Label C={C}>Nombre</Label>
                        <input type="text" value={newFood.name} placeholder="Ej: Leche entera" onChange={e => setNewFood({ ...newFood, name: e.target.value })} style={inputStyle} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <div>
                          <Label C={C}>Categoría</Label>
                          <select value={newFood.category} onChange={e => setNewFood({ ...newFood, category: e.target.value })} style={{ ...inputStyle, height: 42 }}>
                            {CATEGORIES.filter(c => c.key !== 'todos').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label C={C}>Unidad</Label>
                          <select value={newFood.unit} onChange={e => setNewFood({ ...newFood, unit: e.target.value })} style={{ ...inputStyle, height: 42 }}>
                            <option value="g">g (sólido)</option>
                            <option value="ml">ml (líquido)</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {[['Kcal/100g·ml','kcal100'],['Proteína (g)','protein100'],['Hidratos (g)','carbs100'],['Azúcares (g)','sugar100'],['Grasas sat. (g)','satfat100'],['Fibra (g)','fiber100'],['Sal (g)','salt100']].map(([label, key]) => (
                          <div key={key}>
                            <Label C={C}>{label}</Label>
                            <input type="number" value={newFood[key]} placeholder="0" onChange={e => setNewFood({ ...newFood, [key]: e.target.value })} style={inputStyle} />
                          </div>
                        ))}
                        <div>
                          <Label C={C}>Vitaminas</Label>
                          <input type="text" value={newFood.vitamins} placeholder="Ej: A, C, D" onChange={e => setNewFood({ ...newFood, vitamins: e.target.value })} style={inputStyle} />
                        </div>
                      </div>
                      <button type="submit" style={{ width: '100%', marginTop: 14, padding: '13px', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        {editFood ? 'Guardar cambios' : 'Guardar alimento'}
                      </button>
                    </form>
                  )}

                  <input placeholder="🔍 Buscar en el catálogo..." value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                    style={{ ...inputStyle, background: C.white, marginBottom: 10, borderRadius: 14, padding: '12px 14px' }} />

                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
                    {CATEGORIES.map(c => (
                      <button key={c.key} onClick={() => setFilterCategory(c.key)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: filterCategory === c.key ? C.accent : C.white, color: filterCategory === c.key ? '#fff' : C.muted, fontSize: 12, fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>{c.label}</button>
                    ))}
                  </div>

                  <div style={{ display: isDesktop ? 'grid' : 'block', gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : undefined, gap: 8 }}>
                    {catalogFiltered.length === 0
                      ? <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '40px 0' }}>{foods.length === 0 ? 'El catálogo está vacío.' : 'No hay alimentos en esta categoría.'}</div>
                      : catalogFiltered.map(f => (
                        <div key={f.id} style={{ background: C.white, borderRadius: 16, padding: '14px 16px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 24, flexShrink: 0 }}>{CATEGORIES.find(c => c.key === f.category)?.emoji || '📦'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{f.name}</div>
                                <span style={{ fontSize: 10, background: C.accentLight, color: C.accent, padding: '2px 6px', borderRadius: 8, fontWeight: 600 }}>{f.unit}</span>
                              </div>
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                                {f.kcal100} kcal · P:{f.protein100}g · H:{f.carbs100}g · Sat:{f.satfat100}g · Sal:{f.salt100}g
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                            <button onClick={() => startEditFood(f)} style={{ border: 'none', background: C.blueLight, color: C.blue, cursor: 'pointer', borderRadius: 8, width: 28, height: 28, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                            <button onClick={() => deleteFood(f.id)} style={{ border: 'none', background: C.redLight, color: C.red, cursor: 'pointer', borderRadius: 8, width: 28, height: 28, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Vista Mi Plan */}
              {view === 'plan' && canSeePlan && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  <div style={{ background: C.white, borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <iframe src="/nutrilog/plan_trigliceridos.html" style={{ width: '100%', height: '80vh', border: 'none' }} title="Mi Plan de Vida" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 16px', marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.mutedLight }}>© {new Date().getFullYear()} NutriLog · Todos los derechos reservados</div>
          <div style={{ fontSize: 10, color: C.mutedLight, marginTop: 2 }}>Desarrollado por Daniel Ambrosio</div>
        </div>
      </div>

      {showProfile && (
        <Profile username={username} onClose={() => setShowProfile(false)} onAvatarUpdate={av => setAvatarData(av)} darkMode={darkMode} macroGoals={macroGoals} onMacrosUpdate={macros => { setMacroGoals(macros); setGoal(macros.kcal) }} />
      )}

      {whatsNew && (
        <WhatsNew
          entries={whatsNew}
          C={C}
          onClose={() => {
            localStorage.setItem('nutrilog_changelog_seen', LATEST_VERSION)
            setWhatsNew(null)
          }}
        />
      )}
    </div>
  )
}

function Label({ children, C }) {
  return <div style={{ fontSize: 10, color: C?.muted || '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{children}</div>
}