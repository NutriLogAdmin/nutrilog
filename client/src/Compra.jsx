import { useState, useEffect } from 'react'
import { palette } from './Consejos'

const CATEGORY_COLORS = ['green', 'blue', 'purple', 'amber', 'red', 'gray']

// Lista de la compra propia de cada usuario, guardada en el servidor.
export default function Compra({ API, getHeaders, C, inputStyle, canImport }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const pal = palette(C)

  async function request(url, method, body) {
    const res = await fetch(`${API}${url}`, { method, headers: getHeaders(), body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
    return res
  }

  async function load() {
    try {
      const res = await request('/shopping', 'GET')
      setItems(await res.json())
      setError('')
    } catch (err) {
      setError(`No se pudo cargar: ${err.message}`)
    } finally {
      setLoaded(true)
    }
  }
  useEffect(() => { load() }, [])

  async function toggle(item) {
    const next = !item.checked
    setItems(items.map(i => i.id === item.id ? { ...i, checked: next } : i))
    try {
      await request(`/shopping/${item.id}`, 'PUT', { checked: next })
    } catch (err) {
      alert(`No se pudo marcar: ${err.message}`)
      await load()
    }
  }

  async function remove(item) {
    try {
      await request(`/shopping/${item.id}`, 'DELETE')
      await load()
    } catch (err) {
      alert(`No se pudo borrar: ${err.message}`)
    }
  }

  async function reset() {
    if (!window.confirm('¿Desmarcar todos los elementos de la lista?')) return
    try {
      await request('/shopping/reset', 'POST')
      await load()
    } catch (err) {
      alert(`No se pudo resetear: ${err.message}`)
    }
  }

  async function add(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await request('/shopping', 'POST', { name: form.name, category: form.category })
      setForm({ name: '', category: form.category })
      await load()
    } catch (err) {
      alert(`No se pudo añadir: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function doImport() {
    try {
      const parsed = JSON.parse(importText)
      const list = Array.isArray(parsed) ? parsed : parsed.items
      await request('/shopping/import', 'POST', { items: list })
      setImportText('')
      setShowImport(false)
      await load()
    } catch (err) {
      alert(`No se pudo importar: ${err.message}`)
    }
  }

  // Categorías en el orden en que aparece cada una por primera vez
  const categories = []
  items.forEach(i => { if (!categories.includes(i.category)) categories.push(i.category) })
  const done = items.filter(i => i.checked).length
  const label = { fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }

  if (!loaded) return <div style={{ textAlign: 'center', color: C.muted, padding: '30px 0', fontSize: 13 }}>Cargando…</div>

  return (
    <div>
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      <button onClick={() => setShowForm(!showForm)} style={{ width: '100%', padding: 13, background: showForm ? C.bg : C.accent, color: showForm ? C.muted : '#fff', border: showForm ? `1px solid ${C.border}` : 'none', borderRadius: 16, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
        {showForm ? '✕ Cancelar' : '+ Añadir'}
      </button>

      {showForm && (
        <form onSubmit={add} style={{ background: C.white, borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 8 }}>
            <div style={label}>Producto</div>
            <input type="text" value={form.name} placeholder="Tomates (2 kg)" maxLength={200} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={label}>Categoría</div>
            <input type="text" list="compra-categorias" value={form.category} placeholder="Verduras, Lácteos… (o una nueva)" maxLength={80} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle} />
            <datalist id="compra-categorias">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <button type="submit" disabled={saving} style={{ width: '100%', padding: 13, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Añadir a la lista'}
          </button>
        </form>
      )}

      {items.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '30px 16px' }}>Aún no tienes nada en la lista. Pulsa «+ Añadir» para crear tu lista de la compra.</div>
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.muted }}>Toca un elemento para marcarlo · {done}/{items.length}</div>
          <button onClick={reset} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 10, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>Resetear</button>
        </div>
      )}

      {categories.map((cat, ci) => {
        const [main, light] = pal[CATEGORY_COLORS[ci % CATEGORY_COLORS.length]]
        return (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div style={{ background: light, color: main, fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 8, marginBottom: 4 }}>{cat}</div>
            <div style={{ background: C.white, borderRadius: 12, padding: '0 12px', border: `1px solid ${C.border}` }}>
              {items.filter(i => i.category === cat).map((item, idx, arr) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div onClick={() => toggle(item)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${item.checked ? C.green : C.border}`, background: item.checked ? C.green : C.bg, color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.checked ? '✓' : ''}</div>
                    <span style={{ fontSize: 13, color: item.checked ? C.muted : C.text, textDecoration: item.checked ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>{item.name}</span>
                  </div>
                  <button onClick={() => remove(item)} style={{ border: 'none', background: C.redLight, color: C.red, cursor: 'pointer', borderRadius: 8, width: 26, height: 26, fontSize: 12, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {canImport && items.length === 0 && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowImport(!showImport)} style={{ border: `1px dashed ${C.border}`, background: 'transparent', color: C.muted, borderRadius: 12, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
            {showImport ? 'Ocultar importación' : '📥 Importar desde JSON'}
          </button>
          {showImport && (
            <div style={{ marginTop: 8 }}>
              <textarea value={importText} rows={6} placeholder='[{"category":"Frutas","name":"Manzanas (2 kg)","checked":false}]' onChange={e => setImportText(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              <button onClick={doImport} disabled={!importText.trim()} style={{ marginTop: 8, width: '100%', padding: 11, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Importar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
