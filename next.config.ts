import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // GeoJSON: sempre revalida com ETag — baixa de novo só se o conteúdo mudou
      source: '/data/bairros-completo.geojson',
      headers: [{ key: 'Cache-Control', value: 'no-cache' }],
    },
  ],
  compress: true,
}

export default nextConfig
