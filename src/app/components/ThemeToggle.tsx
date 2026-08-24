'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useIsDark } from '@/hooks/useIsDark'

export default function ThemeToggle({ className }: { className?: string }) {
  // useIsDark observa a classe "dark" no <html>, então múltiplas instâncias
  // deste botão (mobile + desktop) ficam sincronizadas automaticamente.
  const isDark = useIsDark()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  function toggle() {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  if (!mounted) {
    // evita piscar o ícone errado antes de saber o tema atual (lido no mount)
    return <div className="size-8" />
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className={className ?? 'shrink-0 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
