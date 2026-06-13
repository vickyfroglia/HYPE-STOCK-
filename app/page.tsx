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
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logueado, setLogueado] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLogueado(!!session);
      setCheckingAuth(false);
      if (session) cargarTodo();
    });
  }, []);

  async function cargarTodo() {
    setLoading(true);
    const [{ data: cls }, { data: tls }, { data: ings }, { data: egs }] = await Promise.all([
      supabase.from('clientes').select('*').order('cod'),
      supabase.from('telas').select('*').order('cod'),
      supabase.from('ingresos').select('*').order('created_at', { ascending: false }),
      supabase.from('egresos').select('*').order('created_at', { ascending: false }),
    ]);
    if (cls) setClientes(cls);
    if (tls) setTelas(tls);
    if (ings) setIngresos(ings);
    if (egs) setEgresos(egs);
    setLoading(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setLogueado(false);
  }

  if (checkingAuth) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff' }}>Cargando...</div>;
  if (!logueado) return <Login onLogin={() => { setLogueado(true); cargarTodo(); }} />;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'ingresos', label: 'Ingresos', icon: '↓' },
    { id: 'egresos', label: 'Egresos', icon: '↑' },
    { id: 'stock', label: 'Stock', icon: '◫' },
    { id: 'clientes', label: 'Clientes', icon: '♟' },
    { id: 'telas', label: 'Telas', icon: '≡' },
  ];

  function calcStock() {
    const stockMap: any = {};
    ingresos.forEach((i: any) => {
      if (!stockMap[i.id_hype]) stockMap[i.id_hype] = { ing: 0, egr: 0, tela: i.tela, cliente: i.cliente, proceso: i.proceso };
      stockMap[i.id_hype].ing += Number(i.mts);
    });
    egresos.forEach((e: any) => {
      if (stockMap[e.id_hype]) stockMap[e.id_hype].egr += Number(e.mts);
    });
    return stockMap;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: 200, background: '#1a1a2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh' }}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>HYPE</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>STOCK & PRODUCCIÓN</div>
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
            {pagina === 'dashboard' && <Dashboard ingresos={ingresos} egresos={egresos} clientes={clientes} telas={telas} calcStock={calcStock} />}
            {pagina === 'ingresos' && <Ingresos clientes={clientes} telas={telas} onGuardar={cargarTodo} />}
            {pagina === 'egresos' && <Egresos ingresos={ingresos} egresos={egresos} onGuardar={cargarTodo} />}
            {pagina === 'stock' && <Stock calcStock={calcStock} />}
            {pagina === 'clientes' && <Clientes clientes={clientes} onGuardar={cargarTodo} />}
            {pagina === 'telas' && <Telas telas={telas} onGuardar={cargarTodo} />}
          </>
        )}
      </div>
    </div>
  );
}

function Dashboard({ ingresos, egresos, clientes, telas, calcStock }: any) {
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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Fecha','Cliente','Tela','ID','Mts','Estado'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: 11, color: '#888' }}>{h}</th>)}</tr></thead>
          <tbody>
            {ingresos.slice(0, 8).map((i: any, idx: number) => (
              <tr key={idx}>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.fecha}</td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.cliente}</td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.tela}</td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', color: '#e85d2f', fontSize: 12 }}>{i.id_hype}</td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.mts} mts</td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0' }}>{i.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Ingresos({ clientes, telas, onGuardar }: any) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [remito, setRemito] = useState('');
  const [cliente, setCliente] = useState('');
  const [codCliente, setCodCliente] = useState('');
  const [recibido, setRecibido] = useState('');
  const [busqCli, setBusqCli] = useState('');
  const [showCli, setShowCli] = useState(false);
  const [renglones, setRenglones] = useState([{ prop: '', proceso: '', tela: '', codTela: '', obs: '', bultos: '', modo: 'KG', kg: '', rinde: '', mts: '', ramado: 'No', ubicacion: '1-A', id_hype: '', busqTela: '', showTela: false }]);
  const [guardando, setGuardando] = useState(false);

  const ubicaciones = ['1-A','1-B','1-C','1-D','2-A','2-B','2-C','3-A','3-B','3-C','3-D','4-A','4-B','4-C','ISLA','PARED','TINTO HYPE','TINTO EXT'];

  function selCliente(c: any) {
    setCliente(c.nombre); setCodCliente(c.cod); setBusqCli(c.nombre); setShowCli(false);
    setRenglones(prev => prev.map(r => ({ ...r, id_hype: buildId(r.prop, r.proceso, c.cod, r.codTela) })));
  }

  function buildId(prop: string, proceso: string, codCli: string, codTela: string) {
    if (prop && proceso && codCli && codTela) return prop + proceso + codCli + codTela;
    return '';
  }

  function updateRenglon(idx: number, field: string, value: string) {
    setRenglones(prev => {
      const updated = prev.map((r, i) => {
        if (i !== idx) return r;
        const nr = { ...r, [field]: value };
        if (field === 'kg' || field === 'rinde') {
          const kg = field === 'kg' ? parseFloat(value) : parseFloat(nr.kg);
          const rinde = field === 'rinde' ? parseFloat(value) : parseFloat(nr.rinde);
          if (kg && rinde && rinde > 0) nr.mts = Math.round(kg / rinde).toString();
        }
        nr.id_hype = buildId(field === 'prop' ? value : nr.prop, field === 'proceso' ? value : nr.proceso, codCliente, field === 'codTela' ? value : nr.codTela);
        return nr;
      });
      return updated;
    });
  }

  function selTela(idx: number, t: any) {
    setRenglones(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const nr = { ...r, tela: t.nombre, codTela: t.cod, busqTela: t.nombre, showTela: false };
      nr.id_hype = buildId(nr.prop, nr.proceso, codCliente, t.cod);
      return nr;
    }));
  }

  async function guardar() {
    if (!fecha || !remito || !cliente) { alert('Completá fecha, remito y cliente.'); return; }
    setGuardando(true);
    const rows = renglones.filter(r => r.prop && r.proceso && r.tela && parseFloat(r.mts) > 0);
    if (!rows.length) { alert('Completá al menos un renglón.'); setGuardando(false); return; }
    const { error } = await supabase.from('ingresos').insert(rows.map(r => ({
      fecha, remito, cliente, cod_cliente: codCliente, recibido,
      prop: r.prop, proceso: r.proceso, tela: r.tela, cod_tela: r.codTela,
      observaciones: r.obs, bultos: parseInt(r.bultos) || 0,
      mts: parseFloat(r.mts), ramado: r.ramado, ubicacion: r.ubicacion,
      id_hype: r.id_hype, estado: 'En almacén'
    })));
    if (error) { alert('Error al guardar: ' + error.message); } else { alert('Ingreso guardado correctamente.'); onGuardar(); }
    setGuardando(false);
  }

  return (
    <div>
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
          <div><label style={lbl}>Recibido por</label><input value={recibido} onChange={e => setRecibido(e.target.value)} placeholder="Nombre" style={inp} /></div>
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
              <div><label style={lbl}>Observaciones</label><input value={r.obs} onChange={e => updateRenglon(idx, 'obs', e.target.value)} placeholder="Color, diseño..." style={inp} /></div>
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
        <div onClick={() => setRenglones(prev => [...prev, { prop: '', proceso: '', tela: '', codTela: '', obs: '', bultos: '', modo: 'KG', kg: '', rinde: '', mts: '', ramado: 'No', ubicacion: '1-A', id_hype: '', busqTela: '', showTela: false }])} style={{ padding: '12px 20px', cursor: 'pointer', color: '#e85d2f', fontSize: 13, background: '#fafafa', borderTop: '1px solid #eee' }}>
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

function Egresos({ ingresos, egresos, onGuardar }: any) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [remitoOrigen, setRemitoOrigen] = useState('');
  const [cliente, setCliente] = useState('');
  const [tela, setTela] = useState('');
  const [obs, setObs] = useState('');
  const [idHype, setIdHype] = useState('');
  const [disponibles, setDisponibles] = useState(0);
  const [mts, setMts] = useState('');
  const [bultos, setBultos] = useState('');
  const [remitoEntrega, setRemitoEntrega] = useState('');
  const [estado, setEstado] = useState('En almacén');
  const [entrego, setEntrego] = useState('');
  const [retiro, setRetiro] = useState('');
  const [alerta, setAlerta] = useState('');
  const [guardando, setGuardando] = useState(false);

  function buscarRemito(val: string) {
    setRemitoOrigen(val);
    const ing = ingresos.find((i: any) => i.remito === val);
    if (ing) {
      setCliente(ing.cliente); setTela(ing.tela); setObs(ing.observaciones || ''); setIdHype(ing.id_hype);
      const ingTotal = ingresos.filter((i: any) => i.id_hype === ing.id_hype).reduce((s: number, i: any) => s + Number(i.mts), 0);
      const egrTotal = egresos.filter((e: any) => e.id_hype === ing.id_hype).reduce((s: number, e: any) => s + Number(e.mts), 0);
      setDisponibles(ingTotal - egrTotal);
    }
  }

  function validarMts(val: string) {
    setMts(val);
    if (parseFloat(val) > disponibles) setAlerta(`La cantidad (${val} mts) supera los disponibles (${disponibles} mts).`);
    else setAlerta('');
  }

  async function guardar() {
    if (alerta) { alert('Corregí los metros antes de guardar.'); return; }
    if (!remitoOrigen || !parseFloat(mts)) { alert('Completá los datos obligatorios.'); return; }
    setGuardando(true);
    const { error } = await supabase.from('egresos').insert([{
      fecha, remito_origen: remitoOrigen, remito_entrega: remitoEntrega,
      cliente, tela, observaciones: obs, id_hype: idHype,
      mts: parseFloat(mts), bultos: parseInt(bultos) || 0,
      estado, entrego, retiro
    }]);
    if (error) alert('Error: ' + error.message);
    else { alert('Egreso guardado.'); onGuardar(); }
    setGuardando(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}><div style={{ fontSize: 18, fontWeight: 500 }}>Nuevo egreso</div></div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div><label style={lbl}>Fecha</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Nro. remito origen</label><input type="number" value={remitoOrigen} onChange={e => buscarRemito(e.target.value)} placeholder="00145" style={inp} /></div>
          <div><label style={lbl}>Cliente <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>auto</span></label><input value={cliente} readOnly style={{ ...inp, background: '#f5f5f7' }} /></div>
          <div><label style={lbl}>Tela <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>auto</span></label><input value={tela} readOnly style={{ ...inp, background: '#f5f5f7' }} /></div>
          <div><label style={lbl}>Observaciones <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>auto</span></label><input value={obs} readOnly style={{ ...inp, background: '#f5f5f7' }} /></div>
          <div><label style={lbl}>ID <span style={{ background: '#e8f4ea', color: '#3B6D11', fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>auto</span></label>
            <div style={{ background: '#1a1a2e', color: '#e85d2f', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 8 }}>{idHype || '---'}</div>
          </div>
          <div><label style={lbl}>Mts disponibles</label><input value={disponibles ? disponibles + ' mts' : '---'} readOnly style={{ ...inp, background: '#f5f5f7', color: '#3B6D11', fontWeight: 500 }} /></div>
          <div><label style={lbl}>Mts a egresar</label><input type="number" value={mts} onChange={e => validarMts(e.target.value)} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Nro. bultos</label><input type="number" value={bultos} onChange={e => setBultos(e.target.value)} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Nro. remito entrega</label><input type="number" value={remitoEntrega} onChange={e => setRemitoEntrega(e.target.value)} placeholder="00089" style={inp} /></div>
          <div><label style={lbl}>Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} style={inp}>
              <option>En almacén</option><option>Entregado a cliente</option><option>A producción</option><option>Salida a tinto externa</option><option>En tinto HYPE</option>
            </select>
          </div>
          <div><label style={lbl}>Quién entregó</label><input value={entrego} onChange={e => setEntrego(e.target.value)} placeholder="Nombre" style={inp} /></div>
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

function Stock({ calcStock }: any) {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('');
  const stock = calcStock();
  const entries = Object.entries(stock).filter(([id, s]: any) => {
    if (filtro && !id.startsWith(filtro)) return false;
    if (search && !id.toLowerCase().includes(search.toLowerCase()) && !s.cliente.toLowerCase().includes(search.toLowerCase()) && !s.tela.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  return (
    <div>
      <div style={{ marginBottom: 20 }}><div style={{ fontSize: 18, fontWeight: 500 }}>Stock actual</div></div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #eee', marginBottom: 16, display: 'flex', gap: 10 }}>
        <input placeholder="Buscar por ID, cliente o tela..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, maxWidth: 280 }} />
        <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inp, maxWidth: 140 }}>
          <option value="">Todos</option><option value="TC">Solo TC</option><option value="TH">Solo TH</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        {entries.length === 0 && <div style={{ color: '#888', fontSize: 13 }}>Sin stock registrado</div>}
        {entries.map(([id, s]: any) => {
          const disp = s.ing - s.egr;
          const pct = Math.round((disp / s.ing) * 100);
          return (
            <div key={id} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eee' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e85d2f', fontSize: 13, letterSpacing: 1 }}>{id}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.cliente} · {s.proceso === 'S' ? 'Sublimación' : 'Digital'}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{s.tela}</div>
              <div style={{ fontSize: 22, fontWeight: 500, marginTop: 8 }}>{disp.toLocaleString()} <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>mts</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginTop: 6 }}>
                <span>Ing: {s.ing.toLocaleString()}</span><span>Egr: {s.egr.toLocaleString()}</span>
              </div>
              <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: 4, background: '#e85d2f', borderRadius: 2, width: pct + '%' }} />
              </div>
            </div>
          );
        })}
      </div>
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
    if (editIdx !== null) {
      await supabase.from('clientes').update({ cod, nombre }).eq('id', clientes[editIdx].id);
    } else {
      await supabase.from('clientes').insert([{ cod, nombre }]);
    }
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
        <input placeholder="Buscar por nombre o código..." value={search} onChange={e => { setSearch(e.target.value); setPag(1); }} style={{ ...inp, maxWidth: 300 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>
            <th style={{ ...th, width: 80 }}>Código</th>
            <th style={th}>Nombre</th>
            <th style={{ ...th, width: 120 }}>Acciones</th>
          </tr></thead>
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
        {total > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {pag > 1 && <button onClick={() => setPag(pag - 1)} style={btn}>‹</button>}
            <span style={{ fontSize: 12, color: '#888', lineHeight: '32px' }}>Pág {pag} de {total}</span>
            {pag < total && <button onClick={() => setPag(pag + 1)} style={btn}>›</button>}
          </div>
        )}
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400, border: '1px solid #eee' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{editIdx !== null ? 'Editar cliente' : 'Nuevo cliente'}</div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Código</label><input value={cod} onChange={e => setCod(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={btn}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
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
    if (editIdx !== null) {
      await supabase.from('telas').update({ cod, nombre }).eq('id', telas[editIdx].id);
    } else {
      await supabase.from('telas').insert([{ cod, nombre }]);
    }
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
        <input placeholder="Buscar por nombre o código..." value={search} onChange={e => { setSearch(e.target.value); setPag(1); }} style={{ ...inp, maxWidth: 300 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>
            <th style={{ ...th, width: 80 }}>Código</th>
            <th style={th}>Nombre</th>
            <th style={{ ...th, width: 120 }}>Acciones</th>
          </tr></thead>
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
        {total > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {pag > 1 && <button onClick={() => setPag(pag - 1)} style={btn}>‹</button>}
            <span style={{ fontSize: 12, color: '#888', lineHeight: '32px' }}>Pág {pag} de {total}</span>
            {pag < total && <button onClick={() => setPag(pag + 1)} style={btn}>›</button>}
          </div>
        )}
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400, border: '1px solid #eee' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{editIdx !== null ? 'Editar tela' : 'Nueva tela'}</div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Código</label><input value={cod} onChange={e => setCod(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={btn}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
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
