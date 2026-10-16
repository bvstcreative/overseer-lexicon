import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Overseer Lexicon',
    short_name: 'Lexicon',
    description: 'Words for the person who runs the place',
    start_url: '/',
    display: 'standalone',
    background_color: '#ECF0F1',
    theme_color: '#FF6B4A',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

