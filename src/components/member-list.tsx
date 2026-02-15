import { useAppStore } from '@/store/app'
import { cn, getInitials } from '@/lib/utils'
import type { User } from '@/types'


export function MemberList() {
  const { members } = useAppStore()

  const online = members.filter((m) => m.status !== 'offline')
  const offline = members.filter((m) => m.status === 'offline')

  return (
    <aside className="w-60 h-full shrink-0 bg-dc-bg-secondary border-l border-dc-border-subtle overflow-y-auto">
      <div className="px-4 py-4 space-y-5">
        {/* Online Members */}
        <MemberGroup label={`ÇEVRİMİÇİ — ${online.length}`} members={online} />

        {/* Offline Members */}
        {offline.length > 0 && (
          <MemberGroup label={`ÇEVRİMDIŞI — ${offline.length}`} members={offline} />
        )}
      </div>
    </aside>
  )
}

function MemberGroup({ label, members }: { label: string; members: User[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-dc-text-muted mb-1 px-1">
        {label}
      </h4>
      <div className="space-y-0.5">
        {members.map((member) => (
          <MemberItem key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}

function MemberItem({ member }: { member: User }) {
  const isOffline = member.status === 'offline'

  return (
    <button
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-2 py-1.5 transition-colors',
        'hover:bg-dc-bg-hover',
        isOffline && 'opacity-40',
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold"
          style={{
            background: member.isBot
              ? 'linear-gradient(135deg, #06B6D4, #8B5CF6)'
              : `hsl(${hashCode(member.id) % 360}, 55%, 45%)`,
          }}
        >
          {getInitials(member.displayName)}
        </div>
        <StatusDot status={member.status} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-medium text-dc-text-primary truncate">
            {member.displayName}
          </span>
          {member.isBot && (
            <span className="rounded bg-dc-accent px-1 py-px text-[8px] font-bold text-white uppercase">
              Bot
            </span>
          )}
        </div>
        {member.customStatus && (
          <p className="text-[11px] text-dc-text-muted truncate leading-tight">
            {member.customStatus}
          </p>
        )}
      </div>
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
        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-dc-bg-secondary',
        color,
      )}
    />
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
