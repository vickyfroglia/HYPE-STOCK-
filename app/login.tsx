'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login({ onLogin }: { onLogin: (rol: string, nombre: string, email?: string) => void }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError('');

    // Primero intentamos login con email (usuarios con @)
    if (usuario.includes('@')) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: usuario, password });
      if (authError) {
        setError('Email o contraseña incorrectos.');
        setLoading(false);
        return;
      }
      // Buscar rol en tabla usuarios
      const { data: userData } = await supabase.from('usuarios').select('*').eq('email', usuario).single();
      if (userData) {
        onLogin(userData.rol.trim(), userData.nombre, usuario.trim().toLowerCase());
      } else {
        // Sin fila en la tabla usuarios: entra solo para consultar (antes entraba como admin)
        onLogin('consulta', usuario.trim().toLowerCase(), usuario.trim().toLowerCase());
      }
    } else {
      // Ya no se entra con usuario sin mail: cada persona usa su mail de HYPE
      setError('Entrá con tu mail de HYPE (por ejemplo produccion@hypearg.com).');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a2e', letterSpacing: 4 }}>HYPE</div>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>Stock & Producción</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Email</label>
          <input
            type="text"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            placeholder="tu-mail@hypearg.com"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' as const }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              type={verClave ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' as const }}
            />
            {/* Ojito para mostrar u ocultar la contraseña */}
            <button
              type="button"
              onClick={() => setVerClave(v => !v)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: '#888' }}
            >
              {verClave ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>
        {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee', color: '#c00', borderRadius: 8, fontSize: 13 }}>{error}</div>}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#e85d2f', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}
