import { useAppStore } from '@/store/app'
import { cn, getInitials } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Plus, Compass, Download } from 'lucide-react'

export function ServerList() {
  const { servers, activeServerId, setActiveServer } = useAppStore()

  return (
    <nav
      className="flex w-18 shrink-0 flex-col items-center gap-2 bg-dc-bg-primary py-3 overflow-y-auto"
      aria-label="Sunucu listesi"
    >
      {/* Home / DM button */}
      <ServerIcon
        active={activeServerId === null}
        onClick={() => setActiveServer(null)}
        color="#8B5CF6"
        tooltip="Direkt Mesajlar"
      >
        <svg viewBox="0 0 28 28" className="w-7 h-7" fill="currentColor">
          <path d="M6 14c0-1 .8-2 1.8-2 2.2 0 5.2 1.5 6.2 4.5 1-3 4-4.5 6.2-4.5 1 0 1.8 1 1.8 2 0 6-3 13-8 16C9 27 6 20 6 14z" />
        </svg>
      </ServerIcon>

      {/* Divider */}
      <div className="mx-auto h-0.5 w-8 rounded-full bg-dc-border" />

      {/* Server Icons */}
      {servers.map((server) => {
        const hasUnread = server.categories
          .flatMap((c) => c.channels)
          .some((ch) => (ch.unreadCount ?? 0) > 0)

        return (
          <ServerIcon
            key={server.id}
            active={activeServerId === server.id}
            hasUnread={hasUnread}
            onClick={() => setActiveServer(server.id)}
            color={server.color}
            tooltip={server.name}
          >
            {server.icon ? (
              <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[11px] font-bold tracking-tight leading-none">
                {getInitials(server.name)}
              </span>
            )}
          </ServerIcon>
        )
      })}

      {/* Divider */}
      <div className="mx-auto h-0.5 w-8 rounded-full bg-dc-border" />

      {/* Add Server */}
      <ServerIcon color="#10B981" tooltip="Sunucu Ekle" onClick={() => {}}>
        <Plus className="w-5 h-5" />
      </ServerIcon>

      {/* Explore */}
      <ServerIcon color="#06B6D4" tooltip="Keşfet" onClick={() => {}}>
        <Compass className="w-5 h-5" />
      </ServerIcon>

      {/* Download App */}
      <div className="mt-auto">
        <ServerIcon color="#F59E0B" tooltip="Uygulamayı İndir" onClick={() => {}}>
          <Download className="w-4 h-4" />
        </ServerIcon>
      </div>
    </nav>
  )
}

function ServerIcon({
  active,
  hasUnread,
  onClick,
  color,
  tooltip,
  children,
}: {
  active?: boolean
  hasUnread?: boolean
  onClick?: () => void
  color: string
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <div className="group relative flex items-center justify-center">
      {/* Active / Unread Indicator */}
      <motion.div
        className="absolute left-0 w-1 rounded-r-full bg-dc-text-primary"
        initial={false}
        animate={{
          height: active ? 36 : hasUnread ? 8 : 0,
          opacity: active || hasUnread ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />

      {/* Icon */}
      <motion.button
        onClick={onClick}
        className={cn(
          'relative flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200',
          active
            ? 'rounded-2xl'
            : 'rounded-3xl hover:rounded-2xl',
        )}
        style={{
          backgroundColor: active ? color : 'var(--color-dc-bg-tertiary)',
          color: active ? '#fff' : 'var(--color-dc-text-secondary)',
        }}
        whileHover={{ scale: 1.05, backgroundColor: color }}
        whileTap={{ scale: 0.95 }}
        aria-label={tooltip}
        title={tooltip}
      >
        {children}
      </motion.button>

      {/* Tooltip */}
      <div
        className={cn(
          'pointer-events-none absolute left-17 z-50 whitespace-nowrap rounded-lg px-3 py-1.5',
          'bg-dc-bg-primary text-sm font-medium text-dc-text-primary shadow-xl border border-dc-border',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        )}
      >
        {tooltip}
      </div>
    </div>
  )
}
