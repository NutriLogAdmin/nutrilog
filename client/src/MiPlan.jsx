import { useState } from 'react'
import { CardsSection } from './Consejos'

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Semanas del mes: bloques de 7 días desde el lunes en/antes del día 1 (misma regla que la
// miniventana de Registro). Salen 4 o 5 según el mes; si el calendario diera una sexta,
// sus días se cuentan dentro de la quinta.
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

// Comidas de cada semana del mes. Son tarjetas propias de cada usuario: un día por tarjeta.
export default function MiPlan({ API, getHeaders, C, inputStyle, canImport }) {
  const { n, current } = planWeeks(localToday())
  const [week, setWeek] = useState(current)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {Array.from({ length: n }, (_, i) => i + 1).map(w => (
          <button key={w} onClick={() => setWeek(w)}
            style={{ padding: '7px 16px', borderRadius: 20, border: week === w ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: week === w ? C.accent : C.white, color: week === w ? '#fff' : C.muted, fontSize: 12, fontWeight: 700 }}>
            S{w}{w === current ? ' ●' : ''}
          </button>
        ))}
      </div>
      <CardsSection key={week} section={`s${week}`} emptyText={`Aún no tienes las comidas de la semana ${week}. Pulsa «+ Añadir» para crear un día.`} API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canImport} labels={LABELS} />
    </div>
  )
}
