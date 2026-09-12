import { useState, useRef } from 'react'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('nutrilog_token')}`
  }
}

const C = {
  bg: '#F7F7F5',
  white: '#FFFFFF',
  border: '#EBEBEB',
  text: '#1A1A1A',
  muted: '#888',
  accent: '#FF6B35',
  accentLight: '#FFF0EB',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  red: '#EF4444',
  redLight: '#FEF2F2',
}

const CATEGORIES = [
  { key: 'otros', label: '📦 Otros' },
  { key: 'frutas', label: '🍎 Frutas' },
  { key: 'verduras', label: '🥦 Verduras' },
  { key: 'carnes', label: '🥩 Carnes' },
  { key: 'pescados', label: '🐟 Pescados' },
  { key: 'lacteos', label: '🥛 Lácteos' },
  { key: 'cereales', label: '🌾 Cereales' },
  { key: 'legumbres', label: '🫘 Legumbres' },
  { key: 'bebidas', label: '🥤 Bebidas' },
  { key: 'snacks', label: '🍿 Snacks' },
  { key: 'salsas', label: '🫙 Salsas' },
]

// Reduce la foto a ~1024px de lado antes de mandarla: la IA no necesita más resolución
// para leer una etiqueta, y el coste de la llamada depende directamente del tamaño.
function resizeImage(file, maxSide = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > height && width > maxSide) {
        height = Math.round(height * maxSide / width)
        width = maxSide
      } else if (height > maxSide) {
        width = Math.round(width * maxSide / height)
        height = maxSide
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')) }
    img.src = url
  })
}

export default function OcrScanner({ onResult, onClose }) {
  const [status, setStatus] = useState('idle')
  const [preview, setPreview] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('otros')
  const [unit, setUnit] = useState('g')
  const [error, setError] = useState('')
  const fileRef = useRef()

  async function handleImage(file) {
    if (!file) return
    setError('')
    setExtracted(null)
    setStatus('processing')

    const url = URL.createObjectURL(file)
    setPreview(url)

    try {
      const { base64, mediaType } = await resizeImage(file)
      const res = await fetch(`${API}/foods/scan`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ image: base64, mediaType })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al analizar la etiqueta')

      setExtracted({
        kcal100: String(data.kcal100 ?? ''),
        protein100: String(data.protein100 ?? ''),
        carbs100: String(data.carbs100 ?? ''),
        sugar100: String(data.sugar100 ?? ''),
        satfat100: String(data.satfat100 ?? ''),
        fiber100: String(data.fiber100 ?? ''),
        salt100: String(data.salt100 ?? ''),
      })
      if (data.name) setName(data.name)
      if (data.category) setCategory(data.category)
      if (data.unit) setUnit(data.unit)
      setStatus('done')
    } catch (err) {
      setError(err.message || 'Error al procesar la imagen. Intenta con una foto más clara.')
      setStatus('idle')
    }
  }

  function handleConfirm() {
    if (!name.trim()) {
      setError('Escribe el nombre del alimento antes de continuar')
      return
    }
    setError('')
    if (extracted) onResult({ ...extracted, name, category, unit })
  }

  return (
    <div style={{ background: C.white, borderRadius: 20, padding: 16, border: `2px solid ${C.accent}`, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>📷 Escanear etiqueta con IA</div>
        <button onClick={onClose} style={{ border: 'none', background: C.accentLight, color: C.accent, borderRadius: 20, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✕ Cerrar</button>
      </div>

      {/* Nombre */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Nombre del alimento</div>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Ej: Leche semidesnatada Lidl"
          style={{ width: '100%', border: `1.5px solid ${name ? C.green : C.border}`, background: C.bg, color: C.text, padding: '10px 12px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
      </div>

      {/* Categoría y unidad */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Categoría</div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 8px', borderRadius: 10, fontSize: 12, height: 40 }}>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Unidad</div>
          <select value={unit} onChange={e => setUnit(e.target.value)}
            style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '10px 8px', borderRadius: 10, fontSize: 12, height: 40 }}>
            <option value="g">g (sólido)</option>
            <option value="ml">ml (líquido)</option>
          </select>
        </div>
      </div>

      {/* Botón cámara */}
      {status === 'idle' && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={e => handleImage(e.target.files[0])}
            style={{ display: 'none' }} />
          <button onClick={() => fileRef.current.click()} style={{
            width: '100%', padding: '16px', background: C.accentLight, color: C.accent,
            border: `2px dashed ${C.accent}`, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer'
          }}>
            📷 Hacer foto a la etiqueta
          </button>
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 }}>
            Apunta a la tabla nutricional · Buena luz · Encuadra bien el texto
          </div>
        </div>
      )}

      {/* Procesando */}
      {status === 'processing' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {preview && <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 200, objectFit: 'cover' }} />}
          <div style={{ fontSize: 13, color: C.muted }}>🔍 Analizando etiqueta con IA…</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: C.redLight, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 12, marginTop: 8 }}>
          {error}
        </div>
      )}

      {/* Resultados */}
      {status === 'done' && extracted && (
        <div>
          {preview && <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 150, objectFit: 'cover' }} />}
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            Verde = detectado · Blanco = no detectado, rellena manualmente:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              ['Kcal/100g', 'kcal100'],
              ['Proteína (g)', 'protein100'],
              ['Hidratos (g)', 'carbs100'],
              ['Azúcares (g)', 'sugar100'],
              ['Grasas sat. (g)', 'satfat100'],
              ['Fibra (g)', 'fiber100'],
              ['Sal (g)', 'salt100'],
            ].map(([label, key]) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <input type="number" value={extracted[key]}
                  onChange={e => setExtracted({ ...extracted, [key]: e.target.value })}
                  style={{ width: '100%', border: `1.5px solid ${extracted[key] ? C.green : C.border}`, background: extracted[key] ? C.greenLight : C.bg, color: C.text, padding: '8px 10px', borderRadius: 8, fontSize: 14, fontWeight: 700, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleConfirm} style={{ flex: 1, padding: '12px', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ✓ Guardar en catálogo
            </button>
            <button onClick={() => { setStatus('idle'); setPreview(null); setExtracted(null) }}
              style={{ padding: '12px 16px', background: C.bg, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 13, cursor: 'pointer' }}>
              Repetir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
