export type StyleMode = 'mono' | 'multi'

// Chave usada tanto por MapWrapper (persistir a escolha) quanto por
// MapLeaflet (ler o valor real síncrono no primeiro paint, já que só ele
// roda exclusivamente no client).
export const STYLE_MODE_STORAGE_KEY = 'styleMode'

export const STYLE_MODES: { id: StyleMode; label: string; preview: string[] }[] = [
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
