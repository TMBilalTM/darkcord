export interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
  customStatus?: string
  isBot?: boolean
}

export interface Server {
  id: string
  name: string
  icon?: string
  color: string
  ownerId: string
  categories: Category[]
  memberCount: number
  boostLevel: number
}

export interface Category {
  id: string
  name: string
  channels: Channel[]
  collapsed?: boolean
}

export interface Channel {
  id: string
  name: string
  type: 'text' | 'voice' | 'announcement' | 'stage' | 'forum'
  unreadCount?: number
  description?: string
}

export interface Message {
  id: string
  channelId: string
  author: User
  content: string
  timestamp: Date
  edited?: boolean
  reactions?: Reaction[]
  replyTo?: string
  attachments?: Attachment[]
  pinned?: boolean
}

export interface Reaction {
  emoji: string
  count: number
  reacted: boolean
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: 'image' | 'video' | 'file'
  size: number
}

export interface VoiceState {
  channelId: string | null
  muted: boolean
  deafened: boolean
  speaking: boolean
}
