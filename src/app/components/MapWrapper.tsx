'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import InfoPanel from './InfoPanel'
import BairroSearch from './BairroSearch'
import LayerToggle from './LayerToggle'
import type { StyleMode } from './LayerToggle'
import type { BairroInfo, CensusData } from '@/types/bairro'

const MapLeaflet = dynamic(() => import('./MapLeaflet'), { ssr: false })

export default function MapWrapper() {
  const [selectedBairro, setSelectedBairro] = useState<BairroInfo | null>(null)
  const [bairros, setBairros] = useState<BairroInfo[]>([])
  const [focusBairroId, setFocusBairroId] = useState<string | null>(null)
  const [styleMode, setStyleMode] = useState<StyleMode>('multi')
  const censusRef = useRef<Record<string, CensusData>>({})

  useEffect(() => {
    fetch('/data/census.json')
      .then((r) => r.json())
      .then((data) => { censusRef.current = data })
      .catch(() => {})
  }, [])

  const handleBairrosLoaded = useCallback((list: BairroInfo[]) => setBairros(list), [])

  const handleSelectBairro = useCallback((bairro: BairroInfo | null) => {
    setSelectedBairro(bairro ? { ...bairro, census: censusRef.current[bairro.id] } : null)
  }, [])

  const handleSearchSelect = useCallback((bairro: BairroInfo) => {
    setSelectedBairro({ ...bairro, census: censusRef.current[bairro.id] })
    setFocusBairroId(bairro.id)
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="relative flex-1 h-full">
        <MapLeaflet
          onSelectBairro={handleSelectBairro}
          onBairrosLoaded={handleBairrosLoaded}
          focusBairroId={focusBairroId}
          styleMode={styleMode}
        />
        {bairros.length > 0 && (
          <BairroSearch bairros={bairros} onSelect={handleSearchSelect} />
        )}
        <LayerToggle mode={styleMode} onChange={setStyleMode} />
      </div>
      <InfoPanel
        bairro={selectedBairro}
        bairros={bairros}
        onClose={() => setSelectedBairro(null)}
        onSelectBairro={handleSearchSelect}
      />
    </div>
  )
}
