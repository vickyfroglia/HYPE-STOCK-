'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Login from './login';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [pagina, setPagina] = useState('dashboard');
  const [clientes, setClientes] = useState<any[]>([]);
  const [telas, setTelas] = useState<any[]>([]);
  const [colores, setColores] = useState<any[]>([]);
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logueado, setLogueado] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [rol, setRol] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: userData } = await supabase.from('usuarios').select('*').eq('email', session.user.email).single();
        if (userData) {
          setRol(userData.rol);
          setNombreUsuario(userData.nombre);
        }
        setLogueado(true);
        cargarTodo();
      }
      setCheckingAuth(false);
    });
  }, []);

  async function cargarTodo() {
    setLoading(true);
    const [{ data: cls }, { data: tls }, { data: cols }, { data: ings }, { data: egs }, { data: emps }] = await Promise.all([
      supabase.from('clientes').select('*').order('cod'),
      supabase.from('telas').select('*').order('cod'),
      supabase.from('colores').select('*').order('nombre'),
      supabase.from('ingresos').select('*').order('created_at', { ascending: false }),
      supabase.from('egresos').select('*').order('created_at', { ascending: false }),
      supabase.from('empleados').select('*').order('nombre'),
    ]);
    if (cls) setClientes(cls);
    if (tls) setTelas(tls);
    if (cols) setColores(cols);
    if (ings) setIngresos(ings);
    if (egs) setEgresos(egs);
    if (emps) setEmpleados(emps);
    setLoading(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setLogueado(false);
    setRol('');
    setNombreUsuario('');
  }

  function handleLogin(rolUsuario: string, nombre: string) {
    setRol(rolUsuario);
    setNombreUsuario(nombre);
    setLogueado(true);
    cargarTodo();
  }

  if (checkingAuth) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff' }}>Cargando...</div>;
  if (!logueado) return <Login onLogin={handleLogin} />;

  const esAdmin = rol === 'admin';
  const esDiseno = rol === 'diseno';
  const esComercial = rol === 'comercial';
  const esAdministrativo = rol === 'administrativo';
  const esEncargado = rol === 'encargado';
  const esOperarioImpresion = rol === 'operario_impresion';
  const esOperarioTerminacion = rol === 'operario_terminacion';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦', roles: ['admin', 'diseno', 'comercial', 'administrativo', 'encargado'] },
    { id: 'ingresos', label: 'Ingresos', icon: '↓', roles: ['admin'] },
    { id: 'egresos', label: 'Egresos', icon: '↑', roles: ['admin'] },
    { id: 'stockTH', label: 'Stock TH', icon: '◫', roles: ['admin', 'diseno'] },
    { id: 'stockTC', label: 'Stock TC', icon: '◫', roles: ['admin', 'diseno'] },
    { id: 'clientes', label: 'Clientes', icon: '♟', roles: ['admin'] },
    { id: 'telas', label: 'Telas', icon: '≡', roles: ['admin'] },
    { id: 'colores', label: 'Colores', icon: '◉', roles: ['admin'] },
    { id: 'empleados', label: 'Empleados', icon: '👤', roles: ['admin'] },
    { id: 'historialIngresos', label: 'Hist. Ingresos', icon: '☰', roles: ['admin'] },
    { id: 'historialEgresos', label: 'Hist. Egresos', icon: '☰', roles: ['admin'] },
    { id: 'produccion', label: 'Producción', icon: '⚙', roles: ['admin'] },
  ].filter(n => n.roles.includes(rol));

  function calcStock() {
    const stockMap: any = {};
    ingresos.forEach((i: any) => {
      if (!stockMap[i.id_hype]) stockMap[i.id_hype] = { ing: 0, egr: 0, tela: i.tela, cliente: i.cliente, proceso: i.proceso, color: i.color, observaciones: i.observaciones, bultos: 0, ubicacion: i.ubicacion, ramado: i.ramado, recibido: i.recibido };
      stockMap[i.id_hype].ing += Number(i.mts);
      stockMap[i.id_hype].bultos += Number(i.bultos || 0);
    });
    egresos.forEach((e: any) => {
      if (stockMap[e.id_hype]) stockMap[e.id_hype].egr += Number(e.mts);
    });
    return stockMap;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: 200, background: '#1a1a2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <img src="/logo.png" alt="HYPE printlab" style={{ width: '100%', maxWidth: 160, display: 'block' }} />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginTop: 6 }}>STOCK & PRODUCCIÓN</div>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{nombreUsuario}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{rol}</div>
        </div>
        {navItems.map(n => (
          <div key={n.id} onClick={() => setPagina(n.id)} style={{
            padding: '10px 16px', cursor: 'pointer', color: pagina === n.id ? '#fff' : 'rgba(255,255,255,0.55)',
            background: pagina === n.id ? 'rgba(255,255,255,0.1)' : 'transparent',
            borderLeft: pagina === n.id ? '2px solid #e85d2f' : '2px solid transparent',
            fontSize: 13, display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span>{n.icon}</span>{n.label}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: 16 }}>
          <button onClick={cerrarSesion} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div style={{ marginLeft: 200, padding: 24, flex: 1, background: '#f5f5f7', minHeight: '100vh' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando...</div>}
        {!loading && (
          <>
            {pagina === 'dashboard' && <Dashboard ingresos={ingresos} egresos={egresos} clientes={clientes} telas={telas} calcStock={calcStock} rol={rol} />}
            {pagina === 'ingresos' && esAdmin && <Ingresos clientes={clientes} telas={telas} colores={colores} empleados={empleados} onGuardar={cargarTodo} />}
            {pagina === 'egresos' && esAdmin && <Egresos ingresos={ingresos} egresos={egresos} clientes={clientes} telas={telas} colores={colores} empleados={empleados} onGuardar={cargarTodo} />}
            {pagina === 'stockTH' && <StockTH calcStock={calcStock} ingresos={ingresos} />}
            {pagina === 'stockTC' && <StockTC calcStock={calcStock} ingresos={ingresos} />}
            {pagina === 'clientes' && esAdmin && <Clientes clientes={clientes} onGuardar={cargarTodo} />}
            {pagina === 'telas' && esAdmin && <Telas telas={telas} onGuardar={cargarTodo} />}
            {pagina === 'colores' && esAdmin && <Colores colores={colores} onGuardar={cargarTodo} />}
            {pagina === 'empleados' && esAdmin && <Empleados empleados={empleados} onGuardar={cargarTodo} />}
            {pagina === 'historialIngresos' && esAdmin && <HistorialIngresos ingresos={ingresos} onGuardar={cargarTodo} clientes={clientes} telas={telas} empleados={empleados} />}
            {pagina === 'historialEgresos' && esAdmin && <HistorialEgresos egresos={egresos} onGuardar={cargarTodo} />}
            {pagina === 'produccion' && esAdmin && <Produccion />}
          </>
        )}
      </div>
    </div>
  );
}

function Produccion() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Producción</div>
        <div style={{ fontSize: 13, color: '#888' }}>Módulo en desarrollo</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 40, border: '1px solid #eee', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a2e', marginBottom: 8 }}>Módulo de Producción</div>
        <div style={{ fontSize: 13, color: '#888' }}>Este módulo está en desarrollo. Próximamente disponible.</div>
      </div>
    </div>
  );
}

function Dashboard({ ingresos, egresos, clientes, telas, calcStock, rol }: any) {
  const stock = calcStock();
  const totalTC = Object.entries(stock).filter(([id]: any) => id.startsWith('TC')).reduce((s: number, [, v]: any) => s + v.ing - v.egr, 0);
  const totalTH = Object.entries(stock).filter(([id]: any) => id.startsWith('TH')).reduce((s: number, [, v]: any) => s + v.ing - v.egr, 0);
  const pendientes = egresos.filter((e: any) => e.estado === 'En almacén').length;
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Dashboard</div>
        <div style={{ fontSize: 13, color: '#888' }}>Resumen general</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Clientes', value: clientes.length, sub: 'registrados' },
          { label: 'Stock TC', value: totalTC.toLocaleString(), sub: 'metros disponibles' },
          { label: 'Stock TH', value: totalTH.toLocaleString(), sub: 'metros disponibles' },
          { label: 'Pendientes entrega', value: pendientes, sub: 'egresos en depósito' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eee' }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, marginTop: 4 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Últimos ingresos</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Fecha','Cliente','Tela','Color','ID','Mts','Estado'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: 11, color: '#888' }}>{h}</th>)}</tr></thead>
            <tbody>
              {ingresos.slice(0, 8).map((i: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.fecha}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.cliente}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.tela}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.color}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', color: '#e85d2f', fontSize: 12 }}>{i.id_hype}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.mts} mts</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AutocompleteEmpleado({ label, value, onChange, empleados }: any) {
  const [show, setShow] = useState(false);
  const filtered = empleados.filter((e: any) => e.nombre.toLowerCase().includes(value.toLowerCase()));
  return (
    <div style={{ position: 'relative' }}>
      <label style={lbl}>{label}</label>
      <input value={value} onChange={e => { onChange(e.target.value); setShow(true); }} placeholder="Escribí para buscar..." style={inp} onFocus={() => setShow(true)} />
      {show && value && filtered.length > 0 && (
        <div style={dropdown}>
          {filtered.map((e: any) => (
            <div key={e.id} onClick={() => { onChange(e.nombre); setShow(false); }} style={ddItem}>{e.nombre}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelEtiquetas({ rows, onCerrar }: any) {
  useEffect(() => {
    rows.forEach((_: any, i: number) => {
      const el = document.getElementById('qr-panel-' + i);
      if (el && el.childElementCount === 0) {
        const qrData = JSON.stringify({ id: rows[i].id_hype, cliente: rows[i].cliente, tela: rows[i].tela, color: rows[i].color, obs: rows[i].obs, fecha: rows[i].fecha, ubicacion: rows[i].ubicacion, mts: rows[i].mts });
        // @ts-ignore
        if (window.QRCode) new window.QRCode(el, { text: qrData, width: 100, height: 100, colorDark: '#1a1a2e', colorLight: '#ffffff' });
      }
    });
  }, [rows]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 999, overflowY: 'auto', padding: '20px 0' }}>
      <div style={{ background: '#f5f5f7', borderRadius: 16, padding: 24, width: '90%', maxWidth: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Etiquetas para imprimir</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>🖨 Imprimir</button>
            <button onClick={onCerrar} style={btn}>Cerrar</button>
          </div>
        </div>
        <div id="etiquetas-print">
          {rows.map((r: any, rIdx: number) =>
            Array.from({ length: parseInt(r.bultos) || 1 }).map((_, i) => (
              <div key={`${rIdx}-${i}`} style={{
                width: 566, height: 378, background: '#fff', border: '1.5px solid #bbb', borderRadius: 6,
                display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Arial, sans-serif',
                marginBottom: 16, pageBreakAfter: 'always'
              }}>
                <div style={{ background: '#1a1a2e', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>HYPE</div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 }}>{r.proceso === 'S' ? 'Sublimación' : 'Digital directo'}</div>
                  <div style={{ color: '#e85d2f', fontSize: 18, fontWeight: 700 }}>ROLLO {i + 1}/{parseInt(r.bultos) || 1}</div>
                </div>
                <div style={{ display: 'flex', flex: 1 }}>
                  <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#1a1a2e', letterSpacing: 3, fontFamily: 'Courier New, monospace', borderBottom: '1.5px solid #e0e0e0', paddingBottom: 6 }}>{r.id_hype}</div>
                    <div><div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Cliente</div><div style={{ fontSize: 17, fontWeight: 700, textTransform: 'uppercase' }}>{r.cliente}</div></div>
                    <div><div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Tela</div><div style={{ fontSize: 17, fontWeight: 700, textTransform: 'uppercase' }}>{r.tela}</div></div>
                    {r.color && <div><div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Color</div><div style={{ fontSize: 17, fontWeight: 700, textTransform: 'uppercase' }}>{r.color}</div></div>}
                    {r.obs && <div><div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Observaciones</div><div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>{r.obs}</div></div>}
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div><div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Fecha</div><div style={{ fontSize: 15, fontWeight: 700 }}>{r.fecha}</div></div>
                      <div><div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Ubicación</div><div style={{ fontSize: 15, fontWeight: 700 }}>{r.ubicacion}</div></div>
                    </div>
                  </div>
                  <div style={{ width: 126, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 10, borderLeft: '1px solid #eee', gap: 6 }}>
                    <div id={`qr-panel-${rIdx}`}></div>
                    <div style={{ fontSize: 10, color: '#aaa', textAlign: 'center' }}>Escanear para ver stock</div>
                  </div>
                </div>
                <div style={{ background: '#f0f0f0', borderTop: '1px solid #ddd', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>HYPE Estampación · {r.fecha}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#e85d2f' }}>{r.mts} MTS TOTALES</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" />
    </div>
  );
}

function Ingresos({ clientes, telas, colores, empleados, onGuardar }: any) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [remito, setRemito] = useState('');
  const [cliente, setCliente] = useState('');
  const [codCliente, setCodCliente] = useState('');
  const [recibido, setRecibido] = useState('');
  const [busqCli, setBusqCli] = useState('');
  const [showCli, setShowCli] = useState(false);
  const [renglones, setRenglones] = useState([{ prop: '', proceso: '', tela: '', codTela: '', color: '', siglaColor: '', obs: '', bultos: '', modo: 'KG', kg: '', rinde: '', mts: '', ramado: 'No', ubicacion: '1-A', id_hype: '', busqTela: '', showTela: false, busqColor: '', showColor: false }]);
  const [guardando, setGuardando] = useState(false);
  const [etiquetasData, setEtiquetasData] = useState<any>(null);
  const ubicaciones = ['1-A','1-B','1-C','1-D','2-A','2-B','2-C','3-A','3-B','3-C','3-D','4-A','4-B','4-C','ISLA','PARED','TINTO HYPE','TINTO EXT'];

  function selCliente(c: any) {
    setCliente(c.nombre); setCodCliente(c.cod); setBusqCli(c.nombre); setShowCli(false);
    setRenglones(prev => prev.map(r => ({ ...r, id_hype: buildId(r.prop, r.proceso, c.cod, r.codTela, r.siglaColor) })));
  }

  function buildId(prop: string, proceso: string, codCli: string, codTela: string, siglaColor: string) {
    if (prop && proceso && codCli && codTela && siglaColor) return prop + proceso + codCli + codTela + siglaColor;
    return '';
  }

  function updateRenglon(idx: number, field: string, value: string) {
    setRenglones(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const nr = { ...r, [field]: value };
      if (field === 'kg' || field === 'rinde') {
        const kg = field === 'kg' ? parseFloat(value) : parseFloat(nr.kg);
        const rinde = field === 'rinde' ? parseFloat(value) : parseFloat(nr.rinde);
        if (kg && rinde && rinde > 0) nr.mts = Math.round(kg / rinde).toString();
      }
      nr.id_hype = buildId(
        field === 'prop' ? value : nr.prop,
        field === 'proceso' ? value : nr.proceso,
        codCliente,
        field === 'codTela' ? value : nr.codTela,
        field === 'siglaColor' ? value : nr.siglaColor
      );
      return nr;
    }));
  }

  function selTela(idx: number, t: any) {
    setRenglones(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const nr = { ...r, tela: t.nombre, codTela: t.cod, busqTela: t.nombre, showTela: false };
      nr.id_hype = buildId(nr.prop, nr.proceso, codCliente, t.cod, nr.siglaColor);
      return nr;
    }));
  }

  function selColor(idx: number, c: any) {
    setRenglones(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const nr = { ...r, color: c.nombre, siglaColor: c.sigla, busqColor: c.nombre, showColor: false };
      nr.id_hype = buildId(nr.prop, nr.proceso, codCliente, nr.codTela, c.sigla);
      return nr;
    }));
  }

  async function guardar() {
    if (!fecha || !remito || !cliente) { alert('Completá fecha, remito y cliente.'); return; }
    setGuardando(true);
    const rows = renglones.filter(r => r.prop && r.proceso && r.tela && r.color && parseFloat(r.mts) > 0);
    if (!rows.length) { alert('Completá al menos un renglón con color.'); setGuardando(false); return; }
    const { error } = await supabase.from('ingresos').insert(rows.map(r => ({
      fecha, remito, cliente, cod_cliente: codCliente, recibido,
      prop: r.prop, proceso: r.proceso, tela: r.tela, cod_tela: r.codTela,
      color: r.color, sigla_color: r.siglaColor,
      observaciones: r.obs, bultos: parseInt(r.bultos) || 0,
      mts: parseFloat(r.mts), ramado: r.ramado, ubicacion: r.ubicacion,
      id_hype: r.id_hype, estado: 'En almacén'
    })));
    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      onGuardar();
      const imprimir = confirm('✅ Ingreso guardado correctamente.\n\n¿Querés imprimir las etiquetas ahora?');
      if (imprimir) setEtiquetasData(rows.map(r => ({ ...r, cliente, fecha })));
    }
    setGuardando(false);
  }

  return (
    <div>
      {etiquetasData && <PanelEtiquetas rows={etiquetasData} onCerrar={() => setEtiquetasData(null)} />}
      <div style={{ marginBottom: 20 }}><div style={{ fontSize: 18, fontWeight: 500 }}>Nuevo ingreso</div></div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Encabezado</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div><label style={lbl}>Fecha</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Nro. remito</label><input type="number" value={remito} onChange={e => setRemito(e.target.value)} placeholder="00145" style={inp} /></div>
          <div style={{ position: 'relative' }}>
            <label style={lbl}>Cliente</label>
            <input value={busqCli} onChange={e => { setBusqCli(e.target.value); setShowCli(true); }} placeholder="Escribí para buscar..." style={inp} />
            {showCli && busqCli && (
              <div style={dropdown}>
                {clientes.filter((c: any) => c.nombre.toLowerCase().includes(busqCli.toLowerCase()) || c.cod.includes(busqCli)).slice(0, 8).map((c: any) => (
                  <div key={c.cod} onClick={() => selCliente(c)} style={ddItem}>{c.nombre} <span style={{ color: '#888', fontSize: 11 }}>{c.cod}</span></div>
                ))}
              </div>
            )}
          </div>
          <div><label style={lbl}>Cód. cliente</label><input value={codCliente} readOnly style={{ ...inp, background: '#f5f5f7' }} /></div>
          <AutocompleteEmpleado label="Recibido por" value={recibido} onChange={setRecibido} empleados={empleados} />
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Renglones</div>
        {renglones.map((r, idx) => (
          <div key={idx} style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>Renglón {idx + 1}</span>
              {renglones.length > 1 && <button onClick={() => setRenglones(prev => prev.filter((_, i) => i !== idx))} style={{ ...btn, background: '#fee', color: '#c00', border: '1px solid #fcc', fontSize: 12, padding: '3px 10px' }}>Eliminar</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
              <div><label style={lbl}>Prop.</label>
                <select value={r.prop} onChange={e => updateRenglon(idx, 'prop', e.target.value)} style={inp}>
                  <option value="">Seleccionar</option><option value="TC">TC - Tela cliente</option><option value="TH">TH - Tela propia</option>
                </select>
              </div>
              <div><label style={lbl}>Proceso</label>
                <select value={r.proceso} onChange={e => updateRenglon(idx, 'proceso', e.target.value)} style={inp}>
                  <option value="">Seleccionar</option><option value="S">S - Sublimación</option><option value="D">D - Digital directo</option>
                </select>
              </div>
              <div style={{ position: 'relative' }}><label style={lbl}>Tela</label>
                <input value={r.busqTela} onChange={e => { updateRenglon(idx, 'busqTela', e.target.value); setRenglones(prev => prev.map((rr, i) => i === idx ? { ...rr, showTela: true } : rr)); }} placeholder="Buscar..." style={inp} />
                {r.showTela && r.busqTela && (
                  <div style={dropdown}>
                    {telas.filter((t: any) => t.nombre.toLowerCase().includes(r.busqTela.toLowerCase()) || t.cod.includes(r.busqTela)).slice(0, 8).map((t: any) => (
                      <div key={t.cod} onClick={() => selTela(idx, t)} style={ddItem}>{t.nombre} <span style={{ color: '#888', fontSize: 11 }}>{t.cod}</span></div>
                    ))}
                  </div>
                )}
              </div>
              <div><label style={lbl}>Cód. tela</label><input value={r.codTela} readOnly style={{ ...inp, background: '#f5f5f7' }} /></div>
              <div style={{ position: 'relative' }}><label style={lbl}>Color</label>
                <input value={r.busqColor} onChange={e => { updateRenglon(idx, 'busqColor', e.target.value); setRenglones(prev => prev.map((rr, i) => i === idx ? { ...rr, showColor: true } : rr)); }} placeholder="Buscar color..." style={inp} />
                {r.showColor && r.busqColor && (
                  <div style={dropdown}>
                    {colores.filter((c: any) => c.nombre.toLowerCase().includes(r.busqColor.toLowerCase()) || c.sigla.toLowerCase().includes(r.busqColor.toLowerCase())).slice(0, 8).map((c: any) => (
                      <div key={c.sigla} onClick={() => selColor(idx, c)} style={ddItem}>{c.nombre} <span style={{ color: '#888', fontSize: 11 }}>{c.sigla}</span></div>
                    ))}
                  </div>
                )}
              </div>
              <div><label style={lbl}>Sigla color</label><input value={r.siglaColor} readOnly style={{ ...inp, background: '#f5f5f7' }} /></div>
              <div><label style={lbl}>Observaciones</label><input value={r.obs} onChange={e => updateRenglon(idx, 'obs', e.target.value)} placeholder="Diseño, detalle..." style={inp} /></div>
              <div><label style={lbl}>Nro. bultos</label><input type="number" value={r.bultos} onChange={e => updateRenglon(idx, 'bultos', e.target.value)} placeholder="0" style={inp} /></div>
              <div><label style={lbl}>Ingreso en</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateRenglon(idx, 'modo', 'KG')} style={{ ...btn, background: r.modo === 'KG' ? '#e85d2f' : '#f0f0f0', color: r.modo === 'KG' ? '#fff' : '#333' }}>KG</button>
                  <button onClick={() => updateRenglon(idx, 'modo', 'MT')} style={{ ...btn, background: r.modo === 'MT' ? '#e85d2f' : '#f0f0f0', color: r.modo === 'MT' ? '#fff' : '#333' }}>Mts</button>
                </div>
              </div>
              {r.modo === 'KG' && <div><label style={lbl}>Cantidad (kg)</label><input type="number" value={r.kg} onChange={e => updateRenglon(idx, 'kg', e.target.value)} placeholder="0" style={inp} /></div>}
              {r.modo === 'KG' && <div><label style={lbl}>Rinde por mt</label><input type="number" value={r.rinde} onChange={e => updateRenglon(idx, 'rinde', e.target.value)} placeholder="0.35" step="0.01" style={inp} /></div>}
              <div><label style={lbl}>Mts totales</label><input type="number" value={r.mts} onChange={e => updateRenglon(idx, 'mts', e.target.value)} readOnly={r.modo === 'KG'} style={{ ...inp, background: r.modo === 'KG' ? '#f5f5f7' : '#fff' }} /></div>
              <div><label style={lbl}>Ramado/Tintorería</label>
                <select value={r.ramado} onChange={e => updateRenglon(idx, 'ramado', e.target.value)} style={inp}>
                  <option value="No">No</option><option value="Si">Sí</option>
                </select>
              </div>
              <div><label style={lbl}>Ubicación</label>
                <select value={r.ubicacion} onChange={e => updateRenglon(idx, 'ubicacion', e.target.value)} style={inp}>
                  {ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Código ID (automático)</label>
                <div style={{ background: '#1a1a2e', color: '#e85d2f', fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: 2, padding: '10px 16px', borderRadius: 8 }}>{r.id_hype || '---'}</div>
              </div>
            </div>
          </div>
        ))}
        <div onClick={() => setRenglones(prev => [...prev, { prop: '', proceso: '', tela: '', codTela: '', color: '', siglaColor: '', obs: '', bultos: '', modo: 'KG', kg: '', rinde: '', mts: '', ramado: 'No', ubicacion: '1-A', id_hype: '', busqTela: '', showTela: false, busqColor: '', showColor: false }])} style={{ padding: '12px 20px', cursor: 'pointer', color: '#e85d2f', fontSize: 13, background: '#fafafa', borderTop: '1px solid #eee' }}>
          + Agregar renglón
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button style={btn}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>{guardando ? 'Guardando...' : 'Guardar ingreso'}</button>
      </div>
    </div>
  );
}

function Egresos({ ingresos, egresos, clientes, telas, colores, empleados, onGuardar }: any) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [remitoOrigen, setRemitoOrigen] = useState('');
  const [idHype, setIdHype] = useState('');
  const [busqId, setBusqId] = useState('');
  const [showId, setShowId] = useState(false);
  const [cliente, setCliente] = useState('');
  const [busqCli, setBusqCli] = useState('');
  const [showCli, setShowCli] = useState(false);
  const [tela, setTela] = useState('');
  const [busqTela, setBusqTela] = useState('');
  const [showTela, setShowTela] = useState(false);
  const [color, setColor] = useState('');
  const [busqColor, setBusqColor] = useState('');
  const [showColor, setShowColor] = useState(false);
  const [obs, setObs] = useState('');
  const [disponibles, setDisponibles] = useState(0);
  const [mts, setMts] = useState('');
  const [bultos, setBultos] = useState('');
  const [remitoEntrega, setRemitoEntrega] = useState('');
  const [estado, setEstado] = useState('En almacén');
  const [entrego, setEntrego] = useState('');
  const [retiro, setRetiro] = useState('');
  const [alerta, setAlerta] = useState('');
  const [guardando, setGuardando] = useState(false);

  function calcDisponibles(id: string) {
    const ingTotal = ingresos.filter((i: any) => i.id_hype === id).reduce((s: number, i: any) => s + Number(i.mts), 0);
    const egrTotal = egresos.filter((e: any) => e.id_hype === id).reduce((s: number, e: any) => s + Number(e.mts), 0);
    setDisponibles(ingTotal - egrTotal);
  }

  function cargarDesdeIngreso(ing: any) {
    setCliente(ing.cliente); setBusqCli(ing.cliente);
    setTela(ing.tela); setBusqTela(ing.tela);
    setColor(ing.color || ''); setBusqColor(ing.color || '');
    setObs(ing.observaciones || '');
    setIdHype(ing.id_hype); setBusqId(ing.id_hype);
    calcDisponibles(ing.id_hype);
  }

  function buscarPorRemito(val: string) {
    setRemitoOrigen(val);
    if (!val) return;
    const ing = ingresos.find((i: any) => i.remito === val);
    if (ing) cargarDesdeIngreso(ing);
  }

  function selId(id: string) {
    setIdHype(id); setBusqId(id); setShowId(false);
    const ing = ingresos.find((i: any) => i.id_hype === id);
    if (ing) cargarDesdeIngreso(ing);
  }

  function buscarPorCampos(cli: string, tel: string, col: string) {
    if (!cli || !tel || !col) { setIdHype(''); setBusqId(''); setDisponibles(0); return; }
    const match = ingresos.find((i: any) =>
      i.cliente.toLowerCase() === cli.toLowerCase() &&
      i.tela.toLowerCase() === tel.toLowerCase() &&
      (i.color || '').toLowerCase() === col.toLowerCase()
    );
    if (match) {
      setIdHype(match.id_hype);
      setBusqId(match.id_hype);
      calcDisponibles(match.id_hype);
    } else {
      setIdHype('');
      setBusqId('');
      setDisponibles(0);
    }
  }

  function selCliente(c: any) {
    setCliente(c.nombre); setBusqCli(c.nombre); setShowCli(false);
    buscarPorCampos(c.nombre, tela, color);
  }

  function selTela(t: any) {
    setTela(t.nombre); setBusqTela(t.nombre); setShowTela(false);
    buscarPorCampos(cliente, t.nombre, color);
  }

  function selColor(c: any) {
    setColor(c.nombre); setBusqColor(c.nombre); setShowColor(false);
    buscarPorCampos(cliente, tela, c.nombre);
  }

  function validarMts(val: string) {
    setMts(val);
    if (parseFloat(val) > disponibles) setAlerta(`La cantidad (${val} mts) supera los disponibles (${disponibles} mts).`);
    else setAlerta('');
  }

  async function guardar() {
    if (alerta) { alert('Corregí los metros antes de guardar.'); return; }
    if (!parseFloat(mts)) { alert('Completá los metros a egresar.'); return; }
    if (!idHype) { alert('No se encontró un ID válido. Verificá remito, ID o cliente+tela+color.'); return; }
    setGuardando(true);
    const { error } = await supabase.from('egresos').insert([{
      fecha, remito_origen: remitoOrigen, remito_entrega: remitoEntrega,
      cliente, tela, color, observaciones: obs, id_hype: idHype,
      mts: parseFloat(mts), bultos: parseInt(bultos) || 0,
      estado, entrego, retiro
    }]);
    if (error) alert('Error: ' + error.message);
    else { alert('Egreso guardado.'); onGuardar(); }
    setGuardando(false);
  }

  const idsUnicos = [...new Set(ingresos.map((i: any) => i.id_hype))] as string[];

  return (
    <div>
      <div style={{ marginBottom: 20 }}><div style={{ fontSize: 18, fontWeight: 500 }}>Nuevo egreso</div></div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee', marginBottom: 16 }}>
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f7', borderRadius: 8, fontSize: 12, color: '#666' }}>
          Podés buscar por <strong>remito de origen</strong>, por <strong>ID</strong>, o por <strong>cliente + tela + color</strong>. Cualquiera de los tres completa el resto automáticamente.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div><label style={lbl}>Fecha</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} /></div>
          <div>
            <label style={lbl}>Nro. remito origen <span style={{ fontSize: 10, color: '#aaa' }}>(opcional)</span></label>
            <input type="number" value={remitoOrigen} onChange={e => buscarPorRemito(e.target.value)} placeholder="00145" style={inp} />
          </div>
          <div style={{ position: 'relative' }}>
            <label style={lbl}>Buscar por ID <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>completa todo</span></label>
            <input value={busqId} onChange={e => { setBusqId(e.target.value); setShowId(true); if (!e.target.value) { setIdHype(''); setDisponibles(0); } }} placeholder="Ej: TCS001045BLA" style={inp} />
            {showId && busqId && (
              <div style={dropdown}>
                {idsUnicos.filter(id => id.toLowerCase().includes(busqId.toLowerCase())).slice(0, 10).map(id => (
                  <div key={id} onClick={() => selId(id)} style={ddItem}>
                    <span style={{ fontFamily: 'monospace', color: '#e85d2f' }}>{id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <label style={lbl}>Cliente <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>completa ID</span></label>
            <input value={busqCli} onChange={e => { setBusqCli(e.target.value); setCliente(e.target.value); setShowCli(true); buscarPorCampos(e.target.value, tela, color); }} placeholder="Escribí para buscar..." style={inp} />
            {showCli && busqCli && (
              <div style={dropdown}>
                {clientes.filter((c: any) => c.nombre.toLowerCase().includes(busqCli.toLowerCase())).slice(0, 8).map((c: any) => (
                  <div key={c.cod} onClick={() => selCliente(c)} style={ddItem}>{c.nombre} <span style={{ color: '#888', fontSize: 11 }}>{c.cod}</span></div>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <label style={lbl}>Tela <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>completa ID</span></label>
            <input value={busqTela} onChange={e => { setBusqTela(e.target.value); setTela(e.target.value); setShowTela(true); buscarPorCampos(cliente, e.target.value, color); }} placeholder="Escribí para buscar..." style={inp} />
            {showTela && busqTela && (
              <div style={dropdown}>
                {telas.filter((t: any) => t.nombre.toLowerCase().includes(busqTela.toLowerCase())).slice(0, 8).map((t: any) => (
                  <div key={t.cod} onClick={() => selTela(t)} style={ddItem}>{t.nombre} <span style={{ color: '#888', fontSize: 11 }}>{t.cod}</span></div>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <label style={lbl}>Color <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>completa ID</span></label>
            <input value={busqColor} onChange={e => { setBusqColor(e.target.value); setColor(e.target.value); setShowColor(true); buscarPorCampos(cliente, tela, e.target.value); }} placeholder="Escribí para buscar..." style={inp} />
            {showColor && busqColor && (
              <div style={dropdown}>
                {colores.filter((c: any) => c.nombre.toLowerCase().includes(busqColor.toLowerCase()) || c.sigla.toLowerCase().includes(busqColor.toLowerCase())).slice(0, 8).map((c: any) => (
                  <div key={c.sigla} onClick={() => selColor(c)} style={ddItem}>{c.nombre} <span style={{ color: '#888', fontSize: 11 }}>{c.sigla}</span></div>
                ))}
              </div>
            )}
          </div>
          <div><label style={lbl}>Observaciones</label><input value={obs} onChange={e => setObs(e.target.value)} placeholder="Diseño, detalle..." style={inp} /></div>
          <div>
            <label style={lbl}>ID <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>automático</span></label>
            <div style={{ background: '#1a1a2e', color: idHype ? '#e85d2f' : '#666', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 8 }}>{idHype || '---'}</div>
          </div>
          <div><label style={lbl}>Mts disponibles</label><input value={disponibles ? disponibles + ' mts' : '---'} readOnly style={{ ...inp, background: '#f5f5f7', color: disponibles > 0 ? '#3B6D11' : '#888', fontWeight: 500 }} /></div>
          <div><label style={lbl}>Mts a egresar</label><input type="number" value={mts} onChange={e => validarMts(e.target.value)} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Nro. bultos</label><input type="number" value={bultos} onChange={e => setBultos(e.target.value)} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Nro. remito entrega</label><input type="number" value={remitoEntrega} onChange={e => setRemitoEntrega(e.target.value)} placeholder="00089" style={inp} /></div>
          <div><label style={lbl}>Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} style={inp}>
              <option>En almacén</option><option>Entregado a cliente</option><option>A producción</option><option>Salida a tinto externa</option><option>En tinto HYPE</option>
            </select>
          </div>
          <AutocompleteEmpleado label="Quién entregó" value={entrego} onChange={setEntrego} empleados={empleados} />
          <div><label style={lbl}>Quién retiró / Envío</label><input value={retiro} onChange={e => setRetiro(e.target.value)} placeholder="Nombre o empresa" style={inp} /></div>
        </div>
        {alerta && <div style={{ marginTop: 12, padding: '10px 14px', background: '#FAEEDA', color: '#854F0B', borderRadius: 8, fontSize: 13 }}>⚠ {alerta}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button style={btn}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>{guardando ? 'Guardando...' : 'Guardar egreso'}</button>
      </div>
    </div>
  );
}

function StockTabla({ entries, titulo }: any) {
  const [search, setSearch] = useState('');
  const filtered = entries.filter(([id, s]: any) => {
    if (!search) return true;
    return id.toLowerCase().includes(search.toLowerCase()) ||
      s.cliente.toLowerCase().includes(search.toLowerCase()) ||
      s.tela.toLowerCase().includes(search.toLowerCase()) ||
      (s.color || '').toLowerCase().includes(search.toLowerCase());
  });
  const totalMts = filtered.reduce((s: number, [, v]: any) => s + v.ing - v.egr, 0);
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: '#888' }}>{filtered.length} IDs · {totalMts.toLocaleString()} mts disponibles</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 16 }}>
        <input placeholder="Buscar por ID, cliente, tela o color..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, maxWidth: 300 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['ID','Cliente','Tela','Color','Observaciones','Bultos','Mts disp.','Ubicación','Ramado','Proceso'].map(h =>
                <th key={h} style={{ ...th, whiteSpace: 'nowrap' }}>{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Sin stock registrado</td></tr>}
              {filtered.map(([id, s]: any) => {
                const disp = s.ing - s.egr;
                return (
                  <tr key={id}>
                    <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f', fontSize: 11, whiteSpace: 'nowrap' }}>{id}</td>
                    <td style={{ ...td, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.cliente}</td>
                    <td style={{ ...td, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.tela}</td>
                    <td style={td}>{s.color || '—'}</td>
                    <td style={{ ...td, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.observaciones || '—'}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.bultos}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: disp > 0 ? '#3B6D11' : '#c00' }}>{disp.toLocaleString()}</td>
                    <td style={td}>{s.ubicacion || '—'}</td>
                    <td style={td}>{s.ramado || '—'}</td>
                    <td style={td}>{s.proceso === 'S' ? 'Sublimación' : 'Digital'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StockTH({ calcStock, ingresos }: any) {
  const stock = calcStock();
  const entries = Object.entries(stock).filter(([id]: any) => id.startsWith('TH'));
  return <StockTabla entries={entries} titulo="Stock TH — Tela propia HYPE" />;
}

function StockTC({ calcStock, ingresos }: any) {
  const stock = calcStock();
  const entries = Object.entries(stock).filter(([id]: any) => id.startsWith('TC'));
  return <StockTabla entries={entries} titulo="Stock TC — Tela de clientes" />;
}

function HistorialIngresos({ ingresos, onGuardar, clientes, telas, empleados }: any) {
  const [search, setSearch] = useState('');
  const [pag, setPag] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const [etiquetasData, setEtiquetasData] = useState<any>(null);
  const POR_PAG = 20;

  const filtered = ingresos.filter((i: any) =>
    (i.cliente || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.tela || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.color || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.id_hype || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.remito || '').includes(search)
  );
  const total = Math.ceil(filtered.length / POR_PAG);
  const page = filtered.slice((pag - 1) * POR_PAG, pag * POR_PAG);

  async function eliminar(i: any) {
    if (!confirm(`¿Eliminar el ingreso ${i.id_hype} del ${i.fecha}?`)) return;
    await supabase.from('ingresos').delete().eq('id', i.id);
    onGuardar();
  }

  async function guardarEdicion() {
    if (!editItem) return;
    setGuardando(true);
    const { error } = await supabase.from('ingresos').update({
      fecha: editItem.fecha, remito: editItem.remito, cliente: editItem.cliente,
      tela: editItem.tela, color: editItem.color, observaciones: editItem.observaciones,
      bultos: editItem.bultos, mts: editItem.mts, ubicacion: editItem.ubicacion,
      ramado: editItem.ramado, recibido: editItem.recibido, estado: editItem.estado,
    }).eq('id', editItem.id);
    if (error) alert('Error: ' + error.message);
    else { setEditItem(null); onGuardar(); }
    setGuardando(false);
  }

  const ubicaciones = ['1-A','1-B','1-C','1-D','2-A','2-B','2-C','3-A','3-B','3-C','3-D','4-A','4-B','4-C','ISLA','PARED','TINTO HYPE','TINTO EXT'];

  return (
    <div>
      {etiquetasData && <PanelEtiquetas rows={etiquetasData} onCerrar={() => setEtiquetasData(null)} />}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Historial de ingresos</div>
        <div style={{ fontSize: 13, color: '#888' }}>{filtered.length} ingresos registrados</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 12 }}>
        <input placeholder="Buscar por cliente, tela, color, ID o remito..." value={search} onChange={e => { setSearch(e.target.value); setPag(1); }} style={{ ...inp, maxWidth: 400 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {['Fecha','Remito','Cliente','Tela','Color','ID','Obs.','Bultos','Mts','Ubic.','Ramado','Recibido','Acciones'].map(h =>
                <th key={h} style={{ ...th, whiteSpace: 'nowrap' }}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {page.map((i: any) => (
                <tr key={i.id}>
                  <td style={td}>{i.fecha}</td>
                  <td style={td}>{i.remito}</td>
                  <td style={{ ...td, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.cliente}</td>
                  <td style={{ ...td, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.tela}</td>
                  <td style={td}>{i.color}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f', fontSize: 11, whiteSpace: 'nowrap' }}>{i.id_hype}</td>
                  <td style={{ ...td, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.observaciones}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{i.bultos}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{i.mts}</td>
                  <td style={td}>{i.ubicacion}</td>
                  <td style={td}>{i.ramado}</td>
                  <td style={td}>{i.recibido}</td>
                  <td style={td}>
                    <button onClick={() => setEtiquetasData([{ ...i, obs: i.observaciones }])} style={{ ...btn, fontSize: 12, padding: '4px 8px', marginRight: 4, background: '#e8f4ea', color: '#3B6D11', border: '1px solid #97C459' }}>🏷</button>
                    <button onClick={() => setEditItem({...i})} style={{ ...btn, fontSize: 12, padding: '4px 8px', marginRight: 4 }}>Editar</button>
                    <button onClick={() => eliminar(i)} style={{ ...btn, fontSize: 12, padding: '4px 8px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 1 && <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {pag > 1 && <button onClick={() => setPag(pag - 1)} style={btn}>‹</button>}
          <span style={{ fontSize: 12, color: '#888', lineHeight: '32px' }}>Pág {pag} de {total}</span>
          {pag < total && <button onClick={() => setPag(pag + 1)} style={btn}>›</button>}
        </div>}
      </div>

      {editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Editar ingreso</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Fecha</label><input type="date" value={editItem.fecha} onChange={e => setEditItem({...editItem, fecha: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Nro. remito</label><input value={editItem.remito} onChange={e => setEditItem({...editItem, remito: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Cliente</label><input value={editItem.cliente} onChange={e => setEditItem({...editItem, cliente: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Tela</label><input value={editItem.tela} onChange={e => setEditItem({...editItem, tela: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Color</label><input value={editItem.color || ''} onChange={e => setEditItem({...editItem, color: e.target.value})} style={inp} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Observaciones</label><input value={editItem.observaciones || ''} onChange={e => setEditItem({...editItem, observaciones: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Bultos</label><input type="number" value={editItem.bultos} onChange={e => setEditItem({...editItem, bultos: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Mts</label><input type="number" value={editItem.mts} onChange={e => setEditItem({...editItem, mts: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Ubicación</label>
                <select value={editItem.ubicacion} onChange={e => setEditItem({...editItem, ubicacion: e.target.value})} style={inp}>
                  {ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Ramado/Tintorería</label>
                <select value={editItem.ramado} onChange={e => setEditItem({...editItem, ramado: e.target.value})} style={inp}>
                  <option value="No">No</option><option value="Si">Sí</option>
                </select>
              </div>
              <div><label style={lbl}>Recibido por</label><input value={editItem.recibido || ''} onChange={e => setEditItem({...editItem, recibido: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Estado</label>
                <select value={editItem.estado} onChange={e => setEditItem({...editItem, estado: e.target.value})} style={inp}>
                  <option>En almacén</option><option>Entregado a cliente</option><option>A producción</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setEditItem(null)} style={btn}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistorialEgresos({ egresos, onGuardar }: any) {
  const [search, setSearch] = useState('');
  const [pag, setPag] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const POR_PAG = 20;

  const filtered = egresos.filter((e: any) =>
    (e.cliente || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.tela || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.color || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.id_hype || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.remito_origen || '').includes(search)
  );
  const total = Math.ceil(filtered.length / POR_PAG);
  const page = filtered.slice((pag - 1) * POR_PAG, pag * POR_PAG);

  async function eliminar(e: any) {
    if (!confirm(`¿Eliminar el egreso ${e.id_hype} del ${e.fecha}?`)) return;
    await supabase.from('egresos').delete().eq('id', e.id);
    onGuardar();
  }

  async function guardarEdicion() {
    if (!editItem) return;
    setGuardando(true);
    const { error } = await supabase.from('egresos').update({
      fecha: editItem.fecha, remito_origen: editItem.remito_origen, remito_entrega: editItem.remito_entrega,
      cliente: editItem.cliente, tela: editItem.tela, color: editItem.color,
      observaciones: editItem.observaciones, mts: editItem.mts, bultos: editItem.bultos,
      estado: editItem.estado, entrego: editItem.entrego, retiro: editItem.retiro,
    }).eq('id', editItem.id);
    if (error) alert('Error: ' + error.message);
    else { setEditItem(null); onGuardar(); }
    setGuardando(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Historial de egresos</div>
        <div style={{ fontSize: 13, color: '#888' }}>{filtered.length} egresos registrados</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 12 }}>
        <input placeholder="Buscar por cliente, tela, color, ID o remito..." value={search} onChange={e => { setSearch(e.target.value); setPag(1); }} style={{ ...inp, maxWidth: 400 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {['Fecha','Rto. Origen','Rto. Entrega','Cliente','Tela','Color','ID','Mts','Estado','Entregó','Retiró','Acciones'].map(h =>
                <th key={h} style={{ ...th, whiteSpace: 'nowrap' }}>{h}</th>
              )}
            </tr></thead>
            <tbody>
              {page.length === 0 && <tr><td colSpan={12} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Sin egresos registrados</td></tr>}
              {page.map((e: any) => (
                <tr key={e.id}>
                  <td style={td}>{e.fecha}</td>
                  <td style={td}>{e.remito_origen}</td>
                  <td style={td}>{e.remito_entrega}</td>
                  <td style={{ ...td, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.cliente}</td>
                  <td style={{ ...td, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.tela}</td>
                  <td style={td}>{e.color}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f', fontSize: 11, whiteSpace: 'nowrap' }}>{e.id_hype}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{e.mts}</td>
                  <td style={td}>{e.estado}</td>
                  <td style={td}>{e.entrego}</td>
                  <td style={td}>{e.retiro}</td>
                  <td style={td}>
                    <button onClick={() => setEditItem({...e})} style={{ ...btn, fontSize: 12, padding: '4px 8px', marginRight: 4 }}>Editar</button>
                    <button onClick={() => eliminar(e)} style={{ ...btn, fontSize: 12, padding: '4px 8px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 1 && <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {pag > 1 && <button onClick={() => setPag(pag - 1)} style={btn}>‹</button>}
          <span style={{ fontSize: 12, color: '#888', lineHeight: '32px' }}>Pág {pag} de {total}</span>
          {pag < total && <button onClick={() => setPag(pag + 1)} style={btn}>›</button>}
        </div>}
      </div>

      {editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Editar egreso</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Fecha</label><input type="date" value={editItem.fecha} onChange={e => setEditItem({...editItem, fecha: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Remito origen</label><input value={editItem.remito_origen || ''} onChange={e => setEditItem({...editItem, remito_origen: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Remito entrega</label><input value={editItem.remito_entrega || ''} onChange={e => setEditItem({...editItem, remito_entrega: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Cliente</label><input value={editItem.cliente || ''} onChange={e => setEditItem({...editItem, cliente: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Tela</label><input value={editItem.tela || ''} onChange={e => setEditItem({...editItem, tela: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Color</label><input value={editItem.color || ''} onChange={e => setEditItem({...editItem, color: e.target.value})} style={inp} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Observaciones</label><input value={editItem.observaciones || ''} onChange={e => setEditItem({...editItem, observaciones: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Mts</label><input type="number" value={editItem.mts} onChange={e => setEditItem({...editItem, mts: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Bultos</label><input type="number" value={editItem.bultos} onChange={e => setEditItem({...editItem, bultos: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Estado</label>
                <select value={editItem.estado} onChange={e => setEditItem({...editItem, estado: e.target.value})} style={inp}>
                  <option>En almacén</option><option>Entregado a cliente</option><option>A producción</option><option>Salida a tinto externa</option><option>En tinto HYPE</option>
                </select>
              </div>
              <div><label style={lbl}>Quién entregó</label><input value={editItem.entrego || ''} onChange={e => setEditItem({...editItem, entrego: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Quién retiró / Envío</label><input value={editItem.retiro || ''} onChange={e => setEditItem({...editItem, retiro: e.target.value})} style={inp} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setEditItem(null)} style={btn}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Colores({ colores, onGuardar }: any) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [sigla, setSigla] = useState('');
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [pag, setPag] = useState(1);
  const POR_PAG = 20;
  const filtered = colores.filter((c: any) => c.nombre.toLowerCase().includes(search.toLowerCase()) || c.sigla.toLowerCase().includes(search.toLowerCase()));
  const total = Math.ceil(filtered.length / POR_PAG);
  const page = filtered.slice((pag - 1) * POR_PAG, pag * POR_PAG);
  async function guardar() {
    if (!sigla || !nombre) { alert('Completá sigla y nombre.'); return; }
    if (sigla.length !== 3) { alert('La sigla debe tener exactamente 3 letras.'); return; }
    setGuardando(true);
    if (editIdx !== null) await supabase.from('colores').update({ sigla: sigla.toUpperCase(), nombre }).eq('id', colores[editIdx].id);
    else await supabase.from('colores').insert([{ sigla: sigla.toUpperCase(), nombre }]);
    setModal(false); onGuardar(); setGuardando(false);
  }
  async function eliminar(c: any) {
    if (!confirm('¿Eliminar este color?')) return;
    await supabase.from('colores').delete().eq('id', c.id);
    onGuardar();
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div><div style={{ fontSize: 18, fontWeight: 500 }}>Colores</div><div style={{ fontSize: 13, color: '#888' }}>{filtered.length} colores registrados</div></div>
        <button onClick={() => { setEditIdx(null); setSigla(''); setNombre(''); setModal(true); }} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>+ Nuevo color</button>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 12 }}>
        <input placeholder="Buscar por nombre o sigla..." value={search} onChange={e => { setSearch(e.target.value); setPag(1); }} style={{ ...inp, maxWidth: 300 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th style={{ ...th, width: 80 }}>Sigla</th><th style={th}>Nombre</th><th style={{ ...th, width: 120 }}>Acciones</th></tr></thead>
          <tbody>
            {page.map((c: any) => (
              <tr key={c.id}>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#e85d2f' }}>{c.sigla}</td>
                <td style={td}>{c.nombre}</td>
                <td style={td}>
                  <button onClick={() => { setEditIdx(colores.indexOf(c)); setSigla(c.sigla); setNombre(c.nombre); setModal(true); }} style={{ ...btn, fontSize: 12, padding: '4px 10px', marginRight: 6 }}>Editar</button>
                  <button onClick={() => eliminar(c)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 1 && <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {pag > 1 && <button onClick={() => setPag(pag - 1)} style={btn}>‹</button>}
          <span style={{ fontSize: 12, color: '#888', lineHeight: '32px' }}>Pág {pag} de {total}</span>
          {pag < total && <button onClick={() => setPag(pag + 1)} style={btn}>›</button>}
        </div>}
      </div>
      {modal && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{editIdx !== null ? 'Editar' : 'Nuevo'} color</div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Sigla (3 letras)</label>
            <input value={sigla} onChange={e => setSigla(e.target.value.toUpperCase().slice(0, 3))} placeholder="Ej: ROJ" style={inp} />
          </div>
          <div><label style={lbl}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Rojo" style={inp} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setModal(false)} style={btn}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>Guardar</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

function Clientes({ clientes, onGuardar }: any) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [cod, setCod] = useState('');
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [pag, setPag] = useState(1);
  const POR_PAG = 20;
  const filtered = clientes.filter((c: any) => c.nombre.toLowerCase().includes(search.toLowerCase()) || c.cod.includes(search));
  const total = Math.ceil(filtered.length / POR_PAG);
  const page = filtered.slice((pag - 1) * POR_PAG, pag * POR_PAG);
  async function guardar() {
    if (!cod || !nombre) { alert('Completá código y nombre.'); return; }
    setGuardando(true);
    if (editIdx !== null) await supabase.from('clientes').update({ cod, nombre }).eq('id', clientes[editIdx].id);
    else await supabase.from('clientes').insert([{ cod, nombre }]);
    setModal(false); onGuardar(); setGuardando(false);
  }
  async function eliminar(c: any) {
    if (!confirm('¿Eliminar este cliente?')) return;
    await supabase.from('clientes').delete().eq('id', c.id);
    onGuardar();
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div><div style={{ fontSize: 18, fontWeight: 500 }}>Clientes</div><div style={{ fontSize: 13, color: '#888' }}>{filtered.length} registrados</div></div>
        <button onClick={() => { setEditIdx(null); setCod(''); setNombre(''); setModal(true); }} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>+ Nuevo cliente</button>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 12 }}>
        <input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPag(1); }} style={{ ...inp, maxWidth: 300 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th style={{ ...th, width: 80 }}>Código</th><th style={th}>Nombre</th><th style={{ ...th, width: 120 }}>Acciones</th></tr></thead>
          <tbody>
            {page.map((c: any) => (
              <tr key={c.id}>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{c.cod}</td>
                <td style={td}>{c.nombre}</td>
                <td style={td}>
                  <button onClick={() => { setEditIdx(clientes.indexOf(c)); setCod(c.cod); setNombre(c.nombre); setModal(true); }} style={{ ...btn, fontSize: 12, padding: '4px 10px', marginRight: 6 }}>Editar</button>
                  <button onClick={() => eliminar(c)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 1 && <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {pag > 1 && <button onClick={() => setPag(pag - 1)} style={btn}>‹</button>}
          <span style={{ fontSize: 12, color: '#888', lineHeight: '32px' }}>Pág {pag} de {total}</span>
          {pag < total && <button onClick={() => setPag(pag + 1)} style={btn}>›</button>}
        </div>}
      </div>
      {modal && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{editIdx !== null ? 'Editar' : 'Nuevo'} cliente</div>
          <div style={{ marginBottom: 12 }}><label style={lbl}>Código</label><input value={cod} onChange={e => setCod(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setModal(false)} style={btn}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>Guardar</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

function Telas({ telas, onGuardar }: any) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [cod, setCod] = useState('');
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [pag, setPag] = useState(1);
  const POR_PAG = 20;
  const filtered = telas.filter((t: any) => t.nombre.toLowerCase().includes(search.toLowerCase()) || t.cod.includes(search));
  const total = Math.ceil(filtered.length / POR_PAG);
  const page = filtered.slice((pag - 1) * POR_PAG, pag * POR_PAG);
  async function guardar() {
    if (!cod || !nombre) { alert('Completá código y nombre.'); return; }
    setGuardando(true);
    if (editIdx !== null) await supabase.from('telas').update({ cod, nombre }).eq('id', telas[editIdx].id);
    else await supabase.from('telas').insert([{ cod, nombre }]);
    setModal(false); onGuardar(); setGuardando(false);
  }
  async function eliminar(t: any) {
    if (!confirm('¿Eliminar esta tela?')) return;
    await supabase.from('telas').delete().eq('id', t.id);
    onGuardar();
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div><div style={{ fontSize: 18, fontWeight: 500 }}>Telas</div><div style={{ fontSize: 13, color: '#888' }}>{filtered.length} tipos</div></div>
        <button onClick={() => { setEditIdx(null); setCod(''); setNombre(''); setModal(true); }} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>+ Nueva tela</button>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 12 }}>
        <input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPag(1); }} style={{ ...inp, maxWidth: 300 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th style={{ ...th, width: 80 }}>Código</th><th style={th}>Nombre</th><th style={{ ...th, width: 120 }}>Acciones</th></tr></thead>
          <tbody>
            {page.map((t: any) => (
              <tr key={t.id}>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{t.cod}</td>
                <td style={td}>{t.nombre}</td>
                <td style={td}>
                  <button onClick={() => { setEditIdx(telas.indexOf(t)); setCod(t.cod); setNombre(t.nombre); setModal(true); }} style={{ ...btn, fontSize: 12, padding: '4px 10px', marginRight: 6 }}>Editar</button>
                  <button onClick={() => eliminar(t)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 1 && <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {pag > 1 && <button onClick={() => setPag(pag - 1)} style={btn}>‹</button>}
          <span style={{ fontSize: 12, color: '#888', lineHeight: '32px' }}>Pág {pag} de {total}</span>
          {pag < total && <button onClick={() => setPag(pag + 1)} style={btn}>›</button>}
        </div>}
      </div>
      {modal && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{editIdx !== null ? 'Editar' : 'Nueva'} tela</div>
          <div style={{ marginBottom: 12 }}><label style={lbl}>Código</label><input value={cod} onChange={e => setCod(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setModal(false)} style={btn}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>Guardar</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

function Empleados({ empleados, onGuardar }: any) {
  const [modal, setModal] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    if (!nombre) { alert('Ingresá el nombre.'); return; }
    setGuardando(true);
    if (editIdx !== null) await supabase.from('empleados').update({ nombre }).eq('id', empleados[editIdx].id);
    else await supabase.from('empleados').insert([{ nombre }]);
    setModal(false); onGuardar(); setGuardando(false);
  }
  async function eliminar(e: any) {
    if (!confirm('¿Eliminar este empleado?')) return;
    await supabase.from('empleados').delete().eq('id', e.id);
    onGuardar();
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div><div style={{ fontSize: 18, fontWeight: 500 }}>Empleados</div><div style={{ fontSize: 13, color: '#888' }}>{empleados.length} registrados</div></div>
        <button onClick={() => { setEditIdx(null); setNombre(''); setModal(true); }} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>+ Nuevo empleado</button>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th style={th}>Nombre</th><th style={{ ...th, width: 120 }}>Acciones</th></tr></thead>
          <tbody>
            {empleados.map((e: any) => (
              <tr key={e.id}>
                <td style={td}>{e.nombre}</td>
                <td style={td}>
                  <button onClick={() => { setEditIdx(empleados.indexOf(e)); setNombre(e.nombre); setModal(true); }} style={{ ...btn, fontSize: 12, padding: '4px 10px', marginRight: 6 }}>Editar</button>
                  <button onClick={() => eliminar(e)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{editIdx !== null ? 'Editar' : 'Nuevo'} empleado</div>
          <div><label style={lbl}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setModal(false)} style={btn}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>Guardar</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

const inp: React.CSSProperties = { fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#1a1a2e', width: '100%', boxSizing: 'border-box' };
const btn: React.CSSProperties = { padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, cursor: 'pointer' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#888', display: 'block', marginBottom: 4 };
const dropdown: React.CSSProperties = { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' };
const ddItem: React.CSSProperties = { padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0' };
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: 11, color: '#888', fontWeight: 500 };
const td: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid #f5f5f5', color: '#1a1a2e' };