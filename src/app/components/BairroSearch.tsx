'use client'

import { useState, useRef, useEffect } from 'react'
import type { BairroInfo } from '@/types/bairro'

interface BairroSearchProps {
  bairros: BairroInfo[]
  onSelect: (bairro: BairroInfo) => void
}

export default function BairroSearch({ bairros, onSelect }: BairroSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim().length === 0 ? [] : bairros.filter((b) =>
    b.nome.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(bairro: BairroInfo) {
    setQuery(bairro.nome.charAt(0) + bairro.nome.slice(1).toLowerCase())
    setOpen(false)
    onSelect(bairro)
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm"
    >
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar bairro..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white shadow-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            ✕
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
          {filtered.map((b) => (
            <li key={b.id}>
              <button
                onClick={() => handleSelect(b)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {b.nome.charAt(0) + b.nome.slice(1).toLowerCase()}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length > 0 && filtered.length === 0 && (
        <div className="mt-1 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-sm text-gray-400">
          Nenhum bairro encontrado
        </div>
      )}
    </div>
  )
}
