import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from './db.js'
import { hashPassword, comparePassword, generateToken, authMiddleware, type AuthRequest } from './auth.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

const router = Router()

// ─── Auth Routes ───

router.post('/auth/register', (req, res) => {
  const { username, displayName, email, password } = req.body
  if (!username || !displayName || !email || !password) {
    res.status(400).json({ error: 'Tüm alanlar gerekli' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' })
    return
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email)
  if (existing) {
    res.status(409).json({ error: 'Bu kullanıcı adı veya e-posta zaten kayıtlı' })
    return
  }

  const id = uuid()
  const hash = hashPassword(password)

  db.prepare(`
    INSERT INTO users (id, username, display_name, email, password_hash, status)
    VALUES (?, ?, ?, ?, ?, 'online')
  `).run(id, username, displayName, email, hash)

  // Auto-join first server
  const firstServer = db.prepare('SELECT id FROM servers LIMIT 1').get() as { id: string } | undefined
  if (firstServer) {
    db.prepare('INSERT OR IGNORE INTO server_members (server_id, user_id) VALUES (?, ?)').run(firstServer.id, id)
    db.prepare('UPDATE servers SET member_count = member_count + 1 WHERE id = ?').run(firstServer.id)
  }

  const token = generateToken(id)
  const user = db.prepare('SELECT id, username, display_name, avatar, status, custom_status, is_bot FROM users WHERE id = ?').get(id)

  res.status(201).json({ token, user })
})

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'E-posta ve şifre gerekli' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
  if (!user || !comparePassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Geçersiz e-posta veya şifre' })
    return
  }

  db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(user.id)
  const token = generateToken(user.id)

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      status: 'online',
      customStatus: user.custom_status,
      isBot: !!user.is_bot,
    },
  })
})

router.get('/auth/me', authMiddleware, (req: AuthRequest, res) => {
  const user = db.prepare(
    'SELECT id, username, display_name, avatar, status, custom_status, is_bot FROM users WHERE id = ?'
  ).get(req.userId!) as any

  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' })
    return
  }

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatar: user.avatar,
    status: user.status,
    customStatus: user.custom_status,
    isBot: !!user.is_bot,
  })
})

// ─── Server Routes ───

router.get('/servers', authMiddleware, (req: AuthRequest, res) => {
  const servers = db.prepare(`
    SELECT s.* FROM servers s
    INNER JOIN server_members sm ON s.id = sm.server_id
    WHERE sm.user_id = ?
    ORDER BY s.created_at
  `).all(req.userId!) as any[]

  const result = servers.map((s) => {
    const categories = db.prepare(
      'SELECT * FROM categories WHERE server_id = ? ORDER BY position'
    ).all(s.id) as any[]

    return {
      id: s.id,
      name: s.name,
      icon: s.icon,
      color: s.color,
      ownerId: s.owner_id,
      memberCount: s.member_count,
      boostLevel: s.boost_level,
      categories: categories.map((cat) => {
        const channels = db.prepare(
          'SELECT * FROM channels WHERE category_id = ? ORDER BY position'
        ).all(cat.id) as any[]

        return {
          id: cat.id,
          name: cat.name,
          channels: channels.map((ch) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            description: ch.description,
            unreadCount: 0,
          })),
        }
      }),
    }
  })

  res.json(result)
})

router.post('/servers', authMiddleware, (req: AuthRequest, res) => {
  const { name, color } = req.body
  if (!name) {
    res.status(400).json({ error: 'Sunucu adı gerekli' })
    return
  }

  const id = uuid()
  db.prepare('INSERT INTO servers (id, name, color, owner_id, member_count) VALUES (?, ?, ?, ?, 1)')
    .run(id, name, color || '#8B5CF6', req.userId!)

  db.prepare("INSERT INTO server_members (server_id, user_id, role) VALUES (?, ?, 'admin')")
    .run(id, req.userId!)

  // Create default category & channel
  const catId = uuid()
  db.prepare('INSERT INTO categories (id, server_id, name, position) VALUES (?, ?, ?, 0)')
    .run(catId, id, 'GENEL')

  const chId = uuid()
  db.prepare("INSERT INTO channels (id, category_id, server_id, name, type, description, position) VALUES (?, ?, ?, 'genel-sohbet', 'text', 'Genel konuşmalar', 0)")
    .run(chId, catId, id)

  res.status(201).json({ id, name, color: color || '#8B5CF6' })
})

// ─── Channel Routes ───

router.get('/channels/:channelId/messages', authMiddleware, (req: AuthRequest, res) => {
  const { channelId } = req.params
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const before = req.query.before as string | undefined

  let query = `
    SELECT m.*, u.username, u.display_name, u.avatar, u.is_bot, u.status as user_status
    FROM messages m
    INNER JOIN users u ON m.author_id = u.id
    WHERE m.channel_id = ?
  `
  const params: any[] = [channelId]

  if (before) {
    query += ` AND m.created_at < ?`
    params.push(before)
  }

  query += ` ORDER BY m.created_at DESC LIMIT ?`
  params.push(limit)

  const rows = db.prepare(query).all(...params) as any[]

  // Get reactions for each message
  const messages = rows.reverse().map((m) => {
    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count,
        MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as reacted
      FROM reactions WHERE message_id = ? GROUP BY emoji
    `).all(req.userId!, m.id) as any[]

    return {
      id: m.id,
      channelId: m.channel_id,
      author: {
        id: m.author_id,
        username: m.username,
        displayName: m.display_name,
        avatar: m.avatar,
        status: m.user_status,
        isBot: !!m.is_bot,
      },
      content: m.content,
      timestamp: m.created_at,
      pinned: !!m.pinned,
      edited: !!m.edited,
      replyTo: m.reply_to,
      reactions: reactions.length > 0
        ? reactions.map((r) => ({ emoji: r.emoji, count: r.count, reacted: !!r.reacted }))
        : undefined,
    }
  })

  res.json(messages)
})

// ─── Members Routes ───

router.get('/servers/:serverId/members', authMiddleware, (req: AuthRequest, res) => {
  const members = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar, u.status, u.custom_status, u.is_bot, sm.role
    FROM server_members sm
    INNER JOIN users u ON sm.user_id = u.id
    WHERE sm.server_id = ?
    ORDER BY u.status = 'offline', u.display_name
  `).all(req.params.serverId) as any[]

  res.json(
    members.map((m) => ({
      id: m.id,
      username: m.username,
      displayName: m.display_name,
      avatar: m.avatar,
      status: m.status,
      customStatus: m.custom_status,
      isBot: !!m.is_bot,
      role: m.role,
    }))
  )
})

// ─── Reactions ───

router.post('/messages/:messageId/reactions', authMiddleware, (req: AuthRequest, res) => {
  const { emoji } = req.body
  if (!emoji) {
    res.status(400).json({ error: 'Emoji gerekli' })
    return
  }

  const existing = db.prepare(
    'SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
  ).get(req.params.messageId, req.userId!, emoji) as any

  if (existing) {
    db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id)
    res.json({ action: 'removed' })
  } else {
    db.prepare('INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)')
      .run(req.params.messageId, req.userId!, emoji)
    res.json({ action: 'added' })
  }
})

export default router
