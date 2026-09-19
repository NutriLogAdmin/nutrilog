import { useState, useEffect } from 'react'

const KINDS = [
  ['legumbre', 'Legumbre'], ['pasta', 'Pasta'], ['arroz', 'Arroz'], ['huevo', 'Huevo / tortilla'], ['pescado', 'Pescado'], ['carne', 'Carne'],
  ['verdura', 'Verdura'], ['ensalada', 'Ensalada'], ['crema', 'Crema / sopa'], ['siempre', 'Siempre (acompaña todas)'],
]
const KIND_LABEL = Object.fromEntries(KINDS)
const MEALS = [['comida', '🍽️ Comida'], ['cena', '🌙 Cena']]

// Platos propios de cada usuario: de aquí sale la rotación mensual de Mi Plan.
export default function Platos({ API, getHeaders, C, inputStyle, canImport, onChange }) {
  const [dishes, setDishes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', kind: 'legumbre', meal: 'comida' })
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
      const res = await request('/dishes', 'GET')
      setDishes(await res.json())
      setError('')
    } catch (err) {
      setError(`No se pudo cargar: ${err.message}`)
    } finally {
      setLoaded(true)
    }
  }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await request('/dishes', 'POST', form)
      setForm({ ...form, name: '' })
      await load()
      if (onChange) onChange()
    } catch (err) {
      alert(`No se pudo añadir: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function remove(d) {
    if (!window.confirm(`¿Quitar «${d.name}» de tus platos?`)) return
    try {
      await request(`/dishes/${d.id}`, 'DELETE')
      await load()
      if (onChange) onChange()
    } catch (err) {
      alert(`No se pudo quitar: ${err.message}`)
    }
  }

  async function doImport() {
    try {
      const parsed = JSON.parse(importText)
      const list = Array.isArray(parsed) ? parsed : parsed.dishes
      await request('/dishes/import', 'POST', { dishes: list })
      setImportText('')
      setShowImport(false)
      await load()
      if (onChange) onChange()
    } catch (err) {
      alert(`No se pudo importar: ${err.message}`)
    }
  }

  const label = { fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }

  if (!loaded) return <div style={{ textAlign: 'center', color: C.muted, padding: '30px 0', fontSize: 13 }}>Cargando…</div>

  return (
    <div>
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>
        Estos son los platos con los que se arma tu plan cada mes. Añade los tuyos: entrarán en la rotación. Legumbre y crema son platos de cuchara y nunca coinciden el mismo día; «Siempre» se añade a todas las comidas o cenas (pan, fruta…).
      </div>

      <form onSubmit={add} style={{ background: C.white, borderRadius: 20, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>➕ Incluye tu propio plato</div>
        <div style={{ marginBottom: 8 }}>
          <div style={label}>Nombre</div>
          <input type="text" value={form.name} placeholder="Lentejas con verduras (500g)" maxLength={200} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={label}>Tipo</div>
          <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} style={inputStyle}>
            {KINDS.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {MEALS.map(([key, name]) => (
            <button key={key} type="button" onClick={() => setForm({ ...form, meal: key })}
              style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.meal === key ? C.accent : C.bg, color: form.meal === key ? '#fff' : C.muted, fontSize: 12, fontWeight: 600 }}>{name}</button>
          ))}
        </div>
        <button type="submit" disabled={saving} style={{ width: '100%', padding: 12, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Guardando…' : 'Añadir a mis platos'}
        </button>
      </form>

      {dishes.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '20px 16px' }}>Aún no tienes platos. Añade los tuyos arriba para poder rotar tu plan.</div>
      )}

      {MEALS.map(([mealKey, mealName]) => {
        const list = dishes.filter(d => d.meal === mealKey)
        if (list.length === 0) return null
        return (
          <div key={mealKey} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 6 }}>{mealName} · {list.length}</div>
            <div style={{ background: C.white, borderRadius: 12, padding: '0 12px', border: `1px solid ${C.border}` }}>
              {list.map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: i < list.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, background: C.accentLight, color: C.accent, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>{KIND_LABEL[d.kind] || d.kind}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.text, overflowWrap: 'anywhere' }}>{d.name}</span>
                  <button onClick={() => remove(d)} style={{ border: 'none', background: C.redLight, color: C.red, borderRadius: 8, width: 26, height: 26, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {canImport && dishes.length === 0 && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowImport(!showImport)} style={{ border: `1px dashed ${C.border}`, background: 'transparent', color: C.muted, borderRadius: 12, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
            {showImport ? 'Ocultar importación' : '📥 Importar desde JSON'}
          </button>
          {showImport && (
            <div style={{ marginTop: 8 }}>
              <textarea value={importText} rows={6} placeholder='[{"name":"Lentejas (500g)","kind":"legumbre","meal":"comida"}]' onChange={e => setImportText(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              <button onClick={doImport} disabled={!importText.trim()} style={{ marginTop: 8, width: '100%', padding: 11, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Importar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
