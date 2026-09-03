// Novedades que se muestran al usuario al iniciar sesión tras un despliegue.
//
// Al subir un cambio que quieras anunciar: añade una entrada NUEVA al principio de
// CHANGELOG, con una versión mayor que la anterior (1.0.0 -> 1.1.0 -> 1.2.0...).
// Si no añades entrada, simplemente no sale pop-up: nada se rompe.

export const CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-09-03',
    changes: [
      'Al registrarte se te confirma que la cuenta se ha creado.',
      'El registro pide una contraseña mínima: 8 caracteres, con al menos una letra y un número.',
      'Puedes crear un alimento nuevo desde la pantalla de añadir a una comida, sin ir al catálogo.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-03',
    changes: [
      'La aplicación ahora se ve bien en pantallas de ordenador, no solo en el móvil.',
      'El objetivo de kcal de la pantalla principal y del PDF respeta el que fijaste en tu perfil (antes se quedaba en 2500).',
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0].version

// Compara "1.2.0" con "1.10.3" tramo a tramo, numéricamente.
export function isNewerVersion(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (x !== y) return x > y
  }
  return false
}

// Entradas que el usuario todavía no ha visto.
// Sin versión guardada = primera vez con esta función: se muestran las actuales una vez.
export function unseenEntries(seenVersion) {
  if (!seenVersion) return CHANGELOG
  return CHANGELOG.filter(e => isNewerVersion(e.version, seenVersion))
}
