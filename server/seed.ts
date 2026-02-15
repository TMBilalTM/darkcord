import { v4 as uuid } from 'uuid'
import db from './db.js'

/**
 * Seeds the database with initial data if empty.
 * This creates a default server with channels so users have something to join.
 */
export function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) return // Already seeded

  console.log('📦 Seeding database...')

  // Create DarkBot
  const botId = uuid()
  db.prepare(`
    INSERT INTO users (id, username, display_name, email, password_hash, status, is_bot)
    VALUES (?, 'darkbot', 'DarkBot', 'bot@darkcord.app', '', 'online', 1)
  `).run(botId)

  // Create default server
  const serverId = uuid()
  db.prepare(`
    INSERT INTO servers (id, name, color, owner_id, member_count, boost_level)
    VALUES (?, 'DarkCord Topluluk', '#8B5CF6', ?, 1, 3)
  `).run(serverId, botId)

  // Add bot as member
  db.prepare(`INSERT INTO server_members (server_id, user_id, role) VALUES (?, ?, 'admin')`)
    .run(serverId, botId)

  // Categories & Channels
  const cats = [
    {
      name: 'BİLGİ',
      channels: [
        { name: 'duyurular', type: 'announcement', desc: 'Önemli güncellemeler' },
        { name: 'kurallar', type: 'text', desc: 'Sunucu kuralları' },
      ],
    },
    {
      name: 'GENEL',
      channels: [
        { name: 'genel-sohbet', type: 'text', desc: 'Genel konuşmalar' },
        { name: 'medya-paylaşım', type: 'text', desc: 'Fotoğraf, video, link paylaşımları' },
        { name: 'bot-komutları', type: 'text', desc: null },
      ],
    },
    {
      name: 'GELİŞTİRME',
      channels: [
        { name: 'frontend', type: 'text', desc: 'Frontend tartışmaları' },
        { name: 'backend', type: 'text', desc: 'Backend tartışmaları' },
        { name: 'tasarım', type: 'text', desc: 'UI/UX tartışmaları' },
      ],
    },
    {
      name: 'SES KANALLARI',
      channels: [
        { name: 'Genel Ses', type: 'voice', desc: null },
        { name: 'Müzik', type: 'voice', desc: null },
        { name: 'Toplantı', type: 'voice', desc: null },
      ],
    },
  ]

  const insertCat = db.prepare('INSERT INTO categories (id, server_id, name, position) VALUES (?, ?, ?, ?)')
  const insertCh = db.prepare('INSERT INTO channels (id, category_id, server_id, name, type, description, position) VALUES (?, ?, ?, ?, ?, ?, ?)')

  cats.forEach((cat, ci) => {
    const catId = uuid()
    insertCat.run(catId, serverId, cat.name, ci)
    cat.channels.forEach((ch, chi) => {
      insertCh.run(uuid(), catId, serverId, ch.name, ch.type, ch.desc, chi)
    })
  })

  // Add a welcome message to genel-sohbet
  const genelChannel = db.prepare(
    "SELECT id FROM channels WHERE server_id = ? AND name = 'genel-sohbet'"
  ).get(serverId) as { id: string } | undefined

  if (genelChannel) {
    db.prepare(`
      INSERT INTO messages (id, channel_id, author_id, content, pinned)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      uuid(),
      genelChannel.id,
      botId,
      '🎉 **DarkCord Topluluğuna Hoş Geldiniz!**\n\nBurası DarkCord\'un resmi topluluk sunucusu. Kuralları okumanızı ve keyifli sohbetler etmenizi diliyoruz!\n\n• Duyurular için #duyurular kanalını takip edin\n• Sorularınız için #genel-sohbet\'i kullanın\n• Geliştirme tartışmaları için #frontend ve #backend kanallarına göz atın'
    )
  }

  console.log('✅ Database seeded!')
}
