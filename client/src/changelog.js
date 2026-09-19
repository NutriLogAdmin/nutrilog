// Novedades que se muestran al usuario al iniciar sesión tras un despliegue.
//
// Al subir un cambio que quieras anunciar: añade una entrada NUEVA al principio de
// CHANGELOG, con una versión mayor que la anterior (1.0.0 -> 1.1.0 -> 1.2.0...).
// Si no añades entrada, simplemente no sale pop-up: nada se rompe.

export const CHANGELOG = [
  {
    version: '1.20.0',
    date: '2026-09-19',
    changes: [
      'Nuevo carrusel de recetas en la pantalla principal: "Para hoy" con ideas distintas cada día y "Completa tu día", que detecta qué te falta (kcal, proteína, fibra) y te propone recetas para llegar a tu objetivo sin pasarte.',
      'Las recetas ahora pueden llevar foto y macros por ración (estimados).',
    ],
  },
  {
    version: '1.19.0',
    date: '2026-09-19',
    changes: [
      'Nueva pestaña "🧍 Mis datos" en tu perfil: peso, altura, edad, sexo, nivel de actividad y objetivo, con tu IMC y tu gasto diario calculados. Puedes recalcular tus kcal y macros cuando cambien tus datos.',
      'Arreglado: al guardar tus objetivos desde el perfil se borraban tu peso, altura y nivel de actividad. Si te pasó, vuelve a poner tus datos en "Mis datos".',
    ],
  },
  {
    version: '1.18.0',
    date: '2026-09-19',
    changes: [
      'Nuevo botón "🔄 Rota los platos" en Mi Plan: cuando empieza un mes nuevo, la app arma tus semanas con tus platos, sin repetir y sin juntar dos platos de cuchara el mismo día.',
      'Nueva pastilla "🍽️ Mis platos" en Mi Plan para añadir tus propios platos a la rotación.',
      'Tu objetivo diario (kcal y macros) aparece ahora arriba de la pantalla principal.',
    ],
  },
  {
    version: '1.17.0',
    date: '2026-09-19',
    changes: [
      'Nuevos temas de color: pulsa el botón 🎨 de la cabecera y elige entre Naranja, Océano, Bosque, Uva, Rosa, Café y Grafito. Funcionan tanto en modo claro como oscuro.',
    ],
  },
  {
    version: '1.16.0',
    date: '2026-09-19',
    changes: [
      'Nueva pestaña "📋 Mi Plan": las comidas de cada día, organizadas por semanas del mes (S1, S2, S3…). Las creas y editas tú, y la semana actual sale marcada.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-09-19',
    changes: [
      'Recetas tiene ahora una subpestaña "⚖️ Cantidades" donde apuntas las cantidades recomendadas de cada ingrediente.',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-09-19',
    changes: [
      'Entreno ahora tiene subpestañas: Registro, Ejercicio, Pesas, Piernas, Tabla y (si los tomas) Suplementos, con tus propias rutinas y notas.',
      'Nueva pestaña "📈 Progreso": apunta tu peso y medidas cuando quieras y ve tu cambio de peso, IMC y evolución calculados automáticamente.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-09-19',
    changes: [
      'Las recetas ahora pueden llevar sus macros (kcal, proteína, hidratos…) y se ven al abrir cada receta.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-09-19',
    changes: [
      'Nueva pestaña "🍳 Recetas": consulta recetas paso a paso y sube las tuyas. Puedes compartirlas con los demás usuarios o dejarlas solo para ti.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-09-19',
    changes: [
      'Nueva pestaña "🛒 Compra": tu lista de la compra por categorías, con casillas para marcar lo que ya tienes. Se guarda y la editas tú.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-09-19',
    changes: [
      'Nueva pestaña "💡 Consejos": qué hacer cuando te entra ansiedad por comer, y tu propio horario de comidas (lo creas y editas tú).',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-09-13',
    changes: [
      'Arreglado: el PDF diario ("📄 Día") ya incluye tu actividad física, igual que el semanal.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-09-13',
    changes: [
      'Nuevo "📊 Resumen de la sesión" en Torso/Piernas/Core: kilocalorías activas/totales, frecuencia cardíaca media y esfuerzo (1-10) de todo el entrenamiento, en vez de repetirlo en cada ejercicio.',
      'En Cardio (Elíptica, Andar...) esos mismos datos, más intervalo, se anotan en el propio ejercicio.',
      'Si el ejercicio se llama "Andar", además puedes anotar distancia, ritmo medio y desnivel.',
      'Añadido "Abdominales" como sugerencia rápida también en Torso y Piernas.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-09-13',
    changes: [
      'Nueva pestaña "🏋️ Entreno" para registrar lo que entrenas cada día (fuerza, piernas, core o cardio).',
      'El PDF semanal ahora incluye tu actividad física de la semana.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-09-13',
    changes: [
      'Nuevo enlace "¿Has olvidado tu contraseña?" en el login.',
      'El registro ya no admite un correo electrónico como nombre de usuario.',
    ],
  },
  {
    version: '1.5.2',
    date: '2026-09-12',
    changes: [
      'Arreglado un margen blanco que se quedaba pegado a un lado en móvil al usar los formularios.',
      'Quitada la línea del mes bajo el saludo (quedaba redundante con la tira de días).',
      'Los días de la tira ahora son cuadraditos con borde, no círculos.',
    ],
  },
  {
    version: '1.5.1',
    date: '2026-09-12',
    changes: [
      'Quitada la fecha duplicada de la cabecera (ahora solo mes y año; el día ya lo marca la tira de días).',
      'Cada anillo de macro vuelve a mostrar el objetivo exacto y lo que queda.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-09-12',
    changes: [
      'Nueva cabecera con saludo y una tira de días de la semana para cambiar de fecha con un toque, con el día de hoy siempre marcado.',
      'Los macros (proteína, hidratos, grasas, sal, fibra, azúcar) ahora se ven como anillos de progreso en vez de barras.',
    ],
  },
  {
    version: '1.4.1',
    date: '2026-09-12',
    changes: [
      'Ajustado el tamaño de los números en las tarjetas de macros: con las 6 tarjetas se veían demasiado grandes.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-09-12',
    changes: [
      'Nueva tarjeta de objetivo de azúcar, con un límite basado en las recomendaciones de la OMS y la American Heart Association (editable en Mi Perfil).',
      'Fibra ahora se ve como una tarjeta más, igual que el resto de objetivos.',
    ],
  },
  {
    version: '1.3.1',
    date: '2026-09-12',
    changes: [
      'Arreglado el anillo de kcal en móvil: el trazo se salía de la caja por el cambio de tamaño anterior.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-09-12',
    changes: [
      'Arreglado el diseño en móvil: ya no se puede mover la pantalla hacia los lados, solo hacia arriba y abajo.',
      'La fecha de la cabecera queda alineada con el título "NutriLog".',
      'Los botones de la cabecera (Día, Semana, tema, Salir) se ordenan bien en cualquier tamaño de pantalla.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-09-12',
    changes: [
      'El escáner de etiquetas ahora usa IA en vez de OCR clásico: lee mucho mejor la tabla nutricional y también adivina el nombre y la categoría del producto.',
      'El tema (claro/oscuro) sigue automáticamente el de tu móvil u ordenador; el botón para cambiarlo a mano ahora también está en la pantalla de inicio de sesión.',
      'Añadido el aviso de copyright en la pantalla de inicio de sesión.',
    ],
  },
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
