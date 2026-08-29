import { jsPDF } from 'jspdf'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'
const MACRO_GOALS = { protein: 155, carbs: 280, satfat: 15, salt: 5, fiber: 30 }

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('nutrilog_token')}`
  }
}

function round(n) { return Math.round((n + Number.EPSILON) * 10) / 10 }
function calcFactor(amount) { return amount / 100 }

function formatDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const MEALS = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'almuerzo', label: 'Almuerzo' },
  { key: 'comida', label: 'Comida' },
  { key: 'merienda', label: 'Merienda' },
  { key: 'cena', label: 'Cena' },
]

async function fetchEntries(date) {
  const res = await fetch(`${API}/foods/entries?date=${date}`, { headers: getHeaders() })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function fetchGoal(date) {
  const res = await fetch(`${API}/foods/goal?date=${date}`, { headers: getHeaders() })
  const data = await res.json()
  return data.kcal_goal || 2500
}

function calcTotals(entries) {
  return entries.reduce((acc, e) => {
    const f = calcFactor(e.amount)
    acc.kcal += e.kcal100 * f
    acc.protein += e.protein100 * f
    acc.satfat += e.satfat100 * f
    acc.carbs += e.carbs100 * f
    acc.sugar += e.sugar100 * f
    acc.fiber += e.fiber100 * f
    acc.salt += e.salt100 * f
    return acc
  }, { kcal: 0, protein: 0, satfat: 0, carbs: 0, sugar: 0, fiber: 0, salt: 0 })
}

function addHeader(doc, title, subtitle) {
  doc.setFillColor(255, 107, 53)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('NutriLog', 14, 10)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 17)
  doc.setTextColor(50, 50, 50)
  return 30
}

function addMacroRow(doc, label, value, goal, unit, y) {
  const pct = Math.min(100, (value / goal) * 100)
  const over = value > goal
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(label, 14, y)
  doc.setTextColor(over ? 200 : 50, over ? 50 : 100, 50)
  doc.setFont('helvetica', 'bold')
  doc.text(`${round(value)}${unit}`, 70, y)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text(`/ ${goal}${unit}`, 90, y)
  // Barra de progreso
  doc.setFillColor(230, 230, 230)
  doc.roundedRect(115, y - 3.5, 70, 4, 1, 1, 'F')
  doc.setFillColor(over ? 220 : 255, over ? 80 : 107, over ? 80 : 53)
  doc.roundedRect(115, y - 3.5, Math.max(1, 70 * pct / 100), 4, 1, 1, 'F')
  doc.setTextColor(50, 50, 50)
  return y + 8
}

export async function exportDayPDF(date, username) {
  const [entries, goal] = await Promise.all([fetchEntries(date), fetchGoal(date)])
  const totals = calcTotals(entries)
  const doc = new jsPDF()

  let y = addHeader(doc, `Informe diario — ${formatDate(date)}`, '')

  // Resumen calórico
  doc.setFillColor(255, 245, 240)
  doc.roundedRect(14, y, 182, 22, 3, 3, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 107, 53)
  doc.text(`${round(totals.kcal)} kcal`, 20, y + 8)
  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`consumidas de ${goal} kcal objetivo`, 20, y + 15)
  const remaining = round(goal - totals.kcal)
  const over = totals.kcal > goal
  doc.setTextColor(over ? 200 : 34, over ? 50 : 197, over ? 50 : 94)
  doc.setFont('helvetica', 'bold')
  doc.text(over ? `${Math.abs(remaining)} kcal por encima` : `${remaining} kcal restantes`, 130, y + 11)
  y += 28

  // Macros
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text('Macronutrientes', 14, y)
  y += 6
  doc.setDrawColor(230, 230, 230)
  doc.line(14, y, 196, y)
  y += 6

  y = addMacroRow(doc, 'Proteína', totals.protein, MACRO_GOALS.protein, 'g', y)
  y = addMacroRow(doc, 'Hidratos de carbono', totals.carbs, MACRO_GOALS.carbs, 'g', y)
  y = addMacroRow(doc, 'Grasas saturadas', totals.satfat, MACRO_GOALS.satfat, 'g', y)
  y = addMacroRow(doc, 'Sal', totals.salt, MACRO_GOALS.salt, 'g', y)
  y = addMacroRow(doc, 'Fibra', totals.fiber, MACRO_GOALS.fiber, 'g', y)
  y = addMacroRow(doc, 'Azúcares', totals.sugar, 50, 'g', y)
  y += 6

  // Entradas por comida
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text('Registro por comidas', 14, y)
  y += 6
  doc.line(14, y, 196, y)
  y += 4

  for (const meal of MEALS) {
    const mealEntries = entries.filter(e => (e.meal || 'comida') === meal.key)
    if (mealEntries.length === 0) continue

    const mealKcal = mealEntries.reduce((sum, e) => sum + e.kcal100 * calcFactor(e.amount), 0)

    if (y > 260) { doc.addPage(); y = 20 }

    doc.setFillColor(255, 245, 240)
    doc.rect(14, y, 182, 7, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 107, 53)
    doc.text(meal.label, 16, y + 5)
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    doc.text(`${round(mealKcal)} kcal`, 170, y + 5)
    y += 9

    for (const e of mealEntries) {
      if (y > 270) { doc.addPage(); y = 20 }
      const f = e.amount / 100
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      doc.text(`${e.name}`, 18, y)
      doc.setTextColor(120, 120, 120)
      doc.text(`${e.amount}${e.unit}`, 100, y)
      doc.text(`P:${round(e.protein100*f)}g  H:${round(e.carbs100*f)}g  Sal:${round(e.salt100*f)}g`, 120, y)
      doc.setTextColor(255, 107, 53)
      doc.setFont('helvetica', 'bold')
      doc.text(`${round(e.kcal100 * f)} kcal`, 175, y)
      y += 6
    }
    y += 2
  }

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(180, 180, 180)
  doc.setFont('helvetica', 'normal')
  doc.text(`NutriLog · ${username} · Generado el ${new Date().toLocaleDateString('es-ES')}`, 14, 290)
  doc.text('© NutriLog · Todos los derechos reservados · Desarrollado por Daniel Ambrosio', 14, 294)

  doc.save(`nutrilog_${date}.pdf`)
}

export async function exportWeekPDF(username) {
  const dates = Array.from({ length: 7 }, (_, i) => daysAgoISO(6 - i))
  const goal = await fetchGoal(dates[6])

  const weekData = await Promise.all(dates.map(async date => {
    const entries = await fetchEntries(date)
    return { date, entries, totals: calcTotals(entries) }
  }))

  const doc = new jsPDF()
  let y = addHeader(doc, `Informe semanal — ${formatDate(dates[0])} al ${formatDate(dates[6])}`, '')

  // Totales semanales
  const weekTotals = weekData.reduce((acc, d) => {
    acc.kcal += d.totals.kcal
    acc.protein += d.totals.protein
    acc.carbs += d.totals.carbs
    acc.satfat += d.totals.satfat
    acc.salt += d.totals.salt
    acc.fiber += d.totals.fiber
    return acc
  }, { kcal: 0, protein: 0, carbs: 0, satfat: 0, salt: 0, fiber: 0 })

  const avgKcal = weekTotals.kcal / 7

  doc.setFillColor(255, 245, 240)
  doc.roundedRect(14, y, 182, 22, 3, 3, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 107, 53)
  doc.text(`${round(weekTotals.kcal)} kcal`, 20, y + 8)
  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`total semanal · Media: ${round(avgKcal)} kcal/día · Objetivo: ${goal} kcal/día`, 20, y + 15)
  y += 28

  // Tabla de días
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text('Calorías por día', 14, y)
  y += 6
  doc.setDrawColor(230, 230, 230)
  doc.line(14, y, 196, y)
  y += 6

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  for (const { date, totals } of weekData) {
    if (y > 260) { doc.addPage(); y = 20 }
    const d = new Date(date + 'T00:00:00')
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
    const pct = Math.min(100, (totals.kcal / goal) * 100)
    const over = totals.kcal > goal

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text(`${dayName} ${formatDate(date)}`, 14, y)
    doc.setTextColor(over ? 200 : 50, over ? 50 : 50, 50)
    doc.text(`${round(totals.kcal)} kcal`, 70, y)
    doc.setFillColor(230, 230, 230)
    doc.roundedRect(100, y - 3.5, 80, 4, 1, 1, 'F')
    doc.setFillColor(over ? 220 : 255, over ? 80 : 107, over ? 80 : 53)
    doc.roundedRect(100, y - 3.5, Math.max(1, 80 * pct / 100), 4, 1, 1, 'F')
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    doc.text(over ? `+${round(totals.kcal - goal)}` : `-${round(goal - totals.kcal)}`, 185, y)
    y += 8
  }

  y += 4
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text('Resumen de macros semanal', 14, y)
  y += 6
  doc.line(14, y, 196, y)
  y += 6

  y = addMacroRow(doc, 'Proteína total', weekTotals.protein, MACRO_GOALS.protein * 7, 'g', y)
  y = addMacroRow(doc, 'Hidratos total', weekTotals.carbs, MACRO_GOALS.carbs * 7, 'g', y)
  y = addMacroRow(doc, 'Grasas saturadas total', weekTotals.satfat, MACRO_GOALS.satfat * 7, 'g', y)
  y = addMacroRow(doc, 'Sal total', weekTotals.salt, MACRO_GOALS.salt * 7, 'g', y)
  y = addMacroRow(doc, 'Fibra total', weekTotals.fiber, MACRO_GOALS.fiber * 7, 'g', y)

  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50, 50, 50)
  doc.text('Detalle por día', 14, y)
  y += 6
  doc.line(14, y, 196, y)
  y += 4

  for (const { date, entries, totals } of weekData) {
    if (entries.length === 0) continue
    if (y > 250) { doc.addPage(); y = 20 }

    doc.setFillColor(255, 245, 240)
    doc.rect(14, y, 182, 7, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 107, 53)
    doc.text(formatDate(date), 16, y + 5)
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    doc.text(`${round(totals.kcal)} kcal · P:${round(totals.protein)}g · H:${round(totals.carbs)}g · Sal:${round(totals.salt)}g`, 50, y + 5)
    y += 9

    for (const e of entries) {
      if (y > 270) { doc.addPage(); y = 20 }
      const f = e.amount / 100
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`${e.name}`, 18, y)
      doc.setTextColor(120, 120, 120)
      doc.text(`${e.amount}${e.unit}`, 110, y)
      doc.setTextColor(255, 107, 53)
      doc.setFont('helvetica', 'bold')
      doc.text(`${round(e.kcal100 * f)} kcal`, 175, y)
      y += 5
    }
    y += 3
  }

  doc.setFontSize(7)
  doc.setTextColor(180, 180, 180)
  doc.setFont('helvetica', 'normal')
  doc.text(`NutriLog · ${username} · Generado el ${new Date().toLocaleDateString('es-ES')}`, 14, 290)
  doc.text('© NutriLog · Todos los derechos reservados · Desarrollado por Daniel Ambrosio', 14, 294)

  doc.save(`nutrilog_semana_${dates[0]}_${dates[6]}.pdf`)
}
