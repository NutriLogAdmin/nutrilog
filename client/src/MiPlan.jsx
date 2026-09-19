import { useState, useEffect } from 'react'
import { CardsSection } from './Consejos'
import Platos from './Platos'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Semanas del mes: bloques de 7 días desde el lunes en/antes del día 1 (misma regla que la
// miniventana de Registro y que weeksInMonth() del servidor). Salen 4 o 5 según el mes; si
// el calendario diera una sexta, sus días se cuentan dentro de la quinta.
function planWeeks(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const since = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const daysInMonth = new Date(y, m, 0).getDate()
  const total = Math.ceil((since + daysInMonth) / 7)
  const n = Math.min(5, Math.max(4, total))
  const diff = Math.round((new Date(y, m - 1, d) - new Date(y, m - 1, 1 - since)) / 86400000)
  return { n, current: Math.min(n, Math.floor(diff / 7) + 1) }
}

const LABELS = { hideTime: true, title: 'Día', titlePh: 'Lunes — TORSO 💪', body: 'Comidas (una por línea)' }

// Comidas de cada semana del mes. Son tarjetas propias de cada usuario (un día por tarjeta)
// que se pueden editar a mano o regenerar cada mes con «Rotar los platos».
export default function MiPlan({ API, getHeaders, C, inputStyle, canImport }) {
  const today = localToday()
  const { n, current } = planWeeks(today)
  const month = today.slice(0, 7)
  const monthName = MONTHS[parseInt(today.slice(5, 7), 10) - 1]
  const [tab, setTab] = useState(current)
  const [status, setStatus] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [rotating, setRotating] = useState(false)

  async function loadStatus() {
    try {
      const res = await fetch(`${API}/plan/status?month=${month}`, { headers: getHeaders() })
      if (res.ok) setStatus(await res.json())
    } catch { /* sin estado no se ofrece rotar; el plan se sigue viendo */ }
  }
  useEffect(() => { loadStatus() }, [])

  async function rotate() {
    const ok = window.confirm(`Se sustituirán las comidas y cenas de todas tus semanas por unas nuevas de ${monthName}, armadas con tus platos. Los desayunos y meriendas fijos se mantienen. ¿Seguimos?`)
    if (!ok) return
    setRotating(true)
    try {
      const res = await fetch(`${API}/plan/rotate`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ month }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
      await loadStatus()
      setReloadKey(k => k + 1)
      setTab(current)
    } catch (err) {
      alert(`No se pudo rotar: ${err.message}`)
    } finally {
      setRotating(false)
    }
  }

  const box = { borderRadius: 16, padding: 14, marginBottom: 12 }
  const bigBtn = { width: '100%', padding: 13, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: rotating ? 0.7 : 1 }
  const noDishes = status && status.dishCount === 0

  return (
    <div>
      {status && status.needsRotation && (
        <div style={{ ...box, background: C.accentLight, border: `1px solid ${C.accent}55` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>Ha empezado {monthName} 🗓️</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>
            {noDishes ? 'Añade tus platos en «🍽️ Mis platos» y podrás rotarlos.' : `Rota los platos para armar un plan nuevo: ${status.weeks} semanas, sin repetir y sin juntar dos platos de cuchara el mismo día.`}
          </div>
          <button onClick={rotate} disabled={rotating || noDishes} style={{ ...bigBtn, opacity: rotating || noDishes ? 0.6 : 1 }}>{rotating ? 'Rotando…' : `🔄 Rota los platos de ${monthName}`}</button>
        </div>
      )}
      {status && !status.hasPlan && (
        <div style={{ ...box, background: C.white, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>
            {noDishes ? 'Añade tus platos en «🍽️ Mis platos» y la app te armará el plan de cada mes.' : `Crea el plan de ${monthName} con tus platos (${status.weeks} semanas).`}
          </div>
          {!noDishes && <button onClick={rotate} disabled={rotating} style={bigBtn}>{rotating ? 'Creando…' : `🔄 Crear el plan de ${monthName}`}</button>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {Array.from({ length: n }, (_, i) => i + 1).map(w => (
          <button key={w} onClick={() => setTab(w)}
            style={{ padding: '7px 16px', borderRadius: 20, border: tab === w ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: tab === w ? C.accent : C.white, color: tab === w ? '#fff' : C.muted, fontSize: 12, fontWeight: 700 }}>
            S{w}{w === current ? ' ●' : ''}
          </button>
        ))}
        <button onClick={() => setTab('platos')}
          style={{ padding: '7px 16px', borderRadius: 20, border: tab === 'platos' ? 'none' : `1px dashed ${C.border}`, cursor: 'pointer', background: tab === 'platos' ? C.accent : 'transparent', color: tab === 'platos' ? '#fff' : C.muted, fontSize: 12, fontWeight: 700 }}>
          🍽️ Mis platos
        </button>
      </div>

      {tab === 'platos'
        ? <Platos API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canImport} onChange={loadStatus} />
        : (
          <>
            <CardsSection key={`${tab}-${reloadKey}`} section={`s${tab}`} emptyText={`Aún no tienes las comidas de la semana ${tab}. Pulsa «+ Añadir» para crear un día, o rota tus platos para generarlas.`} API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canImport} labels={LABELS} />
            {status && status.hasPlan && !status.needsRotation && !noDishes && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={rotate} disabled={rotating} style={{ border: 'none', background: 'transparent', color: C.muted, fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>
                  {rotating ? 'Rotando…' : `🔄 Volver a rotar los platos de ${monthName}`}
                </button>
              </div>
            )}
          </>
        )}
    </div>
  )
}
