'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { BairroInfo } from '@/types/bairro'
import { parseBairroProperties } from '@/lib/parseBairro'
import { GEOJSON_VERSION } from '@/lib/geojson-manifest'
import type { StyleMode } from './LayerToggle'

interface MapLeafletProps {
  onSelectBairro: (bairro: BairroInfo | null) => void
  onBairrosLoaded: (bairros: BairroInfo[]) => void
  focusBairroId: string | null
  styleMode: StyleMode
}

const ITABIRA_CENTER: [number, number] = [-43.22, -19.62]
const PALETTE = ['#fb923c', '#a78bfa', '#4ade80', '#f472b6', '#fcd34d', '#60a5fa']
const MONO_FILL = '#3b82f6'

function fillColor(mode: StyleMode): maplibregl.ExpressionSpecification | string {
  if (mode === 'mono') return MONO_FILL
  return [
    'match', ['get', 'color_idx'],
    0, PALETTE[0],
    1, PALETTE[1],
    2, PALETTE[2],
    3, PALETTE[3],
    4, PALETTE[4],
    PALETTE[5],
  ]
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}

export default function MapLeaflet({ onSelectBairro, onBairrosLoaded, focusBairroId, styleMode }: MapLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const bairroByIdRef = useRef<Map<string, BairroInfo>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    registerServiceWorker()
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxzoom: 19,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: ITABIRA_CENTER,
      zoom: 13,
    })

    mapRef.current = map

    const abortController = new AbortController()

    map.once('load', () => {
      fetch(`/bairros-opt.geojson?v=${GEOJSON_VERSION}`, { signal: abortController.signal })
        .then((r) => r.json())
        .then((geojson) => {
          if (!mapRef.current) return

          const bairroList: BairroInfo[] = []
          geojson.features.forEach((f: GeoJSON.Feature) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const b = parseBairroProperties(f.properties as any)
            bairroByIdRef.current.set(b.id, b)
            bairroList.push(b)
          })

          map.addSource('bairros', { type: 'geojson', data: geojson, promoteId: 'id' })

          map.addLayer({
            id: 'bairros-fill',
            type: 'fill',
            source: 'bairros',
            paint: {
              'fill-color': fillColor(styleMode),
              'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.7,
                ['boolean', ['feature-state', 'hover'], false], styleMode === 'mono' ? 0.35 : 0.8,
                styleMode === 'mono' ? 0.15 : 0.55],
            },
          })

          map.addLayer({
            id: 'bairros-line',
            type: 'line',
            source: 'bairros',
            paint: {
              'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#1d4ed8', styleMode === 'mono' ? '#2563eb' : '#555'],
              'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3,
                ['boolean', ['feature-state', 'hover'], false], 2, 1],
              'line-opacity': 0.8,
            },
          })

          // Fit to bairros bounds
          const coords: number[][] = []
          geojson.features.forEach((f: GeoJSON.Feature) => {
            const geom = f.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon
            const rings = geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : geom.coordinates
            rings.forEach((ring) => ring.forEach((pt) => coords.push(pt as number[])))
          })
          const lngs = coords.map((c) => c[0])
          const lats = coords.map((c) => c[1])
          const bounds = new maplibregl.LngLatBounds(
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          )
          map.fitBounds(bounds, { padding: 20, duration: 0 })

          // Lock map to Itabira area with generous padding
          const pad = 0.15
          const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
          const minLat = Math.min(...lats), maxLat = Math.max(...lats)
          const dLng = (maxLng - minLng) * pad
          const dLat = (maxLat - minLat) * pad
          map.setMaxBounds([minLng - dLng, minLat - dLat, maxLng + dLng, maxLat + dLat])
          map.setMinZoom(map.getZoom() - 0.5)

          onBairrosLoaded(bairroList.sort((a, b) => a.nome.localeCompare(b.nome)))
          setLoading(false)

          const setState = (id: string, state: Record<string, boolean>) =>
            map.setFeatureState({ source: 'bairros', id }, state)

          // Hover state
          let hoveredId: string | null = null
          map.on('mousemove', 'bairros-fill', (e) => {
            const id = String(e.features?.[0]?.id ?? '')
            if (!id || id === hoveredId) return
            if (hoveredId) setState(hoveredId, { hover: false })
            hoveredId = id
            setState(hoveredId, { hover: true })
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', 'bairros-fill', () => {
            if (hoveredId) setState(hoveredId, { hover: false })
            hoveredId = null
            map.getCanvas().style.cursor = ''
          })

          // Click to select
          map.on('click', 'bairros-fill', (e) => {
            const id = String(e.features?.[0]?.id ?? '')
            if (!id) return
            if (selectedIdRef.current === id) {
              setState(id, { selected: false })
              selectedIdRef.current = null
              onSelectBairro(null)
            } else {
              if (selectedIdRef.current) setState(selectedIdRef.current, { selected: false })
              setState(id, { selected: true })
              selectedIdRef.current = id
              onSelectBairro(bairroByIdRef.current.get(id) ?? null)
            }
          })

          map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['bairros-fill'] })
            if (features.length === 0 && selectedIdRef.current) {
              setState(selectedIdRef.current, { selected: false })
              selectedIdRef.current = null
              onSelectBairro(null)
            }
          })
        })
        .catch((err) => { if (err.name !== 'AbortError') console.error(err) })
    })

    return () => {
      abortController.abort()
      map.remove()
      mapRef.current = null
      bairroByIdRef.current.clear()
      selectedIdRef.current = null
    }
  }, [onSelectBairro, onBairrosLoaded])

  // styleMode change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('bairros-fill')) return
    const mode = styleMode
    map.setPaintProperty('bairros-fill', 'fill-color', fillColor(mode))
    map.setPaintProperty('bairros-fill', 'fill-opacity', [
      'case', ['boolean', ['feature-state', 'selected'], false], 0.7,
      ['boolean', ['feature-state', 'hover'], false], mode === 'mono' ? 0.35 : 0.8,
      mode === 'mono' ? 0.15 : 0.55,
    ])
    map.setPaintProperty('bairros-line', 'line-color', [
      'case', ['boolean', ['feature-state', 'selected'], false], '#1d4ed8',
      mode === 'mono' ? '#2563eb' : '#555',
    ])
  }, [styleMode])

  // Focus bairro
  useEffect(() => {
    const map = mapRef.current
    if (!focusBairroId || !map || !map.getSource('bairros')) return

    if (selectedIdRef.current && selectedIdRef.current !== focusBairroId) {
      map.setFeatureState({ source: 'bairros', id: selectedIdRef.current }, { selected: false })
    }
    map.setFeatureState({ source: 'bairros', id: focusBairroId }, { selected: true })
    selectedIdRef.current = focusBairroId

    const features = map.querySourceFeatures('bairros', { filter: ['==', ['get', 'id'], focusBairroId] })
    if (features.length > 0) {
      const coords: number[][] = []
      const geom = features[0].geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon
      const rings = geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : geom.coordinates
      rings.forEach((ring) => ring.forEach((pt) => coords.push(pt as number[])))
      const lngs = coords.map((c) => c[0])
      const lats = coords.map((c) => c[1])
      map.fitBounds(
        new maplibregl.LngLatBounds([Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]),
        { padding: 60, duration: 800 },
      )
    }
  }, [focusBairroId])

  return (
    <div className="relative flex-1 h-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
          <div className="text-sm text-gray-400">Carregando mapa...</div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
