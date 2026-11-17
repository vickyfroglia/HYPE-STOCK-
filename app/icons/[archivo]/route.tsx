// Íconos de la app (hype + STOCK) para instalarla en el celular.
// Se dibujan acá a partir del logo de la app (/logo.png) y la letra Lato negrita, sin archivos de imagen aparte.
import { ImageResponse } from 'next/og';

const AZUL = '#1a1a2e';
const LATO = process.env.ICON_FONT_URL || 'https://cdn.jsdelivr.net/npm/@fontsource/lato@5.3.0/files/lato-latin-700-normal.woff';
// tamaño del ícono y qué parte del ancho ocupa la palabra "hype"
const TAMANOS: Record<string, { lado: number; ancho: number }> = {
  'icon-192.png': { lado: 192, ancho: 0.66 },
  'icon-512.png': { lado: 512, ancho: 0.66 },
  'icon-maskable-512.png': { lado: 512, ancho: 0.52 },
  'apple-touch-icon.png': { lado: 180, ancho: 0.66 },
};

export async function GET(req: Request, ctx: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await ctx.params;
  const t = TAMANOS[archivo];
  if (!t) return new Response('No existe', { status: 404 });

  const logo = await fetch(new URL('/logo.png', req.url)).then(r => r.arrayBuffer());
  const logoSrc = 'data:image/png;base64,' + Buffer.from(logo).toString('base64');
  let fuente: ArrayBuffer | null = null;
  try { fuente = await fetch(LATO).then(r => (r.ok ? r.arrayBuffer() : null)); } catch { fuente = null; }

  const w = Math.round(t.lado * t.ancho);
  const h = Math.round(w * 1878 / 3543);       // proporción del logo
  const fs = Math.round(w * 0.17);
  const tapa = (izq: number, arr: number, ancho: number, alto: number) => (
    <div style={{ position: 'absolute', left: izq * w, top: arr * h, width: ancho * w + 2, height: alto * h, background: AZUL }} />
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: AZUL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: w, height: h, display: 'flex' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={w} height={h} alt="" />
          {tapa(0.5925, 0.745, 0.4075, 0.185)}{/* tapa "printlab" */}
          {tapa(0.9275, 0.17, 0.0725, 0.12)}{/* tapa la ™ */}
        </div>
        <div style={{ width: w, display: 'flex', justifyContent: 'space-between', marginTop: Math.round(t.lado * 0.045 - fs * 0.12),
          color: '#fff', fontSize: fs, fontFamily: 'Lato', fontWeight: 700, lineHeight: 1 }}>
          {'STOCK'.split('').map((c, i) => <span key={i}>{c}</span>)}
        </div>
      </div>
    ),
    {
      width: t.lado, height: t.lado,
      fonts: fuente ? [{ name: 'Lato', data: fuente, weight: 700, style: 'normal' }] : undefined,
      headers: { 'Cache-Control': 'public, max-age=604800, immutable' },
    },
  );
}
