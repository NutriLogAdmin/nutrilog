import { useState, useEffect, useRef } from 'react'
import { palette } from './Consejos'
import { RecipeDetail, emojiOf, nutritionText } from './Recetas'
import { generalPicks, completePicks } from './recommend'

const CARD_W = 200

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const round = n => Math.round(n)

// Carrusel de recetas de Registro: «Para hoy» (un surtido distinto cada día) y «Completa tu
// día» (recetas que cubren lo que aún falta de tus objetivos sin pasarse de kcal).
// `consumed` y `goals` son los totales del día y los objetivos del usuario.
export default function Carrusel({ API, getHeaders, C, consumed, goals }) {
  const [recipes, setRecipes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState('hoy')
  const [openId, setOpenId] = useState(null)
  const scroller = useRef(null)
  const pal = palette(C)

  useEffect(() => {
    let cancelled = false
    fetch(`${API}/recipes?images=1`, { headers: getHeaders() })
      .then(r => (r.ok ? r.json() : []))
      .then(list => { if (!cancelled) setRecipes(Array.isArray(list) ? list : []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  if (!loaded || recipes.length === 0) return null

  const complete = mode === 'completa' ? completePicks(recipes, consumed, goals) : null
  let picks = []
  let note = ''
  let comboText = ''
  if (mode === 'hoy') {
    picks = generalPicks(recipes, localToday()).map(r => ({ r, tag: '' }))
  } else if (complete.state === 'ok') {
    const { rem } = complete
    const gaps = [`${round(rem.kcal)} kcal`]
    if (goals.protein && rem.protein > goals.protein * 0.1) gaps.push(`${round(rem.protein)} g de proteína`)
    if (goals.fiber && rem.fiber > goals.fiber * 0.15) gaps.push(`${round(rem.fiber)} g de fibra`)
    note = `Te faltan ${gaps.join(' · ')}.`
    picks = complete.singles.map(({ r }) => {
      const cover = r.protein != null ? Math.min(r.protein, Math.max(rem.protein, 0)) : 0
      return { r, tag: `${cover >= 5 ? `Cubre ${round(cover)} g de proteína · ` : ''}te quedarían ${round(rem.kcal - r.kcal)} kcal` }
    })
    if (complete.combo) {
      const { a, b } = complete.combo
      const kcal = a.kcal + b.kcal
      comboText = `💡 Idea: ${a.title} + ${b.title} (≈ ${round(kcal)} kcal, +${round((a.protein || 0) + (b.protein || 0))} g de proteína) y llegas a tu objetivo.`
    }
  } else {
    note = {
      nogoals: 'Configura tus objetivos en el perfil para recibir sugerencias.',
      done: '🎉 Tu día está completo: ya has llegado a tu objetivo de kcal.',
      nodata: 'Añade los macros por ración a tus recetas (kcal, proteína…) y aquí saldrán las que completan tu día.',
      nofit: 'Te quedan pocas kcal: cabe algo ligero, como una fruta o un yogur.',
    }[complete.state]
  }

  const open = picks.find(p => p.r.id === openId)
  const pill = key => ({ padding: '6px 12px', borderRadius: 20, border: mode === key ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: mode === key ? C.accent : C.white, color: mode === key ? '#fff' : C.muted, fontSize: 11, fontWeight: 700 })
  const arrow = { border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 16, width: 26, height: 26, cursor: 'pointer', fontSize: 14, lineHeight: 1 }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={() => { setMode('hoy'); setOpenId(null) }} style={pill('hoy')}>✨ Para hoy</button>
        <button onClick={() => { setMode('completa'); setOpenId(null) }} style={pill('completa')}>🎯 Completa tu día</button>
        <div style={{ flex: 1 }} />
        {picks.length > 1 && (
          <>
            <button onClick={() => scroller.current && scroller.current.scrollBy({ left: -CARD_W - 10, behavior: 'smooth' })} style={arrow} aria-label="Anterior">‹</button>
            <button onClick={() => scroller.current && scroller.current.scrollBy({ left: CARD_W + 10, behavior: 'smooth' })} style={arrow} aria-label="Siguiente">›</button>
          </>
        )}
      </div>

      {note && <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>{note}</div>}
      {comboText && <div style={{ background: C.accentLight, borderRadius: 10, padding: '8px 10px', fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>{comboText}</div>}

      {picks.length > 0 && (
        <div ref={scroller} style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 6 }}>
          {picks.map(({ r, tag }) => {
            const [main, light] = pal[r.color] || pal.gray
            const nutri = nutritionText(r)
            const selected = openId === r.id
            return (
              <div key={r.id} onClick={() => setOpenId(selected ? null : r.id)}
                style={{ flex: `0 0 ${CARD_W}px`, scrollSnapAlign: 'start', background: C.white, borderRadius: 16, overflow: 'hidden', border: `${selected ? 2 : 1}px solid ${selected ? C.accent : C.border}`, cursor: 'pointer', boxSizing: 'border-box' }}>
                <div style={{ height: 96, background: r.image ? `center / cover no-repeat url("${r.image}")` : `linear-gradient(135deg, ${light}, ${main}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!r.image && <span style={{ fontSize: 40 }}>{emojiOf(r.title)}</span>}
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3, minHeight: 34, overflowWrap: 'anywhere' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{nutri || (r.badge || 'Sin macros')}</div>
                  {tag && <div style={{ fontSize: 10, color: main, fontWeight: 700, marginTop: 4, lineHeight: 1.3 }}>{tag}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 14, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{open.r.title}</div>
            <button onClick={() => setOpenId(null)} style={{ border: 'none', background: C.bg, color: C.muted, borderRadius: 10, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cerrar</button>
          </div>
          <RecipeDetail r={open.r} C={C} image={open.r.image} />
        </div>
      )}

      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Macros por ración, estimados (±10-15%).</div>
    </div>
  )
}
