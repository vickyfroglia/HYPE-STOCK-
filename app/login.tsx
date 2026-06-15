'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login({ onLogin }: { onLogin: (rol: string, nombre: string) => void }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
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
        onLogin(userData.rol, userData.nombre);
      } else {
        onLogin('admin', 'Usuario');
      }
    } else {
      // Login con usuario/contraseña para operarios
      const { data: operario } = await supabase.from('operarios').select('*').eq('usuario', usuario.toLowerCase()).eq('password', password).single();
      if (operario) {
        onLogin(operario.rol, operario.nombre);
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
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
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Usuario o Email</label>
          <input
            type="text"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            placeholder="usuario o email@hype.com"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' as const }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' as const }}
          />
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
