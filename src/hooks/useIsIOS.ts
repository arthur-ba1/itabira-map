'use client'

import { useEffect, useState } from 'react'

// Lido só depois de montar (não em SSR) — evita hydration mismatch, já que
// o servidor não tem navigator.userAgent do dispositivo do usuário.
export function useIsIOS() {
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
  }, [])

  return isIOS
}
