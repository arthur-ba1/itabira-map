import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../public/data')
const GEOJSON_PATH = resolve(__dirname, '../public/bairros-opt.geojson')

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'itabira-map/1.0 (uso local, dados publicos de associacoes de bairro e UBS)'
const RATE_LIMIT_MS = 1100

// Bounding box generoso em torno do município de Itabira/MG — usado para
// restringir o geocoder e descartar matches de endereços genéricos (ex.:
// "Rua Principal") que caem em outras cidades do Brasil.
const ITABIRA_CENTER = { lat: -19.62, lng: -43.22 }
const ITABIRA_VIEWBOX = '-43.57,-19.27,-42.87,-19.97' // left,top,right,bottom
const MAX_DIST_DEG = 0.35

function withinItabira(lat, lng) {
  return Math.hypot(lat - ITABIRA_CENTER.lat, lng - ITABIRA_CENTER.lng) <= MAX_DIST_DEG
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function ringArea(ring) {
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return Math.abs(area / 2)
}

function ringCentroid(ring) {
  let cx = 0,
    cy = 0,
    a = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[i + 1]
    const cross = x0 * y1 - x1 * y0
    a += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  a /= 2
  if (a === 0) return ring[0]
  return [cx / (6 * a), cy / (6 * a)]
}

function buildBairroCentroids() {
  const geojson = JSON.parse(readFileSync(GEOJSON_PATH, 'utf-8'))
  const centroids = {}
  for (const f of geojson.features) {
    const geom = f.geometry
    const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]
    let bestRing = null,
      bestArea = -1
    for (const poly of polys) {
      const outer = poly[0]
      const area = ringArea(outer)
      if (area > bestArea) {
        bestArea = area
        bestRing = outer
      }
    }
    const [lng, lat] = ringCentroid(bestRing)
    centroids[f.properties.id] = { lat, lng }
  }
  return centroids
}

async function geocode(query) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=br&viewbox=${ITABIRA_VIEWBOX}&bounded=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) return null
  const results = await res.json()
  if (!results.length) return null
  const lat = parseFloat(results[0].lat)
  const lng = parseFloat(results[0].lon)
  if (!withinItabira(lat, lng)) return null
  return { lat, lng }
}

async function geocodeEntry(queries) {
  for (const q of queries) {
    if (!q) continue
    await sleep(RATE_LIMIT_MS)
    const hit = await geocode(q)
    if (hit) return { ...hit, geocode_query: q }
  }
  return null
}

function buildAssocQueries(rec) {
  const parts = [rec.endereco, rec.numero].filter(Boolean).join(', ')
  const bairro = rec.bairro_raw
  return [
    parts && bairro ? `${parts}, ${bairro}, Itabira - MG, Brazil` : null,
    parts ? `${parts}, Itabira - MG, Brazil` : null,
    bairro ? `Bairro ${bairro}, Itabira - MG, Brazil` : null,
  ]
}

function buildUbsQueries(rec) {
  return [
    `${rec.endereco}, Itabira - MG, Brazil`,
    rec.bairro_raw ? `Bairro ${rec.bairro_raw}, Itabira - MG, Brazil` : null,
  ]
}

async function processFile(filename, buildQueries) {
  const path = resolve(DATA_DIR, filename)
  const data = JSON.parse(readFileSync(path, 'utf-8'))
  const centroids = buildBairroCentroids()

  let geocoded = 0,
    fromCentroid = 0,
    failed = 0

  for (const rec of data) {
    if (typeof rec.lat === 'number' && typeof rec.lng === 'number') continue

    const hit = await geocodeEntry(buildQueries(rec))
    if (hit) {
      rec.lat = hit.lat
      rec.lng = hit.lng
      rec.geocode_source = 'nominatim'
      geocoded++
    } else if (rec.bairro_id && centroids[rec.bairro_id]) {
      rec.lat = centroids[rec.bairro_id].lat
      rec.lng = centroids[rec.bairro_id].lng
      rec.geocode_source = 'bairro_centroid'
      fromCentroid++
    } else {
      rec.lat = null
      rec.lng = null
      rec.geocode_source = 'none'
      failed++
    }
    writeFileSync(path, JSON.stringify(data, null, 2))
  }

  console.log(
    `${filename}: ${geocoded} geocodificados, ${fromCentroid} via centroide do bairro, ${failed} sem localização`,
  )
}

async function main() {
  console.log('Geocodificando associações de bairro...')
  await processFile('associacoes.json', buildAssocQueries)
  console.log('Geocodificando unidades de saúde (UBS)...')
  await processFile('ubs.json', buildUbsQueries)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
