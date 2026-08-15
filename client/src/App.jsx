import { useState, useEffect } from 'react'

const API = 'http://localhost:3001/api'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10
}

export default function App() {
  const [date, setDate] = useState(todayISO())
  const [entries, setEntries] = useState([])
  const [foods, setFoods] = useState([])
  const [goal, setGoal] = useState(2500)
  const [view, setView] = useState('registro')

  // Formulario nuevo alimento
  const [newFood, setNewFood] = useState({ name: '', kcal100: '', protein100: '', satfat100: '', carbs100: '' })
  
  // Formulario ingesta
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState(null)
  const [grams, setGrams] = useState('')

  useEffect(() => { loadEntries() }, [date])
  useEffect(() => { loadFoods() }, [])

  async function loadEntries() {
    const res = await fetch(`${API}/foods/entries?date=${date}`)
    setEntries(await res.json())
  }

  async function loadFoods() {
    const res = await fetch(`${API}/foods`)
    setFoods(await res.json())
  }

  async function addFood(e) {
    e.preventDefault()
    const res = await fetch(`${API}/foods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newFood.name,
        kcal100: parseFloat(newFood.kcal100),
        protein100: parseFloat(newFood.protein100) || 0,
        satfat100: parseFloat(newFood.satfat100) || 0,
        carbs100: parseFloat(newFood.carbs100) || 0,
      })
    })
    if (res.ok) {
      setNewFood({ name: '', kcal100: '', protein100: '', satfat100: '', carbs100: '' })
      loadFoods()
    }
  }

  async function addEntry(e) {
    e.preventDefault()
    if (!selectedFood || !grams) return
    await fetch(`${API}/foods/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_id: selectedFood.id,
        grams: parseFloat(grams),
        date,
        time: new Date().toTimeString().slice(0, 5)
      })
    })
    setSelectedFood(null)
    setGrams('')
    setSearch('')
    loadEntries()
  }

  async function deleteEntry(id) {
    await fetch(`${API}/foods/entries/${id}`, { method: 'DELETE' })
    loadEntries()
  }

  const filtered = foods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  const totals = entries.reduce((acc, e) => {
    const f = e.grams / 100
    acc.kcal += e.kcal100 * f
    acc.protein += e.protein100 * f
    acc.satfat += e.satfat100 * f
    acc.carbs += e.carbs100 * f
    return acc
  }, { kcal: 0, protein: 0, satfat: 0, carbs: 0 })

  const pct = Math.min(100, (totals.kcal / goal) * 100)
  const remaining = round(goal - totals.kcal)
  const over = totals.kcal > goal

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '24px 16px', background: '#fff', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #1C1C1A', paddingBottom: 12, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: '#78766F', fontWeight: 700, textTransform: 'uppercase' }}>Seguimiento nutricional</div>
          <h1 style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 900 }}>NutriLog</h1>
        </div>
        <input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)}
          style={{ fontSize: 14, padding: '8px 10px', border: '1px solid #1C1C1A' }} />
      </div>

      {/* Resumen calórico */}
      <div style={{ border: '3px solid #1C1C1A', padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '8px solid #1C1C1A', paddingBottom: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 900 }}>Calorías totales</span>
          <span style={{ fontSize: 32, fontWeight: 900 }}>{round(totals.kcal)}</span>
        </div>
        <div style={{ height: 8, background: '#E4E2DA', marginBottom: 8 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: over ? '#C6402E' : '#2F6B4F', transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: over ? '#C6402E' : '#2F6B4F', fontWeight: 700 }}>
            {over ? `${Math.abs(remaining)} kcal por encima` : `${remaining} kcal restantes`}
          </span>
          <span style={{ color: '#78766F' }}>Objetivo: <strong>{goal}</strong> kcal</span>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 13 }}>
          {[['Proteínas', totals.protein], ['Grasas sat.', totals.satfat], ['Hidratos', totals.carbs]].map(([label, val]) => (
            <div key={label}><span style={{ color: '#78766F' }}>{label}: </span><strong>{round(val)}g</strong></div>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <label style={{ fontSize: 12, color: '#78766F' }}>Objetivo kcal: </label>
            <input type="number" value={goal} onChange={e => setGoal(parseFloat(e.target.value) || 0)}
              style={{ width: 70, padding: '4px 6px', border: '1px solid #1C1C1A', fontSize: 13, fontWeight: 700 }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: 20, gap: 0 }}>
        {[['registro', 'Registro del día'], ['catalogo', 'Catálogo de alimentos']].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{
            padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            border: '1px solid #1C1C1A', borderLeft: key === 'catalogo' ? 'none' : '1px solid #1C1C1A',
            background: view === key ? '#1C1C1A' : '#fff', color: view === key ? '#fff' : '#1C1C1A'
          }}>{label}</button>
        ))}
      </div>

      {view === 'registro' && (
        <div>
          {/* Añadir ingesta */}
          <div style={{ border: '1px solid #E4E2DA', padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Registrar ingesta</div>
            <input placeholder="Buscar alimento..." value={search} onChange={e => { setSearch(e.target.value); setSelectedFood(null) }}
              style={{ width: '100%', padding: '9px 10px', border: '1px solid #1C1C1A', fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }} />
            
            {search && !selectedFood && (
              <div style={{ border: '1px solid #E4E2DA', maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
                {filtered.length === 0 && <div style={{ padding: 10, fontSize: 13, color: '#78766F' }}>No encontrado — añádelo en "Catálogo"</div>}
                {filtered.map(f => (
                  <div key={f.id} onClick={() => { setSelectedFood(f); setSearch(f.name) }}
                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #E4E2DA', fontSize: 14 }}
                    onMouseEnter={e => e.target.style.background = '#F5F4F0'}
                    onMouseLeave={e => e.target.style.background = '#fff'}>
                    <strong>{f.name}</strong>
                    <span style={{ color: '#78766F', marginLeft: 8 }}>{f.kcal100} kcal/100g · P:{f.protein100}g · H:{f.carbs100}g</span>
                  </div>
                ))}
              </div>
            )}

            {selectedFood && (
              <form onSubmit={addEntry} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#78766F', fontWeight: 700, marginBottom: 3 }}>GRAMOS CONSUMIDOS</div>
                  <input type="number" placeholder="Ej: 35" value={grams} onChange={e => setGrams(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid #1C1C1A', fontSize: 15, fontWeight: 700, boxSizing: 'border-box' }} />
                </div>
                {grams && (
                  <div style={{ fontSize: 13, color: '#78766F', paddingBottom: 10 }}>
                    = <strong style={{ color: '#1C1C1A' }}>{round(selectedFood.kcal100 * grams / 100)} kcal</strong>
                    · P: {round(selectedFood.protein100 * grams / 100)}g
                    · H: {round(selectedFood.carbs100 * grams / 100)}g
                  </div>
                )}
                <button type="submit" style={{ padding: '9px 16px', background: '#C6402E', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', height: 37 }}>
                  Añadir
                </button>
              </form>
            )}
          </div>

          {/* Lista de entradas del día */}
          {entries.length === 0
            ? <div style={{ color: '#78766F', fontSize: 14, padding: '20px 0' }}>Nada registrado hoy. Busca un alimento arriba para empezar.</div>
            : entries.map(e => {
              const f = e.grams / 100
              return (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #E4E2DA' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: '#78766F' }}>{e.grams}g · {e.time} · P:{round(e.protein100 * f)}g · H:{round(e.carbs100 * f)}g · Sat:{round(e.satfat100 * f)}g</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 17, fontWeight: 900 }}>{round(e.kcal100 * f)} kcal</span>
                    <button onClick={() => deleteEntry(e.id)} style={{ border: 'none', background: 'none', color: '#78766F', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {view === 'catalogo' && (
        <div>
          {/* Añadir alimento al catálogo */}
          <form onSubmit={addFood} style={{ border: '1px solid #E4E2DA', padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Añadir alimento al catálogo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
              {[['Nombre', 'name', 'text'], ['Kcal/100g', 'kcal100', 'number'], ['Proteína/100g', 'protein100', 'number'], ['Grasas sat./100g', 'satfat100', 'number'], ['Hidratos/100g', 'carbs100', 'number']].map(([label, key, type]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: '#78766F', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                  <input type={type} value={newFood[key]} onChange={e => setNewFood({ ...newFood, [key]: e.target.value })}
                    style={{ width: '100%', padding: '8px 8px', border: '1px solid #1C1C1A', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
              <button type="submit" style={{ padding: '9px 14px', background: '#1C1C1A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', height: 35 }}>
                Guardar
              </button>
            </div>
          </form>

          {/* Lista del catálogo */}
          {foods.length === 0
            ? <div style={{ color: '#78766F', fontSize: 14 }}>El catálogo está vacío. Añade tu primer alimento.</div>
            : foods.map(f => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E4E2DA', fontSize: 14 }}>
                <strong>{f.name}</strong>
                <span style={{ color: '#78766F' }}>{f.kcal100} kcal · P:{f.protein100}g · Sat:{f.satfat100}g · H:{f.carbs100}g</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}