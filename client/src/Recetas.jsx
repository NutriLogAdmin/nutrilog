import { useState, useEffect } from 'react'
import { palette, CardsSection } from './Consejos'

const COLOR_LABELS = [['green', 'Verde'], ['blue', 'Azul'], ['amber', 'Ámbar'], ['red', 'Rojo'], ['purple', 'Morado'], ['gray', 'Gris']]
const NUTRI_FIELDS = [['serving_g', 'Ración (g)'], ['kcal', 'Kcal'], ['protein', 'Proteína (g)'], ['carbs', 'Hidratos (g)'], ['satfat', 'Grasas sat. (g)'], ['sugar', 'Azúcar (g)'], ['fiber', 'Fibra (g)'], ['salt', 'Sal (g)']]
const EMPTY_FORM = { color: 'green', title: '', badge: '', intro: '', steps: '', tip: '', macros: '', is_public: false, serving_g: '', kcal: '', protein: '', carbs: '', satfat: '', sugar: '', fiber: '', salt: '', has_image: false, image: null, imageChanged: false }

const fmtNum = n => String(Number(Number(n).toFixed(1))).replace('.', ',')

// Primer emoji del título, para el icono cuando la receta no tiene foto
export function emojiOf(title) {
  const m = /^\s*(\p{Extended_Pictographic})/u.exec(title || '')
  return m ? m[1] : '🍽️'
}

// «≈ 285 kcal · P 18 g · H 39 g», o '' si la receta no tiene macros en números
export function nutritionText(r) {
  if (r.kcal == null) return ''
  const parts = [`≈ ${fmtNum(r.kcal)} kcal`]
  if (r.protein != null) parts.push(`P ${fmtNum(r.protein)} g`)
  if (r.carbs != null) parts.push(`H ${fmtNum(r.carbs)} g`)
  return parts.join(' · ')
}

// Reduce la foto en el navegador antes de subirla: el servidor solo acepta ~250 KB.
function resizeImage(file, max = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

const toForm = r => ({
  ...EMPTY_FORM, id: r.id, color: r.color, title: r.title, badge: r.badge || '', intro: r.intro || '', steps: r.steps, tip: r.tip || '', macros: r.macros || '',
  is_public: r.is_public, has_image: r.has_image,
  ...Object.fromEntries(NUTRI_FIELDS.map(([k]) => [k, r[k] == null ? '' : String(r[k]).replace('.', ',')])),
})

// Cuerpo de una receta desplegada: foto, notas, pasos numerados y macros. Lo comparten la
// pestaña Recetas y el carrusel de Registro.
export function RecipeDetail({ r, C, image }) {
  const pal = palette(C)
  const [main, light] = pal[r.color] || pal.gray
  let n = 0
  const rows = [['Kcal', r.kcal, ''], ['Proteína', r.protein, ' g'], ['Hidratos', r.carbs, ' g'], ['Grasas sat.', r.satfat, ' g'], ['Azúcar', r.sugar, ' g'], ['Fibra', r.fiber, ' g'], ['Sal', r.salt, ' g']].filter(x => x[1] != null)
  return (
    <div>
      {image && <img src={image} alt={r.title} style={{ width: '100%', height: 'auto', maxHeight: 360, objectFit: 'contain', background: C.surface2, borderRadius: 12, marginBottom: 10, display: 'block' }} />}
      {r.intro && <div style={{ background: light, borderLeft: `3px solid ${main}`, borderRadius: 10, padding: '10px 12px', marginBottom: 10, fontSize: 13, lineHeight: 1.5, color: C.text, whiteSpace: 'pre-wrap' }}>{r.intro}</div>}
      {r.steps.split('\n').filter(l => l.trim()).map((line, i) => {
        const isIngredients = line.startsWith('Ingredientes:')
        if (!isIngredients) n += 1
        return isIngredients ? (
          <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 8, lineHeight: 1.5 }}><strong>{line}</strong></div>
        ) : (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: light, color: main, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{line}</div>
          </div>
        )
      })}
      {r.tip && <div style={{ background: C.yellowLight, borderLeft: `3px solid ${C.yellow}`, borderRadius: 10, padding: '10px 12px', marginTop: 4, fontSize: 13, lineHeight: 1.5, color: C.text, whiteSpace: 'pre-wrap' }}>{r.tip}</div>}
      {rows.length > 0 && (
        <div style={{ background: C.surface2, borderRadius: 10, padding: '10px 12px', marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>📊 Por ración{r.serving_g ? ` (~${fmtNum(r.serving_g)} g)` : ''} · estimado ±10-15%</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
            {rows.map(([name, val, unit]) => (
              <div key={name} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{fmtNum(val)}{unit}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {r.macros && (
        <div style={{ background: C.surface2, borderRadius: 10, padding: '10px 12px', marginTop: 8, fontSize: 12, lineHeight: 1.6, color: C.text, whiteSpace: 'pre-wrap' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', marginBottom: 2 }}>📊 Macros</div>
          {r.macros}
        </div>
      )}
    </div>
  )
}

// Recetas propias y las que otros usuarios han compartido. Solo el autor edita o borra.
const CANTIDADES_LABELS = { time: 'Cantidad (opcional)', timePh: '60–80g en seco', title: 'Alimento', titlePh: 'Pasta', body: 'Referencia visual', timeWidth: 96, timeMax: 110 }

export default function Recetas(props) {
  const [tab, setTab] = useState('recetas')
  const { API, getHeaders, C, inputStyle, canImport } = props
  const sub = [['recetas', '🍳 Recetas'], ['cantidades', '⚖️ Cantidades']]
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {sub.map(([key, name]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '7px 14px', borderRadius: 20, border: tab === key ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: tab === key ? C.accent : C.white, color: tab === key ? '#fff' : C.muted, fontSize: 12, fontWeight: 700 }}>
            {name}
          </button>
        ))}
      </div>
      {tab === 'recetas' && <RecetasLista {...props} />}
      {tab === 'cantidades' && (
        <CardsSection section="cantidades" emptyText="Aún no tienes nada aquí. Pulsa «+ Añadir» para apuntar las cantidades recomendadas de cada ingrediente." API={API} getHeaders={getHeaders} C={C} inputStyle={inputStyle} canImport={canImport} labels={CANTIDADES_LABELS} />
      )}
    </div>
  )
}

function RecetasLista({ API, getHeaders, C, inputStyle, canImport }) {
  const [recipes, setRecipes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [images, setImages] = useState({}) // fotos ya pedidas, por id de receta
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
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
      const res = await request('/recipes', 'GET')
      setRecipes(await res.json())
      setError('')
    } catch (err) {
      setError(`No se pudo cargar: ${err.message}`)
    } finally {
      setLoaded(true)
    }
  }
  useEffect(() => { load() }, [])

  async function toggleOpen(r) {
    const closing = openId === r.id
    setOpenId(closing ? null : r.id)
    if (!closing && r.has_image && images[r.id] === undefined) {
      try {
        const res = await request(`/recipes/${r.id}/image`, 'GET')
        const { image } = await res.json()
        setImages(prev => ({ ...prev, [r.id]: image }))
      } catch { /* sin foto se ve la receta igual */ }
    }
  }

  async function pickPhoto(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await resizeImage(file)
      setForm(f => ({ ...f, image: dataUrl, imageChanged: true }))
    } catch {
      alert('No se pudo leer esa foto. Prueba con otra.')
    }
  }

  async function save(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.steps.trim()) return
    setSaving(true)
    try {
      const body = { title: form.title, badge: form.badge, color: form.color, intro: form.intro, steps: form.steps, tip: form.tip, macros: form.macros, is_public: form.is_public }
      for (const [k] of NUTRI_FIELDS) body[k] = form[k]
      if (form.imageChanged) body.image = form.image
      if (form.id) await request(`/recipes/${form.id}`, 'PUT', body)
      else await request('/recipes', 'POST', body)
      if (form.id && form.imageChanged) setImages(prev => { const next = { ...prev }; delete next[form.id]; return next })
      setForm(null)
      await load()
    } catch (err) {
      alert(`No se pudo guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function remove(r) {
    if (!window.confirm(`¿Borrar «${r.title}»?`)) return
    try {
      await request(`/recipes/${r.id}`, 'DELETE')
      await load()
    } catch (err) {
      alert(`No se pudo borrar: ${err.message}`)
    }
  }

  async function doImport() {
    try {
      const parsed = JSON.parse(importText)
      const list = Array.isArray(parsed) ? parsed : parsed.recipes
      const replace = !Array.isArray(parsed) && parsed.replace === true
      await request('/recipes/import', 'POST', { recipes: list, replace })
      setImportText('')
      setShowImport(false)
      await load()
    } catch (err) {
      alert(`No se pudo importar: ${err.message}`)
    }
  }

  const label = { fontSize: 10, color: C.muted, marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }
  const q = search.trim().toLowerCase()
  const visible = q ? recipes.filter(r => r.title.toLowerCase().includes(q)) : recipes

  if (!loaded) return <div style={{ textAlign: 'center', color: C.muted, padding: '30px 0', fontSize: 13 }}>Cargando…</div>

  return (
    <div>
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      <button onClick={() => setForm(form ? null : { ...EMPTY_FORM })} style={{ width: '100%', padding: 13, background: form ? C.bg : C.accent, color: form ? C.muted : '#fff', border: form ? `1px solid ${C.border}` : 'none', borderRadius: 16, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
        {form ? '✕ Cancelar' : '+ Añadir receta'}
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
          <div style={{ marginBottom: 8 }}>
            <div style={label}>Título</div>
            <input type="text" value={form.title} placeholder="🍋 Pollo al limón" maxLength={200} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={label}>Etiqueta (opcional)</div>
            <input type="text" value={form.badge} placeholder="Sartén · 15 min" maxLength={60} onChange={e => setForm({ ...form, badge: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={label}>Foto (opcional)</div>
            {form.image && <img src={form.image} alt="vista previa" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 6, display: 'block' }} />}
            {!form.image && form.has_image && !form.imageChanged && <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>📷 Esta receta ya tiene foto; se mantiene si no la cambias.</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ border: `1px dashed ${C.border}`, borderRadius: 10, padding: '7px 12px', fontSize: 12, color: C.muted, cursor: 'pointer' }}>
                📷 {form.image || form.has_image ? 'Cambiar foto' : 'Añadir foto'}
                <input type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
              </label>
              {(form.image || (form.has_image && !form.imageChanged)) && (
                <button type="button" onClick={() => setForm({ ...form, image: null, imageChanged: true })} style={{ border: 'none', background: C.redLight, color: C.red, borderRadius: 10, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>Quitar foto</button>
              )}
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={label}>Nota inicial (opcional)</div>
            <textarea value={form.intro} rows={2} maxLength={2000} onChange={e => setForm({ ...form, intro: e.target.value })} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={label}>Pasos — uno por línea</div>
            <textarea value={form.steps} rows={6} maxLength={8000} onChange={e => setForm({ ...form, steps: e.target.value })} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={label}>Truco final (opcional)</div>
            <textarea value={form.tip} rows={2} maxLength={2000} onChange={e => setForm({ ...form, tip: e.target.value })} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={label}>Macros por ración, estimados (opcional)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {NUTRI_FIELDS.map(([key, name]) => (
                <div key={key}>
                  <div style={{ ...label, fontSize: 9 }}>{name}</div>
                  <input type="text" inputMode="decimal" value={form[key]} placeholder="—" onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>Con las kcal y la proteína, la receta puede salir en «Completa tu día» del carrusel de Registro.</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={label}>Notas de macros (opcional)</div>
            <textarea value={form.macros} rows={2} maxLength={1000} placeholder="Por 100 g: 95 kcal · Proteína 6g · Hidratos 13g…" onChange={e => setForm({ ...form, macros: e.target.value })} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_public} onChange={e => setForm({ ...form, is_public: e.target.checked })} />
            Compartir con todos los usuarios
          </label>
          <button type="submit" disabled={saving} style={{ width: '100%', padding: 13, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      )}

      {recipes.length > 0 && (
        <input type="text" value={search} placeholder="Buscar receta…" onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
      )}

      {recipes.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: '30px 16px' }}>Aún no hay recetas. Pulsa «+ Añadir receta» para crear la primera.</div>
      )}
      {recipes.length > 0 && visible.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '20px 0' }}>Ninguna receta coincide con «{search}».</div>
      )}

      {visible.map(r => {
        const [main, light] = pal[r.color] || pal.gray
        const open = openId === r.id
        const nutri = nutritionText(r)
        return (
          <div key={r.id} style={{ background: C.white, borderRadius: 16, marginBottom: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div onClick={() => toggleOpen(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflowWrap: 'anywhere' }}>{r.title}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {r.badge && <span style={{ fontSize: 10, fontWeight: 700, background: light, color: main, padding: '2px 8px', borderRadius: 10 }}>{r.badge}</span>}
                  {nutri && <span style={{ fontSize: 10, color: C.muted, padding: '2px 0' }}>{nutri}</span>}
                  {r.mine && r.is_public && <span style={{ fontSize: 10, color: C.muted, padding: '2px 0' }}>Compartida</span>}
                  {!r.mine && <span style={{ fontSize: 10, color: C.muted, padding: '2px 0' }}>de {r.author}</span>}
                </div>
              </div>
              <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>{open ? '−' : '+'}</span>
            </div>

            {open && (
              <div style={{ padding: '0 14px 14px' }}>
                <RecipeDetail r={r} C={C} image={images[r.id]} />
                {r.mine && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setForm(toForm(r)); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>✏️ Editar</button>
                    <button onClick={() => remove(r)} style={{ border: 'none', background: C.redLight, color: C.red, borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>✕ Borrar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {canImport && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowImport(!showImport)} style={{ border: `1px dashed ${C.border}`, background: 'transparent', color: C.muted, borderRadius: 12, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
            {showImport ? 'Ocultar importación' : '📥 Importar desde JSON'}
          </button>
          {showImport && (
            <div style={{ marginTop: 8 }}>
              <textarea value={importText} rows={6} placeholder='[{"title":"🍋 Pollo al limón","badge":"Sartén · 15 min","color":"green","steps":"Paso 1\nPaso 2","is_public":true}]' onChange={e => setImportText(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              <button onClick={doImport} disabled={!importText.trim()} style={{ marginTop: 8, width: '100%', padding: 11, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Importar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
