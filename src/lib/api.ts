import type { User, Server, Message } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken(): string | null {
  return localStorage.getItem('darkcord_token')
}

export function setToken(token: string) {
  localStorage.setItem('darkcord_token', token)
}

export function clearToken() {
  localStorage.removeItem('darkcord_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Bir hata oluştu' }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// ─── Auth ───
export const api = {
  auth: {
    register: (data: { username: string; displayName: string; email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => request<User>('/auth/me'),
  },

  // ─── Servers ───
  servers: {
    list: () => request<Server[]>('/servers'),

    create: (data: { name: string; color?: string }) =>
      request<{ id: string; name: string; color: string }>('/servers', { method: 'POST', body: JSON.stringify(data) }),

    members: (serverId: string) => request<User[]>(`/servers/${serverId}/members`),
  },

  // ─── Messages ───
  messages: {
    list: (channelId: string, params?: { limit?: number; before?: string }) => {
      const query = new URLSearchParams()
      if (params?.limit) query.set('limit', String(params.limit))
      if (params?.before) query.set('before', params.before)
      const qs = query.toString()
      return request<Message[]>(`/channels/${channelId}/messages${qs ? `?${qs}` : ''}`)
    },
  },

  // ─── Reactions ───
  reactions: {
    toggle: (messageId: string, emoji: string) =>
      request<{ action: string }>(`/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }),
  },
}
