setEditItem({...editItem, ramado: e.target.value})} style={inp}>
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