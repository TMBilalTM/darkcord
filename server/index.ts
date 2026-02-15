import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { initDB } from './db.js'
import { seedDatabase } from './seed.js'
import { initSocket } from './socket.js'
import routes from './routes.js'

const app = express()
const httpServer = createServer(app)

// Init database
initDB()
seedDatabase()

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:1420' }))
app.use(express.json({ limit: '10mb' }))

// API routes
app.use('/api', routes)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Init Socket.IO
initSocket(httpServer)

// Start
const PORT = parseInt(process.env.PORT || '3001')
httpServer.listen(PORT, () => {
  console.log(`\n🚀 DarkCord Server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket ready`)
  console.log(`💾 SQLite database initialized\n`)
})
