'use client'

import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { slugifyBairro } from '@/lib/slug'
import { STYLE_MODE_STORAGE_KEY, type StyleMode } from '@/lib/styleMode'
import type { BairroInfo } from '@/types/bairro'
import BairroSearch from './BairroSearch'
import InfoPanel from './InfoPanel'
import PointsToggle from './PointsToggle'
import ThemeToggle from './ThemeToggle'

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
  // Começa em "multi" (igual ao servidor) pra não gerar hydration mismatch;
  // corrige pro valor salvo assim que montar. O mapa em si (MapLeaflet, só
  // client) lê o localStorage direto e já nasce com a cor certa.
  const [styleMode, setStyleMode] = useState<StyleMode>('multi')
  const [showAssociacoes, setShowAssociacoes] = useState(true)
  const [showUbs, setShowUbs] = useState(true)
  const pendingSlugRef = useRef<string | null>(null)
  const appliedPendingSlugRef = useRef(false)

  const handleBairrosLoaded = useCallback((list: BairroInfo[]) => setBairros(list), [])

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
          styleMode={styleMode}
          showAssociacoes={showAssociacoes}
          showUbs={showUbs}
        />
      </div>

      {/* Busca + filtro; no mobile o alternador de tema entra na mesma linha (no desktop ele mora no topo do painel à esquerda) */}
      <div className="absolute top-4 left-1/2 z-[1000] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-2">
        {bairros.length > 0 && <BairroSearch bairros={bairros} onSelect={handleSearchSelect} />}
        <PointsToggle
          styleMode={styleMode}
          onStyleModeChange={handleStyleModeChange}
          showAssociacoes={showAssociacoes}
          showUbs={showUbs}
          onToggleAssociacoes={() => setShowAssociacoes((v) => !v)}
          onToggleUbs={() => setShowUbs((v) => !v)}
        />
        <ThemeToggle className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-white/40 bg-white/70 text-gray-500 shadow-lg backdrop-blur-xl backdrop-saturate-150 hover:text-gray-700 sm:hidden dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:text-gray-200" />
      </div>

      <InfoPanel
        bairro={selectedBairro}
        bairros={bairros}
        onClose={() => handleSelectBairro(null)}
        onSelectBairro={handleSearchSelect}
      />
    </div>
  )
}
