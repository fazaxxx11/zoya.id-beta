import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import assessHandler from './api/assess.js'
import interpretStatsHandler from './api/interpret-stats.js'
import explainChatHandler from './api/explain-chat.js'
import generateKuesionerHandler from './api/generate-kuesioner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(helmet())
app.use(cors({ origin: ['https://zoya.id', 'https://www.zoya.id', 'https://zoya-id-beta.vercel.app'], credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(express.static(join(__dirname, 'dist')))

// Delegate to the same handlers used in production (Vercel functions).
// This keeps dev & prod behavior identical.
app.post('/api/assess', (req, res) => assessHandler(req, res))
app.post('/api/interpret-stats', (req, res) => interpretStatsHandler(req, res))
app.post('/api/explain-chat', (req, res) => explainChatHandler(req, res))
app.post('/api/generate-kuesioner', (req, res) => generateKuesionerHandler(req, res))

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist/index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  console.log(`📝 Set GROQ_API_KEY or KIMI_API_KEY to use AI`)
})
