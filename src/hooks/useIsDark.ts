'use client'

import { useEffect, useState } from 'react'

// ThemeToggle alterna a classe "dark" direto no <html>; este hook observa
// essa classe para reagir a mudanças de tema sem precisar de um Context.
export function useIsDark() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    setIsDark(root.classList.contains('dark'))

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'))
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}
