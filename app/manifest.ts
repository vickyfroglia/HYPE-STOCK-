import type { MetadataRoute } from 'next';

// "Ficha de app": con esto el celular deja instalar HYPE Stock con su ícono y abrirla a pantalla completa
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HYPE Stock',
    short_name: 'HYPE Stock',
    description: 'Stock y producción HYPE printlab',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#1a1a2e',
    theme_color: '#1a1a2e',
    lang: 'es',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
