import { useState, useEffect } from 'react'
import Login from './Login'
import OcrScanner from './OcrScanner'
import Profile from './Profile'
import Onboarding from './Onboarding'
import { exportDayPDF, exportWeekPDF } from './PdfExport'
import WhatsNew from './WhatsNew'
import Consejos, { CardsSection } from './Consejos'
import Progreso from './Progreso'
import MiPlan from './MiPlan'
import Carrusel from './Carrusel'
import Compra from './Compra'
import Recetas from './Recetas'
import { unseenEntries, LATEST_VERSION } from './changelog'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

const MEALS = [
  { key: 'desayuno', label: 'Desayuno', emoji: '☀️' },
  { key: 'almuerzo', label: 'Almuerzo', emoji: '🍎' },
  { key: 'comida', label: 'Comida', emoji: '🍽️' },
  { key: 'merienda', label: 'Merienda', emoji: '🥪' },
  { key: 'cena', label: 'Cena', emoji: '🌙' },
]

const PLAN_MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const PLAN_WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Semanas del plan: bloques de 7 días desde el lunes en/antes del día 1 del mes.
// El mes casi nunca encaja en exactamente 4 semanas de 7 días — la 4ª absorbe lo que
// sobre (así lo definió Daniel: del 21 al 30 de septiembre es toda "S4", aunque sean
// más de 7 días). Devuelve null si la fecha no coincide con ningún día del plan.
function getPlanDayId(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const current = new Date(y, m - 1, d)
  const firstOfMonth = new Date(y, m - 1, 1)
  const daysSinceMonday = (firstOfMonth.getDay() + 6) % 7
  const anchorMonday = new Date(y, m - 1, 1 - daysSinceMonday)
  const diffDays = Math.round((current - anchorMonday) / 86400000)
  const weekNum = Math.min(4, Math.floor(diffDays / 7) + 1)
  return { weekId: `${PLAN_MONTH_ABBR[m - 1]}${weekNum}`, weekdayName: PLAN_WEEKDAY_NAMES[current.getDay()] }
}

// Trocea el HTML del plan (ya público en /nutrilog/) para sacar solo el día de hoy —
// sin ejercicios ni tips generales, tal como pidió Daniel. Si el HTML cambia de
// estructura (mes nuevo con otro formato) esto simplemente no encuentra nada y la
// miniventana no aparece, en vez de romper la app.
async function fetchPlanDay(dateStr) {
  const { weekId, weekdayName } = getPlanDayId(dateStr)
  try {
    const res = await fetch('/nutrilog/plan_trigliceridos.html')
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const weekSection = doc.getElementById(weekId)
    if (!weekSection) return null
    const dayCard = Array.from(weekSection.querySelectorAll('.day-card'))
      .find(card => card.querySelector('.day-header')?.textContent.includes(weekdayName))
    if (!dayCard) return null
    const headerText = dayCard.querySelector('.day-header').textContent.trim()
    const meals = Array.from(dayCard.querySelectorAll('.meal-row')).map(row => ({
      label: row.querySelector('.meal-label')?.textContent.trim() || '',
      text: row.querySelector('.meal-text')?.textContent.trim() || '',
    }))
    return { headerText, meals }
  } catch (err) {
    console.error('No se pudo cargar el plan del día:', err)
    return null
  }
}

// "23:08" (mm:ss) o "1:02:08" (h:mm:ss) → minutos decimales. Sin ":", se trata como
// minutos enteros (compatible con lo que había antes de poder escribir mm:ss).
function parseDuration(str) {
  const s = String(str).trim()
  if (!s) return null
  if (!s.includes(':')) {
    const n = parseFloat(s)
    return isNaN(n) ? null : n
  }
  const parts = s.split(':').map(p => parseInt(p, 10) || 0)
  if (parts.length === 2) return parts[0] + parts[1] / 60
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60
  return null
}

// Minutos decimales → "mm:ss", para volver a mostrar en el campo lo ya guardado.
function formatDuration(min) {
  if (min == null) return ''
  const totalSeconds = Math.round(min * 60)
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

const SESSION_TYPES = [
  { key: 'torso', label: 'Torso', emoji: '💪' },
  { key: 'piernas', label: 'Piernas', emoji: '🦵' },
  { key: 'core', label: 'Core', emoji: '🎯' },
  { key: 'cardio', label: 'Cardio', emoji: '🏃' },
]
// Sugerencias rápidas por tipo de sesión — texto libre, no un catálogo cerrado.
const EXERCISE_SUGGESTIONS = {
  torso: ['Press banca', 'Remo serrucho', 'Curl bíceps', 'Fondos tríceps', 'Abdominales'],
  piernas: ['Sentadillas', 'Leg extension', 'Curl femoral', 'Gemelos', 'Abdominales'],
  core: ['Plancha', 'Puente de glúteos', 'Elevación de piernas', 'Crunch'],
  cardio: ['Elíptica', 'Andar', 'Comba'],
}
// Tipos de sesión que se miden entera (varios ejercicios, un solo dato de reloj para todo):
// llevan un resumen aparte en vez de repetir kcal/FC/esfuerzo en cada ejercicio.
const SUMMARY_SESSION_TYPES = ['torso', 'piernas', 'core']

// Subpestañas de Entreno. Todas menos «registro» son tarjetas propias de cada usuario.
const ENTRENO_TABS = [['registro', '📝 Registro'], ['ejercicio', '🏃 Ejercicio'], ['pesas', '💪 Pesas'], ['piernas', '🦵 Piernas'], ['tabla', '📋 Tabla']]
const ENTRENO_EMPTY = {
  ejercicio: 'Aún no tienes nada aquí. Pulsa «+ Añadir» para crear tu plan de ejercicio (cardio, estiramientos, movilidad…).',
  pesas: 'Aún no tienes nada aquí. Pulsa «+ Añadir» para crear tu rutina de pesas.',
  piernas: 'Aún no tienes nada aquí. Pulsa «+ Añadir» para crear tu rutina de piernas.',
  tabla: 'Aún no tienes nada aquí. Pulsa «+ Añadir» para crear tu tabla de ejercicios.',
  suplementos: 'Aún no tienes nada aquí. Pulsa «+ Añadir» para apuntar los suplementos que tomas y cuándo.',
}

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

const DEFAULT_GOALS = { protein: 163, carbs: 230, satfat: 12, salt: 4, fiber: 30, sugar: 40, kcal: 2400 }
const PLAN_USERS = ['Daniel', 'daniel']

// Temas de color. Cada uno pisa solo lo que cambia (acento y tintes de fondo) sobre la
// paleta base, en claro y en oscuro; los colores semánticos (verde, rojo…) no se tocan.
// «naranja» es la paleta base sin cambios.
const THEMES = {
  naranja: { name: 'Naranja', swatch: '#FF6B35', light: {}, dark: {} },
  oceano: {
    name: 'Océano', swatch: '#0EA5E9',
    light: { bg: '#F3F8FB', border: '#DDE9F0', accent: '#0EA5E9', accentLight: '#E0F2FE', accentMid: '#7DD3FC' },
    dark: { bg: '#0A1118', white: '#111C26', border: '#1F2E3B', accent: '#38BDF8', accentLight: '#0C2233', accentMid: '#0C4A6E' },
  },
  bosque: {
    name: 'Bosque', swatch: '#16A34A',
    light: { bg: '#F4F8F3', border: '#E0EADC', accent: '#16A34A', accentLight: '#E5F5E6', accentMid: '#86EFAC' },
    dark: { bg: '#0C120C', white: '#131C13', border: '#233023', accent: '#22C55E', accentLight: '#0E2A14', accentMid: '#14532D' },
  },
  uva: {
    name: 'Uva', swatch: '#8B5CF6',
    light: { bg: '#F7F5FB', border: '#E7E1F2', accent: '#8B5CF6', accentLight: '#EDE9FE', accentMid: '#C4B5FD' },
    dark: { bg: '#100C18', white: '#181222', border: '#2A2038', accent: '#A78BFA', accentLight: '#1D1433', accentMid: '#4C1D95' },
  },
  rosa: {
    name: 'Rosa', swatch: '#EC4899',
    light: { bg: '#FBF5F8', border: '#F1DFE8', accent: '#EC4899', accentLight: '#FCE7F3', accentMid: '#F9A8D4' },
    dark: { bg: '#160B11', white: '#1F121A', border: '#361E2A', accent: '#F472B6', accentLight: '#2E1020', accentMid: '#831843' },
  },
  cafe: {
    name: 'Café', swatch: '#B45309',
    light: { bg: '#F6F1EA', white: '#FFFBF5', border: '#E8DDCC', accent: '#B45309', accentLight: '#F5E6D3', accentMid: '#DDB98A' },
    dark: { bg: '#14100C', white: '#1D1712', border: '#33291F', accent: '#D97706', accentLight: '#2A1C10', accentMid: '#6B3A12' },
  },
  grafito: {
    name: 'Grafito', swatch: '#64748B',
    light: { bg: '#F4F5F7', border: '#E2E5EA', accent: '#64748B', accentLight: '#E8ECF1', accentMid: '#B8C2CF' },
    dark: { bg: '#0E1013', white: '#171A1F', border: '#272C33', accent: '#94A3B8', accentLight: '#1B222B', accentMid: '#3A4756' },
  },
}

function getColors(dark, theme = 'naranja') {
  const base = getBaseColors(dark)
  return { ...base, ...(THEMES[theme]?.[dark ? 'dark' : 'light'] || {}) }
}

function getBaseColors(dark) {
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
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
// La semana (lunes a domingo) que contiene `iso`, para la tira de días de la cabecera.
function getWeekStrip(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const sinceMonday = (base.getDay() + 6) % 7 // getDay(): 0=domingo..6=sábado
  const monday = new Date(base)
  monday.setDate(base.getDate() - sinceMonday)
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    const iso2 = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    return { iso: iso2, num: dt.getDate(), letter: DAY_LETTERS[i] }
  })
}
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
  // Todo el trazado se diseñó para size=160 (r=68, trazo 12, offsets de texto). En vez de
  // fijarlo, se escala en bloque: a size=160 sale exactamente igual que antes; a cualquier
  // otro tamaño (el círculo más pequeño del móvil) mantiene las mismas proporciones en vez
  // de que el radio se salga de la caja.
  const scale = size / 160
  const r = 68 * scale, cx = size / 2, cy = size / 2
  const strokeWidth = 12 * scale
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
      <path d={describeArc(startAngle, endAngle)} fill="none" stroke={C.border} strokeWidth={strokeWidth} strokeLinecap="round" />
      {pct > 0 && <path d={describeArc(startAngle, currentAngle)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />}
      <text x={cx} y={cy - 8 * scale} textAnchor="middle" fontSize={30 * scale} fontWeight="700" fill={C.text}>{round(value)}</text>
      <text x={cx} y={cy + 14 * scale} textAnchor="middle" fontSize={11 * scale} fill={C.muted}>kcal</text>
      <text x={cx} y={cy + 30 * scale} textAnchor="middle" fontSize={10 * scale} fill={color} fontWeight="600">
        {over ? `+${round(value - max)} exceso` : `${round(max - value)} restantes`}
      </text>
    </svg>
  )
}

function MacroRing({ label, value, goal, color, C, size = 66 }) {
  const pct = Math.min(1, value / goal)
  const over = value > goal
  const r = size / 2 - 5
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)
  const ringColor = over ? C.red : color
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.4s' }} />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="13" fontWeight="800" fill={C.text}>{round(value)}</text>
      </svg>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 9, color: C.muted, textAlign: 'center', lineHeight: 1.3 }}>
        obj. {goal}g<br />{over ? <span style={{ color: C.red }}>+{round(value - goal)}g</span> : `${round(goal - value)}g restantes`}
      </div>
    </div>
  )
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('nutrilog_dark')
    if (stored === 'true') return true
    if (stored === 'false') return false
    // Sin elección guardada: seguir el tema del sistema (móvil u ordenador).
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [theme, setTheme] = useState(() => {
    try { const t = localStorage.getItem('nutrilog_theme'); return THEMES[t] ? t : 'naranja' } catch { return 'naranja' }
  })
  const [showThemes, setShowThemes] = useState(false)
  const C = getColors(darkMode, theme)

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
  const [planToday, setPlanToday] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [activitySessions, setActivitySessions] = useState([])
  const [entrenoTab, setEntrenoTab] = useState('registro')
  const [takesSupp, setTakesSupp] = useState(false)
  const [summaryType, setSummaryType] = useState('torso')
  const [sessionForm, setSessionForm] = useState({ duration_min: '', kcal_active: '', kcal_total: '', hr_avg: '', effort: '' })
  const [showSessionSummary, setShowSessionSummary] = useState(false)
  const [savingSummary, setSavingSummary] = useState(false)
  const [summarySaved, setSummarySaved] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [newActivity, setNewActivity] = useState({
    session_type: 'torso', exercise_name: '', sets: '', reps: '', weight: '', duration_min: '',
    kcal_active: '', kcal_total: '', hr_avg: '', effort: '', intervals: '',
    distance_km: '', pace_avg: '', elevation_m: '',
  })
  const ACTIVITY_RESET = {
    exercise_name: '', sets: '', reps: '', weight: '', duration_min: '',
    kcal_active: '', kcal_total: '', hr_avg: '', effort: '', intervals: '',
    distance_km: '', pace_avg: '', elevation_m: '',
  }
  const isAndar = newActivity.exercise_name.trim().toLowerCase() === 'andar'

  // El resumen de sesión se guarda una vez por día+tipo, no por ejercicio: al cambiar de
  // tipo o de día, se recarga con lo ya guardado (o vacío si no hay nada todavía).
  useEffect(() => {
    const s = activitySessions.find(s => s.session_type === summaryType)
    setSessionForm({
      duration_min: s?.duration_min != null ? formatDuration(s.duration_min) : '',
      kcal_active: s?.kcal_active ?? '', kcal_total: s?.kcal_total ?? '',
      hr_avg: s?.hr_avg ?? '', effort: s?.effort ?? '',
    })
  }, [summaryType, activitySessions])

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 900)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Si el usuario nunca ha tocado el botón de tema, seguir el del sistema en vivo
  // (cambia el móvil de oscuro a claro con la hora, por ejemplo).
  useEffect(() => {
    if (localStorage.getItem('nutrilog_dark') !== null) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = e => setDarkMode(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('nutrilog_dark', String(next))
  }

  function changeTheme(key) {
    setTheme(key)
    try { localStorage.setItem('nutrilog_theme', key) } catch { /* sin almacenamiento: el tema vale solo para esta sesión */ }
  }

  const canSeePlan = PLAN_USERS.includes(username)
  const tabs = [['registro', 'Registro'], ['catalogo', 'Catálogo'], ['entreno', '🏋️ Entreno'], ['consejos', '💡 Consejos'], ['compra', '🛒 Compra'], ['recetas', '🍳 Recetas'], ['plan', '📋 Mi Plan'], ['progreso', '📈 Progreso']]

  const entrenoPills = takesSupp ? [...ENTRENO_TABS, ['suplementos', '🥤 Suplementos']] : ENTRENO_TABS

  async function changeSupplements(on) {
    try {
      const res = await fetch(`${API}/profile/supplements`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ takes: on }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
      setTakesSupp(on)
      setEntrenoTab(on ? 'suplementos' : 'registro')
    } catch (err) {
      alert(`No se pudo cambiar: ${err.message}`)
    }
  }

  function handleLogin(tkn, user) { setToken(tkn); setUsername(user) }
  function handleLogout() {
    localStorage.removeItem('nutrilog_token')
    localStorage.removeItem('nutrilog_user')
    setToken(null); setUsername(''); setAvatarData(null); setNeedsOnboarding(false)
  }

  function handleOnboardingComplete(macros) {
    setMacroGoals({ protein: macros.goal_protein, carbs: macros.goal_carbs, satfat: macros.goal_satfat, salt: macros.goal_salt, fiber: macros.goal_fiber, sugar: macros.goal_sugar, kcal: macros.goal_kcal })
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
      setTakesSupp(data.takes_supplements === true)
      if (data.goal_kcal) {
        // goal_sugar es un campo nuevo: si el usuario ya tenía objetivos guardados de antes,
        // aún no lo tiene en la BD (queda null) hasta que visite Perfil y lo guarde una vez.
        // Mientras tanto, se calcula igual que en el onboarding: 10% de las kcal, tope 40g.
        const sugarFallback = Math.round(Math.min(data.goal_kcal * 0.10 / 4, 40))
        setMacroGoals({ protein: data.goal_protein, carbs: data.goal_carbs, satfat: data.goal_satfat, salt: data.goal_salt, fiber: data.goal_fiber, sugar: data.goal_sugar ?? sugarFallback, kcal: data.goal_kcal })
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
  useEffect(() => { if (token) loadActivity() }, [date, token])
  useEffect(() => {
    if (!token || !canSeePlan) { setPlanToday(null); return }
    fetchPlanDay(date).then(setPlanToday)
  }, [date, token, canSeePlan])

  async function loadEntries() {
    const res = await fetch(`${API}/foods/entries?date=${date}`, { headers: getHeaders() })
    if (res.status === 401) { handleLogout(); return }
    const data = await res.json()
    setEntries(Array.isArray(data) ? data : [])
  }

  async function loadActivity() {
    const [res, sres] = await Promise.all([
      fetch(`${API}/activity?from=${date}&to=${date}`, { headers: getHeaders() }),
      fetch(`${API}/activity/sessions?from=${date}&to=${date}`, { headers: getHeaders() }),
    ])
    if (res.status === 401 || sres.status === 401) { handleLogout(); return }
    const data = await res.json()
    const sdata = await sres.json()
    setActivityLog(Array.isArray(data) ? data : [])
    setActivitySessions(Array.isArray(sdata) ? sdata : [])
  }

  async function saveSessionSummary() {
    setSavingSummary(true)
    setSummarySaved(false)
    try {
      const res = await fetch(`${API}/activity/sessions`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({
          date, session_type: summaryType,
          duration_min: parseDuration(sessionForm.duration_min),
          kcal_active: sessionForm.kcal_active ? parseFloat(sessionForm.kcal_active) : null,
          kcal_total: sessionForm.kcal_total ? parseFloat(sessionForm.kcal_total) : null,
          hr_avg: sessionForm.hr_avg ? parseInt(sessionForm.hr_avg) : null,
          effort: sessionForm.effort ? parseInt(sessionForm.effort) : null,
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`No se pudo guardar el resumen: ${err.error || res.status}`)
        return
      }
      await loadActivity()
      setSummarySaved(true)
      setTimeout(() => setSummarySaved(false), 3000)
    } catch (err) {
      alert(`No se pudo guardar el resumen — fallo de red: ${err.message}`)
    } finally {
      setSavingSummary(false)
    }
  }

  async function addActivity(e) {
    e.preventDefault()
    if (!newActivity.exercise_name.trim()) return
    await fetch(`${API}/activity`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({
        date, session_type: newActivity.session_type, exercise_name: newActivity.exercise_name.trim(),
        sets: newActivity.sets ? parseInt(newActivity.sets) : null,
        reps: newActivity.reps ? parseInt(newActivity.reps) : null,
        weight: newActivity.weight ? parseFloat(newActivity.weight) : null,
        duration_min: parseDuration(newActivity.duration_min),
        kcal_active: newActivity.kcal_active ? parseFloat(newActivity.kcal_active) : null,
        kcal_total: newActivity.kcal_total ? parseFloat(newActivity.kcal_total) : null,
        hr_avg: newActivity.hr_avg ? parseInt(newActivity.hr_avg) : null,
        effort: newActivity.effort ? parseInt(newActivity.effort) : null,
        intervals: newActivity.intervals.trim() || null,
        distance_km: isAndar && newActivity.distance_km ? parseFloat(newActivity.distance_km) : null,
        pace_avg: isAndar ? (newActivity.pace_avg.trim() || null) : null,
        elevation_m: isAndar && newActivity.elevation_m ? parseFloat(newActivity.elevation_m) : null,
      })
    })
    setNewActivity({ ...newActivity, ...ACTIVITY_RESET })
    loadActivity()
  }

  async function deleteActivity(id) {
    await fetch(`${API}/activity/${id}`, { method: 'DELETE', headers: getHeaders() })
    loadActivity()
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

  if (!token) return <Login onLogin={handleLogin} darkMode={darkMode} onToggleDark={toggleDark} C={C} />
  if (needsOnboarding) return <Onboarding username={username} onComplete={handleOnboardingComplete} />

  const inputStyle = { width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }

  // Layout responsive
  const mainMaxWidth = isDesktop ? 1200 : 480
  const contentLayout = isDesktop ? { display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: 24, alignItems: 'start' } : {}

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', paddingBottom: 40 }}>
      <div style={{ maxWidth: mainMaxWidth, width: '100%', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: C.white, padding: '14px 20px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>NutriLog</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginTop: 1 }}>Hola, {username} 👋</div>
            </div>
            <div onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
              <AvatarDisplay avatarData={avatarData} username={username} size={40} />
            </div>
          </div>

          {/* Tira de días de la semana */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12 }}>
            {getWeekStrip(date).map(d => {
              const selected = d.iso === date
              const isToday = d.iso === todayISO()
              // Cuadradito, no círculo: borde tenue a juego con el tema (blanco en oscuro,
              // gris oscuro suave en claro) por defecto; hoy pisa ese borde con uno verde;
              // el seleccionado se rellena de naranja encima de cualquiera de los dos.
              const baseBorder = darkMode ? '#FFFFFF' : '#333333'
              return (
                <div key={d.iso} onClick={() => setDate(d.iso)} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{d.letter}</div>
                  <div style={{
                    width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, boxSizing: 'border-box',
                    background: selected ? C.accent : 'transparent',
                    color: selected ? '#fff' : C.text,
                    border: `2px solid ${isToday ? C.green : baseBorder}`,
                  }}>{d.num}</div>
                </div>
              )
            })}
            <div style={{ position: 'relative', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => exportDayPDF(date, username)} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.accent, padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📄 Día</button>
              <button onClick={() => exportWeekPDF(username)} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.accent, padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📊 Semana</button>
              <button onClick={toggleDark} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, padding: '5px 10px', borderRadius: 20, fontSize: 13, cursor: 'pointer' }}>
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button onClick={() => setShowThemes(!showThemes)} style={{ border: `1px solid ${showThemes ? C.accent : C.border}`, background: C.white, color: C.muted, padding: '5px 10px', borderRadius: 20, fontSize: 13, cursor: 'pointer' }}>🎨</button>
            </div>
            <button onClick={handleLogout} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, padding: '5px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>Salir</button>
          </div>

          {showThemes && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} onClick={() => changeTheme(key)} title={t.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 16, background: t.swatch, boxSizing: 'border-box', border: `3px solid ${theme === key ? C.text : C.border}` }} />
                  <span style={{ fontSize: 10, color: theme === key ? C.text : C.muted, fontWeight: theme === key ? 700 : 500 }}>{t.name}</span>
                </button>
              ))}
            </div>
          )}
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
                  <CircleProgress value={totals.kcal} max={goal} size={isDesktop ? 160 : 130} C={C} />
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, justifyItems: 'center' }}>
                  <MacroRing label="Proteína" value={totals.protein} goal={macroGoals.protein} color={C.blue} C={C} />
                  <MacroRing label="Hidratos" value={totals.carbs} goal={macroGoals.carbs} color={C.yellow} C={C} />
                  <MacroRing label="Grasas sat." value={totals.satfat} goal={macroGoals.satfat} color={C.red} C={C} />
                  <MacroRing label="Sal" value={totals.salt} goal={macroGoals.salt} color={C.purple} C={C} />
                  <MacroRing label="Fibra" value={totals.fiber} goal={macroGoals.fiber} color={C.teal} C={C} />
                  <MacroRing label="Azúcar" value={totals.sugar} goal={macroGoals.sugar} color={C.green} C={C} />
                </div>
              </div>

              {/* Tabs — en desktop solo en columna izquierda */}
              {isDesktop && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {tabs.map(([key, label]) => (
                    <button key={key} onClick={() => setView(key)} style={{ ...(key === 'plan' ? { gridColumn: 'span 2' } : {}), padding: '12px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${view === key ? C.accent : C.border}`, borderRadius: 14, background: view === key ? C.accent : C.white, color: view === key ? '#fff' : C.muted, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>{label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Columna derecha — Contenido */}
            <div>
              {/* Tabs — en móvil */}
              {!isDesktop && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', margin: '16px 16px 0', gap: 8 }}>
                  {tabs.map(([key, label]) => (
                    <button key={key} onClick={() => setView(key)} style={{ ...(key === 'plan' ? { gridColumn: 'span 2' } : {}), padding: '12px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${view === key ? C.accent : C.border}`, borderRadius: 14, background: view === key ? C.accent : C.white, color: view === key ? '#fff' : C.muted, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>{label}</button>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, marginBottom: 8 }}>
                        <select value={newFood.category} onChange={e => setNewFood({ ...newFood, category: e.target.value })} style={{ ...inputStyle, height: 42, minWidth: 0 }}>
                          {CATEGORIES.filter(c => c.key !== 'todos').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                        <select value={newFood.unit} onChange={e => setNewFood({ ...newFood, unit: e.target.value })} style={{ ...inputStyle, height: 42, minWidth: 0 }}>
                          <option value="g">g (sólido)</option>
                          <option value="ml">ml (líquido)</option>
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        {[['Kcal/100', 'kcal100'], ['Proteína (g)', 'protein100'], ['Hidratos (g)', 'carbs100'], ['Azúcares (g)', 'sugar100'], ['Grasas sat. (g)', 'satfat100'], ['Fibra (g)', 'fiber100'], ['Sal (g)', 'salt100']].map(([label, key]) => (
                          <div key={key} style={{ minWidth: 0 }}>
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
                  <div style={{ background: C.white, borderRadius: 16, padding: '12px 14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.text, textTransform: 'uppercase', marginBottom: 8 }}>🎯 Objetivo diario</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                      {[['Kcal', macroGoals.kcal, ''], ['Proteína', macroGoals.protein, 'g'], ['Hidratos', macroGoals.carbs, 'g'], ['G. sat.', macroGoals.satfat, 'g'], ['Sal', macroGoals.salt, 'g'], ['Fibra', macroGoals.fiber, 'g'], ['Azúcar', macroGoals.sugar, 'g']].map(([name, val, unit]) => (
                        <div key={name} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>{val == null ? '—' : `${val}${unit}`}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{name}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {canSeePlan && planToday && (
                    <div style={{ background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 16, padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', marginBottom: 6 }}>📋 {planToday.headerText}</div>
                      {planToday.meals.map((m, i) => (
                        <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 3 }}>
                          <strong>{m.label}:</strong> {m.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <Carrusel API={API} getHeaders={getHeaders} C={C} consumed={totals} goals={macroGoals} />

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
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, marginBottom: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <Label C={C}>Categoría</Label>
                          <select value={newFood.category} onChange={e => setNewFood({ ...newFood, category: e.target.value })} style={{ ...inputStyle, height: 42, minWidth: 0 }}>
                            {CATEGORIES.filter(c => c.key !== 'todos').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </select>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <Label C={C}>Unidad</Label>
                          <select value={newFood.unit} onChange={e => setNewFood({ ...newFood, unit: e.target.value })} style={{ ...inputStyle, height: 42, minWidth: 0 }}>
                            <option value="g">g (sólido)</option>
                            <option value="ml">ml (líquido)</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                        {[['Kcal/100g·ml','kcal100'],['Proteína (g)','protein100'],['Hidratos (g)','carbs100'],['Azúcares (g)','sugar100'],['Grasas sat. (g)','satfat100'],['Fibra (g)','fiber100'],['Sal (g)','salt100']].map(([label, key]) => (
                          <div key={key} style={{ minWidth: 0 }}>
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

              {/* Vista Entreno */}
              {view === 'entreno' && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {entrenoPills.map(([key, name]) => (
                      <button key={key} onClick={() => setEntrenoTab(key)}
                        style={{ padding: '7px 14px', borderRadius: 20, border: entrenoTab === key ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: entrenoTab === key ? C.accent : C.white, color: entrenoTab === key ? '#fff' : C.muted, fontSize: 12, fontWeight: 700 }}>
                        {name}
                      </button>
                    ))}
                    {!takesSupp && (
                      <button onClick={() => changeSupplements(true)} style={{ padding: '7px 14px', borderRadius: 20, border: `1px dashed ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.muted, fontSize: 12, fontWeight: 700 }}>＋ Suplementos</button>
                    )}
                  </div>

                  {entrenoTab !== 'registro' && (
                    <>
                      <CardsSection key={entrenoTab} section={entrenoTab} emptyText={ENTRENO_EMPTY[entrenoTab]} API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canSeePlan} />
                      {entrenoTab === 'suplementos' && (
                        <button onClick={() => changeSupplements(false)} style={{ marginTop: 16, border: 'none', background: 'transparent', color: C.muted, fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>Dejar de mostrar Suplementos (no borra tus tarjetas)</button>
                      )}
                    </>
                  )}

                  {entrenoTab === 'registro' && (<>
                  <button onClick={() => setShowActivityForm(!showActivityForm)} style={{ width: '100%', padding: '13px', background: showActivityForm ? C.bg : C.accent, color: showActivityForm ? C.muted : '#fff', border: showActivityForm ? `1px solid ${C.border}` : 'none', borderRadius: 16, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                    {showActivityForm ? '✕ Cancelar' : '+ Añadir actividad'}
                  </button>

                  {showActivityForm && (
                    <form onSubmit={addActivity} style={{ background: C.white, borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {SESSION_TYPES.map(t => (
                          <button key={t.key} type="button" onClick={() => setNewActivity({ ...newActivity, session_type: t.key })}
                            style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: newActivity.session_type === t.key ? C.accent : C.bg, color: newActivity.session_type === t.key ? '#fff' : C.muted, fontSize: 12, fontWeight: 600 }}>
                            {t.emoji} {t.label}
                          </button>
                        ))}
                      </div>

                      <input type="text" value={newActivity.exercise_name} placeholder="Ej: Press banca" onChange={e => setNewActivity({ ...newActivity, exercise_name: e.target.value })} style={{ ...inputStyle, marginBottom: 8 }} />

                      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
                        {(EXERCISE_SUGGESTIONS[newActivity.session_type] || []).map(name => (
                          <button key={name} type="button" onClick={() => setNewActivity({ ...newActivity, exercise_name: name })}
                            style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {name}
                          </button>
                        ))}
                      </div>

                      {newActivity.session_type === 'cardio' ? (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Duración (mm:ss)</div>
                          <input type="text" value={newActivity.duration_min} placeholder="23:08" onChange={e => setNewActivity({ ...newActivity, duration_min: e.target.value })} style={inputStyle} />
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Series</div>
                            <input type="number" value={newActivity.sets} placeholder="0" onChange={e => setNewActivity({ ...newActivity, sets: e.target.value })} style={inputStyle} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Reps</div>
                            <input type="number" value={newActivity.reps} placeholder="0" onChange={e => setNewActivity({ ...newActivity, reps: e.target.value })} style={inputStyle} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Peso (kg)</div>
                            <input type="number" value={newActivity.weight} placeholder="0" onChange={e => setNewActivity({ ...newActivity, weight: e.target.value })} style={inputStyle} />
                          </div>
                        </div>
                      )}

                      {isAndar && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Distancia (km)</div>
                            <input type="number" step="0.01" value={newActivity.distance_km} placeholder="0" onChange={e => setNewActivity({ ...newActivity, distance_km: e.target.value })} style={inputStyle} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Ritmo medio</div>
                            <input type="text" value={newActivity.pace_avg} placeholder={`17'35"/km`} onChange={e => setNewActivity({ ...newActivity, pace_avg: e.target.value })} style={inputStyle} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Desnivel (m)</div>
                            <input type="number" value={newActivity.elevation_m} placeholder="0" onChange={e => setNewActivity({ ...newActivity, elevation_m: e.target.value })} style={inputStyle} />
                          </div>
                        </div>
                      )}

                      {newActivity.session_type === 'cardio' && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Kcal activas</div>
                              <input type="number" value={newActivity.kcal_active} placeholder="0" onChange={e => setNewActivity({ ...newActivity, kcal_active: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Kcal totales</div>
                              <input type="number" value={newActivity.kcal_total} placeholder="0" onChange={e => setNewActivity({ ...newActivity, kcal_total: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>FC media (lpm)</div>
                              <input type="number" value={newActivity.hr_avg} placeholder="0" onChange={e => setNewActivity({ ...newActivity, hr_avg: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Esfuerzo (1-10)</div>
                              <input type="number" min="1" max="10" value={newActivity.effort} placeholder="0" onChange={e => setNewActivity({ ...newActivity, effort: e.target.value })} style={inputStyle} />
                            </div>
                          </div>

                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Intervalo</div>
                            <input type="text" value={newActivity.intervals} placeholder={`Ej: 1km 18'26" · 101lpm`} onChange={e => setNewActivity({ ...newActivity, intervals: e.target.value })} style={inputStyle} />
                          </div>
                        </>
                      )}

                      <button type="submit" style={{ width: '100%', padding: '13px', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        Guardar
                      </button>
                    </form>
                  )}

                  {/* Resumen de la sesión: para Torso/Piernas/Core se mide una vez para todo el
                      entrenamiento (así lo da el reloj), no por ejercicio suelto. */}
                  <button onClick={() => setShowSessionSummary(!showSessionSummary)} style={{ width: '100%', padding: '13px', background: C.white, color: C.text, border: `1px solid ${C.border}`, borderRadius: 16, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📊 Resumen de la sesión</span>
                    <span style={{ color: C.muted, fontSize: 11 }}>{showSessionSummary ? '▲' : '▼'}</span>
                  </button>

                  {showSessionSummary && (
                    <div style={{ background: C.white, borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {SESSION_TYPES.filter(t => SUMMARY_SESSION_TYPES.includes(t.key)).map(t => (
                          <button key={t.key} type="button" onClick={() => setSummaryType(t.key)}
                            style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: summaryType === t.key ? C.accent : C.bg, color: summaryType === t.key ? '#fff' : C.muted, fontSize: 12, fontWeight: 600 }}>
                            {t.emoji} {t.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Duración (mm:ss)</div>
                          <input type="text" value={sessionForm.duration_min} placeholder="54:02" onChange={e => setSessionForm({ ...sessionForm, duration_min: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Kcal activas</div>
                          <input type="number" value={sessionForm.kcal_active} placeholder="0" onChange={e => setSessionForm({ ...sessionForm, kcal_active: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Kcal totales</div>
                          <input type="number" value={sessionForm.kcal_total} placeholder="0" onChange={e => setSessionForm({ ...sessionForm, kcal_total: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>FC media (lpm)</div>
                          <input type="number" value={sessionForm.hr_avg} placeholder="0" onChange={e => setSessionForm({ ...sessionForm, hr_avg: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Esfuerzo (1-10)</div>
                          <input type="number" min="1" max="10" value={sessionForm.effort} placeholder="0" onChange={e => setSessionForm({ ...sessionForm, effort: e.target.value })} style={inputStyle} />
                        </div>
                      </div>
                      <button type="button" onClick={saveSessionSummary} disabled={savingSummary} style={{ width: '100%', padding: '11px', background: summarySaved ? C.green : C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: savingSummary ? 'default' : 'pointer', opacity: savingSummary ? 0.7 : 1 }}>
                        {savingSummary ? 'Guardando…' : summarySaved ? '✓ Guardado' : 'Guardar resumen'}
                      </button>
                    </div>
                  )}

                  {/* Resúmenes ya guardados de hoy — visibles aunque el editor esté plegado,
                      que es justo lo que Daniel esperaba ver y no veía. */}
                  {activitySessions.map(s => {
                    const t = SESSION_TYPES.find(x => x.key === s.session_type)
                    const parts = []
                    if (s.duration_min != null) parts.push(`${formatDuration(s.duration_min)} min`)
                    if (s.kcal_active != null) parts.push(`${s.kcal_active} kcal act.`)
                    if (s.kcal_total != null) parts.push(`${s.kcal_total} kcal tot.`)
                    if (s.hr_avg != null) parts.push(`${s.hr_avg} lpm`)
                    if (s.effort != null) parts.push(`esfuerzo ${s.effort}/10`)
                    if (parts.length === 0) return null
                    return (
                      <div key={s.session_type} style={{ background: C.white, borderRadius: 16, padding: '12px 16px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 4 }}>📊 Resumen {t?.label || s.session_type}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{parts.join(' · ')}</div>
                      </div>
                    )
                  })}

                  {activityLog.length === 0
                    ? <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '40px 0' }}>Sin actividad registrada este día.</div>
                    : activityLog.map(a => {
                      const t = SESSION_TYPES.find(s => s.key === a.session_type)
                      const extras = []
                      if (a.distance_km != null) extras.push(`${a.distance_km} km`)
                      if (a.pace_avg) extras.push(a.pace_avg)
                      if (a.elevation_m != null) extras.push(`${a.elevation_m}m desnivel`)
                      if (a.kcal_active != null) extras.push(`${a.kcal_active} kcal act.`)
                      if (a.kcal_total != null) extras.push(`${a.kcal_total} kcal tot.`)
                      if (a.hr_avg != null) extras.push(`${a.hr_avg} lpm`)
                      if (a.effort != null) extras.push(`esfuerzo ${a.effort}/10`)
                      if (a.intervals) extras.push(a.intervals)
                      return (
                        <div key={a.id} style={{ background: C.white, borderRadius: 16, padding: '14px 16px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 22, flexShrink: 0 }}>{t?.emoji || '🏋️'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{a.exercise_name}</div>
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                {t?.label || a.session_type} · {a.session_type === 'cardio' ? `${formatDuration(a.duration_min) || 0} min` : `${a.sets ?? 0}x${a.reps ?? 0}${a.weight ? ` · ${a.weight}kg` : ''}`}
                              </div>
                              {extras.length > 0 && (
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{extras.join(' · ')}</div>
                              )}
                            </div>
                          </div>
                          <button onClick={() => deleteActivity(a.id)} style={{ border: 'none', background: C.redLight, color: C.red, cursor: 'pointer', borderRadius: 8, width: 28, height: 28, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                        </div>
                      )
                    })
                  }
                  </>)}
                </div>
              )}

              {/* Vista Consejos */}
              {view === 'consejos' && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  <Consejos API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canSeePlan} />
                </div>
              )}

              {/* Vista Compra */}
              {view === 'compra' && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  <Compra API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canSeePlan} />
                </div>
              )}

              {/* Vista Recetas */}
              {view === 'recetas' && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  <Recetas API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canSeePlan} />
                </div>
              )}

              {/* Vista Progreso */}
              {view === 'progreso' && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  <Progreso API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canSeePlan} />
                </div>
              )}

              {/* Vista Mi Plan */}
              {view === 'plan' && (
                <div style={{ padding: isDesktop ? '0' : '12px 16px 0' }}>
                  <MiPlan API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canSeePlan} />
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
        <Profile username={username} onClose={() => setShowProfile(false)} onAvatarUpdate={av => setAvatarData(av)} darkMode={darkMode} themeColors={{ bg: C.bg, white: C.white, border: C.border, accent: C.accent, accentLight: C.accentLight, accentMid: C.accentMid }} macroGoals={macroGoals} onMacrosUpdate={macros => { setMacroGoals(macros); setGoal(macros.kcal) }} />
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