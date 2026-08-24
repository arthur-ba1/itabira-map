import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '../public/bairros.geojson')
const OUT = resolve(__dirname, '../public/bairros-opt.geojson')

const EPSILON = 0.00005

// --- Ramer-Douglas-Peucker ---

function perpendicularDistance([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax,
    dy = by - ay
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay)
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function rdp(points, epsilon) {
  if (points.length <= 2) return points
  let maxDist = 0,
    maxIdx = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1])
    if (d > maxDist) {
      maxDist = d
      maxIdx = i
    }
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]]
  return [...rdp(points.slice(0, maxIdx + 1), epsilon).slice(0, -1), ...rdp(points.slice(maxIdx), epsilon)]
}

function round(n) {
  return Math.round(n * 1e6) / 1e6
}

function simplifyRing(ring) {
  const points = ring.map(([lng, lat]) => [round(lng), round(lat)])
  const simplified = rdp(points, EPSILON)
  if (simplified.length < 4) return points
  const first = simplified[0],
    last = simplified[simplified.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) simplified.push(first)
  return simplified
}

function processGeometry(geometry) {
  if (geometry.type === 'MultiPolygon') {
    return { type: 'MultiPolygon', coordinates: geometry.coordinates.map((p) => p.map(simplifyRing)) }
  }
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates.map(simplifyRing) }
  }
  return geometry
}

// --- Graph coloring ---

function edgeKey(a, b) {
  // Chave normalizada para um segmento (ordem independente de direção)
  const ka = `${a[0]},${a[1]}`
  const kb = `${b[0]},${b[1]}`
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}

function buildAdjacency(features) {
  // Mapeia cada aresta → lista de índices de features que a possuem
  const edgeMap = new Map()

  features.forEach((feature, idx) => {
    const rings =
      feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates.flat(1) : feature.geometry.coordinates

    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const key = edgeKey(ring[i], ring[i + 1])
        if (!edgeMap.has(key)) edgeMap.set(key, [])
        edgeMap.get(key).push(idx)
      }
    }
  })

  const adj = Array.from({ length: features.length }, () => new Set())
  for (const owners of edgeMap.values()) {
    if (owners.length === 2) {
      adj[owners[0]].add(owners[1])
      adj[owners[1]].add(owners[0])
    }
  }
  return adj
}

function greedyColor(adj) {
  // Welsh-Powell: processa nós em ordem decrescente de grau (vizinhos)
  const order = [...adj.keys()].sort((a, b) => adj[b].size - adj[a].size)
  const colors = new Array(adj.length).fill(-1)
  for (const i of order) {
    const usedByNeighbors = new Set([...adj[i]].map((n) => colors[n]).filter((c) => c !== -1))
    let color = 0
    while (usedByNeighbors.has(color)) color++
    colors[i] = color
  }
  return colors
}

// --- HTML parsers ---

function parseNumber(html, key) {
  const regex = new RegExp(`<td>${key}<\\/td>\\s*\\n\\s*\\n\\s*<td>([^<]*)<\\/td>`, 's')
  const match = regex.exec(html)
  return match ? parseFloat(match[1].trim().replace(',', '.')) || 0 : 0
}

function parseString(html, key) {
  const regex = new RegExp(`<td>${key}<\\/td>\\s*\\n\\s*\\n\\s*<td>([^<]*)<\\/td>`, 's')
  const match = regex.exec(html)
  return match ? match[1].trim() : ''
}

// --- Main ---

console.log('Lendo GeoJSON original...')
const raw = JSON.parse(readFileSync(SRC, 'utf-8'))

// 1. Adjacência no original (coordenadas exatas — bordas compartilhadas são idênticas)
console.log('Calculando adjacências nas coordenadas originais...')
const adj = buildAdjacency(raw.features)
const colors = greedyColor(adj)
const numColors = Math.max(...colors) + 1

// 2. Simplificar geometria e montar features finais
let totalBefore = 0,
  totalAfter = 0

const features = raw.features.map((feature, i) => {
  const { id, Name, description } = feature.properties
  const html = description || ''
  totalBefore += feature.geometry.coordinates.flat(3).length / 3
  const geometry = processGeometry(feature.geometry)
  totalAfter += geometry.coordinates.flat(3).length / 2
  return {
    type: 'Feature',
    properties: {
      id,
      nome: Name,
      area_ha: parseNumber(html, 'AREA_ha'),
      perim_km: parseNumber(html, 'PERIM_Km'),
      doc_legal: parseString(html, 'DocLegalBa'),
      color_idx: colors[i],
    },
    geometry,
  }
})

const optimized = { type: 'FeatureCollection', features }
const content = JSON.stringify(optimized)
writeFileSync(OUT, content)

const srcSize = readFileSync(SRC).length
const outSize = readFileSync(OUT).length

console.log(`\nPontos de coordenada:`)
console.log(`  Antes:  ${totalBefore.toLocaleString('pt-BR')}`)
console.log(
  `  Depois: ${Math.round(totalAfter).toLocaleString('pt-BR')} (−${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%)`,
)
console.log(`\nColoração:`)
console.log(`  Cores usadas: ${numColors} (máximo teórico: 4)`)
for (let c = 0; c < numColors; c++) {
  console.log(`  Cor ${c}: ${colors.filter((x) => x === c).length} bairros`)
}
console.log(`\nTamanho:`)
console.log(`  Original:  ${(srcSize / 1024).toFixed(0)} KB`)
console.log(`  Otimizado: ${(outSize / 1024).toFixed(0)} KB (−${(100 - (outSize / srcSize) * 100).toFixed(0)}%)`)
