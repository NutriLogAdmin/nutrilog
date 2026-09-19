// Cálculos de gasto energético y objetivos. Compartido por Onboarding (alta) y Perfil
// (recalcular más adelante): una sola fórmula, para que no diverjan.

export const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentario', desc: 'Poco o ningún ejercicio', factor: 1.2, emoji: '🛋️' },
  { key: 'light', label: 'Ligero', desc: '1-3 días/semana', factor: 1.375, emoji: '🚶' },
  { key: 'moderate', label: 'Moderado', desc: '3-5 días/semana', factor: 1.55, emoji: '🏃' },
  { key: 'active', label: 'Activo', desc: '6-7 días/semana', factor: 1.725, emoji: '💪' },
  { key: 'very_active', label: 'Muy activo', desc: 'Ejercicio intenso diario', factor: 1.9, emoji: '🏋️' },
]

export const GOAL_TYPES = [
  { key: 'deficit', label: 'Pérdida de peso', desc: 'Déficit calórico del 20%', emoji: '🔥', deficit: 0.20 },
  { key: 'recomp', label: 'Recomposición', desc: 'Perder grasa + definición', emoji: '💪', deficit: 0.15 },
  { key: 'maintenance', label: 'Mantenimiento', desc: 'Mantener peso actual', emoji: '⚖️', deficit: 0 },
  { key: 'bulk', label: 'Volumen', desc: 'Ganar músculo', emoji: '🏋️', deficit: -0.10 },
]

// Metabolismo basal (Mifflin-St Jeor)
export function calcBMR(weight, height, age = 30, gender = 'male') {
  return gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161
}

export function calcTDEE(weight, height, age = 30, gender = 'male', activityFactor) {
  return Math.round(calcBMR(weight, height, age, gender) * activityFactor)
}

export function calcMacros(kcal, weight, goalType) {
  // Proteína: 2g por kg de peso corporal para recomposición/deficit, 1.8g para volumen
  const proteinPerKg = goalType === 'bulk' ? 1.8 : 2.0
  const protein = Math.round(weight * proteinPerKg)
  const proteinKcal = protein * 4

  // Grasas: 25% de las calorías totales
  const fatKcal = kcal * 0.25
  const fat = Math.round(fatKcal / 9)
  const satfat = Math.round(fat * 0.4) // 40% de la grasa total como saturada máximo

  // Hidratos: resto de calorías
  const carbsKcal = kcal - proteinKcal - fatKcal
  const carbs = Math.round(carbsKcal / 4)

  // Azúcar: 10% de las kcal en gramos (límite general de la OMS), con un techo de 40g
  // inspirado en el límite cardiovascular de la American Heart Association (36g en hombres,
  // 25g en mujeres) — más conservador que el 10% de la OMS a partir de dietas de ~1600 kcal.
  const sugar = Math.round(Math.min(kcal * 0.10 / 4, 40))

  return {
    goal_kcal: kcal,
    goal_protein: protein,
    goal_carbs: Math.max(0, carbs),
    goal_satfat: satfat,
    goal_salt: goalType === 'deficit' || goalType === 'recomp' ? 4 : 5,
    goal_fiber: 30,
    goal_sugar: sugar,
  }
}

export function calcBMI(weight, heightCm) {
  return weight / Math.pow(heightCm / 100, 2)
}

// Categorías de la OMS para adultos
export function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Bajo peso'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Sobrepeso'
  return 'Obesidad'
}
