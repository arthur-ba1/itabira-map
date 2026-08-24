import { networkInterfaces } from 'node:os'
import type { NextConfig } from 'next'

// Sem isso o Next bloqueia (403) os chunks JS quando o dev server é
// acessado por um IP que não seja localhost (ex.: celular na mesma wifi).
// Descobre os IPs da rede local em vez de fixar um — assim não depende de
// um valor específico da máquina indo pro git nem quebra se o IP mudar.
function localNetworkIps(): string[] {
  const ips: string[] = []
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address)
    }
  }
  return ips
}

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkIps(),
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
