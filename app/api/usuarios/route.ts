// Administración de usuarios de la app (solo ventas@ y matias@).
// Corre en el servidor de Vercel con la clave secreta de Supabase (SUPABASE_SERVICE_ROLE_KEY),
// que nunca llega al navegador.
// La clave se carga en Vercel → hype-stock → Settings → Environment Variables.
import { createClient } from '@supabase/supabase-js';

const ADMINS_USUARIOS = ['ventas@hypearg.com', 'matias@hypearg.com'];

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta cargar SUPABASE_SERVICE_ROLE_KEY en Vercel.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Verifica que quien llama haya iniciado sesión con uno de los mails autorizados
async function verificar(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'Sin sesión.' };
  const sb = admin();
  const { data, error } = await sb.auth.getUser(token);
  const email = (data?.user?.email || '').toLowerCase();
  if (error || !ADMINS_USUARIOS.includes(email)) return { error: 'No tenés permiso para administrar usuarios.' };
  return { sb, email };
}

const mal = (msg: string, status = 400) => Response.json({ error: msg }, { status });

export async function GET(request: Request) {
  try {
    const v = await verificar(request); if (!v.sb) return mal(v.error!, 403);
    const { data: cuentas, error } = await v.sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return mal(error.message, 500);
    const { data: filas } = await v.sb.from('usuarios').select('id, email, nombre, rol');
    const lista = (cuentas?.users || []).map(u => {
      const f = (filas || []).find((x: any) => (x.email || '').toLowerCase() === (u.email || '').toLowerCase());
      return { id: u.id, email: u.email, nombre: f?.nombre || '', rol: f?.rol || '', ultimoIngreso: u.last_sign_in_at || null };
    }).sort((a, b) => String(a.email).localeCompare(String(b.email)));
    return Response.json({ usuarios: lista });
  } catch (e: any) { return mal(e.message, 500); }
}

// Crear usuario: { email, nombre, rol, password }
export async function POST(request: Request) {
  try {
    const v = await verificar(request); if (!v.sb) return mal(v.error!, 403);
    const b = await request.json();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return mal('Mail inválido.');
    if (password.length < 10) return mal('La contraseña tiene que tener al menos 10 caracteres.');
    const { data, error } = await v.sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return mal(error?.message || 'No se pudo crear.');
    const { error: e2 } = await v.sb.from('usuarios').upsert({ id: data.user.id, email, nombre: String(b.nombre || '').trim(), rol: String(b.rol || 'consulta').trim() });
    if (e2) return mal('Cuenta creada, pero no se pudo guardar el nombre: ' + e2.message);
    return Response.json({ ok: true });
  } catch (e: any) { return mal(e.message, 500); }
}

// Cambiar contraseña, nombre y/o rol: { id, password?, nombre?, rol? }
export async function PATCH(request: Request) {
  try {
    const v = await verificar(request); if (!v.sb) return mal(v.error!, 403);
    const b = await request.json();
    if (!b.id) return mal('Falta el usuario.');
    if (b.password !== undefined) {
      if (String(b.password).length < 10) return mal('La contraseña tiene que tener al menos 10 caracteres.');
      const { error } = await v.sb.auth.admin.updateUserById(b.id, { password: String(b.password) });
      if (error) return mal(error.message);
    }
    const cambios: any = {};
    if (b.nombre !== undefined) cambios.nombre = String(b.nombre).trim();
    if (b.rol !== undefined) cambios.rol = String(b.rol).trim();
    if (Object.keys(cambios).length) {
      const { data: u } = await v.sb.auth.admin.getUserById(b.id);
      const { error } = await v.sb.from('usuarios').upsert({ id: b.id, email: (u?.user?.email || '').toLowerCase(), ...cambios });
      if (error) return mal(error.message);
    }
    return Response.json({ ok: true });
  } catch (e: any) { return mal(e.message, 500); }
}

// Dar de baja: { id }
export async function DELETE(request: Request) {
  try {
    const v = await verificar(request); if (!v.sb) return mal(v.error!, 403);
    const b = await request.json();
    if (!b.id) return mal('Falta el usuario.');
    const { data: u } = await v.sb.auth.admin.getUserById(b.id);
    if ((u?.user?.email || '').toLowerCase() === v.email) return mal('No podés darte de baja a vos mismo.');
    await v.sb.from('usuarios').delete().eq('id', b.id);
    const { error } = await v.sb.auth.admin.deleteUser(b.id);
    if (error) return mal(error.message);
    return Response.json({ ok: true });
  } catch (e: any) { return mal(e.message, 500); }
}
