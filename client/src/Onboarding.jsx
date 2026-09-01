import { useState } from 'react'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

const C = {
  bg: '#F7F7F5', white: '#FFFFFF', border: '#EBEBEB', text: '#1A1A1A',
  muted: '#888', accent: '#FF6B35', accentLight: '#FFF0EB', accentMid: '#FFB39A',
  green: '#22C55E', greenLight: '#DCFCE7', red: '#EF4444', redLight: '#FEF2F2',
  blue: '#3B82F6', blueLight: '#EFF6FF',
}

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentario', desc: 'Poco o ningún ejercicio', factor: 1.2, emoji: '🛋️' },
  { key: 'light', label: 'Ligero', desc: '1-3 días/semana', factor: 1.375, emoji: '🚶' },
  { key: 'moderate', label: 'Moderado', desc: '3-5 días/semana', factor: 1.55, emoji: '🏃' },
  { key: 'active', label: 'Activo', desc: '6-7 días/semana', factor: 1.725, emoji: '💪' },
  { key: 'very_active', label: 'Muy activo', desc: 'Ejercicio intenso diario', factor: 1.9, emoji: '🏋️' },
]

const GOAL_TYPES = [
  { key: 'deficit', label: 'Pérdida de peso', desc: 'Déficit calórico del 20%', emoji: '🔥', deficit: 0.20 },
  { key: 'recomp', label: 'Recomposición', desc: 'Perder grasa + definición', emoji: '💪', deficit: 0.15 },
  { key: 'maintenance', label: 'Mantenimiento', desc: 'Mantener peso actual', emoji: '⚖️', deficit: 0 },
  { key: 'bulk', label: 'Volumen', desc: 'Ganar músculo', emoji: '🏋️', deficit: -0.10 },
]

function calcTDEE(weight, height, age = 30, gender = 'male', activityFactor) {
  // Fórmula Mifflin-St Jeor
  const bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161
  return Math.round(bmr * activityFactor)
}

function calcMacros(kcal, weight, goalType) {
  // Proteína: 2g por kg de peso corporal para recomposición/deficit, 1.8g para mantenimiento
  const proteinPerKg = goalType === 'bulk' ? 1.8 : 2.0
  const protein = Math.round(weight * proteinPerKg)
  const proteinKcal = protein * 4

  // Grasas: 25% de las calorías totales
  const fatKcal = kcal * 0.25
  const fat = Math.round(fatKcal / 9)
  const satfat = Math.round(fat * 0.4) // 40% de la grasa total como saturada máximo

  // Hidratos: resto de calorías
  const carbsKcal = kcal - proteinKcal - fatKcal
  const carbs = Math.round(carbsKcal / 4)

  return {
    goal_kcal: kcal,
    goal_protein: protein,
    goal_carbs: Math.max(0, carbs),
    goal_satfat: satfat,
    goal_salt: goalType === 'deficit' || goalType === 'recomp' ? 4 : 5,
    goal_fiber: 30,
  }
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('nutrilog_token')}`
  }
}

export default function Onboarding({ username, onComplete }) {
  const [step, setStep] = useState(1)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('male')
  const [activityLevel, setActivityLevel] = useState('')
  const [goalType, setGoalType] = useState('')
  const [calculated, setCalculated] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingMacros, setEditingMacros] = useState(false)
  const [customMacros, setCustomMacros] = useState(null)

  function handleCalculate() {
    const activity = ACTIVITY_LEVELS.find(a => a.key === activityLevel)
    const goal = GOAL_TYPES.find(g => g.key === goalType)
    if (!activity || !goal) return

    const tdee = calcTDEE(parseFloat(weight), parseFloat(height), parseInt(age), gender, activity.factor)
    const targetKcal = Math.round(tdee * (1 - goal.deficit))
    const macros = calcMacros(targetKcal, parseFloat(weight), goalType)

    setCalculated({ tdee, ...macros })
    setCustomMacros({ ...macros })
    setStep(3)
  }

  async function handleSave() {
    setSaving(true)
    const macros = customMacros || calculated
    await fetch(`${API}/profile/goals`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        weight: parseFloat(weight),
        height: parseFloat(height),
        activity_level: activityLevel,
        goal_type: goalType,
        ...macros
      })
    })
    setSaving(false)
    onComplete(macros)
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '0 0 40px' }}>

        {/* Header */}
        <div style={{ background: C.accent, padding: '24px 20px 20px' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.8)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>NutriLog</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Hola, {username} 👋</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>Vamos a configurar tus objetivos personales</div>

          {/* Barra de progreso */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: step >= s ? '#fff' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
            Paso {step} de 3
          </div>
        </div>

        {/* PASO 1 — Datos personales */}
        {step === 1 && (
          <div style={{ padding: '24px 16px' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>Tus datos</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Los usamos para calcular tu metabolismo basal</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <Label>Peso (kg)</Label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="86"
                  style={inputStyle} />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="169"
                  style={inputStyle} />
              </div>
              <div>
                <Label>Edad</Label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="35"
                  style={inputStyle} />
              </div>
              <div>
                <Label>Sexo</Label>
                <select value={gender} onChange={e => setGender(e.target.value)} style={inputStyle}>
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!weight || !height || !age}
              style={{ width: '100%', padding: '14px', background: (!weight || !height || !age) ? C.muted : C.accent, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: (!weight || !height || !age) ? 'not-allowed' : 'pointer', marginTop: 8 }}>
              Siguiente →
            </button>
          </div>
        )}

        {/* PASO 2 — Actividad y objetivo */}
        {step === 2 && (
          <div style={{ padding: '24px 16px' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>Actividad y objetivo</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>¿Cuánto ejercicio haces y qué quieres conseguir?</div>

            <Label>Nivel de actividad</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {ACTIVITY_LEVELS.map(a => (
                <div key={a.key} onClick={() => setActivityLevel(a.key)}
                  style={{ padding: '12px 14px', borderRadius: 14, border: `2px solid ${activityLevel === a.key ? C.accent : C.border}`, background: activityLevel === a.key ? C.accentLight : C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{a.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: activityLevel === a.key ? C.accent : C.text }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <Label>Tu objetivo</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {GOAL_TYPES.map(g => (
                <div key={g.key} onClick={() => setGoalType(g.key)}
                  style={{ padding: '12px', borderRadius: 14, border: `2px solid ${goalType === g.key ? C.accent : C.border}`, background: goalType === g.key ? C.accentLight : C.white, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{g.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: goalType === g.key ? C.accent : C.text }}>{g.label}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{g.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ padding: '14px 20px', background: C.bg, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>← Atrás</button>
              <button
                onClick={handleCalculate}
                disabled={!activityLevel || !goalType}
                style={{ flex: 1, padding: '14px', background: (!activityLevel || !goalType) ? C.muted : C.accent, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: (!activityLevel || !goalType) ? 'not-allowed' : 'pointer' }}>
                Calcular mis objetivos →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 — Resultado y confirmación */}
        {step === 3 && calculated && (
          <div style={{ padding: '24px 16px' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Tus objetivos calculados</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Tu TDEE es <strong>{calculated.tdee} kcal</strong>. Ajustado a tu objetivo:</div>

            <div style={{ background: C.accentLight, borderRadius: 16, padding: '16px', marginBottom: 16, textAlign: 'center', border: `2px solid ${C.accentMid}` }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: C.accent }}>{customMacros?.goal_kcal}</div>
              <div style={{ fontSize: 13, color: C.muted }}>kcal / día objetivo</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                ['Proteína', 'goal_protein', 'g', C.blue, C.blueLight],
                ['Hidratos', 'goal_carbs', 'g', '#F59E0B', '#FFFBEB'],
                ['Grasas sat.', 'goal_satfat', 'g', C.red, C.redLight],
                ['Sal', 'goal_salt', 'g', '#8B5CF6', '#F5F3FF'],
                ['Fibra', 'goal_fiber', 'g', '#14B8A6', '#F0FDFA'],
              ].map(([label, key, unit, color, bg]) => (
                <div key={key} style={{ background: bg, borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  {editingMacros ? (
                    <input type="number" value={customMacros[key]}
                      onChange={e => setCustomMacros({ ...customMacros, [key]: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', border: `1.5px solid ${color}`, background: '#fff', color: C.text, padding: '6px 8px', borderRadius: 8, fontSize: 16, fontWeight: 800, boxSizing: 'border-box' }} />
                  ) : (
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>{customMacros[key]}{unit}</div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setEditingMacros(!editingMacros)} style={{ width: '100%', padding: '10px', background: C.white, color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 12, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
              {editingMacros ? '✓ Aplicar cambios' : '✏️ Ajustar manualmente'}
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(2)} style={{ padding: '14px 20px', background: C.bg, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>← Atrás</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '14px', background: C.accent, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : '✓ Empezar con NutriLog'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', border: '1.5px solid #EBEBEB', background: '#F7F7F5',
  color: '#1A1A1A', padding: '10px 12px', borderRadius: 10, fontSize: 15,
  fontWeight: 600, boxSizing: 'border-box'
}

function Label({ children }) {
  return <div style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{children}</div>
}