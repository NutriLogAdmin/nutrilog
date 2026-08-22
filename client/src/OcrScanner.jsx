import { useState, useRef } from 'react'
import { createWorker } from 'tesseract.js'

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

function parseNutrition(text) {
  const lines = text.toLowerCase().split('\n').map(l => l.trim()).filter(Boolean)
  const result = { kcal100: '', protein100: '', carbs100: '', sugar100: '', satfat100: '', fiber100: '', salt100: '' }

  function findValue(keywords) {
    for (const line of lines) {
      for (const kw of keywords) {
        if (line.includes(kw)) {
          const match = line.match(/(\d+[.,]?\d*)/)
          if (match) return match[1].replace(',', '.')
        }
      }
    }
    return ''
  }

  result.kcal100 = findValue(['kcal', 'energía', 'energia', 'calorias', 'calorías', 'valor energético'])
  result.protein100 = findValue(['proteína', 'proteinas', 'protein'])
  result.carbs100 = findValue(['hidratos', 'carbohidratos', 'carbohydrate'])
  result.sugar100 = findValue(['azúcares', 'azucares', 'sugars'])
  result.satfat100 = findValue(['saturadas', 'saturated', 'saturados'])
  result.fiber100 = findValue(['fibra', 'fiber', 'fibre'])
  result.salt100 = findValue(['sal', 'salt', 'sodio', 'sodium'])

  return result
}

export default function OcrScanner({ onResult, onClose }) {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  async function handleImage(file) {
    if (!file) return
    setError('')
    setExtracted(null)
    setStatus('processing')
    setProgress(0)

    const url = URL.createObjectURL(file)
    setPreview(url)

    try {
      const worker = await createWorker('spa', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        }
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      const parsed = parseNutrition(text)
      setExtracted(parsed)
      setStatus('done')
    } catch {
      setError('Error al procesar la imagen. Intenta con una foto más clara.')
      setStatus('idle')
    }
  }

  function handleConfirm() {
    if (extracted) onResult(extracted)
  }

  return (
    <div style={{ background: C.white, borderRadius: 20, padding: 16, border: `2px solid ${C.accent}`, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>📷 Escanear etiqueta</div>
        <button onClick={onClose} style={{ border: 'none', background: C.accentLight, color: C.accent, borderRadius: 20, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✕ Cerrar</button>
      </div>

      {/* Botón de cámara */}
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
            Apunta a la tabla nutricional con buena luz y encuadra bien el texto
          </div>
        </div>
      )}

      {/* Procesando */}
      {status === 'processing' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {preview && <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 200, objectFit: 'cover' }} />}
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Analizando etiqueta... {progress}%</div>
          <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.accent, borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: C.redLight, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 12 }}>
          {error}
          <button onClick={() => { setStatus('idle'); setPreview(null) }}
            style={{ display: 'block', marginTop: 8, border: 'none', background: C.red, color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Resultados */}
      {status === 'done' && extracted && (
        <div>
          {preview && <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 150, objectFit: 'cover' }} />}
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            Revisa los datos extraídos y corrígelos si es necesario:
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
              ✓ Usar estos datos
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