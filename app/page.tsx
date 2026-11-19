'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import Login from './login';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Trae TODAS las filas de una tabla, sin el límite por defecto de 1000 filas
// que impone Supabase. Pide de a 1000 en 1000 usando .range() hasta que no
// queden más resultados.
async function fetchAll(table: string, orderBy: string, ascending = false) {
  let all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('Error cargando', table, error);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break; // ya no hay más páginas
    from += PAGE;
  }
  return all;
}

// Igual que fetchAll, pero pidiendo solo algunas columnas (para el estado
// de clientes solo necesitamos cliente + fecha de las tablas de Producción,
// no hace falta traer todo el pedido).
async function fetchColumnas(table: string, columnas: string, orderBy: string) {
  let all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columnas)
      .order(orderBy, { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('Error cargando', table, error);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ===== PERMISOS POR MAIL =====
// Quién puede hacer qué en la app. La base de datos (Supabase) tiene las mismas listas,
// así que aunque alguien se saltee el menú, no puede guardar nada que no le corresponda.
const PERMISOS: Record<string, string[]> = {
  // Ingresos, Egresos, Historiales y botón Egresar de Stock TC
  movimientos: ['ventas@hypearg.com', 'jefeproduccion@hypearg.com', 'logistica@hypearg.com'],
  // Cargar / egresar / mover / eliminar paquetes de muestras
  muestras: ['ventas@hypearg.com', 'contacto@hypearg.com', 'contacto2@hypearg.com', 'contacto03@hypearg.com', 'jefeproduccion@hypearg.com'],
  // Telas y Colores (ver y editar)
  baseDatos: ['jefeproduccion@hypearg.com', 'ventas@hypearg.com', 'contacto@hypearg.com', 'administracion@hypearg.com', 'administracion2@hypearg.com', 'matias@hypearg.com'],
  // Clientes (ver y editar): los de Base de Datos + los comerciales
  clientes: ['jefeproduccion@hypearg.com', 'ventas@hypearg.com', 'contacto@hypearg.com', 'contacto2@hypearg.com', 'contacto03@hypearg.com', 'administracion@hypearg.com', 'administracion2@hypearg.com', 'matias@hypearg.com'],
  // Empleados (ver y editar)
  empleados: ['ventas@hypearg.com', 'matias@hypearg.com'],
  // Usuarios de la app: crear, cambiar contraseñas, dar de baja
  usuarios: ['ventas@hypearg.com', 'matias@hypearg.com'],
};
function puede(email: string, permiso: string) {
  return (PERMISOS[permiso] || []).includes((email || '').trim().toLowerCase());
}

export default function Home() {
  const [pagina, setPagina] = useState('dashboard');
  const [clientes, setClientes] = useState<any[]>([]);
  const [telas, setTelas] = useState<any[]>([]);
  const [colores, setColores] = useState<any[]>([]);
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  // Pedidos de Producción y muestras (de hype-produccion, misma base de
  // datos) — se usan solo para calcular el Estado (activo/inactivo) de
  // cada cliente en la pantalla de Clientes.
  const [pedidosProduccion, setPedidosProduccion] = useState<any[]>([]);
  const [muestrasProduccion, setMuestrasProduccion] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logueado, setLogueado] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [rol, setRol] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);   // menú ☰ en el celular
  // Después de la primera carga, al guardar algo (ingreso, egreso, etc.) los datos se actualizan
  // por detrás sin mostrar "Cargando...": así la pantalla sigue en el mismo lugar.
  const yaCargo = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setEmailUsuario((session.user.email || '').toLowerCase());
        const { data: userData } = await supabase.from('usuarios').select('*').eq('email', session.user.email).single();
        if (userData) {
          setRol(userData.rol);
          setNombreUsuario(userData.nombre);
          if (['operario'].includes(userData.rol)) {
            setPagina('stockTC');
          }
        }
        setLogueado(true);
        cargarTodo();
      }
      setCheckingAuth(false);
    });
  }, []);

  async function cargarTodo() {
    if (!yaCargo.current) setLoading(true);
    const [cls, tls, cols, ings, egs, emps, pedidos, muestras] = await Promise.all([
      fetchAll('clientes', 'id'),
      fetchAll('telas', 'id'),
      fetchAll('colores', 'id'),
      fetchAll('ingresos', 'created_at'),
      fetchAll('egresos', 'created_at'),
      fetchAll('empleados', 'nombre', true),
      fetchColumnas('ordenes_directa', 'cliente, fecha', 'fecha'),
      fetchColumnas('muestras', 'cliente, fecha', 'fecha'),
    ]);
    setClientes(cls);
    setTelas(tls);
    setColores(cols);
    setIngresos(ings);
    setEgresos(egs);
    setEmpleados(emps);
    setPedidosProduccion(pedidos);
    setMuestrasProduccion(muestras);
    setLoading(false);
    yaCargo.current = true;
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    yaCargo.current = false;
    setLogueado(false); setRol(''); setNombreUsuario(''); setEmailUsuario(''); setPagina('dashboard');
  }

  function handleLogin(rolUsuario: string, nombre: string, email?: string) {
    setRol(rolUsuario);
    setNombreUsuario(nombre);
    setEmailUsuario((email || '').toLowerCase());
    setLogueado(true);
    if (['operario'].includes(rolUsuario)) {
      setPagina('stockTC');
    }
    cargarTodo();
  }

  if (checkingAuth) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff' }}>Cargando...</div>;
  if (!logueado) return <Login onLogin={handleLogin} />;

  const pMov = puede(emailUsuario, 'movimientos');
  const pMuestras = puede(emailUsuario, 'muestras');
  const pBD = puede(emailUsuario, 'baseDatos');
  const pEmp = puede(emailUsuario, 'empleados');
  const pCli = puede(emailUsuario, 'clientes');
  const pUsu = puede(emailUsuario, 'usuarios');

  function formatFecha(fecha: string) {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('-');
    if (!y || !m || !d) return fecha;
    return `${d}/${m}/${y}`;
  }

  // Dashboard, Stock TH, Stock TC y Paq. Muestras los ven todos (solo consulta si no tienen permiso)
  const navTodos = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦', ver: true, sep: false },
    { id: '__stock__', label: 'STOCK', icon: '', ver: true, sep: true },
    { id: 'ingresos', label: 'Ingresos', icon: '↓', ver: pMov, sep: false },
    { id: 'egresos', label: 'Egresos', icon: '↑', ver: pMov, sep: false },
    { id: 'stockTH', label: 'Stock TH', icon: '◫', ver: true, sep: false },
    { id: 'stockTC', label: 'Stock TC', icon: '◫', ver: true, sep: false },
    { id: 'stockTienda', label: 'Stock TIENDA', icon: '◫', ver: true, sep: false },
    { id: 'paqMuestras', label: 'Paq. Muestras', icon: '▣', ver: true, sep: false },
    { id: 'historialIngresos', label: 'Hist. Ingresos', icon: '☰', ver: pMov, sep: false },
    { id: 'historialEgresos', label: 'Hist. Egresos', icon: '☰', ver: pMov, sep: false },
    { id: '__bd__', label: 'BASE DE DATOS', icon: '', ver: pBD || pCli || pEmp || pUsu, sep: true },
    { id: 'clientes', label: 'Clientes', icon: '♟', ver: pCli, sep: false },
    { id: 'telas', label: 'Telas', icon: '≡', ver: pBD, sep: false },
    { id: 'colores', label: 'Colores', icon: '◉', ver: pBD, sep: false },
    { id: 'empleados', label: 'Empleados', icon: '👤', ver: pEmp, sep: false },
    { id: 'usuarios', label: 'Usuarios', icon: '🔑', ver: pUsu, sep: false },
  ];
  const navItems = navTodos.filter(n => n.ver);

  function calcStock() {
    const stockMap: any = {};
    ingresos.forEach((i: any) => {
      if (!stockMap[i.id_hype]) stockMap[i.id_hype] = {
        ing: 0, egr: 0, tela: i.tela, cliente: i.cliente, proceso: i.proceso,
        color: i.color, observaciones: i.observaciones, bultos: 0,
        ubicacion: i.ubicacion, ramado: i.ramado, recibido: i.recibido, remito: i.remito,
        fecha: i.fecha, remitos: [] as string[]
      };
      if (i.fecha && (!stockMap[i.id_hype].fecha || i.fecha < stockMap[i.id_hype].fecha)) stockMap[i.id_hype].fecha = i.fecha;
      if (i.remito && !stockMap[i.id_hype].remitos.includes(String(i.remito))) stockMap[i.id_hype].remitos.push(String(i.remito));
      stockMap[i.id_hype].ing += Number(i.mts);
      stockMap[i.id_hype].bultos += Number(i.bultos || 0);
    });
    egresos.forEach((e: any) => {
      if (stockMap[e.id_hype]) {
        stockMap[e.id_hype].egr += Number(e.mts);
        stockMap[e.id_hype].bultos -= Number(e.bultos || 0);
      }
    });
    // Redondeo a 2 decimales: evita saldos "fantasma" como -0,00000001 por sumas con decimales
    Object.values(stockMap).forEach((s: any) => { s.ing = Math.round(s.ing * 100) / 100; s.egr = Math.round(s.egr * 100) / 100; });
    return stockMap;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Barra de arriba con el botón ☰ (solo se ve en el celular) */}
      <div className="hs-topbar">
        <button onClick={() => setMenuAbierto(true)} aria-label="Abrir menú" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, lineHeight: 1, padding: '2px 6px', cursor: 'pointer' }}>☰</button>
        <img src="/logo.png" alt="HYPE printlab" style={{ height: 26, display: 'block' }} />
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{navItems.find(n => n.id === pagina)?.label || ''}</div>
      </div>
      <div className={'hs-overlay' + (menuAbierto ? ' abierto' : '')} onClick={() => setMenuAbierto(false)} />
      <div className={'hs-sidebar' + (menuAbierto ? ' abierto' : '')} style={{ width: 200, background: '#1a1a2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <img src="/logo.png" alt="HYPE printlab" style={{ width: '100%', maxWidth: 160, display: 'block' }} />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginTop: 6 }}>STOCK & PRODUCCIÓN</div>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{nombreUsuario}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{rol}</div>
        </div>
        {navItems.map(n => (
          n.sep ? (
            <div key={n.id} style={{ padding: '12px 16px 4px', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>{n.label}</div>
          ) : (
            <div key={n.id} onClick={() => { setPagina(n.id); setMenuAbierto(false); }} style={{
              padding: '10px 16px', cursor: 'pointer', color: pagina === n.id ? '#fff' : 'rgba(255,255,255,0.55)',
              background: pagina === n.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderLeft: pagina === n.id ? '2px solid #e85d2f' : '2px solid transparent',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span>{n.icon}</span>{n.label}
            </div>
          )
        ))}
        <div style={{ marginTop: 'auto', padding: 16 }}>
          <button onClick={cerrarSesion} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer' }}>Cerrar sesión</button>
        </div>
      </div>

      <div className="hs-main" style={{ marginLeft: 200, padding: 24, flex: 1, background: '#f5f5f7', minHeight: '100vh' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando...</div>}
        {!loading && (
          <>
            {pagina === 'dashboard' && <Dashboard ingresos={ingresos} egresos={egresos} clientes={clientes} calcStock={calcStock} formatFecha={formatFecha} />}
            {pagina === 'ingresos' && pMov && <Ingresos clientes={clientes} telas={telas} colores={colores} empleados={empleados} ingresos={ingresos} onGuardar={cargarTodo} />}
            {pagina === 'egresos' && pMov && <Egresos ingresos={ingresos} egresos={egresos} clientes={clientes} telas={telas} colores={colores} empleados={empleados} onGuardar={cargarTodo} />}
            {pagina === 'stockTH' && <StockTH calcStock={calcStock} ingresos={ingresos} formatFecha={formatFecha} onGuardar={cargarTodo} puedeEgresar={pMov} />}
            {pagina === 'stockTienda' && <StockTH prefijo="TT" calcStock={calcStock} ingresos={ingresos} formatFecha={formatFecha} onGuardar={cargarTodo} puedeEgresar={pMov} />}
            {pagina === 'stockTC' && <StockTC calcStock={calcStock} ingresos={ingresos} formatFecha={formatFecha} onGuardar={cargarTodo} puedeEgresar={pMov} />}
            {pagina === 'paqMuestras' && <PaqMuestras clientes={clientes} formatFecha={formatFecha} puedeEditar={pMuestras} />}
            {pagina === 'clientes' && pCli && <Clientes clientes={clientes} ingresos={ingresos} egresos={egresos} onGuardar={cargarTodo} />}
            {pagina === 'telas' && pBD && <Telas telas={telas} onGuardar={cargarTodo} />}
            {pagina === 'colores' && pBD && <Colores colores={colores} onGuardar={cargarTodo} />}
            {pagina === 'empleados' && pEmp && <Empleados empleados={empleados} onGuardar={cargarTodo} />}
            {pagina === 'usuarios' && pUsu && <Usuarios formatFecha={formatFecha} />}
            {pagina === 'historialIngresos' && pMov && <HistorialIngresos ingresos={ingresos} onGuardar={cargarTodo} clientes={clientes} telas={telas} empleados={empleados} formatFecha={formatFecha} />}
            {pagina === 'historialEgresos' && pMov && <HistorialEgresos egresos={egresos} onGuardar={cargarTodo} formatFecha={formatFecha} />}
          </>
        )}
      </div>
    </div>
  );
}

function Dashboard({ ingresos, egresos, clientes, calcStock, formatFecha }: any) {
  const stock = calcStock();
  const totalTC = Object.entries(stock).filter(([id]: any) => id.startsWith('TC')).reduce((s: number, [, v]: any) => s + v.ing - v.egr, 0);
  const totalTH = Object.entries(stock).filter(([id]: any) => id.startsWith('TH')).reduce((s: number, [, v]: any) => s + v.ing - v.egr, 0);
  const totalTienda = Object.entries(stock).filter(([id]: any) => id.startsWith('TT')).reduce((s: number, [, v]: any) => s + v.ing - v.egr, 0);
  const pendientes = egresos.filter((e: any) => e.estado === 'En almacén').length;
  // Telas de clientes pedidas en la planilla (sin fecha fin) que todavía no están en Stock TC
  const [tcSinStock, setTcSinStock] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('pedidos_tc_sin_stock').select('*').order('fecha_pedido', { ascending: true }).order('fila', { ascending: true })
      .then(({ data }) => setTcSinStock(data || []));
  }, []);
  // Telas HYPE (TH) pedidas en la planilla (sin fecha fin) que no alcanzan con el stock: faltante = pedido − disponible
  const [pedidosTH, setPedidosTH] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('pedidos_th').select('clave, id_hype, tela, color, mts_pedidos').then(({ data }) => setPedidosTH(data || []));
  }, []);
  const nTH = (x: any) => (x ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const thFaltantes = pedidosTH.map((p: any) => {
    const disp = Object.entries(stock).filter(([id, v]: any) => id.startsWith('TH') &&
      ('TH:' + nTH(v.tela) + ':' + nTH(v.color) === p.clave || id.replace(/-\d+$/, '') === p.id_hype))
      .reduce((t: number, [, v]: any) => t + v.ing - v.egr, 0);
    return { clave: p.clave, tela: p.tela, color: p.color, falta: Math.round((Number(p.mts_pedidos || 0) - disp) * 100) / 100 };
  }).filter((x: any) => x.falta > 0).sort((a: any, b: any) => String(a.tela).localeCompare(String(b.tela)) || String(a.color).localeCompare(String(b.color)));
  // PRE / POST tratamiento: filas de la planilla sin fecha fin con SI en PRE o POST, consolidadas por OT + cliente + tela
  const [tratamientos, setTratamientos] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('tratamientos_pendientes').select('*').then(({ data }) => setTratamientos(data || []));
  }, []);
  const agruparTrat = (filtro: (r: any) => boolean) => Object.values(tratamientos.filter(filtro).reduce((acc: Record<string, any>, r: any) => {
    const k = (r.nro_ot || '') + '|' + (r.cliente || '') + '|' + (r.tela || '');
    const g = acc[k] || (acc[k] = { key: k, nro_ot: r.nro_ot, cliente: r.cliente, tela: r.tela, mts: 0 });
    g.mts += Number(r.mts || 0);
    return acc;
  }, {})).sort((a: any, b: any) => String(a.nro_ot).localeCompare(String(b.nro_ot), undefined, { numeric: true }) || String(a.tela).localeCompare(String(b.tela)));
  const preTrat = agruparTrat((r: any) => r.pre);
  const postTrat = agruparTrat((r: any) => r.post);
  // Consolidado por Nro de OT, separado por tela (suma los mts pedidos de las filas iguales)
  const tcAgrupado = Object.values(tcSinStock.reduce((acc: Record<string, any>, r: any) => {
    const k = (r.nro_ot || '') + '|' + (r.tela || '').toString().toUpperCase().replace(/\s+/g, ' ').trim();
    const g = acc[k] || (acc[k] = { key: k, fecha_pedido: r.fecha_pedido, nro_ot: r.nro_ot, cliente: r.cliente, tela: r.tela, mts_pedidos: 0 });
    g.mts_pedidos += Number(r.mts_pedidos || 0);
    if (r.fecha_pedido && (!g.fecha_pedido || r.fecha_pedido < g.fecha_pedido)) g.fecha_pedido = r.fecha_pedido;
    return acc;
  }, {})).sort((a: any, b: any) => (a.fecha_pedido || '').localeCompare(b.fecha_pedido || '') || String(a.nro_ot).localeCompare(String(b.nro_ot), undefined, { numeric: true }) || String(a.tela).localeCompare(String(b.tela)));
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Dashboard</div>
        <div style={{ fontSize: 13, color: '#888' }}>Resumen general</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Clientes', value: clientes.length, sub: 'registrados' },
          { label: 'Stock TC', value: totalTC.toLocaleString(), sub: 'metros disponibles' },
          { label: 'Stock TH', value: totalTH.toLocaleString(), sub: 'metros disponibles' },
          { label: 'Stock TIENDA', value: (Math.round(totalTienda * 100) / 100).toLocaleString(), sub: 'metros disponibles' },
          { label: 'Pendientes entrega', value: pendientes, sub: 'egresos en depósito' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '8px 12px', border: '1px solid #eee' }}>
            <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginTop: 2 }}>{m.value}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #eee', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#e85d2f', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Telas TC sin stock</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Pedidos de la planilla de producción (sin fecha fin) con tela del cliente que todavía no está en Stock TC · {tcAgrupado.length} OT / tela · <span style={{ color: '#c00', fontWeight: 700 }}>-{(Math.round(tcSinStock.reduce((t: number, r: any) => t + Number(r.mts_pedidos || 0), 0) * 100) / 100).toLocaleString()} mts</span></div>
        <div style={{ overflow: 'auto', maxHeight: 300 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Fecha pedido','Nro OT','Cliente','Tela','Mts ped.'].map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #eee', fontSize: 10, color: '#888', position: 'sticky', top: 0, background: '#fff' }}>{h}</th>)}</tr></thead>
            <tbody>
              {tcAgrupado.length === 0 && <tr><td colSpan={5} style={{ padding: 10, textAlign: 'center', color: '#888' }}>No hay telas de clientes pendientes sin stock</td></tr>}
              {tcAgrupado.map((r: any) => (
                <tr key={r.key}>
                  <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{formatFecha(r.fecha_pedido)}</td>
                  <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.nro_ot || '—'}</td>
                  <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.cliente || '—'}</td>
                  <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.tela}</td>
                  <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, color: '#c00', whiteSpace: 'nowrap' }}>-{(Math.round(Number(r.mts_pedidos || 0) * 100) / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #eee', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#e85d2f', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Telas TH sin stock</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Metros pedidos en la planilla (sin fecha fin) menos el stock disponible · {thFaltantes.length} telas · <span style={{ color: '#c00', fontWeight: 700 }}>-{(Math.round(thFaltantes.reduce((t: number, x: any) => t + x.falta, 0) * 100) / 100).toLocaleString()} mts</span></div>
        <div style={{ overflow: 'auto', maxHeight: 300 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Tela','Color','Mts faltantes'].map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #eee', fontSize: 10, color: '#888', position: 'sticky', top: 0, background: '#fff' }}>{h}</th>)}</tr></thead>
            <tbody>
              {thFaltantes.length === 0 && <tr><td colSpan={3} style={{ padding: 10, textAlign: 'center', color: '#888' }}>No hay telas HYPE con faltante</td></tr>}
              {thFaltantes.map((x: any) => (
                <tr key={x.clave}>
                  <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>T HYPE {x.tela}</td>
                  <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>{x.color || '—'}</td>
                  <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, color: '#c00', whiteSpace: 'nowrap' }}>-{x.falta.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        {[
          { titulo: 'Pretratamiento', filas: preTrat },
          { titulo: 'Postratamiento', filas: postTrat },
        ].map(card => (
          <div key={card.titulo} style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #eee' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#e85d2f', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{card.titulo}</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>OT sin fecha fin con SI en {card.titulo === 'Pretratamiento' ? 'PRE' : 'POST'} · {card.filas.length} OT / tela · <b>{(Math.round(card.filas.reduce((t: number, r: any) => t + r.mts, 0) * 100) / 100).toLocaleString()} mts</b></div>
            <div style={{ overflow: 'auto', maxHeight: 300 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Nro OT','Cliente','Tela','Mts'].map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #eee', fontSize: 10, color: '#888', position: 'sticky', top: 0, background: '#fff' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {card.filas.length === 0 && <tr><td colSpan={4} style={{ padding: 10, textAlign: 'center', color: '#888' }}>No hay OT pendientes</td></tr>}
                  {card.filas.map((r: any) => (
                    <tr key={r.key}>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.nro_ot || '—'}</td>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.cliente || '—'}</td>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.tela || '—'}</td>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, whiteSpace: 'nowrap' }}>{(Math.round(r.mts * 100) / 100).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== PAQ. MUESTRAS =====================
// Registro de paquetes de muestras (telas varias) que manda cada cliente. Se cuentan por unidad
// (1 paquete, 2 paquetes...). "Egresar" descuenta paquetes cuando se usan o se devuelven.
function PaqMuestras({ clientes, formatFecha, puedeEditar }: any) {
  const hoy = () => new Date().toISOString().split('T')[0];
  const [lista, setLista] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fecha, setFecha] = useState(hoy());
  const [cliente, setCliente] = useState('');
  const [busqCli, setBusqCli] = useState('');
  const [showCli, setShowCli] = useState(false);
  const [paquete, setPaquete] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [remito, setRemito] = useState('');
  const [ubicacion, setUbicacion] = useState('CARRO');
  const [obs, setObs] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [soloDisp, setSoloDisp] = useState(true);
  const ubicaciones = ['CARRO', '1-A','1-B','1-C','1-D','2-A','2-B','2-C','3-A','3-B','3-C','3-D','4-A','4-B','4-C','5-A','5-B','6-A','6-B','ISLA','PARED','ENVIADO A SUBLI'];

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase.from('paq_muestras').select('*').order('fecha', { ascending: false }).order('id', { ascending: false });
    if (error) alert('Error cargando paquetes: ' + error.message);
    setLista(data || []);
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function registrar() {
    const cant = parseInt(cantidad);
    if (!fecha || !cliente.trim() || !paquete.trim() || !(cant > 0)) { alert('Completá fecha, cliente, paquete y cantidad.'); return; }
    setGuardando(true);
    const { error } = await supabase.from('paq_muestras').insert([{ fecha, cliente: cliente.trim(), paquete: paquete.trim(), cantidad: cant, remito: remito.trim() || null, ubicacion: ubicacion.trim() || 'CARRO', observaciones: obs.trim() || null }]);
    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    setPaquete(''); setCantidad('1'); setRemito(''); setObs('');
    cargar();
  }

  async function egresar(p: any) {
    const disp = p.cantidad - p.egresados;
    const txt = window.prompt(`Egresar paquetes de ${p.cliente} · ${p.paquete}\nDisponibles: ${disp}\n\n¿Cuántos paquetes?`, String(disp));
    if (txt === null) return;
    const n = parseInt(txt);
    if (!(n > 0) || n > disp) { alert('Cantidad inválida (máximo ' + disp + ').'); return; }
    const { error } = await supabase.from('paq_muestras').update({ egresados: p.egresados + n, fecha_egreso: hoy() }).eq('id', p.id);
    if (error) { alert('Error: ' + error.message); return; }
    cargar();
  }

  async function cambiarUbicacion(p: any, u: string) {
    const { error } = await supabase.from('paq_muestras').update({ ubicacion: u }).eq('id', p.id);
    if (error) alert('Error: ' + error.message); else cargar();
  }

  async function eliminar(p: any) {
    if (!confirm(`¿Eliminar el registro de ${p.cliente} · ${p.paquete}? No se puede deshacer.`)) return;
    const { error } = await supabase.from('paq_muestras').delete().eq('id', p.id);
    if (error) alert('Error: ' + error.message); else cargar();
  }

  const q = buscar.trim().toLowerCase();
  const filtrados = lista.filter((p: any) => (!soloDisp || p.cantidad - p.egresados > 0) &&
    (!q || [p.cliente, p.paquete, p.remito, p.ubicacion, p.observaciones].some((x: any) => (x || '').toString().toLowerCase().includes(q))));
  const totalDisp = lista.reduce((t: number, p: any) => t + Math.max(0, p.cantidad - p.egresados), 0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Paq. Muestras</div>
        <div style={{ fontSize: 13, color: '#888' }}>Paquetes de muestras de clientes (telas varias) · se cuentan por unidad · {totalDisp} paquetes disponibles</div>
      </div>
      {puedeEditar && <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eee', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Registrar ingreso de paquete</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, alignItems: 'end' }}>
          <div><label style={lbl}>Fecha</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} /></div>
          <div style={{ position: 'relative' }}>
            <label style={lbl}>Cliente</label>
            <input value={busqCli} onChange={e => { setBusqCli(e.target.value); setCliente(e.target.value); setShowCli(true); }} placeholder="Buscar cliente..." style={inp} />
            {showCli && busqCli && (
              <div style={dropdown}>
                {clientes.filter((c: any) => c.nombre.toLowerCase().includes(busqCli.toLowerCase())).slice(0, 8).map((c: any) => (
                  <div key={c.cod} onClick={() => { setCliente(c.nombre); setBusqCli(c.nombre); setShowCli(false); }} style={ddItem}>{c.nombre}</div>
                ))}
              </div>
            )}
          </div>
          <div><label style={lbl}>Paquete (descripción)</label><input value={paquete} onChange={e => setPaquete(e.target.value)} placeholder="Ej: PAQ BULL TELAS VARIAS" style={inp} /></div>
          <div><label style={lbl}>Cantidad (paquetes)</label><input type="number" min={1} value={cantidad} onChange={e => setCantidad(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Remito (opcional)</label><input value={remito} onChange={e => setRemito(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Ubicación</label>
            <select value={ubicacion} onChange={e => setUbicacion(e.target.value)} style={inp}>{ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}</select>
          </div>
          <div><label style={lbl}>Observaciones</label><input value={obs} onChange={e => setObs(e.target.value)} style={inp} /></div>
          <div><button onClick={registrar} disabled={guardando} style={{ ...btn, width: '100%', background: '#e85d2f', color: '#fff', border: 'none', fontWeight: 600 }}>{guardando ? 'Guardando...' : 'Registrar'}</button></div>
        </div>
      </div>}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <input placeholder="Buscar por cliente, paquete, remito, ubicación..." value={buscar} onChange={e => setBuscar(e.target.value)} style={{ ...inp, maxWidth: 360 }} />
        <label style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={soloDisp} onChange={e => setSoloDisp(e.target.checked)} /> Solo con paquetes disponibles</label>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Fecha', 'Cliente', 'Paquete', 'Cant.', 'Disp.', 'Remito', 'Ubicación', 'Observaciones', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {cargando && <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#888' }}>Cargando...</td></tr>}
            {!cargando && filtrados.length === 0 && <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#888' }}>No hay paquetes</td></tr>}
            {filtrados.map((p: any) => {
              const disp = p.cantidad - p.egresados;
              return (
                <tr key={p.id} style={disp <= 0 ? { color: '#999' } : undefined}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatFecha(p.fecha)}</td>
                  <td style={td}>{p.cliente}</td>
                  <td style={td}>{p.paquete}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{p.cantidad}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: disp > 0 ? '#3B6D11' : '#999' }}>{disp}{p.fecha_egreso && p.egresados > 0 && <div style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>egr. {formatFecha(p.fecha_egreso)}</div>}</td>
                  <td style={td}>{p.remito || '—'}</td>
                  <td style={td}>
                    {puedeEditar ? (
                      <select value={p.ubicacion || 'CARRO'} onChange={e => cambiarUbicacion(p, e.target.value)} style={{ ...inp, fontSize: 12, padding: '3px 6px' }}>
                        {[...new Set([p.ubicacion || 'CARRO', ...ubicaciones])].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (p.ubicacion || 'CARRO')}
                  </td>
                  <td style={td}>{p.observaciones || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {puedeEditar && disp > 0 && <button onClick={() => egresar(p)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#e85d2f', color: '#fff', border: 'none', fontWeight: 600, marginRight: 6 }}>Egresar</button>}
                    {puedeEditar && <button onClick={() => eliminar(p)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Eliminar</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockTabla({ entries, titulo, ingresos, formatFecha, resaltarNegativo, mostrarFechaRemito, mostrarPedidos, onEgresar, soloTelaColor }: any) {
  // soloTelaColor: en Stock TH no se muestra la columna Cliente (siempre es HYPE)
  const [search, setSearch] = useState('');
  // Búsqueda sin importar mayúsculas, tildes ni espacios ("off white" = "OFFWHITE")
  const normTxt = (x: any) => (x ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const coincide = (texto: any, q: string) => {
    const t = normTxt(texto);
    return t.includes(q) || t.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
  };
  const filtered = entries.filter(([id, s]: any) => {
    if (!search) return true;
    const q = normTxt(search).trim();
    if (!q) return true;
    // En Stock TH consolidado el ID puede ser "ID1 + ID2": se busca en todos sus ingresos
    const ids = String(id).split(' + ');
    const enIngresos = ingresos.some((i: any) => ids.includes(i.id_hype) &&
      (coincide(i.remito, q) || coincide(i.observaciones, q) || coincide(i.color, q) || coincide(i.ubicacion, q) ||
       coincide(i.fecha, q) || coincide(formatFecha(i.fecha), q)));
    return coincide(id, q) ||
      coincide(s.cliente, q) ||
      coincide(s.tela, q) ||
      coincide(s.color, q) ||
      coincide(s.observaciones, q) ||
      coincide(s.remito, q) ||
      coincide(s.ubicacion, q) ||
      coincide(s.fecha, q) || coincide(formatFecha(s.fecha), q) ||
      enIngresos;
  });
  const totalMts = filtered.reduce((s: number, [, v]: any) => s + v.ing - v.egr, 0);
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: '#888' }}>{filtered.length} IDs · {totalMts.toLocaleString()} mts disponibles{mostrarPedidos && <> · <span style={{ color: '#c00' }}>-{(Math.round(filtered.reduce((t: number, [, v]: any) => t + Math.max(0, Number(v.ped || 0) - (v.ing - v.egr)), 0) * 100) / 100).toLocaleString()} mts faltantes (pedidos sin fecha fin)</span></>}</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 16 }}>
        <input placeholder="Buscar por cliente, tela, color, observaciones, ID, remito, fecha (dd/mm/aaaa) o ubicación..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, maxWidth: 400 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{[...(mostrarFechaRemito ? ['Fecha', 'Remito'] : []),'ID',...(soloTelaColor ? [] : ['Cliente']),'Tela','Color','Observaciones','Bultos',...(mostrarPedidos ? ['Mts ped.'] : []),'Mts disp.','Ubicación','Ramado','Proceso',...(onEgresar ? [''] : [])].map(h =>
                <th key={h} style={h === 'Remito' ? { ...th, width: 64, maxWidth: 64, minWidth: 64, padding: '9px 4px', whiteSpace: 'normal', fontSize: 10 } : { ...th, whiteSpace: 'nowrap' }}>{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={(mostrarFechaRemito ? 12 : 10) - (soloTelaColor ? 1 : 0) + (mostrarPedidos ? 1 : 0) + (onEgresar ? 1 : 0)} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Sin stock registrado</td></tr>}
              {filtered.map(([id, s]: any) => {
                const disp = s.ing - s.egr;
                const esNegativo = resaltarNegativo && disp < 0;
                return (
                  <tr key={id + '|' + (s.remito ?? '')} style={esNegativo ? { background: '#fdecea' } : undefined}>
                    {mostrarFechaRemito && <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatFecha(s.fecha)}</td>}
                    {mostrarFechaRemito && <td style={{ ...td, width: 64, maxWidth: 64, minWidth: 64, padding: '9px 4px', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.2 }}>{(s.remitos && s.remitos.length ? s.remitos : [s.remito || '—']).map((rm: string) => <div key={rm} style={{ whiteSpace: 'nowrap' }}>{rm}</div>)}</td>}
                    <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f', fontSize: 11, whiteSpace: 'nowrap' }}>{id}</td>
                    {!soloTelaColor && <td style={{ ...td, whiteSpace: 'nowrap' }}>{s.cliente}</td>}
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{s.tela}</td>
                    <td style={td}>{s.color || '—'}</td>
                    <td style={{ ...td, whiteSpace: 'normal', minWidth: 150 }}>{s.observaciones || '—'}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{s.bultos}</td>
                    {mostrarPedidos && (
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {Number(s.ped || 0) - disp > 0
                          ? <span style={{ fontWeight: 700, color: '#c00' }}>-{(Math.round((Number(s.ped) - disp) * 100) / 100).toLocaleString()}</span>
                          : '—'}
                      </td>
                    )}
                    <td style={{ ...td, textAlign: 'center' }}>
                      {esNegativo ? (
                        <span style={{ fontWeight: 700, color: '#c00', textTransform: 'uppercase' }}>
                          {disp.toLocaleString()} — SALDO NEGATIVO
                        </span>
                      ) : (
                        <span style={{ fontWeight: 700, color: disp > 0 ? '#3B6D11' : '#c00' }}>{disp.toLocaleString()}</span>
                      )}
                    </td>
                    <td style={td}>{s.ubicacion || '—'}</td>
                    <td style={td}>{s.ramado || '—'}</td>
                    <td style={td}>{s.proceso === 'S' ? 'Sublimación' : 'Digital'}</td>
                    {onEgresar && (
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {disp > 0 && <button onClick={() => onEgresar(id, s, disp)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#e85d2f', color: '#fff', border: 'none', fontWeight: 600 }}>Egresar</button>}
                      </td>
                    )}
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

// prefijo 'TH' = Stock TH (tela HYPE) · prefijo 'TT' = Stock Tienda (mismas telas,
// unidad de negocio aparte con su propio stock)
function StockTH({ calcStock, ingresos, formatFecha, onGuardar, puedeEgresar, prefijo = 'TH' }: any) {
  const stock = calcStock();
  const esTienda = prefijo === 'TT';
  // Botón "Egresar" (igual que en Stock TC). La fila junta varios IDs de la
  // misma tela + color: los metros se descuentan del ID más antiguo primero.
  async function egresar(idFila: string, s: any, disp: number) {
    const dispR = Math.round(disp * 100) / 100;
    const txt = window.prompt(`Egresar de ${s.tela} · ${s.color || ''}\n${idFila}\n\nMetros a egresar (disponible ${dispR.toLocaleString()}):`, String(dispR));
    if (txt === null) return;
    const mts = parseFloat(txt.replace(',', '.'));
    if (!(mts > 0)) { alert('Metros inválidos.'); return; }
    if (mts > dispR + 0.001 && !confirm(`Vas a egresar ${mts} mts y hay ${dispR} disponibles. ¿Seguir igual?`)) return;
    const remitoEntrega = window.prompt('Nro. de remito de entrega (opcional, dejalo vacío si no tiene):', '') || '';
    if (!confirm(`¿Confirmás el egreso de ${mts} mts de ${s.tela} ${s.color || ''}?`)) return;
    const ids: string[] = (s.ids && s.ids.length ? s.ids : [idFila]).slice()
      .sort((a: string, b: string) => ((stock[a]?.fecha || '') < (stock[b]?.fecha || '') ? -1 : (stock[a]?.fecha || '') > (stock[b]?.fecha || '') ? 1 : 0));
    let resto = mts;
    const filas: any[] = [];
    ids.forEach((id, k) => {
      if (resto <= 0.0001) return;
      const d = Math.max(0, Math.round(((stock[id]?.ing || 0) - (stock[id]?.egr || 0)) * 100) / 100);
      const toma = k === ids.length - 1 ? resto : Math.min(resto, d);
      if (toma <= 0.0001) return;
      resto = Math.round((resto - toma) * 100) / 100;
      filas.push({
        fecha: new Date().toISOString().split('T')[0], cliente: stock[id]?.cliente || s.cliente || 'HYPE', tela: s.tela, color: s.color,
        id_hype: id, mts: Math.round(toma * 100) / 100, bultos: 0, remito_origen: null, remito_entrega: remitoEntrega.trim() || null,
        observaciones: esTienda ? 'EGRESO DESDE STOCK TIENDA' : 'EGRESO DESDE STOCK TH', estado: 'En almacén',
      });
    });
    const { error } = await supabase.from('egresos').insert(filas);
    if (error) { alert('Error al egresar: ' + error.message); return; }
    alert('✅ Egreso guardado. Lo ves en Historial de egresos.');
    if (onGuardar) onGuardar();
  }
  // Metros pedidos pendientes (filas de la planilla de producción sin fecha fin),
  // que manda la planilla cada 5 minutos a la tabla pedidos_th.
  const [pedidos, setPedidos] = useState<any[]>([]);
  useEffect(() => {
    if (esTienda) return;   // Stock Tienda no tiene pedidos de la planilla
    supabase.from('pedidos_th').select('clave, id_hype, mts_pedidos').then(({ data }) => setPedidos(data || []));
  }, [esTienda]);
  const claveTH = (tela: any, color: any) => {
    const n = (x: any) => (x ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return 'TH:' + n(tela) + ':' + n(color);
  };
  // Consolidado: una sola fila por tela + color, sumando todos los IDs y
  // remitos de esa misma tela HYPE (ej: todo el LINO OFF WHITE junto).
  const norm = (x: any) => (x || '').toString().toUpperCase().replace(/\s+/g, '');
  const grupos: Record<string, any> = {};
  Object.entries(stock).filter(([id]: any) => id.startsWith(prefijo)).forEach(([id, s]: any) => {
    const k = norm(s.tela) + '|' + norm(s.color);
    if (!grupos[k]) grupos[k] = { ...s, ing: 0, egr: 0, bultos: 0, ids: [] as string[], remitos: [] as string[] };
    const g = grupos[k];
    g.ing += s.ing; g.egr += s.egr; g.bultos += Number(s.bultos || 0);
    g.ids.push(id);
    (s.remitos || []).forEach((r: string) => { if (!g.remitos.includes(r)) g.remitos.push(r); });
    if (s.fecha && (!g.fecha || s.fecha < g.fecha)) g.fecha = s.fecha;
  });
  Object.values(grupos).forEach((g: any) => {
    const clave = claveTH(g.tela, g.color);
    const p = pedidos.find((x: any) => x.clave === clave || g.ids.includes(x.id_hype));
    g.ped = p ? Number(p.mts_pedidos) || 0 : 0;
  });
  const entries = Object.values(grupos)
    .map((g: any) => [g.ids.join(' + '), g])
    .sort((a: any, b: any) => String(a[1].tela).localeCompare(String(b[1].tela)));
  const tabla = <StockTabla entries={entries} titulo={esTienda ? 'Stock TIENDA — Telas de la TIENDA (consolidado por tela)' : 'Stock TH — Tela propia HYPE (consolidado por tela)'} ingresos={ingresos} formatFecha={formatFecha} resaltarNegativo mostrarPedidos={!esTienda} soloTelaColor onEgresar={puedeEgresar ? egresar : undefined} />;
  if (!esTienda) return tabla;
  return (
    <div>
      {puedeEgresar && <IngresoTienda ingresos={ingresos} onGuardar={onGuardar} />}
      {tabla}
    </div>
  );
}

// Ingreso directo en Stock Tienda: se elige una tela HYPE (mismo catálogo que
// Stock TH) y se carga con el código TT, que es un stock aparte.
function IngresoTienda({ ingresos, onGuardar }: any) {
  const hoy = new Date().toISOString().split('T')[0];
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [f, setF] = useState({ fecha: hoy, idTT: '', mts: '', bultos: '', remito: '', ubicacion: '', obs: '' });
  const catalogo = (() => {
    const m = new Map<string, any>();
    (ingresos || []).forEach((i: any) => {
      const id = (i.id_hype || '').toString().trim().replace(/-\d+$/, '');
      const pre = id.slice(0, 2).toUpperCase();
      if (pre !== 'TH' && pre !== 'TT') return;
      const idTT = 'TT' + id.slice(2);
      if (m.has(idTT)) return;
      m.set(idTT, { idTT, proceso: i.proceso || id.charAt(2), tela: i.tela || '', codTela: i.cod_tela || '', color: i.color || '', siglaColor: i.sigla_color || '', codCliente: i.cod_cliente || '', cliente: i.cliente || 'HYPE' });
    });
    return Array.from(m.values()).sort((a: any, b: any) => String(a.tela).localeCompare(String(b.tela)) || String(a.color).localeCompare(String(b.color)));
  })();
  async function guardar() {
    const c = catalogo.find((x: any) => x.idTT === f.idTT);
    const mts = parseFloat(String(f.mts).replace(',', '.'));
    if (!c) { alert('Elegí la tela.'); return; }
    if (!(mts > 0)) { alert('Completá los metros.'); return; }
    if (!f.fecha) { alert('Completá la fecha.'); return; }
    setGuardando(true);
    const { error } = await supabase.from('ingresos').insert([{
      fecha: f.fecha, remito: f.remito.trim() || 'TIENDA', cliente: c.cliente || 'HYPE', cod_cliente: c.codCliente,
      prop: 'TT', proceso: c.proceso, tela: c.tela, cod_tela: c.codTela, color: c.color, sigla_color: c.siglaColor,
      observaciones: f.obs.trim(), bultos: parseInt(f.bultos) || 0, mts, ramado: 'No', ubicacion: f.ubicacion.trim(),
      id_hype: c.idTT, estado: 'En almacén',
    }]);
    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    alert('✅ Ingreso guardado en Stock TIENDA.');
    setF({ fecha: hoy, idTT: '', mts: '', bultos: '', remito: '', ubicacion: '', obs: '' });
    setAbierto(false);
    if (onGuardar) onGuardar();
  }
  if (!abierto) return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setAbierto(true)} style={{ ...btn, background: '#e85d2f', color: '#fff', border: 'none', fontWeight: 600 }}>+ Ingresar a Stock TIENDA</button>
    </div>
  );
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Ingresar a Stock TIENDA</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <div><label style={lbl}>Fecha</label><input type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} style={inp} /></div>
        <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Tela</label>
          <select value={f.idTT} onChange={e => setF({ ...f, idTT: e.target.value })} style={inp}>
            <option value="">Seleccionar tela...</option>
            {catalogo.map((c: any) => <option key={c.idTT} value={c.idTT}>{c.tela} · {c.color || 'SIN COLOR'}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Metros</label><input type="number" value={f.mts} onChange={e => setF({ ...f, mts: e.target.value })} placeholder="0" style={inp} /></div>
        <div><label style={lbl}>Bultos</label><input type="number" value={f.bultos} onChange={e => setF({ ...f, bultos: e.target.value })} placeholder="0" style={inp} /></div>
        <div><label style={lbl}>Nro. remito (opcional)</label><input value={f.remito} onChange={e => setF({ ...f, remito: e.target.value })} style={inp} /></div>
        <div><label style={lbl}>Ubicación</label><input value={f.ubicacion} onChange={e => setF({ ...f, ubicacion: e.target.value })} style={inp} /></div>
        <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Observaciones</label><input value={f.obs} onChange={e => setF({ ...f, obs: e.target.value })} style={inp} /></div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: 'none', fontWeight: 600 }}>{guardando ? 'Guardando...' : 'Guardar ingreso'}</button>
        <button onClick={() => setAbierto(false)} style={btn}>Cancelar</button>
      </div>
    </div>
  );
}

function StockTC({ calcStock, ingresos, formatFecha, onGuardar, puedeEgresar }: any) {
  const stock = calcStock();
  // Botón "Egresar" de cada fila: crea el egreso en el acto (queda en Historial de egresos)
  async function egresar(id: string, s: any, disp: number) {
    const dispR = Math.round(disp * 100) / 100;
    const txt = window.prompt(`Egresar de ${id}\n${s.cliente} · ${s.tela} · ${s.color || ''}${s.remito ? ' · Rto ' + s.remito : ''}\n\nMetros a egresar (disponible ${dispR.toLocaleString()}):`, String(dispR));
    if (txt === null) return;
    const mts = parseFloat(txt.replace(',', '.'));
    if (!(mts > 0)) { alert('Metros inválidos.'); return; }
    if (mts > dispR + 0.001 && !confirm(`Vas a egresar ${mts} mts y hay ${dispR} disponibles. ¿Seguir igual?`)) return;
    const remitoEntrega = window.prompt('Nro. de remito de entrega (opcional, dejalo vacío si no tiene):', '') || '';
    if (!confirm(`¿Confirmás el egreso de ${mts} mts de ${id}?`)) return;
    const { error } = await supabase.from('egresos').insert([{
      fecha: new Date().toISOString().split('T')[0], cliente: s.cliente, tela: s.tela, color: s.color,
      id_hype: id, mts, bultos: 0, remito_origen: s.remito || null, remito_entrega: remitoEntrega.trim() || null,
      observaciones: 'EGRESO DESDE STOCK TC', estado: 'En almacén',
    }]);
    if (error) { alert('Error al egresar: ' + error.message); return; }
    alert('✅ Egreso guardado. Lo ves en Historial de egresos.');
    if (onGuardar) onGuardar();
  }
  // Desglose por remito: una fila por cada remito de ingreso. Los egresos
  // no tienen remito de origen, así que se descuentan del remito más
  // antiguo primero (FIFO).
  const subsPorId: Record<string, any[]> = {};
  ingresos.forEach((i: any, idx: number) => {
    const id = i.id_hype;
    if (!id || !id.startsWith('TC')) return;
    const rem = String(i.remito ?? '').trim();
    const lista = subsPorId[id] || (subsPorId[id] = []);
    let sub = lista.find((x: any) => x.remito === rem);
    if (!sub) {
      sub = { remito: rem, orden: idx, fecha: i.fecha, cliente: i.cliente, tela: i.tela, color: i.color,
        observaciones: i.observaciones, proceso: i.proceso, ubicacion: i.ubicacion, ramado: i.ramado,
        ing: 0, bultosIng: 0, egr: 0, egrBultos: 0 };
      lista.push(sub);
    }
    sub.ing += Number(i.mts || 0);
    sub.bultosIng += Number(i.bultos || 0);
    if (i.fecha && (!sub.fecha || i.fecha < sub.fecha)) sub.fecha = i.fecha;
  });
  const entries: any[] = [];
  Object.keys(subsPorId).forEach(id => {
    const subs = subsPorId[id].sort((a: any, b: any) => ((a.fecha || '') < (b.fecha || '') ? -1 : (a.fecha || '') > (b.fecha || '') ? 1 : a.orden - b.orden));
    const totIngB = subs.reduce((t: number, s: any) => t + s.bultosIng, 0);
    let restoM = stock[id] ? stock[id].egr : 0;
    let restoB = stock[id] ? totIngB - stock[id].bultos : 0;
    subs.forEach((s: any, k: number) => {
      const ultimo = k === subs.length - 1;
      const tomaM = ultimo ? restoM : Math.min(restoM, s.ing);
      const tomaB = ultimo ? restoB : Math.min(restoB, s.bultosIng);
      restoM = Math.round((restoM - tomaM) * 100) / 100; restoB -= tomaB;
      s.ing = Math.round(s.ing * 100) / 100;
      s.egr = Math.round(tomaM * 100) / 100;
      s.bultos = s.bultosIng - tomaB;
      s.remitos = s.remito ? [s.remito] : [];
      if (Math.abs(s.ing - s.egr) >= 0.005) entries.push([id, s]);   // saldo 0 (o -0 por redondeo): no se muestra
    });
  });
  return <StockTabla entries={entries} titulo="Stock TC — Tela de clientes" ingresos={ingresos} formatFecha={formatFecha} mostrarFechaRemito onEgresar={puedeEgresar ? egresar : undefined} />;
}

function Egresos({ ingresos, egresos, clientes, telas, colores, empleados, onGuardar }: any) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [showResultados, setShowResultados] = useState(false);
  const [idHype, setIdHype] = useState('');
  const [cliente, setCliente] = useState('');
  const [tela, setTela] = useState('');
  const [color, setColor] = useState('');
  const [obs, setObs] = useState('');
  const [disponibles, setDisponibles] = useState(0);
  const [disponiblesBultos, setDisponiblesBultos] = useState(0);
  const [mts, setMts] = useState('');
  const [bultos, setBultos] = useState('');
  const [remitoEntrega, setRemitoEntrega] = useState('');
  const [estado, setEstado] = useState('En almacén');
  const [entrego, setEntrego] = useState('');
  const [retiro, setRetiro] = useState('');
  const [alerta, setAlerta] = useState('');
  const [alertaBultos, setAlertaBultos] = useState('');
  const [guardando, setGuardando] = useState(false);

  function buscar(q: string) {
    setBusqueda(q);
    if (!q || q.length < 2) { setResultados([]); setShowResultados(false); return; }
    const ql = q.toLowerCase();
    const grupos: any = {};
    ingresos.forEach((i: any) => {
      if (!grupos[i.id_hype]) grupos[i.id_hype] = { ...i, ingTotal: 0, bultosTotal: 0 };
      grupos[i.id_hype].ingTotal += Number(i.mts);
      grupos[i.id_hype].bultosTotal += Number(i.bultos || 0);
    });
    egresos.forEach((e: any) => {
      if (grupos[e.id_hype]) {
        grupos[e.id_hype].ingTotal -= Number(e.mts);
        grupos[e.id_hype].bultosTotal -= Number(e.bultos || 0);
      }
    });
    const res = Object.values(grupos).filter((g: any) => {
      return (g.cliente || '').toLowerCase().includes(ql) ||
        (g.tela || '').toLowerCase().includes(ql) ||
        (g.color || '').toLowerCase().includes(ql) ||
        (g.id_hype || '').toLowerCase().includes(ql) ||
        (g.remito || '').includes(q);
    }).filter((g: any) => g.ingTotal > 0);
    setResultados(res);
    setShowResultados(true);
  }

  function selIngreso(ing: any) {
    setCliente(ing.cliente); setTela(ing.tela); setColor(ing.color || '');
    setObs(ing.observaciones || ''); setIdHype(ing.id_hype); setDisponibles(ing.ingTotal);
    setDisponiblesBultos(ing.bultosTotal || 0);
    setBusqueda(`${ing.cliente} · ${ing.tela} · ${ing.color || ''}`); setShowResultados(false);
  }

  function validarMts(val: string) {
    setMts(val);
    if (parseFloat(val) > disponibles) setAlerta(`La cantidad (${val} mts) supera los disponibles (${disponibles} mts).`);
    else setAlerta('');
  }

  function validarBultos(val: string) {
    setBultos(val);
    if (parseInt(val) > disponiblesBultos) setAlertaBultos(`La cantidad (${val} bultos) supera los disponibles (${disponiblesBultos} bultos).`);
    else setAlertaBultos('');
  }

  async function guardar() {
    if (alerta) { alert('Corregí los metros antes de guardar.'); return; }
    if (alertaBultos) { alert('Corregí los bultos antes de guardar.'); return; }
    if (!parseFloat(mts)) { alert('Completá los metros a egresar.'); return; }
    if (!idHype) { alert('Seleccioná un ingreso primero.'); return; }
    setGuardando(true);
    const { error } = await supabase.from('egresos').insert([{
      fecha, remito_entrega: remitoEntrega, cliente, tela, color, observaciones: obs, id_hype: idHype,
      mts: parseFloat(mts), bultos: parseInt(bultos) || 0, estado, entrego, retiro
    }]);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Egreso guardado.');
      setBusqueda(''); setIdHype(''); setCliente(''); setTela(''); setColor('');
      setObs(''); setDisponibles(0); setDisponiblesBultos(0); setMts(''); setBultos('');
      setRemitoEntrega(''); setEstado('En almacén'); setEntrego(''); setRetiro(''); setAlertaBultos('');
      onGuardar();
    }
    setGuardando(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}><div style={{ fontSize: 18, fontWeight: 500 }}>Nuevo egreso</div></div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee', marginBottom: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Buscar por cliente, tela, color, ID o remito</label>
          <div style={{ position: 'relative' }}>
            <input value={busqueda} onChange={e => buscar(e.target.value)} placeholder="Ej: ZARA, Jersey, Blanco, TCS001..." style={{ ...inp, fontSize: 14 }} onFocus={() => busqueda.length >= 2 && setShowResultados(true)} />
            {showResultados && resultados.length > 0 && (
              <div style={{ ...dropdown, maxHeight: 300 }}>
                {resultados.slice(0, 10).map((r: any) => (
                  <div key={r.id_hype} onClick={() => selIngreso(r)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1a1a2e' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, color: '#1a1a2e' }}>{r.cliente}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{r.tela} · {r.color || '—'}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#e85d2f' }}>{r.id_hype}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#3B6D11', fontSize: 14 }}>{r.ingTotal} mts</div>
                      <div style={{ fontSize: 11, color: '#888' }}>disponibles</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showResultados && resultados.length === 0 && busqueda.length >= 2 && (
              <div style={{ ...dropdown, padding: 12, fontSize: 13, color: '#888' }}>Sin resultados</div>
            )}
          </div>
        </div>
        {idHype && (
          <div style={{ background: '#f5f5f7', borderRadius: 10, padding: 14, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
            <div><div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Cliente</div><div style={{ fontWeight: 600 }}>{cliente}</div></div>
            <div><div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Tela</div><div style={{ fontWeight: 600 }}>{tela}</div></div>
            <div><div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Color</div><div style={{ fontWeight: 600 }}>{color || '—'}</div></div>
            <div><div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>ID</div><div style={{ fontFamily: 'monospace', color: '#e85d2f', fontWeight: 700 }}>{idHype}</div></div>
            <div><div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Disponibles</div><div style={{ fontWeight: 700, color: '#3B6D11', fontSize: 18 }}>{disponibles} mts</div></div>
            <div><div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Bultos disp.</div><div style={{ fontWeight: 700, color: '#3B6D11', fontSize: 18 }}>{disponiblesBultos}</div></div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div><label style={lbl}>Fecha</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Mts a egresar</label><input type="number" value={mts} onChange={e => validarMts(e.target.value)} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Nro. bultos</label><input type="number" value={bultos} onChange={e => validarBultos(e.target.value)} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Nro. remito entrega</label><input type="number" value={remitoEntrega} onChange={e => setRemitoEntrega(e.target.value)} placeholder="00089" style={inp} /></div>
          <div><label style={lbl}>Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} style={inp}>
              <option>En almacén</option><option>Entregado a cliente</option><option>A producción</option><option>Salida a tinto externa</option><option>En tinto HYPE</option>
            </select>
          </div>
          <AutocompleteEmpleado label="Quién entregó" value={entrego} onChange={setEntrego} empleados={empleados} />
          <div><label style={lbl}>Quién retiró / Envío</label><input value={retiro} onChange={e => setRetiro(e.target.value)} placeholder="Nombre o empresa" style={inp} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Observaciones</label><input value={obs} onChange={e => setObs(e.target.value)} placeholder="Detalle..." style={inp} /></div>
        </div>
        {alerta && <div style={{ marginTop: 12, padding: '10px 14px', background: '#FAEEDA', color: '#854F0B', borderRadius: 8, fontSize: 13 }}>⚠ {alerta}</div>}
        {alertaBultos && <div style={{ marginTop: 12, padding: '10px 14px', background: '#FAEEDA', color: '#854F0B', borderRadius: 8, fontSize: 13 }}>⚠ {alertaBultos}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button style={btn}>Cancelar</button>
        <button onClick={guardar} disabled={guardando || !idHype} style={{ ...btn, background: idHype ? '#e85d2f' : '#ccc', color: '#fff', border: 'none', cursor: idHype ? 'pointer' : 'not-allowed' }}>{guardando ? 'Guardando...' : 'Guardar egreso'}</button>
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

// Etiquetas para impresora térmica de 10 × 15 cm: una etiqueta por rollo, ocupando toda la hoja,
// todo en negro (sin fondos, que las térmicas imprimen punteados) y con el QR grande.
function PanelEtiquetas({ rows, onCerrar }: any) {
  const [qrListo, setQrListo] = useState(false);
  // Escala de impresión (%): algunas impresoras achican la hoja; se ajusta una vez y queda guardada en esta PC
  const [escala, setEscala] = useState<number>(() => { try { return Number(localStorage.getItem('escalaEtiquetas')) || 133; } catch { return 133; } });
  const cambiarEscala = (v: number) => { const n = Math.min(200, Math.max(50, Math.round(v) || 133)); setEscala(n); try { localStorage.setItem('escalaEtiquetas', String(n)); } catch {} };
  const k = escala / 100;
  useEffect(() => {
    // La librería del QR se carga una sola vez (con <script> dentro de React no se ejecuta)
    // @ts-ignore
    if (window.QRCode) { setQrListo(true); return; }
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    sc.onload = () => setQrListo(true);
    document.head.appendChild(sc);
  }, []);
  useEffect(() => {
    if (!qrListo) return;
    rows.forEach((r: any, rIdx: number) => {
      const cantidad = parseInt(r.bultos) || 1;
      for (let i = 0; i < cantidad; i++) {
        const el = document.getElementById(`qr-panel-${rIdx}-${i}`);
        if (el && el.childElementCount === 0) {
          const qrData = JSON.stringify({ id: r.id_hype, cliente: r.cliente, tela: r.tela, color: r.color, obs: r.obs, fecha: r.fecha, ubicacion: r.ubicacion, mts: r.mts });
          // @ts-ignore
          new window.QRCode(el, { text: qrData, width: 132, height: 132, colorDark: '#000000', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
        }
      }
    });
  }, [rows, qrListo]);

  const fechaTxt = (f: any) => { const [y, m, d] = String(f || '').split('-'); return y && m && d ? `${d}/${m}/${y}` : (f || ''); };
  const chico: React.CSSProperties = { fontSize: 9, color: '#000', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 };
  const chicoPie: React.CSSProperties = { ...chico, letterSpacing: 0 };
  // Letra grande que se achica sola si el texto es largo (hasta 2 líneas, sin cortarse con "...")
  const grande = (txt: any): React.CSSProperties => { const n = String(txt || '').length;
    return { fontSize: n <= 14 ? 30 : n <= 18 ? 26 : n <= 24 ? 21 : 17, lineHeight: 1.05, fontWeight: 800, textTransform: 'uppercase', color: '#000',
      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }; };

  return createPortal(
    <div className="etiquetas-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 999, overflowY: 'auto', padding: '20px 0' }}>
      <style>{`
        @page { size: ${150 * k}mm ${100 * k}mm; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body > *:not(.etiquetas-overlay) { display: none !important; }
          .etiquetas-overlay { position: static !important; inset: auto !important; background: none !important; padding: 0 !important; display: block !important; overflow: visible !important; }
          .etiquetas-card { width: auto !important; max-width: none !important; border-radius: 0 !important; padding: 0 !important; background: none !important; }
          .etiquetas-toolbar { display: none !important; }
          .etiqueta { margin: 0 !important; border: none !important; box-shadow: none !important; break-after: page; page-break-after: always; }
          .etiqueta:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
      <div className="etiquetas-card" style={{ background: '#f5f5f7', borderRadius: 16, padding: 24, width: '90%', maxWidth: 680 }}>
        <div className="etiquetas-toolbar" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Etiquetas para imprimir ({rows.reduce((t: number, r: any) => t + (parseInt(r.bultos) || 1), 0)})</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => window.print()} disabled={!qrListo} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>{qrListo ? '🖨 Imprimir' : 'Cargando QR...'}</button>
              <button onClick={onCerrar} style={btn}>Cerrar</button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Etiqueta de 10 × 15 cm. Al imprimir elegí el papel <b>10 × 15 cm (4 × 6 in)</b>, márgenes <b>Ninguno</b> y escala <b>100%</b>.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: '#555' }}>
            <span>Escala de impresión:</span>
            <button onClick={() => cambiarEscala(escala - 5)} style={{ ...btn, padding: '2px 10px' }}>−</button>
            <input type="number" value={escala} onChange={e => cambiarEscala(Number(e.target.value))} style={{ ...inp, width: 70, padding: '4px 6px' }} />
            <span>%</span>
            <button onClick={() => cambiarEscala(escala + 5)} style={{ ...btn, padding: '2px 10px' }}>+</button>
            <span style={{ color: '#888' }}>Si sale chica, subila (ej. 133%). Si sale cortada, bajala. Queda guardada en esta PC.</span>
          </div>
        </div>
        <div id="etiquetas-print">
          {rows.map((r: any, rIdx: number) =>
            Array.from({ length: parseInt(r.bultos) || 1 }).map((_, i) => (
              <div key={`${rIdx}-${i}`} className="etiqueta" style={{ zoom: k, width: '150mm', height: '100mm', boxSizing: 'border-box', background: '#fff', border: '1px solid #bbb', padding: '5mm 6mm', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', marginBottom: 16 }}>
                {/* Encabezado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #000', paddingBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 4 }}>HYPE</div>
                    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{r.proceso === 'S' ? 'Sublimación' : 'Digital directo'}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, border: '3px solid #000', borderRadius: 6, padding: '2px 10px' }}>ROLLO {i + 1}/{parseInt(r.bultos) || 1}</div>
                </div>
                {/* Cuerpo */}
                <div style={{ display: 'flex', flex: 1, minHeight: 0, paddingTop: 6, gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Courier New, monospace', letterSpacing: 1 }}>{r.id_hype}</div>
                    <div><div style={chico}>Cliente</div><div style={grande(r.cliente)}>{r.cliente}</div></div>
                    <div><div style={chico}>Tela</div><div style={grande(r.tela)}>{r.tela}</div></div>
                    {r.color && <div><div style={chico}>Color</div><div style={grande(r.color)}>{r.color}</div></div>}
                    {r.obs && <div><div style={chico}>Observaciones</div><div style={{ fontSize: 15, lineHeight: 1.15, fontWeight: 700, textTransform: 'uppercase', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.obs}</div></div>}
                  </div>
                  <div style={{ width: '38mm', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <div id={`qr-panel-${rIdx}-${i}`} style={{ width: 132, height: 132 }}></div>
                    <div style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>Escanear para ver stock</div>
                    {r.remito && <div style={{ textAlign: 'center', marginTop: 4 }}><div style={chicoPie}>Remito ingreso</div><div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.05 }}>{r.remito}</div></div>}
                  </div>
                </div>
                {/* Pie */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '3px solid #000', paddingTop: 5 }}>
                  <div style={{ display: 'flex', gap: 10, whiteSpace: 'nowrap' }}>
                    <div><div style={chicoPie}>Fecha ingreso</div><div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.05 }}>{fechaTxt(r.fecha)}</div></div>
                    <div><div style={chicoPie}>Ubicación</div><div style={{ fontSize: 14, fontWeight: 800 }}>{r.ubicacion || '—'}</div></div>
                    {(r.mtsPorRollo || r.mts_por_rollo) && <div><div style={chicoPie}>Mts x rollo</div><div style={{ fontSize: 14, fontWeight: 800 }}>{r.mtsPorRollo || r.mts_por_rollo}</div></div>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, whiteSpace: 'nowrap', marginLeft: 8 }}>{r.mts} MTS TOTALES</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Ingresos({ clientes, telas, colores, empleados, ingresos, onGuardar }: any) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [remito, setRemito] = useState('');
  const [cliente, setCliente] = useState('');
  const [codCliente, setCodCliente] = useState('');
  const [recibido, setRecibido] = useState('');
  const [busqCli, setBusqCli] = useState('');
  const [showCli, setShowCli] = useState(false);
  const [renglones, setRenglones] = useState([{ prop: '', proceso: '', tela: '', codTela: '', color: '', siglaColor: '', obs: '', bultos: '', mtsPorRollo: '', modo: 'KG', kg: '', rinde: '', mts: '', ramado: 'No', ubicacion: '1-A', id_hype: '', busqTela: '', showTela: false, busqColor: '', showColor: false, thFijo: false, thManual: false }]);
  const [guardando, setGuardando] = useState(false);
  const [etiquetasData, setEtiquetasData] = useState<any>(null);
  const ubicaciones = ['1-A','1-B','1-C','1-D','2-A','2-B','2-C','3-A','3-B','3-C','3-D','4-A','4-B','4-C','5-A','5-B','6-A','6-B','ISLA','PARED','TINTO HYPE','TINTO EXT','ENVIADO A SUBLI'];

  function selCliente(c: any) {
    setCliente(c.nombre); setCodCliente(c.cod); setBusqCli(c.nombre); setShowCli(false);
    setRenglones(prev => prev.map(r => r.thFijo ? r : ({ ...r, id_hype: buildId(r.prop, r.proceso, c.cod, r.codTela, r.siglaColor) })));
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
        if (kg && rinde && rinde > 0) nr.mts = (kg * rinde).toFixed(1).toString();
      }
      // Si cambia Prop., se libera la tela TH elegida del desplegable
      if (field === 'prop') { nr.thFijo = false; nr.thManual = false; }
      // Tela TH elegida del desplegable de códigos: el ID queda fijo (el que ya existe)
      if (nr.thFijo) return nr;
      nr.id_hype = buildId(field === 'prop' ? value : nr.prop, field === 'proceso' ? value : nr.proceso, codCliente, field === 'codTela' ? value : nr.codTela, field === 'siglaColor' ? value : nr.siglaColor);
      return nr;
    }));
  }

  // Cuando el cliente del ingreso es HYPE, el desplegable de Tela se
  // restringe al catálogo propio (telas marcadas es_hype), para que no
  // aparezcan mezcladas las telas de otros clientes. Para cualquier otro
  // cliente, se busca en todo el catálogo como antes.
  function telasParaBuscar(busqueda: string) {
    const esHype = cliente.trim().toUpperCase() === 'HYPE';
    const base = esHype ? telas.filter((t: any) => t.es_hype) : telas;
    return base.filter((t: any) => t.nombre.toLowerCase().includes(busqueda.toLowerCase()) || t.cod.includes(busqueda));
  }

  // Agrega una tela nueva al catálogo HYPE directo desde el desplegable
  // de Ingresos (sin tener que ir a la pantalla de Telas), y la deja
  // seleccionada en ese renglón.
  async function agregarTelaHype(idx: number) {
    const nombre = window.prompt('Nombre de la nueva tela HYPE:');
    if (!nombre || !nombre.trim()) return;
    const cod = window.prompt('Código de tela HYPE (el que le corresponde):');
    if (!cod || !cod.trim()) return;
    const { data, error } = await supabase.from('telas').insert([{ cod: cod.trim(), nombre: nombre.trim().toUpperCase(), es_hype: true }]).select().single();
    if (error) { alert('No se pudo agregar la tela: ' + error.message); return; }
    selTela(idx, data);
    onGuardar();
  }

  // Busca en el historial real de ingresos si esa tela ya se cargó antes
  // como tela HYPE (id_hype que arranca con TH), para traer directo el
  // prop/proceso/color/ID ya usados — así el código sale siempre igual,
  // en vez de reconstruirlo de nuevo cada vez.
  function buscarStockTH(nombreTela: string) {
    const match = (ingresos || []).find((i: any) =>
      (i.id_hype || '').toUpperCase().startsWith('TH') &&
      (i.tela || '').trim().toLowerCase() === nombreTela.trim().toLowerCase()
    );
    if (!match) return null;
    return { prop: match.prop, proceso: match.proceso, color: match.color, siglaColor: match.sigla_color, id_hype: match.id_hype };
  }

  // Observaciones ya usadas antes para el mismo cliente + tela + color,
  // para elegirlas del desplegable y no reescribirlas distinto cada vez.
  function obsHistorial(r: any): string[] {
    if (!cliente || !r.tela) return [];
    const norm = (s: any) => (s || '').toString().trim().toLowerCase();
    const vistas = new Map<string, string>();
    (ingresos || []).forEach((i: any) => {
      const o = (i.observaciones || '').toString().trim();
      if (!o) return;
      if (norm(i.cliente) !== norm(cliente) || norm(i.tela) !== norm(r.tela)) return;
      if (r.color && norm(i.color) !== norm(r.color)) return;
      if (!vistas.has(norm(o))) vistas.set(norm(o), o);
    });
    return Array.from(vistas.values());
  }

  function selTela(idx: number, t: any) {
    setRenglones(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const nr = { ...r, tela: t.nombre, codTela: t.cod, busqTela: t.nombre, showTela: false };
      const esHype = cliente.trim().toUpperCase() === 'HYPE';
      const historial = esHype ? buscarStockTH(t.nombre) : null;
      if (historial) {
        if (nr.prop === 'TT') {
          nr.proceso = historial.proceso || nr.proceso;
          nr.color = historial.color || ''; nr.busqColor = historial.color || ''; nr.siglaColor = historial.siglaColor || '';
          nr.id_hype = 'TT' + String(historial.id_hype).slice(2);
          return nr;
        }
        nr.prop = historial.prop || nr.prop;
        nr.proceso = historial.proceso || nr.proceso;
        nr.color = historial.color || '';
        nr.busqColor = historial.color || '';
        nr.siglaColor = historial.siglaColor || '';
        nr.id_hype = historial.id_hype;
        return nr;
      }
      nr.id_hype = buildId(nr.prop, nr.proceso, codCliente, t.cod, nr.siglaColor);
      return nr;
    }));
  }

  // Códigos TH que ya existen (uno por ID, sin sufijo -2, -3...), para el
  // desplegable único de Tela cuando Prop. = TH: trae ID, tela y color juntos.
  const codigosTH = (() => {
    const m = new Map<string, any>();
    (ingresos || []).forEach((i: any) => {
      const id = (i.id_hype || '').toString().trim().replace(/-\d+$/, '');
      if (!id.toUpperCase().startsWith('TH') || m.has(id)) return;
      m.set(id, { id, proceso: i.proceso || id.charAt(2), tela: i.tela || '', codTela: i.cod_tela || '', color: i.color || '', siglaColor: i.sigla_color || '' });
    });
    return Array.from(m.values()).sort((a: any, b: any) => String(a.tela).localeCompare(String(b.tela)) || String(a.color).localeCompare(String(b.color)));
  })();

  // Stock Tienda (TT): las mismas telas HYPE, con el mismo código pero empezando con TT
  function codigosPara(prop: string) {
    if (prop !== 'TT') return codigosTH;
    const m = new Map<string, any>();
    (ingresos || []).forEach((i: any) => {
      const id = (i.id_hype || '').toString().trim().replace(/-\d+$/, '');
      const pre = id.slice(0, 2).toUpperCase();
      if (pre !== 'TH' && pre !== 'TT') return;
      const idTT = 'TT' + id.slice(2);
      if (m.has(idTT)) return;
      m.set(idTT, { id: idTT, proceso: i.proceso || id.charAt(2), tela: i.tela || '', codTela: i.cod_tela || '', color: i.color || '', siglaColor: i.sigla_color || '' });
    });
    return Array.from(m.values()).sort((a: any, b: any) => String(a.tela).localeCompare(String(b.tela)) || String(a.color).localeCompare(String(b.color)));
  }

  function selCodigoTH(idx: number, c: any, prop: string = 'TH') {
    setRenglones(prev => prev.map((r, i) => i !== idx ? r : {
      ...r, prop, proceso: c.proceso || r.proceso, tela: c.tela, codTela: c.codTela, busqTela: c.tela,
      color: c.color, busqColor: c.color, siglaColor: c.siglaColor, id_hype: c.id, thFijo: true, thManual: false,
      showTela: false, showColor: false,
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
    // Cada remito es un ingreso separado: si ya existe el mismo ID cargado
    // con otro remito (o con otras observaciones), se crea un ID propio
    // (sufijo -2, -3...) para que no se mezclen en el stock. Solo se
    // reutiliza el ID si coinciden el remito y las observaciones.
    const normObs = (s: any) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
    const normRem = (s: any) => (s || '').toString().trim();
    const baseId = (id: string) => (id || '').replace(/-\d+$/, '');
    const conocidos: { id: string; obs: string; remito: string }[] = [];
    (ingresos || []).forEach((i: any) => {
      if (!i.id_hype) return;
      const obsI = normObs(i.observaciones), remI = normRem(i.remito);
      if (!conocidos.some(c => c.id === i.id_hype && c.obs === obsI && c.remito === remI)) {
        conocidos.push({ id: i.id_hype, obs: obsI, remito: remI });
      }
    });
    const rowsFinal = rows.map(r => {
      const base = baseId(r.id_hype);
      // Telas HYPE (TH): siempre el mismo ID, sin sufijo -2, -3...,
      // para que Stock TH quede consolidado por tela + color.
      if (base.toUpperCase().startsWith('TH') || base.toUpperCase().startsWith('TT')) return { ...r, id_hype: base };
      const obs = normObs(r.obs);
      const rem = normRem(remito);
      const mismos = conocidos.filter(c => baseId(c.id) === base);
      const igual = mismos.find(c => c.obs === obs && c.remito === rem);
      let id = r.id_hype;
      if (igual) id = igual.id;
      else if (mismos.length > 0) {
        const usados = new Set(mismos.map(c => c.id));
        let n = 2;
        while (usados.has(`${base}-${n}`)) n++;
        id = `${base}-${n}`;
        conocidos.push({ id, obs, remito: rem });
      } else {
        id = base;
        conocidos.push({ id, obs, remito: rem });
      }
      return { ...r, id_hype: id };
    });
    const { error } = await supabase.from('ingresos').insert(rowsFinal.map(r => ({
      fecha, remito, cliente, cod_cliente: codCliente, recibido,
      prop: r.prop, proceso: r.proceso, tela: r.tela, cod_tela: r.codTela,
      color: r.color, sigla_color: r.siglaColor,
      observaciones: r.obs, bultos: parseInt(r.bultos) || 0,
      mts_por_rollo: parseFloat(r.mtsPorRollo) || null,
      mts: parseFloat(r.mts), ramado: r.ramado, ubicacion: r.ubicacion,
      id_hype: r.id_hype, estado: 'En almacén'
    })));
    if (error) { alert('Error al guardar: ' + error.message); } else {
      onGuardar();
      const imprimir = confirm('✅ Ingreso guardado correctamente.\n\n¿Querés imprimir las etiquetas ahora?');
      if (imprimir) setEtiquetasData(rowsFinal.map(r => ({ ...r, cliente, fecha, remito })));
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
                  <option value="">Seleccionar</option><option value="TC">TC - Tela cliente</option><option value="TH">TH - Tela propia</option><option value="TT">TT - Stock TIENDA</option>
                </select>
              </div>
              <div><label style={lbl}>Proceso</label>
                <select value={r.proceso} onChange={e => updateRenglon(idx, 'proceso', e.target.value)} style={inp}>
                  <option value="">Seleccionar</option><option value="S">S - Sublimación</option><option value="D">D - Digital directo</option>
                </select>
              </div>
              {(r.prop === 'TH' || r.prop === 'TT') && !r.thManual ? (
                <div style={{ gridColumn: 'span 2' }}><label style={lbl}>{r.prop === 'TT' ? 'Tela (Stock TIENDA)' : 'Tela (código TH)'}</label>
                  <select
                    value={r.thFijo ? r.id_hype : ''}
                    onChange={e => {
                      if (e.target.value === '__nueva__') { setRenglones(prev => prev.map((rr, i) => i === idx ? { ...rr, thManual: true, thFijo: false } : rr)); return; }
                      const c = codigosPara(r.prop).find((x: any) => x.id === e.target.value);
                      if (c) selCodigoTH(idx, c, r.prop);
                    }}
                    style={inp}
                  >
                    <option value="">Seleccionar tela HYPE...</option>
                    {codigosPara(r.prop).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.tela} · {c.color || 'SIN COLOR'} · {c.id}</option>
                    ))}
                    <option value="__nueva__">+ Tela o color {r.prop} nuevo (cargar a mano)</option>
                  </select>
                </div>
              ) : cliente.trim().toUpperCase() === 'HYPE' ? (
                <div><label style={lbl}>Tela</label>
                  <select
                    value={r.codTela}
                    onChange={e => {
                      if (e.target.value === '__nueva__') { agregarTelaHype(idx); return; }
                      const t = telas.find((tt: any) => tt.cod === e.target.value);
                      if (t) selTela(idx, t);
                    }}
                    style={inp}
                  >
                    <option value="">Seleccionar</option>
                    {telas.filter((t: any) => t.es_hype).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre)).map((t: any) => (
                      <option key={t.cod} value={t.cod}>{t.nombre}</option>
                    ))}
                    <option value="__nueva__">+ Agregar nueva tela</option>
                  </select>
                </div>
              ) : (
                <div style={{ position: 'relative' }}><label style={lbl}>Tela</label>
                  <input value={r.busqTela} onChange={e => { updateRenglon(idx, 'busqTela', e.target.value); setRenglones(prev => prev.map((rr, i) => i === idx ? { ...rr, showTela: true } : rr)); }} placeholder="Buscar..." style={inp} />
                  {r.showTela && r.busqTela && (
                    <div style={dropdown}>
                      {telasParaBuscar(r.busqTela).slice(0, 8).map((t: any) => (
                        <div key={t.cod} onClick={() => selTela(idx, t)} style={ddItem}>{t.nombre} <span style={{ color: '#888', fontSize: 11 }}>{t.cod}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              <div>
                <label style={lbl}>Observaciones</label>
                <input list={`obs-hist-${idx}`} value={r.obs} onChange={e => updateRenglon(idx, 'obs', e.target.value)} placeholder="Escribí o elegí una anterior..." style={inp} />
                <datalist id={`obs-hist-${idx}`}>
                  {obsHistorial(r).map(o => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div><label style={lbl}>Nro. bultos</label><input type="number" value={r.bultos} onChange={e => updateRenglon(idx, 'bultos', e.target.value)} placeholder="0" style={inp} /></div>
              <div><label style={lbl}>Mts x rollo (aprox)</label><input type="number" value={r.mtsPorRollo} onChange={e => updateRenglon(idx, 'mtsPorRollo', e.target.value)} placeholder="0" step="0.01" style={inp} /></div>
              <div><label style={lbl}>Ingreso en</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateRenglon(idx, 'modo', 'KG')} style={{ ...btn, background: r.modo === 'KG' ? '#e85d2f' : '#f0f0f0', color: r.modo === 'KG' ? '#fff' : '#333' }}>KG</button>
                  <button onClick={() => updateRenglon(idx, 'modo', 'MT')} style={{ ...btn, background: r.modo === 'MT' ? '#e85d2f' : '#f0f0f0', color: r.modo === 'MT' ? '#fff' : '#333' }}>Mts</button>
                </div>
              </div>
              {r.modo === 'KG' && <div><label style={lbl}>Cantidad (kg)</label><input type="number" value={r.kg} onChange={e => updateRenglon(idx, 'kg', e.target.value)} placeholder="0" style={inp} /></div>}
              {r.modo === 'KG' && <div><label style={lbl}>Rinde (mts por kg)</label><input type="number" value={r.rinde} onChange={e => updateRenglon(idx, 'rinde', e.target.value)} placeholder="3.5" step="0.01" style={inp} /></div>}
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
        <div onClick={() => setRenglones(prev => [...prev, { prop: '', proceso: '', tela: '', codTela: '', color: '', siglaColor: '', obs: '', bultos: '', mtsPorRollo: '', modo: 'KG', kg: '', rinde: '', mts: '', ramado: 'No', ubicacion: '1-A', id_hype: '', busqTela: '', showTela: false, busqColor: '', showColor: false, thFijo: false, thManual: false }])} style={{ padding: '12px 20px', cursor: 'pointer', color: '#e85d2f', fontSize: 13, background: '#fafafa', borderTop: '1px solid #eee' }}>
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

function HistorialIngresos({ ingresos, onGuardar, clientes, telas, empleados, formatFecha }: any) {
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
    await supabase.from('ingresos').delete().eq('id', i.id); onGuardar();
  }
  // Partes del ID: PROP(2) + PROCESO(1) + COD CLIENTE(5) + COD TELA(3) + SIGLA COLOR (+ -N)
  function partesId(i: any) {
    const id = String(i.id_hype || '').replace(/-\d+$/, '');
    return {
      prop: (i.prop || id.slice(0, 2) || '').toUpperCase(),
      proceso: i.proceso || id.slice(2, 3),
      codCli: i.cod_cliente || id.slice(3, 8),
      codTela: i.cod_tela || id.slice(8, 11),
      sigla: i.sigla_color || id.slice(11),
    };
  }

  function abrirEdicion(i: any) {
    const p = partesId(i);
    setEditItem({ ...i, _prop: p.prop, _codCli: p.codCli, _cliente: i.cliente });
  }

  // Calcula el ID nuevo si cambió la propiedad o el cliente
  function calcularNuevoId(item: any) {
    const p = partesId(item);
    const cambio = item._prop !== p.prop || item._codCli !== p.codCli;
    if (!cambio) return { cambio: false, nuevoId: item.id_hype };
    const base = item._prop + p.proceso + item._codCli + p.codTela + p.sigla;
    if (item._prop === 'TH' || item._prop === 'TT') return { cambio: true, nuevoId: base }; // telas HYPE: siempre el mismo ID
    // Tela de cliente: si ya existe ese ID con otro remito/obs, usa sufijo -2, -3...
    const normObs = (x: any) => (x || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
    const otros = ingresos.filter((x: any) => x.id !== item.id && String(x.id_hype || '').replace(/-\d+$/, '') === base);
    const igual = otros.find((x: any) => normObs(x.observaciones) === normObs(item.observaciones) && String(x.remito || '').trim() === String(item.remito || '').trim());
    if (igual) return { cambio: true, nuevoId: igual.id_hype };
    if (!otros.length) return { cambio: true, nuevoId: base };
    const usados = new Set(otros.map((x: any) => x.id_hype));
    let n = 2;
    while (usados.has(`${base}-${n}`)) n++;
    return { cambio: true, nuevoId: `${base}-${n}` };
  }

  async function guardarEdicion() {
    if (!editItem) return;
    const { cambio, nuevoId } = calcularNuevoId(editItem);
    const idViejo = editItem.id_hype;
    let moverEgresos = false;
    if (cambio) {
      if (!editItem._codCli) { alert('Elegí el cliente de la lista.'); return; }
      const otrosConIdViejo = ingresos.filter((x: any) => x.id !== editItem.id && x.id_hype === idViejo).length;
      const { count } = await supabase.from('egresos').select('id', { count: 'exact', head: true }).eq('id_hype', idViejo);
      const nEgr = count || 0;
      moverEgresos = otrosConIdViejo === 0 && nEgr > 0;
      let msg = `El ID va a cambiar:\n\n${idViejo}  →  ${nuevoId}\n\n`;
      if (moverEgresos) msg += `Los ${nEgr} egreso(s) de este ingreso también pasan al ID nuevo.\n\n`;
      else if (nEgr > 0) msg += `OJO: hay otros ingresos con el ID ${idViejo}, así que sus ${nEgr} egreso(s) quedan en el ID viejo.\n\n`;
      msg += 'Si ya imprimiste la etiqueta de este rollo, vas a tener que reimprimirla.\n\n¿Confirmás el cambio?';
      if (!confirm(msg)) return;
    }
    setGuardando(true);
    const datos: any = {
      fecha: editItem.fecha, remito: editItem.remito, cliente: editItem._cliente,
      tela: editItem.tela, color: editItem.color, observaciones: editItem.observaciones,
      bultos: editItem.bultos, mts: editItem.mts, ubicacion: editItem.ubicacion,
      mts_por_rollo: editItem.mts_por_rollo === '' ? null : editItem.mts_por_rollo,
      ramado: editItem.ramado, recibido: editItem.recibido, estado: editItem.estado,
    };
    if (cambio) { datos.prop = editItem._prop; datos.cod_cliente = editItem._codCli; datos.id_hype = nuevoId; }
    const { error } = await supabase.from('ingresos').update(datos).eq('id', editItem.id);
    if (error) { alert('Error: ' + error.message); setGuardando(false); return; }
    if (cambio && moverEgresos) {
      const { error: e2 } = await supabase.from('egresos').update({ id_hype: nuevoId, cliente: editItem._cliente }).eq('id_hype', idViejo);
      if (e2) alert('El ingreso se guardó, pero no se pudieron mover los egresos: ' + e2.message);
    }
    setEditItem(null); onGuardar();
    setGuardando(false);
  }
  const ubicaciones = ['1-A','1-B','1-C','1-D','2-A','2-B','2-C','3-A','3-B','3-C','3-D','4-A','4-B','4-C','5-A','5-B','6-A','6-B','ISLA','PARED','TINTO HYPE','TINTO EXT','ENVIADO A SUBLI'];
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
            <thead><tr>{['Fecha','Remito','Cliente','Tela','Color','ID','Obs.','Bultos','Mts x rollo','Mts','Ubic.','Ramado','Recibido','Acciones'].map(h => <th key={h} style={{ ...th, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {page.map((i: any) => (
                <tr key={i.id}>
                  <td style={td}>{formatFecha(i.fecha)}</td><td style={td}>{i.remito}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{i.cliente}</td><td style={{ ...td, whiteSpace: 'nowrap' }}>{i.tela}</td>
                  <td style={td}>{i.color}</td><td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f', fontSize: 11, whiteSpace: 'nowrap' }}>{i.id_hype}</td>
                  <td style={{ ...td, whiteSpace: 'normal', minWidth: 150 }}>{i.observaciones}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{i.bultos}</td><td style={{ ...td, textAlign: 'center' }}>{i.mts_por_rollo ?? '—'}</td><td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{i.mts}</td>
                  <td style={td}>{i.ubicacion}</td><td style={td}>{i.ramado}</td><td style={td}>{i.recibido}</td>
                  <td style={td}>
                    <button onClick={() => setEtiquetasData([{ ...i, obs: i.observaciones }])} style={{ ...btn, fontSize: 12, padding: '4px 8px', marginRight: 4, background: '#e8f4ea', color: '#3B6D11', border: '1px solid #97C459' }}>🏷</button>
                    <button onClick={() => abrirEdicion(i)} style={{ ...btn, fontSize: 12, padding: '4px 8px', marginRight: 4 }}>Editar</button>
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
              <div><label style={lbl}>Propiedad</label>
                <select value={editItem._prop} onChange={e => setEditItem({...editItem, _prop: e.target.value})} style={inp}>
                  <option value="TC">TC — Tela de cliente</option>
                  <option value="TH">TH — Tela HYPE</option>
                  <option value="TT">TT — Stock TIENDA</option>
                </select>
              </div>
              <div><label style={lbl}>Cliente</label>
                <input list="clientes-editar-ingreso" value={editItem._cliente} onChange={e => {
                  const v = e.target.value;
                  const c = (clientes || []).find((x: any) => x.nombre === v);
                  setEditItem({ ...editItem, _cliente: v, _codCli: c ? c.cod : (v === editItem.cliente ? partesId(editItem).codCli : '') });
                }} placeholder="Escribí para buscar..." style={inp} />
                <datalist id="clientes-editar-ingreso">
                  {(clientes || []).map((c: any) => <option key={c.cod} value={c.nombre}>{c.cod}</option>)}
                </datalist>
              </div>
              <div style={{ gridColumn: '1/-1', fontSize: 12, color: '#666' }}>
                ID: <span style={{ fontFamily: 'monospace', color: '#e85d2f' }}>{editItem.id_hype}</span>
                {calcularNuevoId(editItem).cambio && <> → <span style={{ fontFamily: 'monospace', color: '#3B6D11', fontWeight: 700 }}>{editItem._codCli ? calcularNuevoId(editItem).nuevoId : '(elegí un cliente de la lista)'}</span></>}
              </div>
              <div><label style={lbl}>Tela</label><input value={editItem.tela} onChange={e => setEditItem({...editItem, tela: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Color</label><input value={editItem.color || ''} onChange={e => setEditItem({...editItem, color: e.target.value})} style={inp} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Observaciones</label><input value={editItem.observaciones || ''} onChange={e => setEditItem({...editItem, observaciones: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Bultos</label><input type="number" value={editItem.bultos} onChange={e => setEditItem({...editItem, bultos: e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Mts x rollo (aprox)</label><input type="number" value={editItem.mts_por_rollo ?? ''} onChange={e => setEditItem({...editItem, mts_por_rollo: e.target.value})} style={inp} /></div>
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

function HistorialEgresos({ egresos, onGuardar, formatFecha }: any) {
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
    await supabase.from('egresos').delete().eq('id', e.id); onGuardar();
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
            <thead><tr>{['Fecha','Rto. Entrega','Cliente','Tela','Color','ID','Obs.','Mts','Estado','Entregó','Retiró','Acciones'].map(h => <th key={h} style={{ ...th, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {page.length === 0 && <tr><td colSpan={12} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Sin egresos registrados</td></tr>}
              {page.map((e: any) => (
                <tr key={e.id}>
                  <td style={td}>{formatFecha(e.fecha)}</td><td style={td}>{e.remito_entrega}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{e.cliente}</td><td style={{ ...td, whiteSpace: 'nowrap' }}>{e.tela}</td>
                  <td style={td}>{e.color}</td><td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f', fontSize: 11, whiteSpace: 'nowrap' }}>{e.id_hype}</td>
                  <td style={{ ...td, whiteSpace: 'normal', minWidth: 150 }}>{e.observaciones}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{e.mts}</td><td style={td}>{e.estado}</td>
                  <td style={td}>{e.entrego}</td><td style={td}>{e.retiro}</td>
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
    await supabase.from('colores').delete().eq('id', c.id); onGuardar();
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
          <div style={{ marginBottom: 12 }}><label style={lbl}>Sigla (3 letras)</label><input value={sigla} onChange={e => setSigla(e.target.value.toUpperCase().slice(0, 3))} placeholder="Ej: ROJ" style={inp} /></div>
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

// Estado del cliente según sus pedidos en la planilla de producción (FECHA PEDIDO):
// - ACTIVO: hizo algún pedido en los últimos 3 meses.
// - INACTIVO: no hizo ningún pedido en los últimos 3 meses.
// La planilla manda cada 5 minutos la fecha del último pedido de cada
// cliente a la tabla clientes_ultimo_pedido.
const MESES_ACTIVIDAD = 3;

// Va formateando el CUIT a medida que lo escriben: se queda solo con los
// números (hasta 11) y les pone los guiones en su lugar, para que termine
// como XX-XXXXXXXX-X sin tener que tipear los guiones a mano.
function formatearCuit(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 10) return `${digitos.slice(0, 2)}-${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

// Mismo criterio que la planilla para comparar nombres: sin tildes, mayúsculas, solo letras y números
const normCliente = (x: any) => (x ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function estadoCliente(nombreCliente: string, ultimos: Record<string, string>): 'ACTIVO' | 'INACTIVO' {
  const ult = ultimos[normCliente(nombreCliente)];
  if (!ult) return 'INACTIVO';
  const limite = new Date();
  limite.setMonth(limite.getMonth() - MESES_ACTIVIDAD);
  return ult >= limite.toISOString().split('T')[0] ? 'ACTIVO' : 'INACTIVO';
}

function Clientes({ clientes, ingresos, egresos, onGuardar }: any) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [cod, setCod] = useState('');
  const [nombre, setNombre] = useState('');
  const [cuit, setCuit] = useState('');
  const [contacto, setContacto] = useState('');
  const [tel, setTel] = useState('');
  const [mail, setMail] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [pag, setPag] = useState(1);
  const POR_PAG = 20;
  // Fecha del último pedido de cada cliente en la planilla de producción
  const [ultimos, setUltimos] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from('clientes_ultimo_pedido').select('cliente_norm, ultimo_pedido').then(({ data }) => {
      const m: Record<string, string> = {};
      (data || []).forEach((r: any) => { m[r.cliente_norm] = r.ultimo_pedido; });
      setUltimos(m);
    });
  }, []);
  const filtered = clientes.filter((c: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    if (c.nombre.toLowerCase().includes(q) || c.cod.includes(search)) return true;
    // Para Estado usamos "empieza con" en vez de "contiene": si fuera
    // "contiene", buscar "activo" también traía los INACTIVO (porque
    // "inactivo" contiene "activo"). También aceptamos el plural
    // (activos/inactivos) sacando la "s" del final antes de comparar.
    const estadoNorm = estadoCliente(c.nombre, ultimos).toLowerCase();
    const qSinPlural = q.endsWith('s') ? q.slice(0, -1) : q;
    return estadoNorm.startsWith(q) || estadoNorm.startsWith(qSinPlural);
  });
  const total = Math.ceil(filtered.length / POR_PAG);
  const page = filtered.slice((pag - 1) * POR_PAG, pag * POR_PAG);
  async function guardar() {
    if (!cod || !nombre) { alert('Completá código y nombre.'); return; }
    setGuardando(true);
    if (editIdx !== null) await supabase.from('clientes').update({ cod, nombre, cuit, contacto, tel, mail }).eq('id', clientes[editIdx].id);
    else await supabase.from('clientes').insert([{ cod, nombre, cuit, contacto, tel, mail }]);
    setModal(false); onGuardar(); setGuardando(false);
  }
  async function eliminar(c: any) {
    if (!confirm('¿Eliminar este cliente?')) return;
    await supabase.from('clientes').delete().eq('id', c.id); onGuardar();
  }
  async function actualizarCampo(c: any, campo: string, valor: string) {
    await supabase.from('clientes').update({ [campo]: valor || null }).eq('id', c.id);
    onGuardar();
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div><div style={{ fontSize: 18, fontWeight: 500 }}>Clientes</div><div style={{ fontSize: 13, color: '#888' }}>{filtered.length} registrados</div></div>
        <button onClick={() => { setEditIdx(null); setCod(''); setNombre(''); setCuit(''); setContacto(''); setTel(''); setMail(''); setModal(true); }} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>+ Nuevo cliente</button>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 12 }}>
        <input placeholder="Buscar por código, nombre o estado (activo, inactivo)..." value={search} onChange={e => { setSearch(e.target.value); setPag(1); }} style={{ ...inp, maxWidth: 420 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th style={{ ...th, width: 80 }}>Código</th><th style={th}>Nombre</th><th style={{ ...th, width: 110 }}>CUIT</th><th style={th}>Contacto</th><th style={th}>Tel</th><th style={th}>Mail</th><th style={{ ...th, width: 110, whiteSpace: 'nowrap' }}>Estado</th><th style={{ ...th, width: 120 }}>Acciones</th></tr></thead>
          <tbody>
            {page.map((c: any) => {
              const estado = estadoCliente(c.nombre, ultimos);
              return (
              <tr key={c.id}>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{c.cod}</td>
                <td style={td}>{c.nombre}</td>
                <td style={td}>
                  <input defaultValue={c.cuit || ''} onBlur={e => actualizarCampo(c, 'cuit', formatearCuit(e.target.value))} placeholder="XX-XXXXXXXX-X" style={{ ...inp, fontSize: 12, padding: '4px 6px' }} />
                </td>
                <td style={td}>
                  <input defaultValue={c.contacto || ''} onBlur={e => actualizarCampo(c, 'contacto', e.target.value)} placeholder="Nombre del contacto" style={{ ...inp, fontSize: 12, padding: '4px 6px' }} />
                </td>
                <td style={td}>
                  <input defaultValue={c.tel || ''} onBlur={e => actualizarCampo(c, 'tel', e.target.value)} style={{ ...inp, fontSize: 12, padding: '4px 6px' }} />
                </td>
                <td style={td}>
                  <input defaultValue={c.mail || ''} onBlur={e => actualizarCampo(c, 'mail', e.target.value)} style={{ ...inp, fontSize: 12, padding: '4px 6px' }} />
                </td>
                <td style={td}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    background: estado === 'ACTIVO' ? '#e6f4e1' : '#fde8e8',
                    color: estado === 'ACTIVO' ? '#2e7d32' : '#c00',
                  }}>
                    {estado}
                  </span>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 3, whiteSpace: 'nowrap' }}>{ultimos[normCliente(c.nombre)] ? 'Últ. pedido ' + ultimos[normCliente(c.nombre)].split('-').reverse().join('/') : 'Sin pedidos'}</div>
                </td>
                <td style={td}>
                  <button onClick={() => { setEditIdx(clientes.indexOf(c)); setCod(c.cod); setNombre(c.nombre); setCuit(c.cuit || ''); setContacto(c.contacto || ''); setTel(c.tel || ''); setMail(c.mail || ''); setModal(true); }} style={{ ...btn, fontSize: 12, padding: '4px 10px', marginRight: 6 }}>Editar</button>
                  <button onClick={() => eliminar(c)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Eliminar</button>
                </td>
              </tr>
              );
            })}
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
          <div style={{ marginBottom: 12 }}><label style={lbl}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} /></div>
          <div style={{ marginBottom: 12 }}><label style={lbl}>CUIT</label><input value={cuit} onChange={e => setCuit(formatearCuit(e.target.value))} style={inp} placeholder="XX-XXXXXXXX-X" inputMode="numeric" /></div>
          <div style={{ marginBottom: 12 }}><label style={lbl}>Contacto</label><input value={contacto} onChange={e => setContacto(e.target.value)} style={inp} placeholder="Nombre del contacto" /></div>
          <div style={{ marginBottom: 12 }}><label style={lbl}>Tel</label><input value={tel} onChange={e => setTel(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Mail</label><input value={mail} onChange={e => setMail(e.target.value)} style={inp} /></div>
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
    await supabase.from('telas').delete().eq('id', t.id); onGuardar();
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
    await supabase.from('empleados').delete().eq('id', e.id); onGuardar();
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

// ===== USUARIOS DE LA APP (solo ventas@ y matias@) =====
// Habla con /api/usuarios, que corre en el servidor con la clave secreta de Supabase.
const ROLES_APP = ['admin', 'encargado', 'logistica', 'comercial', 'diseno', 'administrativo', 'operario'];
function Usuarios({ formatFecha }: any) {
  const [lista, setLista] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState({ email: '', nombre: '', rol: 'comercial', password: '' });
  const [guardando, setGuardando] = useState(false);
  const [claveDe, setClaveDe] = useState<string | null>(null);
  const [clave, setClave] = useState('');

  async function api(metodo: string, cuerpo?: any) {
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch('/api/usuarios', {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Error ' + r.status);
    return j;
  }
  async function cargar() {
    setCargando(true); setError('');
    try { const j = await api('GET'); setLista(j.usuarios || []); } catch (e: any) { setError(e.message); }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function crear() {
    if (!nuevo.email.trim() || !nuevo.nombre.trim()) { alert('Completá mail y nombre.'); return; }
    if (nuevo.password.length < 10) { alert('La contraseña tiene que tener al menos 10 caracteres.'); return; }
    setGuardando(true);
    try { await api('POST', nuevo); setNuevo({ email: '', nombre: '', rol: 'comercial', password: '' }); alert('✅ Usuario creado.'); cargar(); }
    catch (e: any) { alert('Error: ' + e.message); }
    setGuardando(false);
  }
  async function guardarClave(u: any) {
    if (clave.length < 10) { alert('La contraseña tiene que tener al menos 10 caracteres.'); return; }
    try { await api('PATCH', { id: u.id, password: clave }); setClaveDe(null); setClave(''); alert('✅ Contraseña cambiada para ' + u.email); }
    catch (e: any) { alert('Error: ' + e.message); }
  }
  async function cambiarRol(u: any, rol: string) {
    try { await api('PATCH', { id: u.id, rol }); cargar(); } catch (e: any) { alert('Error: ' + e.message); }
  }
  async function cambiarNombre(u: any) {
    const n = window.prompt('Nombre para ' + u.email, u.nombre || '');
    if (n === null) return;
    try { await api('PATCH', { id: u.id, nombre: n }); cargar(); } catch (e: any) { alert('Error: ' + e.message); }
  }
  async function baja(u: any) {
    if (!confirm(`¿Dar de baja a ${u.email}? Ya no va a poder entrar a la app. No se puede deshacer.`)) return;
    try { await api('DELETE', { id: u.id }); cargar(); } catch (e: any) { alert('Error: ' + e.message); }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Usuarios</div>
        <div style={{ fontSize: 13, color: '#888' }}>Quién puede entrar a la app. Lo que ve cada uno depende de su mail (permisos). Contraseñas de 10 caracteres o más.</div>
      </div>
      {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee', color: '#c00', borderRadius: 8, fontSize: 13 }}>{error}</div>}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eee', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Crear usuario</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, alignItems: 'end' }}>
          <div><label style={lbl}>Mail</label><input value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} placeholder="nombre@hypearg.com" style={inp} /></div>
          <div><label style={lbl}>Nombre</label><input value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} style={inp} /></div>
          <div><label style={lbl}>Rol (lo usa HYPE Producción)</label>
            <select value={nuevo.rol} onChange={e => setNuevo({ ...nuevo, rol: e.target.value })} style={inp}>{ROLES_APP.map(r => <option key={r} value={r}>{r}</option>)}</select>
          </div>
          <div><label style={lbl}>Contraseña</label><input type="password" autoComplete="new-password" value={nuevo.password} onChange={e => setNuevo({ ...nuevo, password: e.target.value })} style={inp} /></div>
          <div><button onClick={crear} disabled={guardando} style={{ ...btn, width: '100%', background: '#e85d2f', color: '#fff', border: 'none', fontWeight: 600 }}>{guardando ? 'Creando...' : 'Crear'}</button></div>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Mail', 'Nombre', 'Rol', 'Último ingreso', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {cargando && <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#888' }}>Cargando...</td></tr>}
            {!cargando && lista.map((u: any) => (
              <tr key={u.id}>
                <td style={td}>{u.email}</td>
                <td style={td}><span onClick={() => cambiarNombre(u)} style={{ cursor: 'pointer', borderBottom: '1px dashed #bbb' }} title="Cambiar nombre">{u.nombre || '—'}</span></td>
                <td style={td}>
                  <select value={u.rol || ''} onChange={e => cambiarRol(u, e.target.value)} style={{ ...inp, fontSize: 12, padding: '3px 6px', width: 'auto' }}>
                    {[...new Set([u.rol || '', ...ROLES_APP])].map(r => <option key={r} value={r}>{r || '—'}</option>)}
                  </select>
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{u.ultimoIngreso ? formatFecha(String(u.ultimoIngreso).slice(0, 10)) : 'Nunca'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  {claveDe === u.id ? (
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <input type="password" autoComplete="new-password" autoFocus placeholder="Nueva contraseña" value={clave} onChange={e => setClave(e.target.value)} onKeyDown={e => e.key === 'Enter' && guardarClave(u)} style={{ ...inp, fontSize: 12, padding: '4px 8px', width: 170 }} />
                      <button onClick={() => guardarClave(u)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#e85d2f', color: '#fff', border: 'none' }}>Guardar</button>
                      <button onClick={() => { setClaveDe(null); setClave(''); }} style={{ ...btn, fontSize: 12, padding: '4px 10px' }}>Cancelar</button>
                    </span>
                  ) : (
                    <>
                      <button onClick={() => { setClaveDe(u.id); setClave(''); }} style={{ ...btn, fontSize: 12, padding: '4px 10px', marginRight: 6 }}>Cambiar contraseña</button>
                      <button onClick={() => baja(u)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#fee', color: '#c00', border: '1px solid #fcc' }}>Dar de baja</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#1a1a2e', width: '100%', boxSizing: 'border-box' };
const btn: React.CSSProperties = { padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, cursor: 'pointer' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#888', display: 'block', marginBottom: 4 };
const dropdown: React.CSSProperties = { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', color: '#1a1a2e' };
const ddItem: React.CSSProperties = { padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0', color: '#1a1a2e' };
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: 11, color: '#888', fontWeight: 500 };
const td: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid #ddd', color: '#1a1a2e' };
