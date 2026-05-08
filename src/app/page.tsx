import MapWrapper from './components/MapWrapper'

export default function Home() {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Mapa de Itabira</h1>
          <p className="text-xs text-gray-400">Visualizador de bairros · Itabira, MG</p>
        </div>
      </header>
      <MapWrapper />
    </div>
  )
}
