'use client'

import { SlidersHorizontal } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { STYLE_MODES, type StyleMode } from '@/lib/styleMode'
import { cn } from '@/lib/utils'

interface PointsToggleProps {
  styleMode: StyleMode
  onStyleModeChange: (mode: StyleMode) => void
  showAssociacoes: boolean
  showUbs: boolean
  onToggleAssociacoes: () => void
  onToggleUbs: () => void
}

export default function PointsToggle({
  styleMode,
  onStyleModeChange,
  showAssociacoes,
  showUbs,
  onToggleAssociacoes,
  onToggleUbs,
}: PointsToggleProps) {
  const allActive = showAssociacoes && showUbs

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Filtros do mapa"
        className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-white/40 bg-white/70 text-gray-500 shadow-lg outline-none backdrop-blur-xl backdrop-saturate-150 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <SlidersHorizontal className="size-4" />
        {!allActive && (
          <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-white bg-blue-500 dark:border-gray-900" />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 rounded-xl border border-white/40 bg-white/70 p-2 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-gray-900/60"
      >
        <span className="block px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Cor do mapa
        </span>
        <div className="flex gap-2 px-1 pb-2">
          {STYLE_MODES.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => onStyleModeChange(layer.id)}
              aria-pressed={styleMode === layer.id}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-lg border p-2',
                styleMode === layer.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-transparent hover:bg-muted',
              )}
            >
              <div className="grid h-8 w-8 grid-cols-2 gap-px overflow-hidden rounded-md border border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700">
                {layer.preview.map((color, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: lista estática de swatches, ordem e tamanho fixos
                  <div key={i} style={{ backgroundColor: color }} />
                ))}
              </div>
              <span className="text-[10px] font-medium text-foreground">{layer.label}</span>
            </button>
          ))}
        </div>

        <div className="my-1.5 border-t border-border" />

        <span className="block px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Mostrar no mapa
        </span>
        <Label className="cursor-pointer rounded-lg px-2 py-2 font-normal hover:bg-muted">
          <Checkbox checked={showAssociacoes} onCheckedChange={onToggleAssociacoes} />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="text-foreground">Associações</span>
        </Label>
        <Label className="cursor-pointer rounded-lg px-2 py-2 font-normal hover:bg-muted">
          <Checkbox checked={showUbs} onCheckedChange={onToggleUbs} />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
          <span className="text-foreground">Postos de Saúde</span>
        </Label>
        <p className="mt-1 border-t border-border px-2 pt-2 text-[11px] leading-snug text-muted-foreground">
          Pinos apagados marcam localização aproximada (centro do bairro).
        </p>
      </PopoverContent>
    </Popover>
  )
}
