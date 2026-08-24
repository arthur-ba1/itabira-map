const OSM_SUBDOMAINS = ['a', 'b', 'c']

export async function GET(_req: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await params
  const sub = OSM_SUBDOMAINS[(parseInt(x, 10) + parseInt(y, 10)) % 3]
  const upstream = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`

  const tile = await fetch(upstream, {
    headers: { 'User-Agent': 'itabira-map/1.0 (educational project)' },
    next: { revalidate: 86400 },
  })

  if (!tile.ok) {
    return new Response(null, { status: tile.status })
  }

  const buffer = await tile.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
