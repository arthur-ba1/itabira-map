'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BairroInfo } from '@/types/bairro'
import ThemeToggle from './ThemeToggle'

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
  const nome = bairro ? bairro.nome.toUpperCase() : null

  const [drawerHeight, setDrawerHeight] = useState(SNAP_PEEK)
  const [isDragging, setIsDragging] = useState(false)
  // Fechado por padrão pra liberar o mapa; abre sozinho quando um bairro é selecionado.
  const [open, setOpen] = useState(false)

  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  useEffect(() => {
    if (bairro) {
      setDrawerHeight(Math.round(window.innerHeight * SNAP_HALF))
      setOpen(true)
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
      {/* Desktop — título + lista fundidos num único painel à esquerda, expande pra baixo (deixa a cidade à direita livre) */}
      <aside className="hidden sm:flex absolute top-4 left-4 z-[999] w-80 flex-col">
        <div
          className={cn(
            'flex items-center gap-1 border border-white/40 bg-white/70 p-1.5 shadow-xl backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-gray-900/60',
            open ? 'rounded-t-2xl border-b-0' : 'rounded-2xl',
          )}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-gray-900/5 dark:hover:bg-white/10"
          >
            <div className="min-w-0">
              {bairro ? (
                <>
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Bairro selecionado
                  </h2>
                  <h1 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">{nome}</h1>
                </>
              ) : (
                <>
                  <h1 className="text-sm font-bold leading-tight text-gray-900 dark:text-gray-100">Mapa de Itabira</h1>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{bairros.length} bairros · Itabira, MG</p>
                </>
              )}
            </div>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-gray-400 transition-transform dark:text-gray-500',
                open && 'rotate-180',
              )}
            />
          </button>
          <ThemeToggle className="shrink-0 text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-white/10" />
        </div>

        {open && (
          <div className="flex max-h-[60vh] flex-col overflow-hidden rounded-b-2xl border border-t-0 border-white/40 bg-white/70 shadow-xl backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-gray-900/60">
            {bairro ? (
              <>
                <div className="px-4 pt-2 pb-1 shrink-0">
                  <Button
                    type="button"
                    variant="link"
                    onClick={onClose}
                    className="h-auto gap-1 p-0 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    ← Todos os bairros
                  </Button>
                </div>
                <div className="overflow-y-auto flex-1 border-t border-gray-100/80 dark:border-gray-800/80">
                  <Sections bairro={bairro} />
                </div>
              </>
            ) : (
              <ul className="overflow-y-auto flex-1 divide-y divide-gray-50/80 dark:divide-gray-800/80">
                {bairros.map((b) => (
                  <BairroListItem key={b.id} bairro={b} onClick={handleListSelect} />
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>

      {/* Mobile — drawer */}
      <div
        className="sm:hidden fixed inset-x-0 bottom-0 z-[1000] bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl backdrop-saturate-150 rounded-t-2xl shadow-2xl flex flex-col"
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
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          {bairro ? (
            <>
              <div>
                <Button
                  type="button"
                  variant="link"
                  onClick={onClose}
                  className="mb-1 h-auto gap-1 p-0 text-xs text-blue-500 dark:text-blue-400"
                >
                  ← Todos os bairros
                </Button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{nome}</h1>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDrawerHeight(SNAP_PEEK)
                  onClose()
                }}
                className="shrink-0 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                ✕
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bairros</p>
                {isExpanded && <p className="text-xs text-gray-400 dark:text-gray-500">{bairros.length} bairros</p>}
              </div>
              {!isExpanded && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setDrawerHeight(Math.round(window.innerHeight * SNAP_HALF))}
                  className="h-auto p-0 text-xs font-medium text-blue-500 dark:text-blue-400"
                >
                  Ver todos →
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {bairro ? (
            <Sections bairro={bairro} />
          ) : isExpanded ? (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {bairros.map((b) => (
                <BairroListItem key={b.id} bairro={b} onClick={handleListSelect} />
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Backdrop */}
      {bairro && drawerHeight > SNAP_PEEK && (
        <button
          type="button"
          aria-label="Fechar"
          className="sm:hidden fixed inset-0 z-[999] bg-black/10"
          onClick={() => {
            setDrawerHeight(SNAP_PEEK)
            onClose()
          }}
        />
      )}
    </>
  )
}

function BairroListItem({ bairro, onClick }: { bairro: BairroInfo; onClick: (b: BairroInfo) => void }) {
  const nome = bairro.nome.toUpperCase()
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(bairro)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{nome}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {Math.round(bairro.area_ha).toLocaleString('pt-BR')} ha
        </span>
      </button>
    </li>
  )
}

function Sections({ bairro }: { bairro: BairroInfo }) {
  const c = bairro.census

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {bairro.associacoes && bairro.associacoes.length > 0 && (
        <Section title="Associação de Bairro">
          <div className="space-y-3">
            {bairro.associacoes.map((a) => (
              <div key={a.codigo} className="text-sm">
                <p className="font-medium text-gray-800 dark:text-gray-200">{a.nome}</p>
                {(a.endereco || a.numero) && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    {[a.endereco, a.numero].filter(Boolean).join(', ')}
                  </p>
                )}
                {a.presidente && <p className="text-gray-500 dark:text-gray-400 text-xs">Presidente: {a.presidente}</p>}
                {a.telefone_presidente && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Tel: {a.telefone_presidente}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
      {bairro.ubs && bairro.ubs.length > 0 && (
        <Section title="Unidade Básica de Saúde">
          <div className="space-y-3">
            {bairro.ubs.map((u) => (
              <div key={`${u.unidade}-${u.endereco}`} className="text-sm">
                <p className="font-medium text-gray-800 dark:text-gray-200">{u.unidade}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{u.endereco}</p>
                {u.telefone && <p className="text-gray-500 dark:text-gray-400 text-xs">Tel: {u.telefone}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Accordion>
        <AccordionItem value="geral" className="border-none">
          <AccordionTrigger className="px-5 py-4 text-xs font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase hover:no-underline">
            Informações Gerais
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
              <Section title="Dados Gerais">
                {c && <Stat label="População" value={c.populacao.toLocaleString('pt-BR')} />}
                {c && <Stat label="Domicílios" value={c.domicilios.toLocaleString('pt-BR')} />}
                <Stat label="Área" value={`${bairro.area_ha.toFixed(2)} ha`} />
                <Stat label="Perímetro" value={`${bairro.perim_km.toFixed(3)} km`} />
                {bairro.docLegal && <Stat label="Doc. Legal" value={bairro.docLegal} />}
              </Section>
              {c && (
                <Section title="Sexo">
                  <Stat
                    label="Masculino"
                    value={`${c.masculino.toLocaleString('pt-BR')} (${pct(c.masculino, c.populacao)}%)`}
                  />
                  <Stat
                    label="Feminino"
                    value={`${c.feminino.toLocaleString('pt-BR')} (${pct(c.feminino, c.populacao)}%)`}
                  />
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
                  {c.indigenaRaca > 0 && (
                    <Bar label="Indígena" value={c.indigenaRaca} total={c.populacao} color="bg-green-500" />
                  )}
                </Section>
              )}
              {c && (c.indigenas > 0 || c.quilombolas > 0) && (
                <Section title="Povos e Comunidades">
                  {c.indigenas > 0 && <Stat label="Pessoas indígenas" value={c.indigenas.toLocaleString('pt-BR')} />}
                  {c.quilombolas > 0 && (
                    <Stat label="Pessoas quilombolas" value={c.quilombolas.toLocaleString('pt-BR')} />
                  )}
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {value.toLocaleString('pt-BR')}{' '}
          <span className="text-gray-400 dark:text-gray-500 font-normal">({p.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  )
}
