import { useState, useEffect, useRef } from 'react'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

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

export default function Profile({ username, onClose, onAvatarUpdate, darkMode, macroGoals, onMacrosUpdate }) {
  const C = getColors(darkMode)
  const [avatar, setAvatar] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('avatar')
  const [editMacros, setEditMacros] = useState(null)
  const [savingMacros, setSavingMacros] = useState(false)
  const [savedMacros, setSavedMacros] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API}/profile`, { headers: getHeaders() })
      const data = await res.json()
      if (data.avatar) setAvatar(data.avatar)
      if (macroGoals) setEditMacros({ ...macroGoals })
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
      })
    })
    onMacrosUpdate(editMacros)
    setSavingMacros(false); setSavedMacros(true)
    setTimeout(() => setSavedMacros(false), 2000)
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
          {[['avatar', '🖼️ Avatar'], ['macros', '🎯 Mis objetivos'], ['refs', '📚 Fuentes']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: 9, background: tab === key ? C.accent : 'transparent', color: tab === key ? '#fff' : C.muted }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                ['Proteína (g)', 'protein', '#3B82F6'],
                ['Hidratos (g)', 'carbs', '#F59E0B'],
                ['Grasas sat. (g)', 'satfat', '#EF4444'],
                ['Sal (g)', 'salt', '#8B5CF6'],
                ['Fibra (g)', 'fiber', '#14B8A6'],
              ].map(([label, key, color]) => (
                <div key={key} style={{ background: C.bg, borderRadius: 12, padding: '10px 12px' }}>
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
      </div>
    </div>
  )
}