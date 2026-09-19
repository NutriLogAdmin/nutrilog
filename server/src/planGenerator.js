// Generador de las comidas de un mes a partir de los platos de un usuario.
// Función pura (sin base de datos ni reloj) para poder razonar sobre ella y probarla aislada.

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MAIN_KINDS = ['legumbre', 'pasta', 'arroz', 'huevo', 'pescado', 'carne']
const SIDE_KINDS = ['verdura', 'ensalada', 'crema']
const ALL_KINDS = [...MAIN_KINDS, ...SIDE_KINDS, 'siempre']
// Platos de cuchara: como mucho uno por día (comida + cena), para no juntar p. ej. lentejas
// con crema de calabaza.
const CUCHARA = ['legumbre', 'crema']
// Máximo de veces por semana que un tipo de plato principal puede repetirse en una comida.
const WEEK_MAX = { legumbre: 3, pasta: 2, arroz: 2, huevo: 2, pescado: 3, carne: 3 }

const DAY_TITLE_RE = /^[^\p{L}]*(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/u

// Semanas del mes: bloques de 7 días desde el lunes en/antes del día 1, 4 o 5.
// Debe coincidir con planWeeks() de client/src/MiPlan.jsx.
function weeksInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  const since = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const days = new Date(y, m, 0).getDate()
  return Math.min(5, Math.max(4, Math.ceil((since + days) / 7)))
}

function weekdayOf(title) {
  const m = DAY_TITLE_RE.exec(title || '')
  return m ? m[1] : null
}

function labelOf(line, fallback) {
  const i = line.indexOf(': ')
  return i > 0 ? line.slice(0, i) : (line.trim() || fallback)
}

// previous: { s1: [tarjetas], s2: [...] } — el plan actual, del que se hereda la estructura
// (títulos de día, comidas fijas). random: inyectable para las pruebas.
function generatePlan({ dishes, previous, weeks, random = Math.random }) {
  const pool = {}
  for (const meal of ['comida', 'cena']) {
    pool[meal] = {
      mains: dishes.filter(d => d.meal === meal && MAIN_KINDS.includes(d.kind)),
      sides: dishes.filter(d => d.meal === meal && SIDE_KINDS.includes(d.kind)),
      always: dishes.filter(d => d.meal === meal && d.kind === 'siempre'),
    }
  }
  const state = { lastUsed: new Map(), uses: new Map(), dayIdx: 0 }

  function choose(cands, { isMain, meal, dayState, weekCount }) {
    const list = cands.filter(d => !(dayState.cuchara && CUCHARA.includes(d.kind)))
    if (!list.length) return null
    const gap = Math.max(1, Math.min(4, Math.floor(cands.length / 2)))
    // Filtros blandos, de más a menos importante: si no queda ningún plato se van soltando
    // desde el último, así siempre sale algo aunque la lista sea corta.
    const soft = [
      d => !isMain || (weekCount[`${meal}:${d.kind}`] || 0) < (WEEK_MAX[d.kind] ?? 99),
      d => !isMain || !dayState.kinds.has(d.kind),
      d => state.dayIdx - (state.lastUsed.has(d.id) ? state.lastUsed.get(d.id) : -99) >= gap,
    ]
    let filtered = list
    for (let n = soft.length; n >= 0; n--) {
      const f = list.filter(d => soft.slice(0, n).every(fn => fn(d)))
      if (f.length) { filtered = f; break }
    }
    // Se elige al azar entre los platos poco usados en el mes (los que llevan como mucho una
    // vez más que el que menos): variedad sin desequilibrar, también con listas cortas.
    const scored = filtered.map(d => ({ d, u: state.uses.get(d.id) || 0, r: random() })).sort((a, b) => a.u - b.u || a.r - b.r)
    const top = scored.filter(x => x.u <= scored[0].u + 1)
    const pick = top[Math.floor(random() * top.length)].d
    state.lastUsed.set(pick.id, state.dayIdx)
    state.uses.set(pick.id, (state.uses.get(pick.id) || 0) + 1)
    if (isMain) {
      weekCount[`${meal}:${pick.kind}`] = (weekCount[`${meal}:${pick.kind}`] || 0) + 1
      dayState.kinds.add(pick.kind)
    }
    if (CUCHARA.includes(pick.kind)) dayState.cuchara = true
    return pick
  }

  function generateMeal(meal, ctx) {
    const p = pool[meal]
    const main = choose(p.mains, { ...ctx, meal, isMain: true })
    const side = choose(p.sides, { ...ctx, meal, isMain: false })
    const parts = [side, main].filter(Boolean).map(d => d.name)
    if (!parts.length) return null
    return [...parts, ...p.always.map(d => d.name)].join(' · ')
  }

  const out = {}
  for (let w = 1; w <= weeks; w++) {
    const template = previous['s' + w] || previous['s' + (w - 1)] || previous.s1 || []
    const cards = []
    // Comidas fijas de la semana («Desayuno todos los días…»). Las notas y objetivos propios
    // de un mes concreto no se copian: quedarían desfasados.
    for (const c of template) {
      if (!weekdayOf(c.title) && /todos los días/i.test(c.title)) cards.push({ color: c.color, time_label: c.time_label || '', title: c.title, body: c.body || '' })
    }
    const weekCount = {}
    for (const day of WEEKDAYS) {
      const base = template.find(c => weekdayOf(c.title) === day) || (previous.s1 || []).find(c => weekdayOf(c.title) === day) || null
      const ctx = { dayState: { cuchara: false, kinds: new Set() }, weekCount }
      const lines = []
      let hasComida = false
      let hasCena = false
      let skipContinuation = false
      for (const line of base ? (base.body || '').split('\n') : []) {
        if (line.startsWith('↳')) { if (!skipContinuation) lines.push(line); continue }
        skipContinuation = false
        if (/^Comida\b/.test(line)) {
          hasComida = true
          if (line.includes('🎉')) { lines.push(line); continue }
          const text = generateMeal('comida', ctx)
          lines.push(text ? `${labelOf(line, 'Comida')}: ${text}` : line)
          skipContinuation = !!text
        } else if (/^Cena\b/.test(line)) {
          hasCena = true
          const text = generateMeal('cena', ctx)
          lines.push(text ? `${labelOf(line, 'Cena')}: ${text}` : line)
          skipContinuation = !!text
        } else {
          lines.push(line)
        }
      }
      if (!hasComida) { const t = generateMeal('comida', ctx); if (t) lines.push(`Comida: ${t}`) }
      if (!hasCena) { const t = generateMeal('cena', ctx); if (t) lines.push(`Cena: ${t}`) }
      cards.push({
        color: base ? base.color : (day === 'Sábado' ? 'purple' : day === 'Domingo' ? 'blue' : 'green'),
        time_label: '',
        title: base ? base.title : day,
        body: lines.join('\n'),
      })
      state.dayIdx++
    }
    out['s' + w] = cards
  }
  return out
}

module.exports = { generatePlan, weeksInMonth, WEEKDAYS, MAIN_KINDS, SIDE_KINDS, ALL_KINDS }
