import { create } from 'zustand'
import type { Server, Message, User, VoiceState, Reaction } from '@/types'
import { api, setToken, clearToken } from '@/lib/api'
import { connectSocket, getSocket, disconnectSocket } from '@/lib/socket'

interface TypingUser {
  userId: string
  displayName: string
}

interface AppState {
  // ─── Auth ───
  token: string | null
  isAuthenticated: boolean
  authLoading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, displayName: string, email: string, password: string) => Promise<void>
  logout: () => void
  restoreSession: () => Promise<void>

  // ─── User ───
  currentUser: User | null
  setStatus: (status: User['status']) => void

  // ─── Navigation ───
  activeServerId: string | null
  activeChannelId: string | null
  setActiveServer: (id: string | null) => void
  setActiveChannel: (id: string) => void

  // ─── Servers ───
  servers: Server[]
  loadServers: () => Promise<void>

  // ─── Messages ───
  messages: Record<string, Message[]>
  messagesLoading: boolean
  sendMessage: (channelId: string, content: string) => void
  loadMessages: (channelId: string) => Promise<void>

  // ─── Typing ───
  typingUsers: Record<string, TypingUser[]>
  startTyping: (channelId: string) => void

  // ─── Voice ───
  voiceState: VoiceState
  joinVoice: (channelId: string) => void
  leaveVoice: () => void
  toggleMute: () => void
  toggleDeafen: () => void

  // ─── UI ───
  showMemberList: boolean
  toggleMemberList: () => void
  commandPaletteOpen: boolean
  toggleCommandPalette: () => void
  mobileSidebarOpen: boolean
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void

  // ─── Members ───
  members: User[]
  loadMembers: (serverId: string) => Promise<void>

  // ─── Socket ───
  initSocket: () => void
}

const initialVoiceState: VoiceState = {
  channelId: null,
  muted: false,
  deafened: false,
  speaking: false,
}

export const useAppStore = create<AppState>((set, get) => ({
  // ─── Auth ───
  token: localStorage.getItem('darkcord_token'),
  isAuthenticated: false,
  authLoading: true,
  authError: null,

  login: async (email, password) => {
    set({ authLoading: true, authError: null })
    try {
      const { token, user } = await api.auth.login({ email, password })
      setToken(token)
      set({
        token,
        isAuthenticated: true,
        authLoading: false,
        currentUser: user,
      })
      get().initSocket()
      await get().loadServers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Giriş başarısız'
      set({ authLoading: false, authError: msg })
      throw err
    }
  },

  register: async (username, displayName, email, password) => {
    set({ authLoading: true, authError: null })
    try {
      const { token, user } = await api.auth.register({ username, displayName, email, password })
      setToken(token)
      set({
        token,
        isAuthenticated: true,
        authLoading: false,
        currentUser: user,
      })
      get().initSocket()
      await get().loadServers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kayıt başarısız'
      set({ authLoading: false, authError: msg })
      throw err
    }
  },

  logout: () => {
    clearToken()
    disconnectSocket()
    set({
      token: null,
      isAuthenticated: false,
      currentUser: null,
      servers: [],
      messages: {},
      members: [],
      activeServerId: null,
      activeChannelId: null,
    })
  },

  restoreSession: async () => {
    const token = localStorage.getItem('darkcord_token')
    if (!token) {
      set({ authLoading: false })
      return
    }
    try {
      const user = await api.auth.me()
      set({ isAuthenticated: true, authLoading: false, currentUser: user })
      get().initSocket()
      await get().loadServers()
    } catch {
      clearToken()
      set({ token: null, authLoading: false })
    }
  },

  // ─── User ───
  currentUser: null,
  setStatus: (status) => {
    set((s) => ({ currentUser: s.currentUser ? { ...s.currentUser, status } : null }))
    getSocket()?.emit('status:update', status)
  },

  // ─── Navigation ───
  activeServerId: null,
  activeChannelId: null,
  setActiveServer: (id) => {
    const server = get().servers.find((s) => s.id === id)
    const firstTextChannel = server?.categories
      .flatMap((c) => c.channels)
      .find((ch) => ch.type === 'text')

    const newChannelId = firstTextChannel?.id ?? null
    const oldChannelId = get().activeChannelId

    // Leave old channel room, join new
    const socket = getSocket()
    if (socket && oldChannelId) socket.emit('channel:leave', oldChannelId)
    if (socket && newChannelId) socket.emit('channel:join', newChannelId)

    set({ activeServerId: id, activeChannelId: newChannelId })

    if (id) get().loadMembers(id)
    if (newChannelId) get().loadMessages(newChannelId)
  },

  setActiveChannel: (id) => {
    const oldChannelId = get().activeChannelId
    const socket = getSocket()
    if (socket && oldChannelId) socket.emit('channel:leave', oldChannelId)
    if (socket) socket.emit('channel:join', id)

    set({ activeChannelId: id })
    get().loadMessages(id)
  },

  // ─── Servers ───
  servers: [],
  loadServers: async () => {
    try {
      const servers = await api.servers.list()
      set({ servers })
      // Auto-select first server
      if (servers.length > 0 && !get().activeServerId) {
        get().setActiveServer(servers[0].id)
      }
    } catch (err) {
      console.error('Failed to load servers:', err)
    }
  },

  // ─── Messages ───
  messages: {},
  messagesLoading: false,
  loadMessages: async (channelId) => {
    set({ messagesLoading: true })
    try {
      const msgs = await api.messages.list(channelId, { limit: 50 })
      const parsed = msgs.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp as unknown as string),
      }))
      set((s) => ({
        messages: { ...s.messages, [channelId]: parsed },
        messagesLoading: false,
      }))
    } catch {
      set({ messagesLoading: false })
    }
  },

  sendMessage: (channelId, content) => {
    const socket = getSocket()
    if (!socket) return
    socket.emit('message:send', { channelId, content })
  },

  // ─── Typing ───
  typingUsers: {},
  startTyping: (channelId) => {
    getSocket()?.emit('typing:start', channelId)
  },

  // ─── Voice ───
  voiceState: initialVoiceState,
  joinVoice: (channelId) =>
    set((s) => ({ voiceState: { ...s.voiceState, channelId } })),
  leaveVoice: () =>
    set((s) => ({ voiceState: { ...s.voiceState, channelId: null } })),
  toggleMute: () =>
    set((s) => ({ voiceState: { ...s.voiceState, muted: !s.voiceState.muted } })),
  toggleDeafen: () =>
    set((s) => ({
      voiceState: {
        ...s.voiceState,
        deafened: !s.voiceState.deafened,
        muted: !s.voiceState.deafened ? true : s.voiceState.muted,
      },
    })),

  // ─── UI ───
  showMemberList: true,
  toggleMemberList: () => set((s) => ({ showMemberList: !s.showMemberList })),
  commandPaletteOpen: false,
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  mobileSidebarOpen: false,
  toggleMobileSidebar: () =>
    set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  // ─── Members ───
  members: [],
  loadMembers: async (serverId) => {
    try {
      const members = await api.servers.members(serverId)
      set({ members })
    } catch (err) {
      console.error('Failed to load members:', err)
    }
  },

  // ─── Socket ───
  initSocket: () => {
    const token = get().token
    if (!token) return

    const socket = connectSocket(token)

    // ─── Message Events ───
    socket.on('message:new', (message: Record<string, unknown>) => {
      const msg = { ...message, timestamp: new Date(message.timestamp as string) } as Message
      set((s) => ({
        messages: {
          ...s.messages,
          [msg.channelId]: [...(s.messages[msg.channelId] ?? []), msg],
        },
      }))
    })

    socket.on('message:edited', (data: { id: string; content: string; edited: boolean }) => {
      set((s) => {
        const newMessages = { ...s.messages }
        for (const chId of Object.keys(newMessages)) {
          newMessages[chId] = newMessages[chId].map((m) =>
            m.id === data.id ? { ...m, content: data.content, edited: true } : m
          )
        }
        return { messages: newMessages }
      })
    })

    socket.on('message:deleted', (data: { id: string }) => {
      set((s) => {
        const newMessages = { ...s.messages }
        for (const chId of Object.keys(newMessages)) {
          newMessages[chId] = newMessages[chId].filter((m) => m.id !== data.id)
        }
        return { messages: newMessages }
      })
    })

    // ─── Reaction Events ───
    socket.on('reaction:updated', (data: { messageId: string; reactions: Reaction[] }) => {
      set((s) => {
        const newMessages = { ...s.messages }
        for (const chId of Object.keys(newMessages)) {
          newMessages[chId] = newMessages[chId].map((m) =>
            m.id === data.messageId ? { ...m, reactions: data.reactions } : m
          )
        }
        return { messages: newMessages }
      })
    })

    // ─── Typing Events ───
    socket.on('typing:start', (data: { channelId: string; userId: string; displayName: string }) => {
      set((s) => {
        const existing = s.typingUsers[data.channelId] ?? []
        if (existing.some((t) => t.userId === data.userId)) return s
        return {
          typingUsers: {
            ...s.typingUsers,
            [data.channelId]: [...existing, { userId: data.userId, displayName: data.displayName }],
          },
        }
      })
    })

    socket.on('typing:stop', (data: { channelId: string; userId: string }) => {
      set((s) => {
        const existing = s.typingUsers[data.channelId] ?? []
        return {
          typingUsers: {
            ...s.typingUsers,
            [data.channelId]: existing.filter((t) => t.userId !== data.userId),
          },
        }
      })
    })

    // ─── User Status Events ───
    socket.on('user:status', (data: { userId: string; status: string }) => {
      set((s) => ({
        members: s.members.map((m) =>
          m.id === data.userId ? { ...m, status: data.status as User['status'] } : m
        ),
      }))
    })
  },
}))
