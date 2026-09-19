import { useState, useEffect } from 'react'

const fmt = n => (n == null ? '—' : String(Number(Number(n).toFixed(2))).replace('.', ','))
const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`
function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${parseInt(d, 10)}/${m}/${y}`
}
const MEASURES = [['weight', 'Peso (kg)'], ['waist', 'Cintura (cm)'], ['chest', 'Pecho (cm)'], ['under_chest', 'Bajo pecho (cm)'], ['arm', 'Brazo (cm)']]
const blankForm = () => ({ date: localToday(), weight: '', waist: '', chest: '', under_chest: '', arm: '', note: '' })

// Peso y medidas de cada usuario, guardados en el servidor. Los resúmenes se calculan
// a partir de los registros, no son valores fijos.
export default function Progreso({ API, getHeaders, C, inputStyle, canImport }) {
  const [heightCm, setHeightCm] = useState(null)
  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(blankForm())
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')

  async function request(url, method, body) {
    const res = await fetch(`${API}${url}`, { method, headers: getHeaders(), body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
    return res
  }

  async function load() {
    try {
      const res = await request('/progress', 'GET')
      setEntries(await res.json())
      setError('')
    } catch (err) {
      setError(`No se pudo cargar: ${err.message}`)
    } finally {
      setLoaded(true)
    }
  }
  useEffect(() => { load() }, [])

  // La altura del perfil se pide aquí (y no se guarda en App) para que siempre esté al día
  // si se ha cambiado en Perfil.
  useEffect(() => {
    fetch(`${API}/profile`, { headers: getHeaders() })
      .then(r => (r.ok ? r.json() : {}))
      .then(p => setHeightCm(p.height || null))
      .catch(() => {})
  }, [])

  // Al elegir una fecha que ya tiene registro se cargan sus valores: guardar sustituye el
  // registro entero, y sin esto se borrarían las medidas que no se vuelvan a escribir.
  function changeDate(date) {
    const existing = entries.find(e => e.date === date)
    setForm(existing
      ? { date, weight: fmtInput(existing.weight), waist: fmtInput(existing.waist), chest: fmtInput(existing.chest), under_chest: fmtInput(existing.under_chest), arm: fmtInput(existing.arm), note: existing.note || '' }
      : { ...blankForm(), date })
  }
  const fmtInput = v => (v == null ? '' : String(v).replace('.', ','))
  const editingExisting = entries.some(e => e.date === form.date)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await request('/progress', 'PUT', form)
      setForm(blankForm())
      await load()
    } catch (err) {
      alert(`No se pudo guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function remove(entry) {
    if (!window.confirm(`¿Borrar el registro del ${fmtDate(entry.date)}?`)) return
    try {
      await request(`/progress/${entry.id}`, 'DELETE')
      await load()
    } catch (err) {
      alert(`No se pudo borrar: ${err.message}`)
    }
  }

  async function doImport() {
    try {
      const parsed = JSON.parse(importText)
      const list = Array.isArray(parsed) ? parsed : parsed.entries
      await request('/progress/import', 'POST', { entries: list })
      setImportText('')
      setShowImport(false)
      await load()
    } catch (err) {
      alert(`No se pudo importar: ${err.message}`)
    }
  }

  const weights = entries.filter(e => e.weight != null)
  const first = weights[0]
  const last = weights[weights.length - 1]
  const prev = weights.length > 1 ? weights[weights.length - 2] : null
  const bmi = last && heightCm ? last.weight / Math.pow(heightCm / 100, 2) : null
  const totalChange = first && last ? last.weight - first.weight : null
  const lastChange = last && prev ? last.weight - prev.weight : null
  const label = { fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }
  const stat = (name, value, sub, color, valueColor) => (
    <div style={{ background: C.white, borderRadius: 12, padding: '10px 12px', border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>{name}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: valueColor || C.text, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
    </div>
  )
  const card = { background: C.white, borderRadius: 16, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` }
  const cardTitle = { fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }
  const th = { padding: '8px 6px', textAlign: 'center', color: C.muted, fontWeight: 700, fontSize: 11 }
  const td = { padding: '8px 6px', textAlign: 'center', fontSize: 12, color: C.text, verticalAlign: 'top' }

  if (!loaded) return <div style={{ textAlign: 'center', color: C.muted, padding: '30px 0', fontSize: 13 }}>Cargando…</div>

  return (
    <div>
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {last && (
        <div style={card}>
          <div style={cardTitle}>💪 Lo que llevas conseguido</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {stat('Cambio de peso', totalChange === null || weights.length < 2 ? '—' : `${signed(totalChange)} kg`, `desde ${fmtDate(first.date)}`, C.green, totalChange < 0 ? C.green : totalChange > 0 ? C.yellow : C.text)}
            {stat('Peso actual', `${fmt(last.weight)} kg`, fmtDate(last.date), C.blue)}
            {stat('IMC actual', bmi ? fmt(Math.round(bmi * 10) / 10) : '—', bmi ? `con ${fmt(heightCm)} cm de altura` : 'añade tu altura en Perfil', C.purple)}
            {stat('Último cambio', lastChange === null ? '—' : `${signed(lastChange)} kg`, prev ? `vs ${fmtDate(prev.date)}` : 'primer registro', C.yellow, lastChange < 0 ? C.green : lastChange > 0 ? C.yellow : C.text)}
          </div>
        </div>
      )}

      <div style={card}>
        <div style={cardTitle}>➕ Nuevo registro</div>
        <form onSubmit={save}>
          <div style={{ marginBottom: 8 }}>
            <div style={label}>Fecha</div>
            <input type="date" value={form.date} max={localToday()} onChange={e => changeDate(e.target.value)} style={inputStyle} />
            {editingExisting && <div style={{ fontSize: 11, color: C.yellow, marginTop: 4 }}>Ya hay un registro de esta fecha: se actualizará.</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
            {MEASURES.map(([key, name]) => (
              <div key={key}>
                <div style={label}>{name}</div>
                <input type="text" inputMode="decimal" value={form[key]} placeholder="—" onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={label}>Nota (opcional)</div>
            <input type="text" value={form.note} maxLength={300} onChange={e => setForm({ ...form, note: e.target.value })} style={inputStyle} />
          </div>
          <button type="submit" disabled={saving} style={{ width: '100%', padding: 13, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : editingExisting ? 'Actualizar registro' : 'Guardar registro'}
          </button>
        </form>
      </div>

      <div style={card}>
        <div style={cardTitle}>📈 Evolución de peso y medidas</div>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '16px 0' }}>Aún no tienes registros. Añade el primero arriba.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ ...th, textAlign: 'left' }}>Fecha</th><th style={th}>Peso</th><th style={th}>Cintura</th><th style={th}>Pecho</th><th style={th}>Bajo pecho</th><th style={th}>Brazo</th><th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map(entry => {
                  const older = weights.filter(w => w.date < entry.date)
                  const before = older.length ? older[older.length - 1] : null
                  const diff = entry.weight != null && before ? entry.weight - before.weight : null
                  return (
                    <tr key={entry.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...td, textAlign: 'left', fontWeight: 700, minWidth: 84 }}>
                        {fmtDate(entry.date)}
                        {entry.note && <div style={{ fontSize: 10, color: C.muted, fontWeight: 400, marginTop: 2, maxWidth: 120 }}>{entry.note}</div>}
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>
                        {entry.weight != null ? fmt(entry.weight) : '—'}
                        {diff !== null && <div style={{ fontSize: 10, fontWeight: 600, color: diff < 0 ? C.green : diff > 0 ? C.yellow : C.muted }}>{signed(diff)}</div>}
                      </td>
                      <td style={td}>{fmt(entry.waist)}</td>
                      <td style={td}>{fmt(entry.chest)}</td>
                      <td style={td}>{fmt(entry.under_chest)}</td>
                      <td style={td}>{fmt(entry.arm)}</td>
                      <td style={td}><button onClick={() => remove(entry)} style={{ border: 'none', background: C.redLight, color: C.red, borderRadius: 8, width: 24, height: 24, fontSize: 11, cursor: 'pointer' }}>✕</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={cardTitle}>📏 Cómo medirte correctamente</div>
        {[
          ['Cuándo', 'Siempre el mismo día y a la misma hora, mejor por la mañana, en ayunas y antes de beber nada. Después de ir al baño.'],
          ['Peso', 'Sin ropa o con la misma cada vez. En el mismo sitio de la casa — el suelo puede variar.'],
          ['Cintura', 'A la altura del ombligo, cinta paralela al suelo, sin meter tripa ni forzar. Exhala y mide.'],
          ['Pecho', 'A la altura de los pezones, cinta paralela al suelo, respiración normal.'],
          ['Bajo pecho', 'Justo debajo del pecho, donde termina la caja torácica.'],
          ['Brazo', 'En el punto más ancho del bíceps, brazo relajado caído. Siempre el mismo brazo.'],
        ].map(([t, d]) => (
          <div key={t} style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 8 }}><strong>{t}:</strong> <span style={{ color: C.muted }}>{d}</span></div>
        ))}
        <div style={{ background: C.blueLight, borderLeft: `3px solid ${C.blue}`, borderRadius: 10, padding: '10px 12px', marginTop: 8, fontSize: 12, lineHeight: 1.5, color: C.text }}>
          <strong>Nota medidas:</strong> medir con cinta en el mismo punto exacto cada vez es difícil. Las variaciones de 2-5 cm entre semanas son normales si el punto cambia. El peso es el indicador más fiable semana a semana.
        </div>
        <div style={{ background: C.yellowLight, borderLeft: `3px solid ${C.yellow}`, borderRadius: 10, padding: '10px 12px', marginTop: 8, fontSize: 12, lineHeight: 1.5, color: C.text }}>
          <strong>Importante:</strong> el peso puede variar 1-2 kg día a día por agua, sal y tránsito. Lo que importa es la tendencia semanal, no el número de cada día.
        </div>
      </div>

      {canImport && entries.length === 0 && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowImport(!showImport)} style={{ border: `1px dashed ${C.border}`, background: 'transparent', color: C.muted, borderRadius: 12, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
            {showImport ? 'Ocultar importación' : '📥 Importar desde JSON'}
          </button>
          {showImport && (
            <div style={{ marginTop: 8 }}>
              <textarea value={importText} rows={6} placeholder='[{"date":"2026-06-06","weight":89.45,"waist":142,"note":""}]' onChange={e => setImportText(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              <button onClick={doImport} disabled={!importText.trim()} style={{ marginTop: 8, width: '100%', padding: 11, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Importar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
