import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { v4 as uuid } from 'uuid'
import db from './db.js'
import { verifyToken } from './auth.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Track online users: socketId -> userId
const onlineUsers = new Map<string, string>()
// Track which channels users are viewing
const channelViewers = new Map<string, Set<string>>()
// Track typing state
const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>()

export function initSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:1420',
      methods: ['GET', 'POST'],
    },
    pingInterval: 25000,
    pingTimeout: 10000,
  })

  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))

    const decoded = verifyToken(token)
    if (!decoded) return next(new Error('Invalid token'))

    socket.data.userId = decoded.userId
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    onlineUsers.set(socket.id, userId)

    // Set user online
    db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(userId)

    // Join user's server rooms
    const servers = db.prepare(
      'SELECT server_id FROM server_members WHERE user_id = ?'
    ).all(userId) as { server_id: string }[]

    servers.forEach((s) => socket.join(`server:${s.server_id}`))

    // Broadcast online status
    servers.forEach((s) => {
      io.to(`server:${s.server_id}`).emit('user:status', { userId, status: 'online' })
    })

    console.log(`🟢 ${userId} connected (${onlineUsers.size} online)`)

    // ─── Join Channel ───
    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`)
      if (!channelViewers.has(channelId)) channelViewers.set(channelId, new Set())
      channelViewers.get(channelId)!.add(userId)
    })

    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`)
      channelViewers.get(channelId)?.delete(userId)
    })

    // ─── Send Message ───
    socket.on('message:send', (data: { channelId: string; content: string; replyTo?: string }) => {
      const { channelId, content, replyTo } = data
      if (!content?.trim()) return

      const messageId = uuid()
      db.prepare(`
        INSERT INTO messages (id, channel_id, author_id, content, reply_to)
        VALUES (?, ?, ?, ?, ?)
      `).run(messageId, channelId, userId, content.trim(), replyTo || null)

      const author = db.prepare(
        'SELECT id, username, display_name, avatar, status, custom_status, is_bot FROM users WHERE id = ?'
      ).get(userId) as any

      const message = {
        id: messageId,
        channelId,
        author: {
          id: author.id,
          username: author.username,
          displayName: author.display_name,
          avatar: author.avatar,
          status: author.status,
          isBot: !!author.is_bot,
        },
        content: content.trim(),
        timestamp: new Date().toISOString(),
        pinned: false,
        edited: false,
        replyTo: replyTo || undefined,
      }

      // Broadcast to everyone in the channel
      const channel = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as { server_id: string } | undefined
      if (channel) {
        io.to(`channel:${channelId}`).emit('message:new', message)

        // Also emit to the server room for unread counts
        socket.to(`server:${channel.server_id}`).emit('channel:activity', {
          channelId,
          serverId: channel.server_id,
        })
      }

      // Clear typing
      clearTyping(channelId, userId)
    })

    // ─── Edit Message ───
    socket.on('message:edit', (data: { messageId: string; content: string }) => {
      const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND author_id = ?')
        .get(data.messageId, userId) as any
      if (!msg) return

      db.prepare('UPDATE messages SET content = ?, edited = 1 WHERE id = ?')
        .run(data.content, data.messageId)

      io.to(`channel:${msg.channel_id}`).emit('message:edited', {
        id: data.messageId,
        content: data.content,
        edited: true,
      })
    })

    // ─── Delete Message ───
    socket.on('message:delete', (messageId: string) => {
      const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND author_id = ?')
        .get(messageId, userId) as any
      if (!msg) return

      db.prepare('DELETE FROM messages WHERE id = ?').run(messageId)
      io.to(`channel:${msg.channel_id}`).emit('message:deleted', { id: messageId })
    })

    // ─── Typing ───
    socket.on('typing:start', (channelId: string) => {
      if (!typingUsers.has(channelId)) typingUsers.set(channelId, new Map())
      const channelTyping = typingUsers.get(channelId)!

      // Clear existing timeout
      const existing = channelTyping.get(userId)
      if (existing) clearTimeout(existing)

      // Set new timeout (stop typing after 5 seconds)
      channelTyping.set(
        userId,
        setTimeout(() => {
          clearTyping(channelId, userId)
          socket.to(`channel:${channelId}`).emit('typing:stop', { channelId, userId })
        }, 5000)
      )

      const user = db.prepare('SELECT display_name FROM users WHERE id = ?').get(userId) as any
      socket.to(`channel:${channelId}`).emit('typing:start', {
        channelId,
        userId,
        displayName: user?.display_name || 'Bilinmeyen',
      })
    })

    socket.on('typing:stop', (channelId: string) => {
      clearTyping(channelId, userId)
      socket.to(`channel:${channelId}`).emit('typing:stop', { channelId, userId })
    })

    // ─── Reaction ───
    socket.on('reaction:toggle', (data: { messageId: string; emoji: string }) => {
      const existing = db.prepare(
        'SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
      ).get(data.messageId, userId, data.emoji) as any

      if (existing) {
        db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id)
      } else {
        db.prepare('INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)')
          .run(data.messageId, userId, data.emoji)
      }

      // Get updated reactions
      const reactions = db.prepare(`
        SELECT emoji, COUNT(*) as count,
          MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as reacted
        FROM reactions WHERE message_id = ? GROUP BY emoji
      `).all(userId, data.messageId) as any[]

      const msg = db.prepare('SELECT channel_id FROM messages WHERE id = ?').get(data.messageId) as any
      if (msg) {
        io.to(`channel:${msg.channel_id}`).emit('reaction:updated', {
          messageId: data.messageId,
          reactions: reactions.map((r) => ({ emoji: r.emoji, count: r.count, reacted: !!r.reacted })),
        })
      }
    })

    // ─── Status ───
    socket.on('status:update', (status: string) => {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId)
      servers.forEach((s) => {
        io.to(`server:${s.server_id}`).emit('user:status', { userId, status })
      })
    })

    // ─── Disconnect ───
    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id)

      // Check if user has other sockets
      const stillOnline = [...onlineUsers.values()].includes(userId)
      if (!stillOnline) {
        db.prepare("UPDATE users SET status = 'offline' WHERE id = ?").run(userId)
        servers.forEach((s) => {
          io.to(`server:${s.server_id}`).emit('user:status', { userId, status: 'offline' })
        })
      }

      console.log(`🔴 ${userId} disconnected (${onlineUsers.size} online)`)
    })
  })

  return io
}

function clearTyping(channelId: string, userId: string) {
  const timeout = typingUsers.get(channelId)?.get(userId)
  if (timeout) clearTimeout(timeout)
  typingUsers.get(channelId)?.delete(userId)
}
