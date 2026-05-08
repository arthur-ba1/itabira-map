'use client'

import { useEffect, useRef, useState } from 'react'
import type { BairroInfo } from '@/types/bairro'

interface InfoPanelProps {
  bairro: BairroInfo | null
  bairros: BairroInfo[]
  onClose: () => void
  onSelectBairro: (bairro: BairroInfo) => void
}

const SNAP_PEEK = 72
const SNAP_HALF = 0.45
const SNAP_FULL = 0.85

export default function InfoPanel({ bairro, bairros, onClose, onSelectBairro }: InfoPanelProps) {
  const nome = bairro
    ? bairro.nome.charAt(0) + bairro.nome.slice(1).toLowerCase()
    : null

  const [drawerHeight, setDrawerHeight] = useState(SNAP_PEEK)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  useEffect(() => {
    if (bairro) {
      setDrawerHeight(Math.round(window.innerHeight * SNAP_HALF))
    } else {
      setDrawerHeight(SNAP_PEEK)
    }
  }, [bairro])

  function snapTo(currentHeight: number, direction: 'up' | 'down') {
    const winH = window.innerHeight
    const half = Math.round(winH * SNAP_HALF)
    const full = Math.round(winH * SNAP_FULL)

    if (direction === 'down') {
      if (currentHeight > half) return setDrawerHeight(half)
      setDrawerHeight(SNAP_PEEK)
      if (bairro) onClose()
    } else {
      if (currentHeight < half) return setDrawerHeight(half)
      return setDrawerHeight(full)
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY
    dragStartHeight.current = drawerHeight
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return
    const delta = dragStartY.current - e.clientY
    const next = Math.max(0, Math.min(Math.round(window.innerHeight * SNAP_FULL), dragStartHeight.current + delta))
    setDrawerHeight(next)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!isDragging) return
    setIsDragging(false)
    const delta = dragStartY.current - e.clientY
    snapTo(drawerHeight, delta < 0 ? 'down' : 'up')
  }

  function handleListSelect(b: BairroInfo) {
    onSelectBairro(b)
  }

  const isExpanded = drawerHeight > SNAP_PEEK

  return (
    <>
      {/* Desktop — painel lateral */}
      <aside className="hidden sm:flex w-80 shrink-0 bg-white border-l border-gray-200 flex-col overflow-hidden">
        {bairro ? (
          <>
            <div className="p-5 border-b border-gray-100 shrink-0">
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mb-3"
              >
                ← Todos os bairros
              </button>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                Bairro selecionado
              </h2>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{nome}</h1>
            </div>
            <div className="overflow-y-auto flex-1">
              <Sections bairro={bairro} />
            </div>
          </>
        ) : (
          <>
            <div className="p-5 border-b border-gray-100 shrink-0">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                Bairros
              </h2>
              <p className="text-xs text-gray-400 mt-1">{bairros.length} bairros</p>
            </div>
            <ul className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {bairros.map((b) => (
                <BairroListItem key={b.id} bairro={b} onClick={handleListSelect} />
              ))}
            </ul>
          </>
        )}
      </aside>

      {/* Mobile — drawer */}
      <div
        className="sm:hidden fixed inset-x-0 bottom-0 z-[1000] bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          height: drawerHeight > 0 ? `${drawerHeight}px` : 0,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <div
          className="flex flex-col items-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 shrink-0">
          {bairro ? (
            <>
              <div>
                <button
                  onClick={onClose}
                  className="flex items-center gap-1 text-xs text-blue-500 mb-1"
                >
                  ← Todos os bairros
                </button>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{nome}</h1>
              </div>
              <button
                onClick={() => { setDrawerHeight(SNAP_PEEK); onClose() }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 shrink-0"
              >
                ✕
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-semibold text-gray-700">Bairros</p>
                {isExpanded && (
                  <p className="text-xs text-gray-400">{bairros.length} bairros</p>
                )}
              </div>
              {!isExpanded && (
                <button
                  onClick={() => setDrawerHeight(Math.round(window.innerHeight * SNAP_HALF))}
                  className="text-xs text-blue-500 font-medium"
                >
                  Ver todos →
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {bairro ? (
            <Sections bairro={bairro} />
          ) : isExpanded ? (
            <ul className="divide-y divide-gray-50">
              {bairros.map((b) => (
                <BairroListItem key={b.id} bairro={b} onClick={handleListSelect} />
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Backdrop */}
      {bairro && drawerHeight > SNAP_PEEK && (
        <div
          className="sm:hidden fixed inset-0 z-[999] bg-black/10"
          onClick={() => { setDrawerHeight(SNAP_PEEK); onClose() }}
        />
      )}
    </>
  )
}

function BairroListItem({ bairro, onClick }: { bairro: BairroInfo; onClick: (b: BairroInfo) => void }) {
  const nome = bairro.nome.charAt(0) + bairro.nome.slice(1).toLowerCase()
  return (
    <li>
      <button
        onClick={() => onClick(bairro)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-blue-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">{nome}</span>
        <span className="text-xs text-gray-400">{bairro.area_ha.toFixed(1)} ha</span>
      </button>
    </li>
  )
}

function Sections({ bairro }: { bairro: BairroInfo }) {
  const c = bairro.census
  return (
    <div className="divide-y divide-gray-100">
      <Section title="Dados Gerais">
        {c && <Stat label="População" value={c.populacao.toLocaleString('pt-BR')} />}
        {c && <Stat label="Domicílios" value={c.domicilios.toLocaleString('pt-BR')} />}
        <Stat label="Área" value={`${bairro.area_ha.toFixed(2)} ha`} />
        <Stat label="Perímetro" value={`${bairro.perim_km.toFixed(3)} km`} />
        {bairro.docLegal && <Stat label="Doc. Legal" value={bairro.docLegal} />}
      </Section>
      {c && (
        <Section title="Sexo">
          <Stat label="Masculino" value={`${c.masculino.toLocaleString('pt-BR')} (${pct(c.masculino, c.populacao)}%)`} />
          <Stat label="Feminino" value={`${c.feminino.toLocaleString('pt-BR')} (${pct(c.feminino, c.populacao)}%)`} />
        </Section>
      )}
      {c && (
        <Section title="Faixa Etária">
          <Bar label="0–14 anos" value={c.de0a14} total={c.populacao} color="bg-blue-400" />
          <Bar label="15–29 anos" value={c.de15a29} total={c.populacao} color="bg-violet-400" />
          <Bar label="30–59 anos" value={c.de30a59} total={c.populacao} color="bg-orange-400" />
          <Bar label="60+ anos" value={c.de60mais} total={c.populacao} color="bg-pink-400" />
        </Section>
      )}
      {c && (
        <Section title="Cor / Raça">
          <Bar label="Parda" value={c.parda} total={c.populacao} color="bg-amber-400" />
          <Bar label="Branca" value={c.branca} total={c.populacao} color="bg-sky-300" />
          <Bar label="Preta" value={c.preta} total={c.populacao} color="bg-gray-600" />
          {c.amarela > 0 && <Bar label="Amarela" value={c.amarela} total={c.populacao} color="bg-yellow-300" />}
          {c.indigenaRaca > 0 && <Bar label="Indígena" value={c.indigenaRaca} total={c.populacao} color="bg-green-500" />}
        </Section>
      )}
      {c && (c.indigenas > 0 || c.quilombolas > 0) && (
        <Section title="Povos e Comunidades">
          {c.indigenas > 0 && <Stat label="Pessoas indígenas" value={c.indigenas.toLocaleString('pt-BR')} />}
          {c.quilombolas > 0 && <Stat label="Pessoas quilombolas" value={c.quilombolas.toLocaleString('pt-BR')} />}
        </Section>
      )}
      {c && (
        <Section title="Óbitos (jan/2019 – jul/2022)">
          <Stat
            label="Domicílios com falecimento"
            value={`${c.obitosHouseholds.toLocaleString('pt-BR')} (${pct(c.obitosHouseholds, c.domicilios)}%)`}
          />
        </Section>
      )}
    </div>
  )
}

function pct(part: number, total: number) {
  if (!total) return '0'
  return ((part / total) * 100).toFixed(1)
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = total ? (value / total) * 100 : 0
  return (
    <div className="text-sm">
      <div className="flex justify-between mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-800">{value.toLocaleString('pt-BR')} <span className="text-gray-400 font-normal">({p.toFixed(1)}%)</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
