'use client'

import { Loader2 } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GEOJSON_VERSION } from '@/lib/geojson-manifest'
import { parseBairroProperties } from '@/lib/parseBairro'
import { STYLE_MODE_STORAGE_KEY, type StyleMode } from '@/lib/styleMode'
import type { BairroInfo, BairrosCompletoGeoJSON } from '@/types/bairro'

interface MapLeafletProps {
  onSelectBairro: (bairro: BairroInfo | null) => void
  onBairrosLoaded: (bairros: BairroInfo[]) => void
  focusBairroId: string | null
  styleMode: StyleMode
  showAssociacoes: boolean
  showUbs: boolean
}

function popupContent(title: string, lines: (string | null | undefined)[]) {
  const container = document.createElement('div')
  container.className = 'text-sm max-w-[220px]'
  const h = document.createElement('div')
  h.className = 'font-semibold text-gray-900 mb-1'
  h.textContent = title
  container.appendChild(h)
  lines.filter(Boolean).forEach((line) => {
    const p = document.createElement('div')
    p.className = 'text-gray-600 text-xs leading-snug'
    p.textContent = line as string
    container.appendChild(p)
  })
  return container
}

interface HasLatLng {
  lat: number | null
  lng: number | null
}

// Pontos são renderizados como camada nativa do mapa (circle layer), não
// como maplibregl.Marker — elementos DOM ficam levemente dessincronizados
// do canvas WebGL durante a animação de zoom/pan.
function toPointFeatureCollection<T extends HasLatLng>(items: T[]): GeoJSON.FeatureCollection<GeoJSON.Point, T> {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((item) => item.lat != null && item.lng != null)
      .map((item) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [item.lng as number, item.lat as number] },
        properties: item,
      })),
  }
}

// Nem todo ponto tem endereço geocodificado com precisão — quando o
// endereço real não é encontrado, o pino cai no centroide do bairro
// (aproximado). Esses pinos ficam visualmente "apagados" para não passar
// falsa confiança de precisão.
const APPROX_OPACITY: maplibregl.ExpressionSpecification = [
  'case',
  ['==', ['get', 'geocode_source'], 'bairro_centroid'],
  0.45,
  1,
]

function addPointsLayer(
  map: maplibregl.Map,
  id: string,
  data: GeoJSON.FeatureCollection,
  color: string,
  visible: boolean,
) {
  map.addSource(id, { type: 'geojson', data })
  map.addLayer({
    id,
    type: 'circle',
    source: id,
    layout: { visibility: visible ? 'visible' : 'none' },
    paint: {
      'circle-radius': 6,
      'circle-color': color,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': APPROX_OPACITY,
      'circle-stroke-opacity': APPROX_OPACITY,
    },
  })
}

const ITABIRA_CENTER: [number, number] = [-43.22, -19.62]
const PALETTE = ['#fb923c', '#a78bfa', '#4ade80', '#f472b6', '#fcd34d', '#60a5fa']
const MONO_FILL = '#3b82f6'
// Duração de cada metade do crossfade (some/aparece) na troca de modo de cor.
const FADE_MS = 180

function fillColor(mode: StyleMode): maplibregl.ExpressionSpecification | string {
  if (mode === 'mono') return MONO_FILL
  return [
    'match',
    ['get', 'color_idx'],
    0,
    PALETTE[0],
    1,
    PALETTE[1],
    2,
    PALETTE[2],
    3,
    PALETTE[3],
    4,
    PALETTE[4],
    PALETTE[5],
  ]
}

// Contorno "#555" tem contraste bom no basemap OSM claro, mas quase some
// sobre o CARTO Dark Matter — troca para um cinza claro nesse caso.
function lineColor(mode: StyleMode, isDark: boolean): string {
  if (mode === 'mono') return '#2563eb'
  return isDark ? '#94a3b8' : '#555'
}

const OSM_TILES = [
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
]
const OSM_ATTRIBUTION = '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
const CARTO_DARK_TILES = [
  'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
]
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION} © <a href="https://carto.com/attributions">CARTO</a>`

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}

export default function MapLeaflet({
  onSelectBairro,
  onBairrosLoaded,
  focusBairroId,
  styleMode,
  showAssociacoes,
  showUbs,
}: MapLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const bairroByIdRef = useRef<Map<string, BairroInfo>>(new Map())
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  // Lidos de forma síncrona (não via useEffect) porque este componente só roda
  // no client (dynamic import com ssr:false em MapWrapper) — evita criar o
  // mapa com o tema/cor errados e ter que corrigir um instante depois. A prop
  // `styleMode` começa em "multi" no MapWrapper (SSR-safe) e só chega com o
  // valor salvo depois de montar, então o mapa não pode confiar nela aqui.
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [initialStyleMode] = useState<StyleMode>(() => {
    const saved = localStorage.getItem(STYLE_MODE_STORAGE_KEY)
    return saved === 'mono' || saved === 'multi' ? saved : styleMode
  })

  useEffect(() => {
    registerServiceWorker()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')))
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // styleMode/showAssociacoes/showUbs/isDark abaixo só definem os valores iniciais
  // do mapa — mudanças depois do mount são aplicadas pelos efeitos
  // dedicados mais abaixo (setPaintProperty/setLayoutProperty), sem recriar
  // o mapa inteiro (o que refaria o fetch e piscaria o mapa inteiro).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentário acima
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: OSM_TILES,
            tileSize: 256,
            attribution: OSM_ATTRIBUTION,
            maxzoom: 19,
          },
          'osm-dark': {
            type: 'raster',
            tiles: CARTO_DARK_TILES,
            tileSize: 256,
            attribution: CARTO_ATTRIBUTION,
            maxzoom: 19,
          },
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm', layout: { visibility: isDark ? 'none' : 'visible' } },
          {
            id: 'osm-dark',
            type: 'raster',
            source: 'osm-dark',
            layout: { visibility: isDark ? 'visible' : 'none' },
            // CARTO Dark Matter é quase preto puro — levanta o preto pra um
            // cinza mais suave em vez de trocar de provedor.
            paint: { 'raster-brightness-min': 0.18 },
          },
        ],
      },
      center: ITABIRA_CENTER,
      zoom: 13,
    })

    mapRef.current = map

    const tooltip = document.createElement('div')
    tooltip.style.position = 'absolute'
    tooltip.style.top = '0'
    tooltip.style.left = '0'
    tooltip.style.pointerEvents = 'none'
    tooltip.style.zIndex = '5'
    tooltip.style.background = 'rgba(17,24,39,0.92)'
    tooltip.style.color = '#fff'
    tooltip.style.fontSize = '12px'
    tooltip.style.fontWeight = '600'
    tooltip.style.padding = '3px 9px'
    tooltip.style.borderRadius = '6px'
    tooltip.style.whiteSpace = 'nowrap'
    tooltip.style.opacity = '0'
    tooltip.style.transition = 'opacity 0.1s'
    containerRef.current.appendChild(tooltip)
    tooltipRef.current = tooltip

    const abortController = new AbortController()

    map.once('load', () => {
      fetch(`/data/bairros-completo.geojson?v=${GEOJSON_VERSION}`, { signal: abortController.signal })
        .then((r) => r.json())
        .then((geojson: BairrosCompletoGeoJSON) => {
          if (!mapRef.current) return

          const bairroList: BairroInfo[] = []
          geojson.features.forEach((f) => {
            const b = parseBairroProperties(f.properties)
            bairroByIdRef.current.set(b.id, b)
            bairroList.push(b)
          })

          map.addSource('bairros', { type: 'geojson', data: geojson, promoteId: 'id' })

          map.addLayer({
            id: 'bairros-fill',
            type: 'fill',
            source: 'bairros',
            paint: {
              'fill-color': fillColor(initialStyleMode),
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                0.7,
                ['boolean', ['feature-state', 'hover'], false],
                initialStyleMode === 'mono' ? 0.35 : 0.8,
                initialStyleMode === 'mono' ? 0.15 : 0.55,
              ],
              // fill-color não faz transição suave entre a expressão por-bairro
              // (multi) e uma cor sólida (mono) — são "tipos" de paint property
              // diferentes internamente, o GPU não interpola entre eles. Em vez
              // disso a troca de modo anima via opacidade (some → troca a cor →
              // aparece), por isso essa duração casa com a do crossfade em JS.
              'fill-opacity-transition': { duration: FADE_MS },
            },
          })

          map.addLayer({
            id: 'bairros-line',
            type: 'line',
            source: 'bairros',
            paint: {
              'line-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                '#1d4ed8',
                lineColor(initialStyleMode, isDark),
              ],
              'line-opacity-transition': { duration: FADE_MS },
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                3,
                ['boolean', ['feature-state', 'hover'], false],
                2,
                1,
              ],
              'line-opacity': 0.8,
            },
          })

          addPointsLayer(
            map,
            'associacoes-points',
            toPointFeatureCollection(geojson.associacoes),
            '#10b981',
            showAssociacoes,
          )
          addPointsLayer(map, 'ubs-points', toPointFeatureCollection(geojson.ubs), '#f43f5e', showUbs)

          // Fit to bairros bounds
          const coords: number[][] = []
          geojson.features.forEach((f) => {
            const geom = f.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon
            const rings = geom.type === 'MultiPolygon' ? geom.coordinates.flat(1) : geom.coordinates
            for (const ring of rings) {
              for (const pt of ring) coords.push(pt as number[])
            }
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
          const minLng = Math.min(...lngs),
            maxLng = Math.max(...lngs)
          const minLat = Math.min(...lats),
            maxLat = Math.max(...lats)
          const dLng = (maxLng - minLng) * pad
          const dLat = (maxLat - minLat) * pad
          map.setMaxBounds([minLng - dLng, minLat - dLat, maxLng + dLng, maxLat + dLat])
          map.setMinZoom(map.getZoom() - 0.5)

          onBairrosLoaded(bairroList.sort((a, b) => a.nome.localeCompare(b.nome)))
          setLoading(false)

          const setState = (id: string, state: Record<string, boolean>) =>
            map.setFeatureState({ source: 'bairros', id }, state)

          const pointLayerIds = ['associacoes-points', 'ubs-points']

          // Hover state
          let hoveredId: string | null = null
          map.on('mousemove', 'bairros-fill', (e) => {
            // pins têm prioridade sobre o polígono por baixo
            if (map.queryRenderedFeatures(e.point, { layers: pointLayerIds }).length > 0) {
              if (hoveredId) {
                setState(hoveredId, { hover: false })
                hoveredId = null
              }
              return
            }
            const id = String(e.features?.[0]?.id ?? '')
            if (!id) return
            if (id !== hoveredId) {
              if (hoveredId) setState(hoveredId, { hover: false })
              hoveredId = id
              setState(hoveredId, { hover: true })
              map.getCanvas().style.cursor = 'pointer'
            }
            const tip = tooltipRef.current
            const bairro = bairroByIdRef.current.get(id)
            if (tip && bairro) {
              tip.textContent = bairro.nome.toUpperCase()
              tip.style.transform = `translate(${e.point.x + 14}px, ${e.point.y - 12}px)`
              tip.style.opacity = '1'
            }
          })
          map.on('mouseleave', 'bairros-fill', () => {
            if (hoveredId) setState(hoveredId, { hover: false })
            hoveredId = null
            map.getCanvas().style.cursor = ''
            if (tooltipRef.current) tooltipRef.current.style.opacity = '0'
          })

          // Click to select
          map.on('click', 'bairros-fill', (e) => {
            if (map.queryRenderedFeatures(e.point, { layers: pointLayerIds }).length > 0) return
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

          // Pins — hover mostra o nome, clique abre os detalhes
          const setupPointLayer = (
            layerId: string,
            getLabel: (p: GeoJSON.GeoJsonProperties) => string,
            buildLines: (p: GeoJSON.GeoJsonProperties) => (string | null | undefined)[],
          ) => {
            map.on('mousemove', layerId, (e) => {
              const f = e.features?.[0]
              if (!f) return
              map.getCanvas().style.cursor = 'pointer'
              const tip = tooltipRef.current
              if (tip) {
                tip.textContent = getLabel(f.properties)
                tip.style.transform = `translate(${e.point.x + 14}px, ${e.point.y - 12}px)`
                tip.style.opacity = '1'
              }
            })
            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = ''
              if (tooltipRef.current) tooltipRef.current.style.opacity = '0'
            })
            map.on('click', layerId, (e) => {
              const f = e.features?.[0]
              if (!f) return
              popupRef.current?.remove()
              popupRef.current = new maplibregl.Popup({ offset: 10, closeButton: true, maxWidth: '240px' })
                .setLngLat(e.lngLat)
                .setDOMContent(popupContent(getLabel(f.properties), buildLines(f.properties)))
                .addTo(map)
            })
          }

          const approxNote = (p: GeoJSON.GeoJsonProperties) =>
            p?.geocode_source === 'bairro_centroid' ? '📍 Localização aproximada (centro do bairro)' : null

          setupPointLayer(
            'associacoes-points',
            (p) => String(p?.nome ?? ''),
            (p) => [
              [p?.endereco, p?.numero].filter(Boolean).join(', ') || null,
              p?.presidente ? `Presidente: ${p.presidente}` : null,
              p?.telefone_presidente ? `Tel: ${p.telefone_presidente}` : null,
              approxNote(p),
            ],
          )
          setupPointLayer(
            'ubs-points',
            (p) => {
              const bairroNome = bairroByIdRef.current.get(String(p?.bairro_id ?? ''))?.nome
              return bairroNome ? `UBS ${p?.unidade} (${bairroNome})` : `UBS ${p?.unidade ?? ''}`
            },
            (p) => [p?.endereco ?? null, p?.telefone ? `Tel: ${p.telefone}` : null, approxNote(p)],
          )
        })
        .catch((err) => {
          if (err.name === 'AbortError') return
          console.error(err)
          setLoading(false)
          setLoadError(true)
        })
    })

    return () => {
      abortController.abort()
      map.remove()
      mapRef.current = null
      bairroByIdRef.current.clear()
      selectedIdRef.current = null
      tooltip.remove()
      tooltipRef.current = null
    }
  }, [onSelectBairro, onBairrosLoaded])

  // styleMode/isDark change — anima a troca via crossfade de opacidade (some,
  // troca a cor por baixo, aparece), já que o GPU não interpola fill-color
  // entre a expressão por-bairro (multi) e uma cor sólida (mono).
  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('bairros-fill')) return
    const mode = styleMode

    map.setPaintProperty('bairros-fill', 'fill-opacity', 0)
    map.setPaintProperty('bairros-line', 'line-opacity', 0)

    const timer = setTimeout(() => {
      const m = mapRef.current
      if (!m?.getLayer('bairros-fill')) return
      m.setPaintProperty('bairros-fill', 'fill-color', fillColor(mode))
      m.setPaintProperty('bairros-fill', 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.7,
        ['boolean', ['feature-state', 'hover'], false],
        mode === 'mono' ? 0.35 : 0.8,
        mode === 'mono' ? 0.15 : 0.55,
      ])
      m.setPaintProperty('bairros-line', 'line-color', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#1d4ed8',
        lineColor(mode, isDark),
      ])
      m.setPaintProperty('bairros-line', 'line-opacity', 0.8)
    }, FADE_MS)

    return () => clearTimeout(timer)
  }, [styleMode, isDark])

  // Basemap claro/escuro
  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('osm') || !map.getLayer('osm-dark')) return
    map.setLayoutProperty('osm', 'visibility', isDark ? 'none' : 'visible')
    map.setLayoutProperty('osm-dark', 'visibility', isDark ? 'visible' : 'none')
  }, [isDark])

  // Focus bairro
  useEffect(() => {
    const map = mapRef.current
    if (!focusBairroId || !map?.getSource('bairros')) return

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
      for (const ring of rings) {
        for (const pt of ring) coords.push(pt as number[])
      }
      const lngs = coords.map((c) => c[0])
      const lats = coords.map((c) => c[1])
      map.fitBounds(
        new maplibregl.LngLatBounds([Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]),
        { padding: 60, duration: 800 },
      )
    }
  }, [focusBairroId])

  // Visibilidade das camadas de pontos
  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('associacoes-points')) return
    map.setLayoutProperty('associacoes-points', 'visibility', showAssociacoes ? 'visible' : 'none')
  }, [showAssociacoes])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('ubs-points')) return
    map.setLayoutProperty('ubs-points', 'visibility', showUbs ? 'visible' : 'none')
  }, [showUbs])

  return (
    <div className="relative flex-1 h-full">
      {loading && !loadError && (
        <div className="absolute inset-0 z-10 overflow-hidden">
          <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-white dark:bg-gray-900 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 shadow-md">
              <Loader2 className="size-4 animate-spin" />
              Carregando mapa...
            </div>
          </div>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
          <Alert variant="destructive" className="max-w-sm bg-white dark:bg-gray-900">
            <AlertTitle>Não foi possível carregar o mapa</AlertTitle>
            <AlertDescription>
              <p>Verifique sua conexão e tente novamente.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
