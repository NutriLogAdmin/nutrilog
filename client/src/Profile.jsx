import { useState, useEffect, useRef } from 'react'
import { ACTIVITY_LEVELS, GOAL_TYPES, calcBMR, calcTDEE, calcMacros, calcBMI, bmiCategory } from './nutritionCalc'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'
// Debe coincidir con PLAN_USERS en client/src/App.jsx y ADMIN_USERS en server/src/routes/auth.js.
const ADMIN_USERS = ['Daniel', 'daniel']

const PRESET_AVATARS = [
  { id: 'av1', emoji: '🧑‍💻', label: 'Techie' },
  { id: 'av2', emoji: '🏋️', label: 'Atleta' },
  { id: 'av3', emoji: '🥗', label: 'Foodie' },
  { id: 'av4', emoji: '🧘', label: 'Zen' },
  { id: 'av5', emoji: '🚴', label: 'Ciclista' },
  { id: 'av6', emoji: '🏃', label: 'Runner' },
  { id: 'av7', emoji: '🎯', label: 'Focused' },
  { id: 'av8', emoji: '💪', label: 'Fuerte' },
  { id: 'av9', emoji: '🌟', label: 'Star' },
  { id: 'av10', emoji: '🦁', label: 'León' },
]

const MACRO_REFS = [
  {
    macro: 'Proteína',
    emoji: '🥩',
    range: '1.6–2.2g / kg peso corporal',
    why: 'Para preservar y desarrollar masa muscular en déficit calórico. El rango alto (2g+) es recomendado para personas activas que buscan recomposición corporal.',
    source: 'ISSN (International Society of Sports Nutrition), 2017 · Stokes et al., Nutrients 2018',
  },
  {
    macro: 'Hidratos de carbono',
    emoji: '🌾',
    range: '3–5g / kg peso corporal',
    why: 'Principal fuente de energía. En déficit calórico se reducen pero se mantienen para sostener el rendimiento en el ejercicio y preservar músculo.',
    source: 'OMS / WHO · Burke et al., Journal of Sports Sciences 2011',
  },
  {
    macro: 'Grasas saturadas',
    emoji: '🧈',
    range: 'Menos del 10% de las calorías totales',
    why: 'Las grasas saturadas en exceso elevan el colesterol LDL y aumentan el riesgo cardiovascular. Para 2400 kcal eso equivale a menos de 26g, pero se recomienda ser más conservador.',
    source: 'OMS / WHO · American Heart Association · EFSA 2010',
  },
  {
    macro: 'Sal',
    emoji: '🧂',
    range: 'Menos de 5g al día (OMS) · Menos de 4g en déficit',
    why: 'El exceso de sodio contribuye a la hipertensión y retención de líquidos. En proceso de pérdida de grasa se recomienda ser más estricto para favorecer la definición.',
    source: 'OMS / WHO 2023 · EFSA · Ministerio de Sanidad España',
  },
  {
    macro: 'Fibra',
    emoji: '🥦',
    range: '25–38g al día',
    why: 'Regula el tránsito intestinal, mejora la saciedad y el control glucémico. Especialmente importante en dietas de déficit calórico para controlar el apetito.',
    source: 'EFSA 2010 · Dietary Guidelines for Americans 2020',
  },
  {
    macro: 'Azúcar',
    emoji: '🍬',
    range: 'Menos del 10% de las calorías (OMS) · máximo 40g/día en NutriLog',
    why: 'El exceso de azúcares libres se asocia a triglicéridos elevados y mayor riesgo cardiovascular. La OMS marca el 10% de las calorías como límite general (un 5% adicional da beneficio extra); la American Heart Association fija un tope fijo más estricto por motivos cardiovasculares (36g en hombres, 25g en mujeres). NutriLog calcula el 10% de tus kcal y lo recorta a 40g si sale más alto, para no superar ese límite cardiovascular aunque tu objetivo calórico sea generoso.',
    source: 'OMS / WHO, Guideline: Sugars intake for adults and children (2015) · American Heart Association, Added Sugars',
  },
]

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('nutrilog_token')}`
  }
}

function getColors(dark) {
  return dark ? {
    bg: '#0F0F0F', white: '#1A1A1A', border: '#2E2E2E', text: '#F5F5F5',
    muted: '#888', accent: '#FF6B35', accentLight: '#2A1A12', accentMid: '#7A3A1A',
    green: '#22C55E', red: '#EF4444', blue: '#60A5FA', blueLight: '#0A1628',
  } : {
    bg: '#F7F7F5', white: '#FFFFFF', border: '#EBEBEB', text: '#1A1A1A',
    muted: '#888', accent: '#FF6B35', accentLight: '#FFF0EB', accentMid: '#FFB39A',
    green: '#22C55E', red: '#EF4444', blue: '#3B82F6', blueLight: '#EFF6FF',
  }
}

export default function Profile({ username, onClose, onAvatarUpdate, darkMode, macroGoals, onMacrosUpdate, themeColors }) {
  // themeColors trae los colores del tema elegido en App; este componente conserva su propia
  // paleta base para el resto de tonos.
  const C = { ...getColors(darkMode), ...themeColors }
  const [avatar, setAvatar] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('avatar')
  const [editMacros, setEditMacros] = useState(null)
  const [savingMacros, setSavingMacros] = useState(false)
  const [savedMacros, setSavedMacros] = useState(false)
  const [resetUsername, setResetUsername] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetStatus, setResetStatus] = useState(null) // { ok: bool, msg: string }
  const [resetting, setResetting] = useState(false)
  const [body, setBody] = useState({ weight: '', height: '', age: '', gender: 'male', activity_level: '', goal_type: '' })
  const [bodyLoaded, setBodyLoaded] = useState(false)
  const [savingBody, setSavingBody] = useState(false)
  const [savedBody, setSavedBody] = useState(false)
  const [latestWeight, setLatestWeight] = useState(null) // { weight, date } del último registro de Progreso
  const fileRef = useRef()
  const isAdmin = ADMIN_USERS.includes(username)

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API}/profile`, { headers: getHeaders() })
      const data = await res.json()
      if (data.avatar) setAvatar(data.avatar)
      if (macroGoals) setEditMacros({ ...macroGoals })
      setBody({
        weight: data.weight != null ? String(data.weight) : '',
        height: data.height != null ? String(data.height) : '',
        age: data.age != null ? String(data.age) : '',
        gender: data.gender || 'male',
        activity_level: data.activity_level || '',
        goal_type: data.goal_type || '',
      })
      setBodyLoaded(true)
      try {
        const pr = await fetch(`${API}/progress`, { headers: getHeaders() })
        if (pr.ok) {
          const list = (await pr.json()).filter(e => e.weight != null)
          if (list.length) setLatestWeight({ weight: list[list.length - 1].weight, date: list[list.length - 1].date })
        }
      } catch { /* sin el último peso de Progreso solo se pierde el atajo */ }
    }
    load()
  }, [])

  async function saveAvatar(newAvatar) {
    setSaving(true); setSaved(false)
    await fetch(`${API}/profile/avatar`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ avatar: newAvatar }) })
    setAvatar(newAvatar)
    onAvatarUpdate(newAvatar)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveMacros() {
    if (!editMacros) return
    setSavingMacros(true)
    await fetch(`${API}/profile/goals`, {
      method: 'PUT', headers: getHeaders(),
      body: JSON.stringify({
        goal_kcal: editMacros.kcal,
        goal_protein: editMacros.protein,
        goal_carbs: editMacros.carbs,
        goal_satfat: editMacros.satfat,
        goal_salt: editMacros.salt,
        goal_fiber: editMacros.fiber,
        goal_sugar: editMacros.sugar,
      })
    })
    onMacrosUpdate(editMacros)
    setSavingMacros(false); setSavedMacros(true)
    setTimeout(() => setSavedMacros(false), 2000)
  }

  // Guarda los datos corporales. Con recalc=true además recalcula los objetivos (kcal y
  // macros) con la fórmula del alta y los guarda; sin él, los objetivos no se tocan.
  async function saveBody(recalc) {
    const w = parseFloat(String(body.weight).replace(',', '.'))
    const h = parseFloat(String(body.height).replace(',', '.'))
    const a = parseInt(body.age, 10)
    const payload = { weight: w, height: h, age: a, gender: body.gender, activity_level: body.activity_level || undefined, goal_type: body.goal_type || undefined }
    let macros = null
    if (recalc) {
      const level = ACTIVITY_LEVELS.find(x => x.key === body.activity_level)
      const goal = GOAL_TYPES.find(x => x.key === body.goal_type)
      if (!(w > 0 && h > 0 && a > 0 && level && goal)) { alert('Para recalcular hacen falta peso, altura, edad, nivel de actividad y objetivo.'); return }
      const kcal = Math.round(calcTDEE(w, h, a, body.gender, level.factor) * (1 - goal.deficit))
      macros = calcMacros(kcal, w, body.goal_type)
      const ok = window.confirm(`Se sustituirán tus objetivos actuales por los recalculados: ${macros.goal_kcal} kcal, ${macros.goal_protein}g de proteína, ${macros.goal_carbs}g de hidratos… Los ajustes manuales que hayas hecho se pierden. ¿Seguimos?`)
      if (!ok) return
      Object.assign(payload, macros)
    }
    setSavingBody(true)
    try {
      const res = await fetch(`${API}/profile/goals`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
      if (macros) {
        const next = { kcal: macros.goal_kcal, protein: macros.goal_protein, carbs: macros.goal_carbs, satfat: macros.goal_satfat, salt: macros.goal_salt, fiber: macros.goal_fiber, sugar: macros.goal_sugar }
        setEditMacros(next)
        onMacrosUpdate(next)
      }
      setSavedBody(true)
      setTimeout(() => setSavedBody(false), 2500)
    } catch (err) {
      alert(`No se pudo guardar: ${err.message}`)
    } finally {
      setSavingBody(false)
    }
  }

  async function handleAdminReset(e) {
    e.preventDefault()
    setResetStatus(null)
    setResetting(true)
    try {
      const res = await fetch(`${API}/auth/admin-reset-password`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ username: resetUsername.trim(), newPassword: resetPassword })
      })
      const data = await res.json()
      if (!res.ok) {
        setResetStatus({ ok: false, msg: data.error || 'No se pudo cambiar la contraseña' })
      } else {
        setResetStatus({ ok: true, msg: `Contraseña de "${resetUsername.trim()}" actualizada. Pásasela ya por otro medio.` })
        setResetPassword('')
      }
    } catch {
      setResetStatus({ ok: false, msg: 'Error de conexión con el servidor' })
    } finally {
      setResetting(false)
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('La imagen no puede superar 2MB'); return }
    const reader = new FileReader()
    reader.onload = ev => saveAvatar(ev.target.result)
    reader.readAsDataURL(file)
  }

  const isPreset = avatar && avatar.startsWith('av')
  const currentEmoji = PRESET_AVATARS.find(a => a.id === avatar)?.emoji

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: C.white, borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Mi perfil</div>
          <button onClick={onClose} style={{ border: 'none', background: C.bg, color: C.muted, borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>Cerrar</button>
        </div>

        {/* Avatar actual */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 10px', background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `3px solid ${C.accent}` }}>
            {!avatar && <span style={{ fontSize: 32, fontWeight: 700, color: C.accent }}>{username.charAt(0).toUpperCase()}</span>}
            {avatar && isPreset && <span style={{ fontSize: 44 }}>{currentEmoji}</span>}
            {avatar && !isPreset && <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{username}</div>
          {saved && <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>✓ Avatar guardado</div>}
          {saving && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Guardando...</div>}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: C.bg, borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 }}>
          {[
            ['avatar', '🖼️ Avatar'], ['datos', '🧍 Mis datos'], ['macros', '🎯 Objetivos'], ['refs', '📚 Fuentes'],
            ...(isAdmin ? [['admin', '🔑 Usuarios']] : []),
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, minWidth: 0, padding: '8px 2px', fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: 9, background: tab === key ? C.accent : 'transparent', color: tab === key ? '#fff' : C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab Avatar */}
        {tab === 'avatar' && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Avatares predefinidos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
              {PRESET_AVATARS.map(a => (
                <div key={a.id} onClick={() => saveAvatar(a.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', borderRadius: 14, cursor: 'pointer', background: avatar === a.id ? C.accentLight : C.bg, border: `2px solid ${avatar === a.id ? C.accent : 'transparent'}`, transition: 'all 0.2s' }}>
                  <span style={{ fontSize: 30 }}>{a.emoji}</span>
                  <span style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{a.label}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>O sube tu foto</div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current.click()} style={{ width: '100%', padding: '14px', background: C.accentLight, color: C.accent, border: `2px dashed ${C.accent}`, borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
              📷 Seleccionar foto
            </button>
            <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>Máximo 2MB · JPG, PNG o WEBP</div>
            {avatar && !isPreset && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button onClick={() => saveAvatar(null)} style={{ border: 'none', background: '#FEF2F2', color: C.red, borderRadius: 10, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Eliminar foto</button>
              </div>
            )}
          </div>
        )}

        {/* Tab Mis datos */}
        {tab === 'datos' && bodyLoaded && (() => {
          const w = parseFloat(String(body.weight).replace(',', '.'))
          const h = parseFloat(String(body.height).replace(',', '.'))
          const a = parseInt(body.age, 10)
          const level = ACTIVITY_LEVELS.find(x => x.key === body.activity_level)
          const goal = GOAL_TYPES.find(x => x.key === body.goal_type)
          const bmi = w > 0 && h > 0 ? calcBMI(w, h) : null
          const canTDEE = w > 0 && h > 0 && a > 0 && level
          const bmr = canTDEE ? Math.round(calcBMR(w, h, a, body.gender)) : null
          const tdee = canTDEE ? calcTDEE(w, h, a, body.gender, level.factor) : null
          const recommended = tdee && goal ? Math.round(tdee * (1 - goal.deficit)) : null
          const currentKcal = editMacros ? editMacros.kcal : null
          const diff = recommended && currentKcal ? currentKcal - recommended : null
          const lab = { fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }
          const field = { width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 15, fontWeight: 600, boxSizing: 'border-box' }
          const stat = (name, value, sub) => (
            <div style={{ background: C.bg, borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>{name}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginTop: 2 }}>{value}</div>
              {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{sub}</div>}
            </div>
          )
          return (
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
                Mantén estos datos al día: con ellos se calcula tu IMC y tu gasto diario, y puedes recalcular tus objetivos cuando cambien tu peso, tu actividad o tu meta.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 6 }}>
                <div>
                  <div style={lab}>Peso actual (kg)</div>
                  <input type="text" inputMode="decimal" value={body.weight} placeholder="86" onChange={e => setBody({ ...body, weight: e.target.value })} style={field} />
                </div>
                <div>
                  <div style={lab}>Altura (cm)</div>
                  <input type="text" inputMode="decimal" value={body.height} placeholder="169" onChange={e => setBody({ ...body, height: e.target.value })} style={field} />
                </div>
                <div>
                  <div style={lab}>Edad</div>
                  <input type="text" inputMode="numeric" value={body.age} placeholder="35" onChange={e => setBody({ ...body, age: e.target.value })} style={field} />
                </div>
                <div>
                  <div style={lab}>Sexo</div>
                  <select value={body.gender} onChange={e => setBody({ ...body, gender: e.target.value })} style={field}>
                    <option value="male">Hombre</option>
                    <option value="female">Mujer</option>
                  </select>
                </div>
              </div>
              {latestWeight && String(latestWeight.weight) !== String(body.weight).replace(',', '.') && (
                <button onClick={() => setBody({ ...body, weight: String(latestWeight.weight) })} style={{ border: 'none', background: 'transparent', color: C.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginBottom: 10 }}>
                  ↺ Usar mi último peso de Progreso ({String(latestWeight.weight).replace('.', ',')} kg, {latestWeight.date.split('-').reverse().join('/')})
                </button>
              )}

              <div style={{ ...lab, marginTop: 10 }}>¿Dónde te ubicas en actividad física?</div>
              <div style={{ background: C.bg, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                {ACTIVITY_LEVELS.map((l, i) => (
                  <div key={l.key} onClick={() => setBody({ ...body, activity_level: l.key })}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: body.activity_level === l.key ? C.accentLight : 'transparent', borderTop: i ? `1px solid ${C.border}` : 'none' }}>
                    <span style={{ fontSize: 20 }}>{l.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: body.activity_level === l.key ? C.accent : C.text }}>{l.label}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{l.desc}</div>
                    </div>
                    <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>×{l.factor}</span>
                  </div>
                ))}
              </div>

              <div style={lab}>Tu objetivo</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
                {GOAL_TYPES.map(g => (
                  <div key={g.key} onClick={() => setBody({ ...body, goal_type: g.key })}
                    style={{ padding: '10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center', border: `2px solid ${body.goal_type === g.key ? C.accent : C.border}`, background: body.goal_type === g.key ? C.accentLight : C.white }}>
                    <div style={{ fontSize: 22 }}>{g.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: body.goal_type === g.key ? C.accent : C.text }}>{g.label}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{g.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
                {stat('IMC', bmi ? `${(Math.round(bmi * 10) / 10).toString().replace('.', ',')}` : '—', bmi ? bmiCategory(bmi) : 'faltan peso y altura')}
                {stat('Metabolismo basal', bmr ? `${bmr} kcal` : '—', bmr ? 'en reposo' : 'faltan edad y actividad')}
                {stat('Gasto diario', tdee ? `${tdee} kcal` : '—', tdee ? 'con tu actividad' : '')}
                {stat('Objetivo recomendado', recommended ? `${recommended} kcal` : '—', goal ? goal.label : 'elige un objetivo')}
              </div>

              {recommended && currentKcal ? (
                <div style={{ background: C.accentLight, borderRadius: 12, padding: '10px 12px', fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 14 }}>
                  Tu objetivo actual es <strong>{currentKcal} kcal</strong>. Con estos datos se recomiendan <strong>{recommended} kcal</strong>
                  {Math.abs(diff) < 50 ? ': estás alineado.' : diff > 0 ? `: ahora comes ${diff} kcal más de lo recomendado.` : `: ahora comes ${-diff} kcal menos de lo recomendado.`}
                </div>
              ) : <div style={{ marginBottom: 14 }} />}

              <button onClick={() => saveBody(false)} disabled={savingBody} style={{ width: '100%', padding: '14px', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: savingBody ? 'not-allowed' : 'pointer', opacity: savingBody ? 0.7 : 1, marginBottom: 8 }}>
                {savingBody ? 'Guardando...' : savedBody ? '✓ Guardado' : 'Guardar mis datos'}
              </button>
              <button onClick={() => saveBody(true)} disabled={savingBody} style={{ width: '100%', padding: '12px', background: C.white, color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                🔄 Guardar y recalcular mis objetivos
              </button>
              <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
                «Guardar mis datos» no toca tus objetivos. Recalcular usa la fórmula Mifflin-St Jeor y sustituye tus kcal y macros.
              </div>
            </div>
          )
        })()}

        {/* Tab Macros */}
        {tab === 'macros' && editMacros && (
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
              Ajusta tus objetivos diarios. Estos valores se usan para calcular el progreso en las barras de macros.
            </div>

            <div style={{ background: C.accentLight, borderRadius: 14, padding: '12px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Calorías objetivo</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>{editMacros.kcal} kcal</div>
              </div>
              <input type="number" value={editMacros.kcal} onChange={e => setEditMacros({ ...editMacros, kcal: parseFloat(e.target.value)||0 })}
                style={{ width: 90, border: `2px solid ${C.accent}`, background: C.white, color: C.text, padding: '8px 10px', borderRadius: 10, fontSize: 16, fontWeight: 800, textAlign: 'right' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                ['Proteína (g)', 'protein', '#3B82F6'],
                ['Hidratos (g)', 'carbs', '#F59E0B'],
                ['Grasas sat. (g)', 'satfat', '#EF4444'],
                ['Sal (g)', 'salt', '#8B5CF6'],
                ['Fibra (g)', 'fiber', '#14B8A6'],
                ['Azúcar (g)', 'sugar', '#EC4899'],
              ].map(([label, key, color]) => (
                <div key={key} style={{ background: C.bg, borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
                  <input type="number" value={editMacros[key]} onChange={e => setEditMacros({ ...editMacros, [key]: parseFloat(e.target.value)||0 })}
                    style={{ width: '100%', border: `2px solid ${color}`, background: C.white, color: C.text, padding: '8px 10px', borderRadius: 8, fontSize: 16, fontWeight: 800, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            <button onClick={() => setTab('refs')} style={{ width: '100%', padding: '10px', background: C.bg, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, cursor: 'pointer', marginBottom: 10 }}>
              📚 Ver recomendaciones científicas →
            </button>

            <button onClick={saveMacros} disabled={savingMacros} style={{ width: '100%', padding: '14px', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: savingMacros ? 'not-allowed' : 'pointer', opacity: savingMacros ? 0.7 : 1 }}>
              {savingMacros ? 'Guardando...' : savedMacros ? '✓ Guardado' : 'Guardar objetivos'}
            </button>
          </div>
        )}

        {/* Tab Fuentes */}
        {tab === 'refs' && (
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
              Los valores recomendados en NutriLog se basan en guías de organizaciones internacionales de salud y nutrición deportiva. Aquí tienes el detalle de cada macro:
            </div>
            {MACRO_REFS.map((ref, i) => (
              <div key={i} style={{ background: C.bg, borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{ref.emoji}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{ref.macro}</div>
                </div>
                <div style={{ fontSize: 12, background: C.accentLight, color: C.accent, padding: '4px 10px', borderRadius: 8, fontWeight: 700, marginBottom: 8, display: 'inline-block' }}>{ref.range}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 8 }}>{ref.why}</div>
                <div style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>📖 {ref.source}</div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
              Estos valores son orientativos. Consulta siempre con un profesional de la salud o nutricionista para una planificación personalizada.
            </div>
          </div>
        )}

        {/* Tab Admin — solo visible para Daniel */}
        {tab === 'admin' && isAdmin && (
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
              NutriLog no envía correos de recuperación. Si alguien no puede entrar, pon aquí
              su nombre de usuario y una contraseña nueva, y pásasela tú por otro medio.
            </div>
            <form onSubmit={handleAdminReset}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Usuario</div>
                <input type="text" value={resetUsername} onChange={e => setResetUsername(e.target.value)}
                  placeholder="Nombre de usuario exacto"
                  style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Contraseña nueva</div>
                <input type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, con letra y número"
                  style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              {resetStatus && (
                <div style={{ background: resetStatus.ok ? C.bg : '#FEF2F2', border: `1px solid ${resetStatus.ok ? C.green : C.red}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: resetStatus.ok ? C.green : C.red, marginBottom: 14 }}>
                  {resetStatus.msg}
                </div>
              )}
              <button type="submit" disabled={resetting || !resetUsername.trim() || !resetPassword} style={{
                width: '100%', padding: '14px', background: C.accent, color: '#fff',
                border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14,
                cursor: resetting ? 'not-allowed' : 'pointer', opacity: (resetting || !resetUsername.trim() || !resetPassword) ? 0.6 : 1
              }}>
                {resetting ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}