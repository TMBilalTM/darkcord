import { useAppStore } from '@/store/app'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Hash, Users, Settings, ArrowRight } from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  keywords: string[]
}

export function CommandPalette() {
  const { servers, toggleCommandPalette, setActiveServer, setActiveChannel } = useAppStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Build all commands
  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = []

    // Channels from all servers
    servers.forEach((server) => {
      server.categories.forEach((cat) => {
        cat.channels.forEach((ch) => {
          if (ch.type !== 'voice') {
            items.push({
              id: ch.id,
              label: `#${ch.name}`,
              description: `${server.name} › ${cat.name}`,
              icon: <Hash className="w-4 h-4 text-dc-text-muted" />,
              action: () => {
                setActiveServer(server.id)
                setActiveChannel(ch.id)
                toggleCommandPalette()
              },
              keywords: [ch.name, server.name, cat.name],
            })
          }
        })
      })
    })

    // Server navigation
    servers.forEach((server) => {
      items.push({
        id: `server-${server.id}`,
        label: server.name,
        description: `${server.memberCount.toLocaleString('tr-TR')} üye`,
        icon: <Users className="w-4 h-4 text-dc-text-muted" />,
        action: () => {
          setActiveServer(server.id)
          toggleCommandPalette()
        },
        keywords: [server.name],
      })
    })

    // Settings
    items.push({
      id: 'settings',
      label: 'Ayarlar',
      description: 'Uygulama ayarlarını aç',
      icon: <Settings className="w-4 h-4 text-dc-text-muted" />,
      action: () => toggleCommandPalette(),
      keywords: ['ayarlar', 'settings', 'preferences'],
    })

    return items
  }, [servers, setActiveServer, setActiveChannel, toggleCommandPalette])

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.toLowerCase().includes(q))
    )
  }, [commands, query])

  // Keyboard nav
  // Reset selection when query changes
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    setSelectedIndex(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      filtered[selectedIndex].action()
    } else if (e.key === 'Escape') {
      toggleCommandPalette()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onClick={toggleCommandPalette}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-145 overflow-hidden rounded-2xl bg-dc-bg-secondary border border-dc-border shadow-2xl"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-dc-border px-4 py-3">
            <Search className="w-5 h-5 text-dc-text-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Kanal, sunucu veya ayar ara..."
              className="flex-1 bg-transparent text-[15px] text-dc-text-primary placeholder:text-dc-text-muted/50 outline-none"
            />
            <kbd className="hidden sm:flex items-center gap-1 rounded border border-dc-border bg-dc-bg-tertiary px-1.5 py-0.5 text-[10px] font-mono text-dc-text-muted">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-90 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-dc-text-muted text-sm">Sonuç bulunamadı</p>
              </div>
            ) : (
              filtered.map((item, i) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    i === selectedIndex
                      ? 'bg-dc-accent/10 text-dc-text-primary'
                      : 'text-dc-text-secondary hover:bg-dc-bg-hover',
                  )}
                >
                  {item.icon}
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-[14px] font-medium">{item.label}</span>
                    {item.description && (
                      <span className="ml-2 text-[12px] text-dc-text-muted">{item.description}</span>
                    )}
                  </div>
                  {i === selectedIndex && (
                    <ArrowRight className="w-4 h-4 text-dc-accent shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-dc-border px-4 py-2 text-[11px] text-dc-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-dc-border bg-dc-bg-tertiary px-1 font-mono">↑↓</kbd>
              gezin
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-dc-border bg-dc-bg-tertiary px-1 font-mono">↵</kbd>
              seç
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-dc-border bg-dc-bg-tertiary px-1 font-mono">esc</kbd>
              kapat
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
