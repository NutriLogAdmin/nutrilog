import { useState } from 'react'

const C = {
  bg: '#F7F7F5',
  white: '#FFFFFF',
  border: '#EBEBEB',
  text: '#1A1A1A',
  muted: '#888',
  accent: '#FF6B35',
  accentLight: '#FFF0EB',
  accentMid: '#FFB39A',
  red: '#EF4444',
  redLight: '#FEF2F2',
  green: '#16A34A',
  greenLight: '#F0FDF4',
}

const API = 'https://nutrilog-production-46b5.up.railway.app/api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`${API}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al conectar'); setLoading(false); return }
      if (mode === 'register') {
        setMode('login')
        setError('')
        setPassword('')
        setNotice('Cuenta creada. Ya puedes iniciar sesión con tu usuario y contraseña.')
        setLoading(false)
        return
      }
      localStorage.setItem('nutrilog_token', data.token)
      localStorage.setItem('nutrilog_user', data.username)
      onLogin(data.token, data.username)
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
            🥗
          </div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: C.accent, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Bienvenido a</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.text }}>NutriLog</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Seguimiento nutricional personal</div>
        </div>

        {/* Card */}
        <div style={{ background: C.white, borderRadius: 24, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

          {/* Tabs modo */}
          <div style={{ display: 'flex', background: C.bg, borderRadius: 14, padding: 4, gap: 4, marginBottom: 20 }}>
            {[['login', 'Entrar'], ['register', 'Registrarse']].map(([key, label]) => (
              <button key={key} onClick={() => { setMode(key); setError(''); setNotice('') }} style={{
                flex: 1, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: 'none', borderRadius: 10,
                background: mode === key ? C.accent : 'transparent',
                color: mode === key ? '#fff' : C.muted,
                transition: 'all 0.2s'
              }}>{label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Usuario</div>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Tu nombre de usuario" autoFocus
                style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '12px 14px', borderRadius: 12, fontSize: 15, boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Contraseña</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                style={{ width: '100%', border: `1.5px solid ${C.border}`, background: C.bg, color: C.text, padding: '12px 14px', borderRadius: 12, fontSize: 15, boxSizing: 'border-box' }} />
            </div>

            {error && (
              <div style={{ background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 16 }}>
                {error}
              </div>
            )}

            {notice && !error && (
              <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.green, marginBottom: 16 }}>
                ✅ {notice}
              </div>
            )}

            {mode === 'register' && !error && !notice && (
              <div style={{ background: C.accentLight, border: `1px solid ${C.accentMid}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.accent, marginBottom: 16 }}>
                Después de registrarte inicia sesión con tus datos.
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', background: C.accent, color: '#fff',
              border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}