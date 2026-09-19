// Recomendaciones de recetas para el carrusel de Registro. Funciones puras (sin React ni red).
// Los macros de cada receta son POR RACIÓN y estimados; `goals` y `consumed` usan las mismas
// claves que las recetas: kcal, protein, carbs, satfat, sugar, fiber, salt.

const COVER = { protein: 1.5, carbs: 1, fiber: 0.7 } // peso de cada macro «a completar»
const LIMITS = ['satfat', 'sugar', 'salt'] // macros con tope diario: no conviene pasarse

function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Generador pseudoaleatorio con semilla (mulberry32): la misma semilla da siempre el mismo orden.
function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Recomendaciones generales: un orden distinto cada día, igual para todo el día.
export function generalPicks(recipes, dateStr, n = 6) {
  const random = rng(hashString(dateStr))
  const list = [...recipes]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list.slice(0, n)
}

export function remainingOf(consumed, goals) {
  const rem = {}
  for (const k of ['kcal', 'protein', 'carbs', 'fiber', ...LIMITS]) rem[k] = (goals[k] || 0) - (consumed[k] || 0)
  return rem
}

// Puntuación de una receta (o de un par) para «completar el día»: cuánto cubre de lo que falta
// sin pasarse de kcal, con un pequeño premio por llenar las kcal restantes y castigo si se
// pasa de los topes (grasas saturadas, azúcar, sal).
function scoreItems(items, rem, goals) {
  const sum = k => items.reduce((a, r) => a + (r[k] || 0), 0)
  const kcal = sum('kcal')
  if (kcal > rem.kcal * 1.08 + 20) return -Infinity
  let cover = 0
  for (const k of Object.keys(COVER)) if (goals[k] > 0) cover += COVER[k] * Math.min(sum(k), Math.max(rem[k], 0)) / goals[k]
  const fill = Math.min(kcal, rem.kcal) / rem.kcal
  let over = 0
  for (const k of LIMITS) if (goals[k] > 0) over += Math.max(0, sum(k) - Math.max(rem[k], 0)) / goals[k]
  return cover + 0.5 * fill - 1.5 * over
}

// state: 'nogoals' | 'done' (día completo) | 'nodata' (ninguna receta con macros) |
//        'nofit' (ninguna cabe en las kcal que quedan) | 'ok'
export function completePicks(recipes, consumed, goals, n = 6) {
  if (!goals || !goals.kcal) return { state: 'nogoals' }
  const rem = remainingOf(consumed, goals)
  if (rem.kcal < 120) return { state: 'done', rem }
  const withData = recipes.filter(r => r.kcal != null)
  if (withData.length === 0) return { state: 'nodata', rem }
  const singles = withData.map(r => ({ r, s: scoreItems([r], rem, goals) })).filter(x => x.s > -Infinity).sort((a, b) => b.s - a.s)
  if (singles.length === 0) return { state: 'nofit', rem }
  // Con muchas kcal por cubrir, una receta sola suele quedarse corta: se busca la mejor pareja.
  let combo = null
  if (rem.kcal >= 450) {
    const top = singles.slice(0, 10)
    let best = singles[0].s + 0.1
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        const s = scoreItems([top[i].r, top[j].r], rem, goals)
        if (s > best) { best = s; combo = { a: top[i].r, b: top[j].r } }
      }
    }
  }
  return { state: 'ok', rem, singles: singles.slice(0, n), combo }
}
