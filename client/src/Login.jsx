const C = {
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surface2: '#242424',
  border: '#2E2E2E',
  accent: '#6C63FF',
  red: '#EF4444',
  text: '#F5F5F5',
  muted: '#888',
}

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login')

  const API = 'https://nutrilog-production-46b5.up.railway.app/api'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al conectar')
        return
      }
      if (mode === 'register') {
        setMode('login')
        setError('')
        setUsername('')
        setPassword('')
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
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>Bienvenido a</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.text, marginTop: 4 }}>NutriLog</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Seguimiento nutricional personal</div>
        </div>

        <div style={{ background: C.surface, borderRadius: 20, padding: 24, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', marginBottom: 20, background: C.surface2, borderRadius: 10, padding: 4, gap: 4 }}>
            {[['login', 'Entrar'], ['register', 'Registrarse']].map(([key, label]) => (
              <button key={key} onClick={() => { setMode(key); setError('') }} style={{
                flex: 1, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: 'none', borderRadius: 7,
                background: mode === key ? C.accent : 'transparent',
                color: mode === key ? '#fff' : C.muted
              }}>{label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Usuario</div>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Tu nombre de usuario" autoFocus
                style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '12px 14px', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Contraseña</div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '12px 14px', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div style={{ background: '#2D1515', border: `1px solid ${C.red}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 16 }}>
                {error}
              </div>
            )}

            {mode === 'register' && !error && (
              <div style={{ background: '#1A1A2D', border: `1px solid ${C.accent}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.accent, marginBottom: 16 }}>
                Después de registrarte inicia sesión con tus datos.
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', background: C.accent, color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'