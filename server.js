const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}-${file.originalname}`)
  },
})

const upload = multer({ storage })

const generatePin = () => {
  const part1 = Math.floor(100 + Math.random() * 900)
  const part2 = Math.floor(100 + Math.random() * 900)
  return `${part1}-${part2}`
}

const items = new Map()

app.post('/api/upload', upload.array('files', 20), async (req, res) => {
  try {
    const text = req.body.text?.trim()
    const files = req.files || []
    const expiration = req.body.expiration || '24h'
    const password = req.body.password?.trim()

    if (!text && files.length === 0) {
      return res.status(400).json({ error: 'No text or files provided' })
    }

    const pin = generatePin()
    const createdAt = new Date().toISOString()
    const expiresAt = expiration === 'never'
      ? null
      : new Date(Date.now() + {
          '1h': 60 * 60 * 1000,
          '12h': 12 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        }[expiration] || 24 * 60 * 60 * 1000).toISOString()

    const payload = {
      id: crypto.randomUUID(),
      pin,
      text: text || undefined,
      files: files.map((file) => ({
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        path: file.path,
      })),
      passwordProtected: Boolean(password),
      createdAt,
      expiresAt,
    }

    items.set(pin, payload)

    res.json({ pin, item: payload })
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' })
  }
})

app.get('/api/items/:pin', (req, res) => {
  const item = items.get(req.params.pin)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
    items.delete(req.params.pin)
    return res.status(404).json({ error: 'Item expired' })
  }

  const password = req.headers['x-password']
  if (item.passwordProtected && password !== process.env.SHARED_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  res.json({ item })
})

app.get('/api/download/:pin', (req, res) => {
  const item = items.get(req.params.pin)
  if (!item || !item.files?.length) return res.status(404).json({ error: 'No file found' })

  const file = item.files[0]
  if (!fs.existsSync(file.path)) return res.status(404).json({ error: 'File missing' })

  res.download(file.path, file.name)
})

app.get('/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
