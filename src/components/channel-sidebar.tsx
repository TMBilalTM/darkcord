import { useAppStore } from '@/store/app'
import { cn } from '@/lib/utils'
import { UserPanel } from '@/components/user-panel'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hash,
  Volume2,
  Megaphone,
  ChevronDown,
  Settings,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import type { Channel, Category } from '@/types'

export function ChannelSidebar() {
  const { servers, activeServerId, activeChannelId, setActiveChannel, setMobileSidebarOpen } = useAppStore()
  const activeServer = servers.find((s) => s.id === activeServerId)

  if (!activeServer) return null

  const handleSelectChannel = (id: string) => {
    setActiveChannel(id)
    setMobileSidebarOpen(false)
  }

  if (!activeServer) return null

  return (
    <aside className="flex w-60 h-full shrink-0 flex-col bg-dc-bg-secondary border-r border-dc-border-subtle overflow-hidden">
      {/* Server Header */}
      <button
        className={cn(
          'group flex h-12 items-center justify-between px-4',
          'border-b border-dc-border-subtle',
          'hover:bg-dc-bg-hover transition-colors',
        )}
      >
        <h2 className="text-[15px] font-semibold text-dc-text-primary truncate">
          {activeServer.name}
        </h2>
        <ChevronDown className="w-4 h-4 text-dc-text-secondary group-hover:text-dc-text-primary transition-colors" />
      </button>

      {/* Channel List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-4">
        {activeServer.categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            activeChannelId={activeChannelId}
            onSelectChannel={handleSelectChannel}
          />
        ))}
      </div>

      {/* User Panel */}
      <UserPanel />
    </aside>
  )
}

function CategorySection({
  category,
  activeChannelId,
  onSelectChannel,
}: {
  category: Category
  activeChannelId: string | null
  onSelectChannel: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(category.collapsed ?? false)

  return (
    <div>
      {/* Category Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="group flex w-full items-center gap-0.5 px-1 py-1 text-[11px] font-bold uppercase tracking-wider text-dc-text-muted hover:text-dc-text-secondary transition-colors"
      >
        <motion.div
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="w-3 h-3" />
        </motion.div>
        <span>{category.name}</span>
      </button>

      {/* Channels */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {category.channels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                active={activeChannelId === channel.id}
                onClick={() => {
                  if (channel.type !== 'voice') {
                    onSelectChannel(channel.id)
                  }
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ChannelItem({
  channel,
  active,
  onClick,
}: {
  channel: Channel
  active: boolean
  onClick: () => void
}) {
  const joinVoice = useAppStore((s) => s.joinVoice)
  const isVoice = channel.type === 'voice'

  const Icon = {
    text: Hash,
    voice: Volume2,
    announcement: Megaphone,
    stage: Volume2,
    forum: Hash,
  }[channel.type]

  return (
    <button
      onClick={isVoice ? () => joinVoice(channel.id) : onClick}
      className={cn(
        'group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[15px] transition-all duration-100',
        active
          ? 'bg-dc-bg-active text-dc-text-primary'
          : 'text-dc-text-secondary hover:bg-dc-bg-hover hover:text-dc-text-primary',
      )}
    >
      <Icon className={cn(
        'w-4 h-4 shrink-0',
        isVoice && 'text-dc-green',
        active && !isVoice && 'text-dc-text-primary',
      )} />

      <span className="truncate flex-1 text-left">{channel.name}</span>

      {/* Unread Badge */}
      {(channel.unreadCount ?? 0) > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-dc-red px-1 text-[10px] font-bold text-white">
          {channel.unreadCount}
        </span>
      )}

      {/* Action Icons (hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isVoice && (
          <UserPlus className="w-3.5 h-3.5 text-dc-text-muted hover:text-dc-text-primary" />
        )}
        <Settings className="w-3.5 h-3.5 text-dc-text-muted hover:text-dc-text-primary" />
      </div>
    </button>
  )
}
