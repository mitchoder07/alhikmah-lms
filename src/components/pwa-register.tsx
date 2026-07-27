'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, X, Smartphone, RefreshCw } from 'lucide-react'

export function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // If a new SW takes over, force reload so user sees latest content
        reg.addEventListener('controllerchange', () => {
          setNeedsRefresh(true)
        })
        // If there's a waiting SW, activate it immediately
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }).catch(() => {})

      // Listen for a new controlling SW
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const dismissed = sessionStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowInstall(true), 8000)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installedHandler = () => {
      setInstalled(true)
      setShowInstall(false)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setShowInstall(false)
  }

  const dismiss = () => {
    setShowInstall(false)
    sessionStorage.setItem('pwa-install-dismissed', '1')
  }

  if (needsRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <Card className="shadow-lg border-primary">
          <CardContent className="p-4 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Update available</p>
              <p className="text-xs text-muted-foreground">A new version of the portal is ready.</p>
            </div>
            <Button size="sm" onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
              Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!showInstall || installed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-4 sm:right-auto sm:w-80 z-50 animate-in slide-in-from-bottom-4">
      <Card className="shadow-lg border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg albashir-gradient flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Install Al-Bashir Academy LMS</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Add to your home screen for offline access and a faster, app-like experience.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={install} className="bg-primary hover:bg-primary/90 text-xs h-8">
                  <Download className="h-3 w-3 mr-1" /> Install App
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 text-xs">
                  <X className="h-3 w-3 mr-1" /> Not now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
