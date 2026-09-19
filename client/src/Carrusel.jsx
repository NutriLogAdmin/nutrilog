import { useState, useEffect } from 'react'
import { palette } from './Consejos'
import { RecipeDetail, emojiOf, nutritionText } from './Recetas'
import { generalPicks, completePicks } from './recommend'

const ROTATE_MS = 7000

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const round = n => Math.round(n)

// Carrusel de recetas de Registro: una tarjeta a la vez que rota sola cada pocos segundos, sin
// scroll. «Para hoy» (un surtido distinto cada día) y «Completa tu día» (recetas que cubren lo
// que aún falta de tus objetivos sin pasarse de kcal). `consumed` y `goals` son los totales del
// día y los objetivos del usuario.
export default function Carrusel({ API, getHeaders, C, consumed, goals }) {
  const [recipes, setRecipes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState('hoy')
  const [idx, setIdx] = useState(0)
  const [openId, setOpenId] = useState(null)
  const [hover, setHover] = useState(false)
  const [interaction, setInteraction] = useState(0) // cambia con cada gesto manual: reinicia la cuenta atrás
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
      comboText = `💡 Idea: ${a.title} + ${b.title} (≈ ${round(a.kcal + b.kcal)} kcal, +${round((a.protein || 0) + (b.protein || 0))} g de proteína) y llegas a tu objetivo.`
    }
  } else {
    note = {
      nogoals: 'Configura tus objetivos en el perfil para recibir sugerencias.',
      done: '🎉 Tu día está completo: ya has llegado a tu objetivo de kcal.',
      nodata: 'Añade los macros por ración a tus recetas (kcal, proteína…) y aquí saldrán las que completan tu día.',
      nofit: 'Te quedan pocas kcal: cabe algo ligero, como una fruta o un yogur.',
    }[complete.state]
  }

  const n = picks.length
  const current = n ? idx % n : 0
  const paused = hover || openId !== null

  // Cambia de tarjeta sola. Se detiene con el ratón encima o con una receta abierta, y cada
  // gesto manual reinicia la espera para no saltar justo después de que el usuario elija.
  useEffect(() => {
    if (n < 2 || paused) return undefined
    const t = setInterval(() => setIdx(i => (i + 1) % n), ROTATE_MS)
    return () => clearInterval(t)
  }, [n, paused, interaction])

  if (!loaded || recipes.length === 0) return null

  function go(delta) {
    setIdx((current + delta + n) % n)
    setOpenId(null)
    setInteraction(x => x + 1)
  }
  function changeMode(m) {
    setMode(m)
    setIdx(0)
    setOpenId(null)
    setInteraction(x => x + 1)
  }

  const pick = n ? picks[current] : null
  const r = pick ? pick.r : null
  const [main, light] = r ? (pal[r.color] || pal.gray) : [C.accent, C.accentLight]
  const pill = key => ({ padding: '6px 12px', borderRadius: 20, border: mode === key ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: mode === key ? C.accent : C.white, color: mode === key ? '#fff' : C.muted, fontSize: 11, fontWeight: 700 })
  const arrow = { border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 16, width: 28, height: 28, cursor: 'pointer', fontSize: 15, lineHeight: 1, flexShrink: 0 }

  return (
    <div style={{ marginBottom: 12 }}
      onPointerEnter={e => { if (e.pointerType === 'mouse') setHover(true) }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') setHover(false) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={() => changeMode('hoy')} style={pill('hoy')}>✨ Sugerencia para hoy</button>
        <button onClick={() => changeMode('completa')} style={pill('completa')}>🎯 Completa tu día</button>
      </div>

      {note && <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>{note}</div>}
      {comboText && <div style={{ background: C.accentLight, borderRadius: 10, padding: '8px 10px', fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>{comboText}</div>}

      {r && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {n > 1 && <button onClick={() => go(-1)} style={arrow} aria-label="Anterior">‹</button>}
          <div key={r.id} className="nl-slide" onClick={() => setOpenId(openId === r.id ? null : r.id)}
            style={{ flex: 1, minWidth: 0, background: C.white, borderRadius: 16, overflow: 'hidden', border: `${openId === r.id ? 2 : 1}px solid ${openId === r.id ? C.accent : C.border}`, cursor: 'pointer', animation: 'nl-slide-in 0.45s ease' }}>
            <div style={{ aspectRatio: '16 / 10', background: r.image ? `center / cover no-repeat url("${r.image}")` : `linear-gradient(135deg, ${light}, ${main}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!r.image && <span style={{ fontSize: 52 }}>{emojiOf(r.title)}</span>}
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{r.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{nutritionText(r) || r.badge || 'Sin macros'}</div>
              {pick.tag && <div style={{ fontSize: 11, color: main, fontWeight: 700, marginTop: 4, lineHeight: 1.3 }}>{pick.tag}</div>}
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{openId === r.id ? 'Toca para cerrar' : 'Toca para ver la receta'}</div>
            </div>
          </div>
          {n > 1 && <button onClick={() => go(1)} style={arrow} aria-label="Siguiente">›</button>}
        </div>
      )}

      {n > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {picks.map((p, i) => (
            <button key={p.r.id} onClick={() => { setIdx(i); setOpenId(null); setInteraction(x => x + 1) }} aria-label={`Ir a la receta ${i + 1}`}
              style={{ width: i === current ? 18 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0, cursor: 'pointer', background: i === current ? C.accent : C.border, transition: 'all 0.3s' }} />
          ))}
        </div>
      )}

      {r && openId === r.id && (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 14, marginTop: 8 }}>
          <RecipeDetail r={r} C={C} image={r.image} />
        </div>
      )}

      <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>Macros por ración, estimados (±10-15%).</div>
    </div>
  )
}
