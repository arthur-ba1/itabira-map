'use client'

import { ChevronDown, MapPin, Navigation, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsIOS } from '@/hooks/useIsIOS'
import { cn } from '@/lib/utils'
import type { BairroInfo } from '@/types/bairro'
import ThemeToggle from './ThemeToggle'

interface InfoPanelProps {
  bairro: BairroInfo | null
  bairros: BairroInfo[]
  onClose: () => void
  onSelectBairro: (bairro: BairroInfo) => void
  onFocusPoint: (lat: number, lng: number) => void
}

export default function InfoPanel({ bairro, bairros, onClose, onSelectBairro, onFocusPoint }: InfoPanelProps) {
  const nome = bairro ? bairro.nome.toUpperCase() : null

  // Fechado por padrão pra liberar o mapa; no desktop abre sozinho quando um
  // bairro é selecionado (mostra os detalhes de cara). No mobile fica só o
  // nome no cabeçalho — o usuário abre manualmente se quiser mais informação.
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (bairro && window.matchMedia('(min-width: 640px)').matches) setOpen(true)
  }, [bairro])

  function handleListSelect(b: BairroInfo) {
    onSelectBairro(b)
  }

  return (
    // Título + lista fundidos num único painel, mesmo em todas as telas —
    // largura total no mobile (nada mais divide essa linha com ele lá),
    // largura fixa no desktop (deixa a cidade à direita livre).
    <aside className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] left-4 z-[999] flex w-[calc(100%-2rem)] flex-col sm:w-80">
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
          <div className={cn('min-w-0', bairro && 'flex-1 text-center')}>
            {bairro ? (
              <h1 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">{nome}</h1>
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
        <ThemeToggle className="hidden shrink-0 text-gray-500 hover:bg-gray-900/5 sm:flex dark:text-gray-400 dark:hover:bg-white/10" />
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
                <Sections bairro={bairro} onFocusPoint={onFocusPoint} />
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

function Sections({ bairro, onFocusPoint }: { bairro: BairroInfo; onFocusPoint: (lat: number, lng: number) => void }) {
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
                <ActionRow tel={a.telefone_presidente} lat={a.lat} lng={a.lng} onFocusPoint={onFocusPoint} />
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
                <ActionRow tel={u.telefone} lat={u.lat} lng={u.lng} onFocusPoint={onFocusPoint} />
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

const ACTION_PILL =
  'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/70 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-xl backdrop-saturate-150 hover:bg-white/90 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:bg-gray-900/80'

type MapProvider = 'google' | 'waze' | 'apple'

// target="_blank" simples abre como página dentro do próprio PWA em vez do
// app. Google/Waze: tenta o URL scheme nativo primeiro; se o app não
// estiver instalado, o esquema falha em silêncio e a página continua em
// primeiro plano — o timeout então cai pro navegador. Apple Maps não
// precisa desse truque: maps.apple.com já é um universal link nativo do
// iOS.
function openInMaps(provider: MapProvider, lat: number, lng: number) {
  if (provider === 'apple') {
    window.location.href = `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`
    return
  }
  const appUrl =
    provider === 'google'
      ? `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}`
      : `waze://?ll=${lat},${lng}&navigate=yes`
  const webUrl =
    provider === 'google'
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  const start = Date.now()
  window.location.href = appUrl
  setTimeout(() => {
    if (Date.now() - start < 1500) window.open(webUrl, '_blank', 'noopener,noreferrer')
  }, 800)
}

function MapsPopover({ lat, lng }: { lat: number; lng: number }) {
  const isIOS = useIsIOS()

  return (
    <Popover>
      <PopoverTrigger className={ACTION_PILL}>
        <Navigation className="size-3" />
        Maps
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-40 rounded-xl bg-white/95 p-1 shadow-xl backdrop-blur-xl backdrop-saturate-150 dark:bg-gray-900/90"
      >
        <MapProviderItem label="Google Maps" onClick={() => openInMaps('google', lat, lng)} />
        <MapProviderItem label="Waze" onClick={() => openInMaps('waze', lat, lng)} />
        {isIOS && <MapProviderItem label="Apple Maps" onClick={() => openInMaps('apple', lat, lng)} />}
      </PopoverContent>
    </Popover>
  )
}

function MapProviderItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-900/5 dark:text-gray-200 dark:hover:bg-white/10"
    >
      {label}
    </button>
  )
}

function ActionRow({
  tel,
  lat,
  lng,
  onFocusPoint,
}: {
  tel?: string
  lat: number | null
  lng: number | null
  onFocusPoint: (lat: number, lng: number) => void
}) {
  const hasLocation = lat != null && lng != null
  if (!tel && !hasLocation) return null

  return (
    <div className="mt-2 flex gap-1.5">
      {tel && (
        <a href={`tel:${tel}`} className={ACTION_PILL}>
          <Phone className="size-3" />
          Ligar
        </a>
      )}
      {hasLocation && (
        <>
          <button type="button" onClick={() => onFocusPoint(lat, lng)} className={ACTION_PILL}>
            <MapPin className="size-3" />
            Ver
          </button>
          <MapsPopover lat={lat} lng={lng} />
        </>
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
