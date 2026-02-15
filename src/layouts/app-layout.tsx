import { useAppStore } from '@/store/app'
import { ServerList } from '@/components/server-list'
import { ChannelSidebar } from '@/components/channel-sidebar'
import { ChatArea } from '@/components/chat-area'
import { MemberList } from '@/components/member-list'
import { CommandPalette } from '@/components/command-palette'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AppLayout() {
  const {
    commandPaletteOpen,
    toggleCommandPalette,
    showMemberList,
    mobileSidebarOpen,
    toggleMobileSidebar,
    setMobileSidebarOpen,
  } = useAppStore()

  // Ctrl+K global handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleCommandPalette])

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = () => { if (mq.matches) setMobileSidebarOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setMobileSidebarOpen])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dc-bg-primary">
      {/* ─── Mobile Hamburger ─── */}
      <button
        onClick={toggleMobileSidebar}
        className={cn(
          'fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-xl',
          'bg-dc-bg-elevated/90 backdrop-blur-sm border border-dc-border',
          'text-dc-text-secondary hover:text-dc-text-primary transition-colors',
          'md:hidden',
        )}
        aria-label="Menü aç/kapat"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ─── Desktop Sidebar (server rail + channel) ─── */}
      <div className="hidden md:flex h-full shrink-0">
        <ServerList />
        <ChannelSidebar />
      </div>

      {/* ─── Mobile Sidebar Overlay ─── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed inset-y-0 left-0 z-30 flex w-78 max-w-[85vw] md:hidden"
            >
              <ServerList />
              <ChannelSidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Content ─── */}
      <div className="flex h-full flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <ChatArea />
      </div>

      {/* ─── Member List (desktop only, toggleable) ─── */}
      <div className="hidden lg:block">
        {showMemberList && <MemberList />}
      </div>

      {/* ─── Command Palette ─── */}
      {commandPaletteOpen && <CommandPalette />}
    </div>
  )
}
