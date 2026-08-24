'use client'

import { useState } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { BairroInfo } from '@/types/bairro'

interface BairroSearchProps {
  bairros: BairroInfo[]
  onSelect: (bairro: BairroInfo) => void
  autoFocus?: boolean
  className?: string
}

const MAX_RESULTS = 8

export default function BairroSearch({ bairros, onSelect, autoFocus, className }: BairroSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered =
    query.trim().length === 0
      ? []
      : bairros.filter((b) => b.nome.toLowerCase().includes(query.toLowerCase())).slice(0, MAX_RESULTS)

  function handleSelect(bairro: BairroInfo) {
    setQuery(bairro.nome.toUpperCase())
    setOpen(false)
    onSelect(bairro)
  }

  return (
    <Command
      shouldFilter={false}
      className={cn(
        'relative min-w-0 flex-1 overflow-visible rounded-xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-gray-900/60',
        className,
      )}
    >
      <CommandInput
        autoFocus={autoFocus}
        value={query}
        onValueChange={(value) => {
          setQuery(value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar bairro..."
      />
      {open && query.trim().length > 0 && (
        // No mobile a busca fica perto do rodapé — abrir pra baixo estoura a
        // tela. Abre pra cima lá; no desktop (busca no topo) continua pra
        // baixo, como antes.
        <div className="absolute inset-x-0 bottom-full z-[1000] mb-1 max-h-60 overflow-x-hidden overflow-y-auto rounded-xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-xl backdrop-saturate-150 sm:top-full sm:bottom-auto sm:mt-1 sm:mb-0 dark:border-white/10 dark:bg-gray-900/60">
          <CommandList className="max-h-none overflow-visible">
            <CommandEmpty className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
              Nenhum bairro encontrado
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((b) => (
                <CommandItem
                  key={b.id}
                  value={b.id}
                  onSelect={() => handleSelect(b)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="cursor-pointer px-4 py-2.5 text-sm text-gray-700 data-selected:bg-blue-500/10 data-selected:text-blue-700 dark:text-gray-300 dark:data-selected:bg-blue-400/15 dark:data-selected:text-blue-300"
                >
                  {b.nome.toUpperCase()}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      )}
    </Command>
  )
}
