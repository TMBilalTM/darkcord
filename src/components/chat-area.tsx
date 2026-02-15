import { useAppStore } from '@/store/app'
import { cn, getInitials, formatTimestamp } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hash,
  Bell,
  Pin,
  Users,
  Search,
  Inbox,
  SmilePlus,
  Paperclip,
  Gift,
  Sticker,
  SendHorizontal,
  Menu,
  Loader2,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { Message, Reaction } from '@/types'

export function ChatArea() {
  const {
    servers,
    activeServerId,
    activeChannelId,
    messages,
    messagesLoading,
    sendMessage,
    startTyping,
    typingUsers,
    toggleMemberList,
    showMemberList,
    toggleMobileSidebar,
  } = useAppStore()

  const activeServer = servers.find((s) => s.id === activeServerId)
  const activeChannel = activeServer?.categories
    .flatMap((c) => c.channels)
    .find((ch) => ch.id === activeChannelId)

  const channelMessages = messages[activeChannelId ?? ''] ?? []
  const channelTyping = typingUsers[activeChannelId ?? ''] ?? []
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages.length])

  const handleSend = () => {
    if (!input.trim() || !activeChannelId) return
    sendMessage(activeChannelId, input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    if (activeChannelId && value.trim()) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      startTyping(activeChannelId)
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null
      }, 3000)
    }
  }

  if (!activeChannel) {
    return (
      <div className="flex flex-1 items-center justify-center bg-dc-bg-primary">
        <div className="text-center space-y-3 px-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobileSidebar}
            className="mb-4 flex items-center gap-2 mx-auto rounded-xl bg-dc-bg-elevated border border-dc-border px-4 py-2 text-dc-text-secondary hover:text-dc-text-primary transition-colors md:hidden"
          >
            <Menu className="w-4 h-4" />
            <span className="text-sm">Kanal Seç</span>
          </button>
          <div className="mx-auto w-16 h-16 rounded-2xl bg-dc-bg-tertiary flex items-center justify-center">
            <Hash className="w-8 h-8 text-dc-text-muted" />
          </div>
          <p className="text-dc-text-muted text-sm">Sohbet etmek için bir kanal seç</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-dc-bg-primary min-w-0 min-h-0 overflow-hidden">
      {/* Channel Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-dc-border-subtle px-2 sm:px-4">
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile menu */}
          <button
            onClick={toggleMobileSidebar}
            className="p-1 text-dc-text-muted hover:text-dc-text-primary transition-colors md:hidden shrink-0"
            aria-label="Menü"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Hash className="w-5 h-5 text-dc-text-muted shrink-0" />
          <h3 className="text-[15px] font-semibold text-dc-text-primary truncate">{activeChannel.name}</h3>
          {activeChannel.description && (
            <>
              <div className="h-5 w-px bg-dc-border mx-1 hidden sm:block" />
              <p className="text-[13px] text-dc-text-muted truncate hidden sm:block">{activeChannel.description}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          {[
            { icon: Bell, label: 'Bildirimler', hide: true },
            { icon: Pin, label: 'Sabitlenmiş', hide: true },
            { icon: Users, label: 'Üye listesi', active: showMemberList, onClick: toggleMemberList, hide: false },
            { icon: Search, label: 'Ara', hide: true },
            { icon: Inbox, label: 'Gelen kutusu', hide: true },
          ].map(({ icon: Icon, label, active, onClick, hide }) => (
            <button
              key={label}
              onClick={onClick}
              className={cn(
                'p-1 rounded transition-colors',
                active ? 'text-dc-text-primary' : 'text-dc-text-muted hover:text-dc-text-primary',
                hide && 'hidden sm:block',
              )}
              aria-label={label}
              title={label}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-4 space-y-0.5">
        {/* Channel Welcome */}
        <div className="mb-6 pb-4 border-b border-dc-border">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-dc-bg-tertiary mb-3">
            <Hash className="w-8 h-8 text-dc-text-secondary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-dc-text-primary mb-1">
            #{activeChannel.name}
          </h2>
          <p className="text-dc-text-muted text-sm">
            Bu kanalın başlangıcı. {activeChannel.description ?? `${activeChannel.name} kanalına hoş geldin!`}
          </p>
        </div>

        {/* Loading */}
        {messagesLoading && channelMessages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-dc-accent animate-spin" />
          </div>
        )}

        {/* Message List */}
        <AnimatePresence initial={false}>
          {channelMessages.map((msg, i) => {
            const prev = channelMessages[i - 1]
            const isCompact =
              prev &&
              prev.author.id === msg.author.id &&
              msg.timestamp.getTime() - prev.timestamp.getTime() < 5 * 60000

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                compact={isCompact ?? false}
              />
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="shrink-0 px-2 sm:px-4 pb-4 sm:pb-6">
        {/* Typing Indicator */}
        <AnimatePresence>
          {channelTyping.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="text-[12px] text-dc-text-muted mb-1 px-1 flex items-center gap-1">
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-dc-text-muted animate-pulse" />
                  <span className="h-1 w-1 rounded-full bg-dc-text-muted animate-pulse [animation-delay:150ms]" />
                  <span className="h-1 w-1 rounded-full bg-dc-text-muted animate-pulse [animation-delay:300ms]" />
                </span>
                <span className="font-medium text-dc-text-secondary">
                  {channelTyping.map((t) => t.displayName).join(', ')}
                </span>
                {' '}yazıyor...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 rounded-xl bg-dc-bg-elevated border border-dc-border px-3 sm:px-4 py-2.5 focus-within:border-dc-accent/40 transition-colors">
          <button className="p-1 text-dc-text-muted hover:text-dc-text-primary transition-colors shrink-0 mb-0.5 hidden sm:block">
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`#${activeChannel.name} kanalına mesaj gönder`}
            className={cn(
              'flex-1 resize-none bg-transparent text-[15px] text-dc-text-primary',
              'placeholder:text-dc-text-muted/60 outline-none',
              'max-h-30 min-h-6',
            )}
            rows={1}
          />

          <div className="flex items-center gap-1 shrink-0 mb-0.5">
            <button className="p-1 text-dc-text-muted hover:text-dc-text-primary transition-colors hidden sm:block">
              <Gift className="w-5 h-5" />
            </button>
            <button className="p-1 text-dc-text-muted hover:text-dc-text-primary transition-colors hidden sm:block">
              <Sticker className="w-5 h-5" />
            </button>
            <button className="p-1 text-dc-text-muted hover:text-dc-text-primary transition-colors">
              <SmilePlus className="w-5 h-5" />
            </button>

            {input.trim() && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleSend}
                className="p-1.5 rounded-lg bg-dc-accent text-white hover:bg-dc-accent-hover transition-colors ml-1"
              >
                <SendHorizontal className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, compact }: { message: Message; compact: boolean }) {
  const [hovered, setHovered] = useState(false)

  if (compact) {
    return (
      <div
        className="group relative flex items-start gap-4 px-2 py-0.5 -mx-2 rounded hover:bg-dc-bg-hover/50 transition-colors"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="w-10 shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-dc-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <MessageContent content={message.content} />
          {message.reactions && <Reactions reactions={message.reactions} />}
        </div>
        {hovered && <MessageActions />}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex items-start gap-4 px-2 py-2 -mx-2 mt-3 rounded hover:bg-dc-bg-hover/50 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
        style={{
          background: message.author.isBot
            ? 'linear-gradient(135deg, #06B6D4, #8B5CF6)'
            : `hsl(${hashCode(message.author.id) % 360}, 60%, 45%)`,
        }}
      >
        {getInitials(message.author.displayName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-dc-text-primary hover:underline cursor-pointer">
            {message.author.displayName}
          </span>
          {message.author.isBot && (
            <span className="rounded bg-dc-accent px-1 py-px text-[9px] font-bold text-white uppercase tracking-wider">
              Bot
            </span>
          )}
          <span className="text-[11px] text-dc-text-muted">
            {formatTimestamp(message.timestamp)}
          </span>
          {message.pinned && (
            <Pin className="w-3 h-3 text-dc-amber" />
          )}
        </div>
        <MessageContent content={message.content} />
        {message.reactions && <Reactions reactions={message.reactions} />}
      </div>

      {/* Hover Actions */}
      {hovered && <MessageActions />}
    </motion.div>
  )
}

function MessageContent({ content }: { content: string }) {
  // Handle code blocks
  if (content.includes('```')) {
    const parts = content.split(/(```[\s\S]*?```)/g)
    return (
      <div className="space-y-1 mt-0.5">
        {parts.map((part, i) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const code = part.slice(3, -3)
            const firstNewline = code.indexOf('\n')
            const lang = firstNewline > 0 ? code.slice(0, firstNewline) : ''
            const body = firstNewline > 0 ? code.slice(firstNewline + 1) : code
            return (
              <pre
                key={i}
                className="rounded-lg bg-dc-bg-primary border border-dc-border p-3 text-[13px] font-mono text-dc-text-primary overflow-x-auto"
              >
                {lang && (
                  <div className="text-[10px] text-dc-text-muted mb-2 uppercase tracking-wider">{lang}</div>
                )}
                <code>{body}</code>
              </pre>
            )
          }
          return part ? (
            <p key={i} className="text-[15px] text-dc-text-primary leading-relaxed whitespace-pre-wrap overflow-wrap-break-word">
              {formatInlineText(part)}
            </p>
          ) : null
        })}
      </div>
    )
  }

  return (
    <p className="text-[15px] text-dc-text-primary leading-relaxed whitespace-pre-wrap overflow-wrap-break-word mt-0.5">
      {formatInlineText(content)}
    </p>
  )
}

function formatInlineText(text: string) {
  // Bold **text**
  const parts = text.split(/(\*\*[\s\S]*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
    }
    // Channel links #channel-name
    if (part.includes('#')) {
      const subParts = part.split(/(#[\w-]+)/g)
      return subParts.map((sp, j) => {
        if (sp.startsWith('#')) {
          return (
            <span
              key={`${i}-${j}`}
              className="rounded bg-dc-accent/20 px-1 text-dc-accent cursor-pointer hover:bg-dc-accent/30 hover:underline"
            >
              {sp}
            </span>
          )
        }
        return sp
      })
    }
    return part
  })
}

function Reactions({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map((r, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] border transition-colors',
            r.reacted
              ? 'bg-dc-accent/15 border-dc-accent/40 text-dc-accent'
              : 'bg-dc-bg-tertiary border-dc-border text-dc-text-secondary hover:border-dc-text-muted',
          )}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </motion.button>
      ))}
      <button className="flex items-center justify-center w-7 h-7 rounded-md border border-dc-border text-dc-text-muted hover:text-dc-text-primary hover:border-dc-text-muted transition-colors">
        <SmilePlus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function MessageActions() {
  return (
    <div className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg bg-dc-bg-elevated border border-dc-border p-0.5 shadow-lg">
      {['😀', '❤️', '👍', '🔥'].map((emoji) => (
        <button
          key={emoji}
          className="flex h-7 w-7 items-center justify-center rounded-md text-sm hover:bg-dc-bg-hover transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}
