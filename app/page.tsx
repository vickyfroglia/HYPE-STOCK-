'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [clientes, setClientes] = useState([]);
  const [telas, setTelas] = useState([]);

  useEffect(() => {
    async function cargarDatos() {
      const { data: cls } = await supabase.from('clientes').select('*');
      const { data: tls } = await supabase.from('telas').select('*');
      if(cls) setClientes(cls);
      if(tls) setTelas(tls);
    }
    cargarDatos();
  }, []);

  return (
    <main style={{padding:'20px'}}>
      <h1>HYPE Stock</h1>
      <p>Clientes cargados: {clientes.length}</p>
      <p>Telas cargadas: {telas.length}</p>
    </main>
  );
}