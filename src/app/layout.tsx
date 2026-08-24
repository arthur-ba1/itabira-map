import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Mapa de Itabira',
  description: 'Visualizador interativo de bairros de Itabira - MG',
  // No Safari normal (aba do navegador) não tem como deixar as barras
  // realmente transparentes — isso só funciona em modo PWA (adicionado à
  // tela de início). "black-translucent" é o que deixa o mapa aparecer por
  // baixo da status bar nesse modo; os ícones da status bar ficam claros,
  // então isso não é adaptativo ao tema claro/escuro do app.
  appleWebApp: {
    capable: true,
    title: 'Mapa de Itabira',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Deixa o conteúdo se estender por baixo do notch/status bar e da faixa
  // do home indicator no iOS, em vez de parar na área "segura". Sem uma
  // theme-color sólida forçando opacidade, o Safari usa a barra translúcida
  // nativa dele ali — o mapa aparece borrado por trás em vez de uma cor
  // sólida (e sem isso, sem viewport-fit, ele cai pra preto puro). Os
  // controles flutuantes usam env(safe-area-inset-*) pra não ficarem
  // colados/embaixo dessas áreas.
  viewportFit: 'cover',
}

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full flex flex-col">
        {/** biome-ignore lint/security/noDangerouslySetInnerHtml: script de inicialização de tema (sem input do usuário), evita flash de tema errado */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  )
}
