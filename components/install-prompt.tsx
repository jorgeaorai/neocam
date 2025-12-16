'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream
    )
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  if (!mounted || isStandalone) return null

  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm border p-4 rounded-xl shadow-lg z-50 animate-in slide-in-from-bottom-5">
        <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Instalar Aplicativo</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para instalar, toque no botão de <span className="font-medium text-foreground">Compartilhar</span> e selecione <span className="font-medium text-foreground">"Adicionar à Tela de Início"</span>.
                </p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsIOS(false)}>
                <span className="sr-only">Fechar</span>
                ×
            </Button>
        </div>
      </div>
    )
  }

  if (!deferredPrompt) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button onClick={handleInstallClick} size="lg" className="shadow-xl rounded-full px-6 font-semibold">
          Instalar App
        </Button>
    </div>
  )
}