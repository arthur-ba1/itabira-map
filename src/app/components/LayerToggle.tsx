'use client'

export type StyleMode = 'mono' | 'multi'

interface LayerToggleProps {
  mode: StyleMode
  onChange: (mode: StyleMode) => void
}

const LAYERS: { id: StyleMode; label: string; preview: string[] }[] = [
  {
    id: 'multi',
    label: 'Bairros',
    preview: ['#fb923c', '#a78bfa', '#4ade80', '#f472b6'],
  },
  {
    id: 'mono',
    label: 'Padrão',
    preview: ['#bfdbfe', '#bfdbfe', '#bfdbfe', '#bfdbfe'],
  },
]

export default function LayerToggle({ mode, onChange }: LayerToggleProps) {
  const next = mode === 'multi' ? 'mono' : 'multi'
  const nextLayer = LAYERS.find((l) => l.id === next)!

  return (
    <button
      onClick={() => onChange(next)}
      title={`Trocar para: ${nextLayer.label}`}
      className="absolute bottom-24 right-3 sm:bottom-8 sm:left-3 sm:right-auto z-[1000] bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex flex-col items-center gap-1 hover:shadow-xl transition-shadow w-16"
    >
      {/* Mini preview do próximo modo */}
      <div className="w-11 h-11 rounded-lg overflow-hidden grid grid-cols-2 gap-px bg-gray-200 border border-gray-300">
        {nextLayer.preview.map((color, i) => (
          <div key={i} style={{ backgroundColor: color }} />
        ))}
      </div>
      <span className="text-[10px] font-medium text-gray-600 leading-none">
        {nextLayer.label}
      </span>
    </button>
  )
}
