import { useState, useEffect } from 'react'

const COLOR_LABELS = [['green', 'Verde'], ['blue', 'Azul'], ['amber', 'Ámbar'], ['red', 'Rojo'], ['purple', 'Morado'], ['gray', 'Gris']]
const EMPTY_FORM = { color: 'gray', time_label: '', title: '', body: '' }

export function palette(C) {
  return {
    green: [C.green, C.greenLight], blue: [C.blue, C.blueLight], amber: [C.yellow, C.yellowLight],
    red: [C.red, C.redLight], purple: [C.purple, C.purpleLight], gray: [C.muted, C.surface2],
  }
}

// Consejo fijo, igual para todos los usuarios (no se edita).
function Ansiedad({ C }) {
  const block = { borderRadius: 14, padding: 14, marginBottom: 10 }
  const title = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }
  const tip = (color, light, strong, text) => (
    <div style={{ background: light, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, fontSize: 13, lineHeight: 1.5, color: C.text }}>
      <strong>{strong}</strong> {text}
    </div>
  )
  return (
    <div>
      <div style={{ ...block, background: C.red, color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>¿Te está entrando ahora?</div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>Vaso de agua fría grande. Espera 10 minutos. El pico pasa solo.<br />Si no pasa: 10 min de ejercicio suave.</div>
      </div>
      <div style={{ ...block, background: C.redLight, border: `1px solid ${C.red}55` }}>
        <div style={{ ...title, color: C.red }}>NO tocar esto</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: C.text }}>✕ Bolsas de patatas / snacks<br />✕ Bollería, galletas, chocolate con leche<br />✕ Refrescos o zumos industriales<br />✕ Embutido graso (chorizo, salchichón)<br />✕ Pan blanco con mantequilla</div>
      </div>
      <div style={{ ...block, background: C.greenLight, border: `1px solid ${C.green}55` }}>
        <div style={{ ...title, color: C.green }}>SÍ coger esto</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: C.text }}>✓ Edamame al vapor con sal marina<br />✓ Puñado de nueces o almendras<br />✓ Yogur desnatado con canela<br />✓ Manzana o mandarina<br />✓ Palomitas sin mantequilla<br />✓ Chocolate negro +85% (2-3 onzas max)<br />✓ Zanahoria baby cruda</div>
      </div>
      {tip(C.blue, C.blueLight, 'Por qué te pasa:', 'el cuerpo pide azúcar y grasa porque lleva tiempo con ellos. No es falta de voluntad. Los picos duran 10-15 minutos.')}
      {tip(C.yellow, C.yellowLight, 'La regla de oro:', 'no tengas guarrerías en casa. La batalla se gana en el supermercado.')}
      {tip(C.green, C.greenLight, 'El edamame es tu arma:', 'cubre el mismo ritual que las patatas fritas — con las manos, salado, crujiente.')}
    </div>
  )
}

// Tarjetas propias de cada usuario, guardadas en el servidor.
const DEFAULT_LABELS = { time: 'Hora (opcional)', timePh: '8:00–9:00', title: 'Título', titlePh: 'Desayuno', body: 'Texto', timeWidth: 74 }

// `labels` permite reutilizar las tarjetas con otro significado (p. ej. Cantidades:
// alimento / cantidad / referencia visual) sin duplicar el componente.
export function CardsSection({ section, emptyText, API, getHeaders, C, inputStyle, canImport, labels }) {
  const L = { ...DEFAULT_LABELS, ...labels }
  const [cards, setCards] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const pal = palette(C)

  async function load() {
    try {
      const res = await fetch(`${API}/content?section=${section}`, { headers: getHeaders() })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
      setCards(await res.json())
      setError('')
    } catch (err) {
      setError(`No se pudo cargar: ${err.message}`)
    } finally {
      setLoaded(true)
    }
  }
  useEffect(() => { load() }, [section])

  async function request(url, method, body) {
    const res = await fetch(`${API}${url}`, { method, headers: getHeaders(), body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
    return res
  }

  async function save(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const body = { section, color: form.color, time_label: form.time_label, title: form.title, body: form.body }
      if (form.id) await request(`/content/${form.id}`, 'PUT', body)
      else await request('/content', 'POST', body)
      setForm(null)
      await load()
    } catch (err) {
      alert(`No se pudo guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function remove(card) {
    if (!window.confirm(`¿Borrar «${card.title}»?`)) return
    try {
      await request(`/content/${card.id}`, 'DELETE')
      await load()
    } catch (err) {
      alert(`No se pudo borrar: ${err.message}`)
    }
  }

  async function move(index, dir) {
    const target = index + dir
    if (target < 0 || target >= cards.length) return
    const next = [...cards]
    ;[next[index], next[target]] = [next[target], next[index]]
    setCards(next)
    try {
      await request('/content/order', 'PUT', { section, ids: next.map(c => c.id) })
    } catch (err) {
      alert(`No se pudo reordenar: ${err.message}`)
      await load()
    }
  }

  async function doImport() {
    try {
      const parsed = JSON.parse(importText)
      if (!Array.isArray(parsed) && parsed.sections) {
        // Fichero con varias secciones a la vez: solo se cargan las que aún estén vacías
        const res = await request('/content/import-all', 'POST', { sections: parsed.sections })
        const out = await res.json()
        const done = Object.entries(out.imported).map(([n, c]) => `${n} (${c})`).join(', ') || 'ninguna'
        alert(`Importadas: ${done}.${out.skipped.length ? ` Saltadas por tener ya contenido: ${out.skipped.join(', ')}.` : ''}`)
      } else {
        const list = Array.isArray(parsed) ? parsed : parsed.cards
        await request('/content/import', 'POST', { section, cards: list })
      }
      setImportText('')
      setShowImport(false)
      await load()
    } catch (err) {
      alert(`No se pudo importar: ${err.message}`)
    }
  }

  const label = { fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }
  const iconBtn = { border: 'none', background: C.surface2, color: C.muted, cursor: 'pointer', borderRadius: 8, width: 26, height: 26, fontSize: 12, flexShrink: 0 }

  if (!loaded) return <div style={{ textAlign: 'center', color: C.muted, padding: '30px 0', fontSize: 13 }}>Cargando…</div>

  return (
    <div>
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      <button onClick={() => setForm(form ? null : { ...EMPTY_FORM })} style={{ width: '100%', padding: 13, background: form ? C.bg : C.accent, color: form ? C.muted : '#fff', border: form ? `1px solid ${C.border}` : 'none', borderRadius: 16, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
        {form ? '✕ Cancelar' : '+ Añadir'}
      </button>

      {form && (
        <form onSubmit={save} style={{ background: C.white, borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {COLOR_LABELS.map(([key, name]) => (
              <button key={key} type="button" onClick={() => setForm({ ...form, color: key })}
                style={{ padding: '6px 12px', borderRadius: 20, border: `2px solid ${form.color === key ? pal[key][0] : 'transparent'}`, cursor: 'pointer', background: pal[key][1], color: C.text, fontSize: 12, fontWeight: 600 }}>
                {name}
              </button>
            ))}
          </div>
          {!L.hideTime && (
            <div style={{ marginBottom: 8 }}>
              <div style={label}>{L.time}</div>
              <input type="text" value={form.time_label} placeholder={L.timePh} maxLength={40} onChange={e => setForm({ ...form, time_label: e.target.value })} style={inputStyle} />
            </div>
          )}
          <div style={{ marginBottom: 8 }}>
            <div style={label}>{L.title}</div>
            <input type="text" value={form.title} placeholder={L.titlePh} maxLength={200} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={label}>{L.body}</div>
            <textarea value={form.body} rows={4} maxLength={4000} onChange={e => setForm({ ...form, body: e.target.value })} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={saving} style={{ width: '100%', padding: 13, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      )}

      {cards.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '30px 16px' }}>{emptyText}</div>
      )}

      {cards.map((card, i) => {
        const [main, light] = pal[card.color] || pal.gray
        return (
          <div key={card.id} style={{ background: light, borderLeft: `3px solid ${main}`, borderRadius: 12, padding: '12px 12px 12px 14px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {card.time_label && <div style={{ fontSize: 12, fontWeight: 800, color: main, minWidth: L.timeWidth, maxWidth: L.timeMax, flexShrink: 0, paddingTop: 1, overflowWrap: 'anywhere' }}>{card.time_label}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{card.title}</div>
              {card.body && <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{card.body}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...iconBtn, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i === cards.length - 1} style={{ ...iconBtn, opacity: i === cards.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setForm({ ...card })} style={iconBtn}>✏️</button>
                <button onClick={() => remove(card)} style={{ ...iconBtn, background: C.redLight, color: C.red }}>✕</button>
              </div>
            </div>
          </div>
        )
      })}

      {canImport && cards.length === 0 && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowImport(!showImport)} style={{ border: `1px dashed ${C.border}`, background: 'transparent', color: C.muted, borderRadius: 12, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
            {showImport ? 'Ocultar importación' : '📥 Importar desde JSON'}
          </button>
          {showImport && (
            <div style={{ marginTop: 8 }}>
              <textarea value={importText} rows={6} placeholder='[{"color":"green","time_label":"8:00","title":"Desayuno","body":"..."}]' onChange={e => setImportText(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              <button onClick={doImport} disabled={!importText.trim()} style={{ marginTop: 8, width: '100%', padding: 11, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Importar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Consejos({ API, getHeaders, C, inputStyle, canImport }) {
  const [tab, setTab] = useState('ansiedad')
  const sub = [['ansiedad', '🚨 Ansiedad'], ['horarios', '🕐 Horarios']]
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {sub.map(([key, name]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '7px 14px', borderRadius: 20, border: tab === key ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: tab === key ? C.accent : C.white, color: tab === key ? '#fff' : C.muted, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {name}
          </button>
        ))}
      </div>
      {tab === 'ansiedad' && <Ansiedad C={C} />}
      {tab === 'horarios' && (
        <CardsSection section="horarios" emptyText="Aún no tienes nada aquí. Pulsa «+ Añadir» para crear tu horario de comidas." API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canImport} />
      )}
    </div>
  )
}
