import { useState, useEffect, useRef } from 'react'

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

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

const PRESET_AVATARS = [
  { id: 'av1', emoji: '🧑‍💻', label: 'Techie' },
  { id: 'av2', emoji: '🏋️', label: 'Atleta' },
  { id: 'av3', emoji: '🥗', label: 'Foodie' },
  { id: 'av4', emoji: '🧘', label: 'Zen' },
  { id: 'av5', emoji: '🚴', label: 'Ciclista' },
  { id: 'av6', emoji: '🏃', label: 'Runner' },
  { id: 'av7', emoji: '🎯', label: 'Focused' },
  { id: 'av8', emoji: '💪', label: 'Fuerte' },
  { id: 'av9', emoji: '🌟', label: 'Star' },
  { id: 'av10', emoji: '🦁', label: 'León' },
]

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('nutrilog_token')}`
  }
}

export default function Profile({ username, onClose, onAvatarUpdate }) {
  const [avatar, setAvatar] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('presets')
  const fileRef = useRef()

useEffect(() => {
  async function load() {
    const res = await fetch(`${API}/profile`, { headers: getHeaders() })
    const data = await res.json()
    if (data.avatar) setAvatar(data.avatar)
  }
  load()
}, [])

  async function saveAvatar(newAvatar) {
    setSaving(true)
    setSaved(false)
    await fetch(`${API}/profile/avatar`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ avatar: newAvatar })
    })
    setAvatar(newAvatar)
    onAvatarUpdate(newAvatar)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede superar 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      saveAvatar(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const isPreset = avatar && avatar.startsWith('av')
  const currentEmoji = PRESET_AVATARS.find(a => a.id === avatar)?.emoji

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: C.white, borderRadius: '24px 24px 0 0', padding: 24,
        width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Mi perfil</div>
          <button onClick={onClose} style={{ border: 'none', background: C.bg, color: C.muted, borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>Cerrar</button>
        </div>

        {/* Avatar actual */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%', margin: '0 auto 12px',
            background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', border: `3px solid ${C.accent}`
          }}>
            {!avatar && (
              <span style={{ fontSize: 36, fontWeight: 700, color: C.accent }}>{username.charAt(0).toUpperCase()}</span>
            )}
            {avatar && isPreset && (
              <span style={{ fontSize: 48 }}>{currentEmoji}</span>
            )}
            {avatar && !isPreset && (
              <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{username}</div>
          {saved && <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>✓ Avatar guardado</div>}
          {saving && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Guardando...</div>}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: C.bg, borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 }}>
          {[['presets', '😀 Avatares'], ['upload', '📷 Foto']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: 'none', borderRadius: 9,
              background: tab === key ? C.accent : 'transparent',
              color: tab === key ? '#fff' : C.muted
            }}>{label}</button>
          ))}
        </div>

        {/* Avatares predefinidos */}
        {tab === 'presets' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {PRESET_AVATARS.map(a => (
              <div key={a.id} onClick={() => saveAvatar(a.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '10px 6px', borderRadius: 14, cursor: 'pointer',
                  background: avatar === a.id ? C.accentLight : C.bg,
                  border: `2px solid ${avatar === a.id ? C.accent : 'transparent'}`,
                  transition: 'all 0.2s'
                }}>
                <span style={{ fontSize: 32 }}>{a.emoji}</span>
                <span style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{a.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Subir foto */}
        {tab === 'upload' && (
          <div>
            <input ref={fileRef} type="file" accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }} />
            <button onClick={() => fileRef.current.click()} style={{
              width: '100%', padding: '16px', background: C.accentLight, color: C.accent,
              border: `2px dashed ${C.accent}`, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12
            }}>
              📷 Seleccionar foto
            </button>
            <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
              Máximo 2MB · JPG, PNG o WEBP
            </div>
            {avatar && !isPreset && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <img src={avatar} alt="avatar actual" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.accent}` }} />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Foto actual</div>
                <button onClick={() => saveAvatar(null)} style={{
                  marginTop: 8, border: 'none', background: C.redLight, color: C.red,
                  borderRadius: 10, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600
                }}>Eliminar foto</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}