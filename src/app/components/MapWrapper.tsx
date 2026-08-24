'use client'

import { Search, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { slugifyBairro } from '@/lib/slug'
import { STYLE_MODE_STORAGE_KEY, type StyleMode } from '@/lib/styleMode'
import { cn } from '@/lib/utils'
import type { BairroInfo } from '@/types/bairro'
import BairroSearch from './BairroSearch'
import InfoPanel from './InfoPanel'
import PointsToggle from './PointsToggle'

const GLASS_BUTTON =
  'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-white/40 bg-white/70 text-gray-500 shadow-lg backdrop-blur-xl backdrop-saturate-150 hover:text-gray-700 dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:text-gray-200'

const MapLeaflet = dynamic(() => import('./MapLeaflet'), { ssr: false })

// useSearchParams() opta o componente por renderização client-side — isolado
// aqui num filho com Suspense para não afetar o resto da árvore.
function InitialBairroFromUrl({ onSlug }: { onSlug: (slug: string | null) => void }) {
  const searchParams = useSearchParams()
  // Lê o parâmetro apenas uma vez, no mount — onSlug só grava numa ref.
  // biome-ignore lint/correctness/useExhaustiveDependencies: leitura única intencional
  useEffect(() => {
    onSlug(searchParams.get('bairro'))
  }, [])
  return null
}

export default function MapWrapper() {
  const router = useRouter()
  const pathname = usePathname()

  const [selectedBairro, setSelectedBairro] = useState<BairroInfo | null>(null)
  const [bairros, setBairros] = useState<BairroInfo[]>([])
  const [focusBairroId, setFocusBairroId] = useState<string | null>(null)
  // "Ver no mapa" nas associações/UBS — centraliza nesse ponto sem mexer no
  // bairro selecionado/URL.
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number } | null>(null)
  // Começa em "multi" (igual ao servidor) pra não gerar hydration mismatch;
  // corrige pro valor salvo assim que montar. O mapa em si (MapLeaflet, só
  // client) lê o localStorage direto e já nasce com a cor certa.
  const [styleMode, setStyleMode] = useState<StyleMode>('multi')
  const [showAssociacoes, setShowAssociacoes] = useState(true)
  const [showUbs, setShowUbs] = useState(true)
  // Busca no mobile mora embaixo, recolhida numa lupa (drawer fica intocado
  // por enquanto) — expande sob demanda em vez de ocupar espaço fixo.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const pendingSlugRef = useRef<string | null>(null)
  const appliedPendingSlugRef = useRef(false)

  const handleBairrosLoaded = useCallback((list: BairroInfo[]) => setBairros(list), [])

  const handleFocusPoint = useCallback((lat: number, lng: number) => setFocusPoint({ lat, lng }), [])

  useEffect(() => {
    const saved = localStorage.getItem(STYLE_MODE_STORAGE_KEY)
    if (saved === 'mono' || saved === 'multi') setStyleMode(saved)
  }, [])

  const handleStyleModeChange = useCallback((mode: StyleMode) => {
    setStyleMode(mode)
    localStorage.setItem(STYLE_MODE_STORAGE_KEY, mode)
  }, [])

  const updateUrl = useCallback(
    (bairro: BairroInfo | null) => {
      const params = new URLSearchParams(window.location.search)
      if (bairro) params.set('bairro', slugifyBairro(bairro.nome))
      else params.delete('bairro')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  // Cada bairro já chega de MapLeaflet com censo/associações/UBS embutidos
  // (vêm prontos de public/data/bairros-completo.geojson), sem necessidade
  // de buscar e cruzar dados aqui.
  const handleSelectBairro = useCallback(
    (bairro: BairroInfo | null) => {
      setSelectedBairro(bairro)
      updateUrl(bairro)
    },
    [updateUrl],
  )

  const handleSearchSelect = useCallback(
    (bairro: BairroInfo) => {
      setSelectedBairro(bairro)
      setFocusBairroId(bairro.id)
      updateUrl(bairro)
      setMobileSearchOpen(false)
    },
    [updateUrl],
  )

  // Aplica o ?bairro= da URL assim que a lista de bairros carrega (uma vez só)
  useEffect(() => {
    if (appliedPendingSlugRef.current || bairros.length === 0) return
    const slug = pendingSlugRef.current
    if (!slug) return
    appliedPendingSlugRef.current = true
    const match = bairros.find((b) => slugifyBairro(b.nome) === slug)
    if (match) {
      setSelectedBairro(match)
      setFocusBairroId(match.id)
    }
  }, [bairros])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Suspense fallback={null}>
        <InitialBairroFromUrl
          onSlug={(slug) => {
            pendingSlugRef.current = slug
          }}
        />
      </Suspense>

      <div className="absolute inset-0">
        <MapLeaflet
          onSelectBairro={handleSelectBairro}
          onBairrosLoaded={handleBairrosLoaded}
          focusBairroId={focusBairroId}
          focusPoint={focusPoint}
          styleMode={styleMode}
          showAssociacoes={showAssociacoes}
          showUbs={showUbs}
        />
      </div>

      {/* Topo — só a partir de 1125px: abaixo disso a sidebar (320px) some espaço
          demais e a busca centralizada passa por cima dela, então usamos o
          padrão "lupa recolhida" (como no mobile) até ter largura de sobra */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] left-1/2 z-[1000] hidden w-[calc(100%-2rem)] max-w-md min-[1125px]:-translate-x-1/2 min-[1125px]:flex items-start gap-2">
        {bairros.length > 0 && <BairroSearch bairros={bairros} onSelect={handleSearchSelect} />}
        <PointsToggle
          styleMode={styleMode}
          onStyleModeChange={handleStyleModeChange}
          showAssociacoes={showAssociacoes}
          showUbs={showUbs}
          onToggleAssociacoes={() => setShowAssociacoes((v) => !v)}
          onToggleUbs={() => setShowUbs((v) => !v)}
        />
      </div>

      {/* Abaixo de 1125px (mobile e tablet/desktop estreito) — canto inferior direito: configurações (com o tema junto) empilhadas acima da busca, que vira uma lupa maior e expande sob demanda */}
      <div
        className="min-[1125px]:hidden absolute inset-x-4 z-[999] flex flex-col items-end gap-2"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <PointsToggle
          styleMode={styleMode}
          onStyleModeChange={handleStyleModeChange}
          showAssociacoes={showAssociacoes}
          showUbs={showUbs}
          onToggleAssociacoes={() => setShowAssociacoes((v) => !v)}
          onToggleUbs={() => setShowUbs((v) => !v)}
        />
        {mobileSearchOpen ? (
          <div className="flex w-full items-start gap-2">
            {bairros.length > 0 && <BairroSearch bairros={bairros} onSelect={handleSearchSelect} autoFocus />}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Fechar busca"
              className={GLASS_BUTTON}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Buscar bairro"
            className={cn(GLASS_BUTTON, 'h-14 w-14')}
          >
            <Search className="size-6" />
          </button>
        )}
      </div>

      <InfoPanel
        bairro={selectedBairro}
        bairros={bairros}
        onClose={() => handleSelectBairro(null)}
        onSelectBairro={handleSearchSelect}
        onFocusPoint={handleFocusPoint}
      />
    </div>
  )
}
