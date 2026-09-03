// Pop-up de novedades. Se muestra al iniciar sesión cuando hay entradas del
// changelog que el usuario no ha visto todavía. Al cerrarlo se guarda la versión
// actual en localStorage y no vuelve a salir hasta el próximo despliegue con
// entrada nueva. Lógica de "qué mostrar" en changelog.js; aquí solo se pinta.

export default function WhatsNew({ entries, C, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.white, color: C.text, borderRadius: 20, padding: 24,
          maxWidth: 420, width: '100%', maxHeight: '80vh', overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 2, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>
          Novedades
        </div>

        {entries.map(e => (
          <div key={e.version} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
              Versión {e.version} · {e.date}
            </div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {e.changes.map((c, i) => (
                <li key={i} style={{ fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>{c}</li>
              ))}
            </ul>
          </div>
        ))}

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 20, padding: 13, background: C.accent,
            color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700,
            fontSize: 14, cursor: 'pointer',
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
