import { useAppStore } from '@/store/app'
import { cn, getInitials } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Settings,
  Signal,
  PhoneOff,
} from 'lucide-react'

export function UserPanel() {
  const { currentUser, voiceState, toggleMute, toggleDeafen, leaveVoice } = useAppStore()
  const isInVoice = voiceState.channelId !== null

  if (!currentUser) return null

  return (
    <div className="border-t border-dc-border-subtle">
      {/* Voice Connection Bar */}
      {isInVoice && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-b border-dc-border-subtle bg-dc-bg-tertiary px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Signal className="w-4 h-4 text-dc-green animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-dc-green">Ses Bağlantısı</p>
              <p className="text-[11px] text-dc-text-muted truncate">Genel Ses</p>
            </div>
            <button
              onClick={leaveVoice}
              className="p-1 rounded hover:bg-dc-bg-hover transition-colors"
              aria-label="Ses kanalından ayrıl"
            >
              <PhoneOff className="w-4 h-4 text-dc-text-secondary hover:text-dc-red" />
            </button>
          </div>
        </motion.div>
      )}

      {/* User Info */}
      <div className="flex items-center gap-2 px-2 py-2 bg-dc-bg-tertiary/50">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}
          >
            {getInitials(currentUser.displayName)}
          </div>
          <StatusDot status={currentUser.status} />
        </div>

        {/* Name & Status */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-dc-text-primary truncate leading-tight">
            {currentUser.displayName}
          </p>
          {currentUser.customStatus && (
            <p className="text-[11px] text-dc-text-muted truncate leading-tight">
              {currentUser.customStatus}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <ControlButton
            onClick={toggleMute}
            active={voiceState.muted}
            activeColor="text-dc-red"
            aria-label={voiceState.muted ? 'Mikrofonu aç' : 'Mikrofonu kapat'}
          >
            {voiceState.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </ControlButton>

          <ControlButton
            onClick={toggleDeafen}
            active={voiceState.deafened}
            activeColor="text-dc-red"
            aria-label={voiceState.deafened ? 'Sesi aç' : 'Sesi kapat'}
          >
            {voiceState.deafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </ControlButton>

          <ControlButton aria-label="Ayarlar">
            <Settings className="w-4 h-4" />
          </ControlButton>
        </div>
      </div>
    </div>
  )
}

function ControlButton({
  children,
  onClick,
  active,
  activeColor,
  ...props
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  activeColor?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        active
          ? `${activeColor} bg-dc-bg-active`
          : 'text-dc-text-secondary hover:bg-dc-bg-hover hover:text-dc-text-primary',
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = {
    online: 'bg-dc-green',
    idle: 'bg-dc-amber',
    dnd: 'bg-dc-red',
    offline: 'bg-dc-text-muted',
  }[status] ?? 'bg-dc-text-muted'

  return (
    <div
      className={cn(
        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-dc-bg-tertiary',
        color,
      )}
    />
  )
}
