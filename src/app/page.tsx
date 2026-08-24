import MapWrapper from './components/MapWrapper'

export default function Home() {
  return (
    // fixed inset-0 em vez de h-full: isso ancora direto no viewport real
    // (spec: containing block de elementos fixed é o viewport), sem
    // depender da cadeia de height:100%/100dvh em html/body/divs — mais
    // confiável no WKWebView do PWA standalone, que tem tratado dvh de
    // forma inconsistente com viewport-fit=cover.
    <div className="fixed inset-0">
      <MapWrapper />
    </div>
  )
}
