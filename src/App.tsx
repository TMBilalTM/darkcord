import { useEffect } from 'react'
import { useAppStore } from '@/store/app'
import AppLayout from '@/layouts/app-layout'
import AuthPage from '@/pages/auth'

function App() {
  const { isAuthenticated, authLoading, restoreSession } = useAppStore()

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  // Loading screen
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dc-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-dc-accent to-dc-cyan flex items-center justify-center animate-pulse-glow">
            <svg viewBox="0 0 28 28" className="w-7 h-7 text-white" fill="currentColor">
              <path d="M6 14c0-1 .8-2 1.8-2 2.2 0 5.2 1.5 6.2 4.5 1-3 4-4.5 6.2-4.5 1 0 1.8 1 1.8 2 0 6-3 13-8 16C9 27 6 20 6 14z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-dc-accent animate-pulse" />
            <div className="h-1 w-1 rounded-full bg-dc-accent animate-pulse [animation-delay:150ms]" />
            <div className="h-1 w-1 rounded-full bg-dc-accent animate-pulse [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return <AppLayout />
}

export default App
