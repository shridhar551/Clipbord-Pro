import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  ClipboardPaste,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  KeyRound,
  Moon,
  QrCode,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { QRCode } from 'react-qr-code'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const THEME_KEY = 'infinite-clipboard-theme'

type Theme = 'light' | 'dark'

type UploadedFile = {
  name: string
  size: number
  mimeType: string
  fileData: string
}

type SharedItem = {
  id: string
  pin: string
  type: 'text' | 'files'
  text?: string
  files?: UploadedFile[]
  passwordProtected: boolean
  createdAt: string
  expiresAt?: string
}

type Toast = {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)
  const value = bytes / 1024 ** i
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`
}

const formatExpiration = (value: string) => {
  switch (value) {
    case '1h':
      return '1 Hour'
    case '12h':
      return '12 Hours'
    case '24h':
      return '24 Hours'
    case '7d':
      return '7 Days'
    case '30d':
      return '30 Days'
    case 'never':
      return 'Never'
    default:
      return '24 Hours'
  }
}

function App() {
  const [theme, setTheme] = useState<Theme>('light')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [textContent, setTextContent] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [expiration, setExpiration] = useState('24h')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('Ready to upload')
  const [retrievedItem, setRetrievedItem] = useState<SharedItem | null>(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [generatedPin, setGeneratedPin] = useState('')
  const [recentPins, setRecentPins] = useState<string[]>([])
  const [toast, setToast] = useState<Toast | null>(null)
  const [retrievalError, setRetrievalError] = useState('')
  const [stats, setStats] = useState({
    uploads: 0,
    active: 0,
    storage: 0,
    downloads: 0,
  })

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const totalFileSize = useMemo(
    () => selectedFiles.reduce((sum, item) => sum + item.size, 0),
    [selectedFiles],
  )

  const previewUrl = useMemo(() => {
    if (!retrievedItem?.files?.[0]) return ''
    const file = retrievedItem.files[0]
    if (!file.fileData) return ''
    return `data:${file.mimeType};base64,${file.fileData}`
  }, [retrievedItem])

  const showToast = (message: string, tone: Toast['tone']) => {
    setToast({ id: Date.now(), message, tone })
  }

  const handleFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    if (!list.length) return
    setSelectedFiles(list)
    setUploadStatus(`${list.length} file${list.length > 1 ? 's' : ''} selected`)
  }

  const startUploadProgress = () => {
    setUploadProgress(0)
    const interval = window.setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 94) {
          window.clearInterval(interval)
          return 94
        }
        return Math.min(prev + Math.random() * 18, 94)
      })
    }, 180)
    return interval
  }

  const uploadContent = async () => {
    if (!textContent.trim() && !selectedFiles.length) {
      showToast('Add some text or select a file first.', 'error')
      return
    }

    setIsUploading(true)
    setUploadStatus('Preparing upload...')
    const progressTimer = startUploadProgress()

    const formData = new FormData()
    if (textContent.trim()) formData.append('text', textContent)
    selectedFiles.forEach((file) => formData.append('files', file))
    formData.append('expiration', expiration)
    if (passwordInput.trim()) formData.append('password', passwordInput)

    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      window.clearInterval(progressTimer)
      setUploadProgress(100)
      setGeneratedPin(data.pin)
      setShowPinModal(true)
      setRecentPins((prev) => [data.pin, ...prev].slice(0, 6))
      setStats((prev) => ({
        uploads: prev.uploads + 1,
        active: prev.active + 1,
        storage: prev.storage + selectedFiles.reduce((sum, file) => sum + file.size, 0),
        downloads: prev.downloads,
      }))
      setUploadStatus('Upload complete')
      setTextContent('')
      setSelectedFiles([])
      setPasswordInput('')
      setRetrievalError('')
      showToast('Share link is ready.', 'success')
    } catch (error) {
      window.clearInterval(progressTimer)
      setUploadProgress(0)
      setUploadStatus('Upload failed')
      showToast(error instanceof Error ? error.message : 'Upload failed', 'error')
    } finally {
      setIsUploading(false)
      window.setTimeout(() => setUploadProgress(0), 600)
    }
  }

  const retrieveContent = async () => {
    if (!pinInput.trim()) {
      showToast('Enter a PIN to retrieve content.', 'error')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/items/${pinInput.trim()}`, {
        headers: passwordInput.trim() ? { 'x-password': passwordInput.trim() } : undefined,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to retrieve content')
      }
      setRetrievedItem(data.item)
      const item = data.item
      setStats((prev) => ({
        ...prev,
        active: Math.max(prev.active, item ? 1 : 0),
      }))
      setRetrievalError('')
      showToast('Content retrieved successfully.', 'success')
    } catch (error) {
      setRetrievedItem(null)
      setRetrievalError(error instanceof Error ? error.message : 'Unable to retrieve content')
      showToast('Unable to retrieve content.', 'error')
    }
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      showToast('Copied to clipboard.', 'success')
    } catch {
      showToast('Copy failed.', 'error')
    }
  }

  const downloadCurrentFile = async () => {
    if (!retrievedItem?.pin) return

    const response = await fetch(`${API_BASE}/api/download/${retrievedItem.pin}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = retrievedItem.files?.[0]?.name || 'shared-content'
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-pill">
          <Sparkles size={16} />
          Infinite Clipboard
        </div>
        <button
          className="theme-toggle"
          onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>
      </header>

      <main className="app-content">
        <section className="hero-section">
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ShieldCheck size={16} />
            Secure share hub
          </motion.div>
          <h1>INFINITE CLIPBOARD</h1>
          <p className="hero-subtitle">Share text & files instantly using a PIN</p>
          <p className="hero-description">
            Upload any file or text, generate a unique PIN, and access it from anywhere.
          </p>
        </section>

        <section className="dashboard-grid">
          <motion.div
            className="panel share-panel"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="panel-header">
              <div>
                <p className="eyebrow">Share clips & files</p>
                <h2>Upload content</h2>
              </div>
              <button
                className="ghost-btn"
                onClick={() => setIsAdvancedOpen((prev) => !prev)}
              >
                {isAdvancedOpen ? 'Hide options' : 'Advanced options'}
              </button>
            </div>

            {isAdvancedOpen && (
              <div className="advanced-options">
                <div className="toggle-group">
                  <span>Expiration</span>
                  <select value={expiration} onChange={(e) => setExpiration(e.target.value)}>
                    <option value="1h">1 Hour</option>
                    <option value="12h">12 Hours</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="never">Never</option>
                  </select>
                </div>
                <div className="toggle-group">
                  <span>Password</span>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Optional password"
                  />
                </div>
              </div>
            )}

            <div
              className={`dropzone ${dragActive ? 'dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                handleFiles(e.dataTransfer.files)
              }}
            >
              <UploadCloud size={32} />
              <p>Drag & drop files here</p>
              <span>PNG, PDF, ZIP, MP4, code files, or any document</span>
              <label className="upload-label">
                Upload any file
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </label>
            </div>

            <div className="action-row">
              <button className="primary-btn" onClick={uploadContent} disabled={isUploading}>
                <UploadCloud size={16} />
                {isUploading ? 'Uploading...' : 'Upload now'}
              </button>
              <button className="secondary-btn" onClick={() => setSelectedFiles([])}>
                <FolderPlus size={16} />
                Clear files
              </button>
              <button
                className="secondary-btn"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    setTextContent(text)
                    showToast('Clipboard text loaded.', 'info')
                  } catch {
                    showToast('Clipboard access denied.', 'error')
                  }
                }}
              >
                <ClipboardPaste size={16} />
                Paste text
              </button>
            </div>

            <div className="selected-meta">
              {selectedFiles.length > 0 ? (
                <>
                  <div>
                    <strong>{selectedFiles[0].name}</strong>
                    <span>{formatBytes(totalFileSize)}</span>
                  </div>
                  <span>{selectedFiles.length} file(s)</span>
                </>
              ) : (
                <div>
                  <strong>No file selected</strong>
                  <span>Text sharing available below</span>
                </div>
              )}
            </div>

            <div className="editor-panel">
              <div className="editor-toolbar">
                <span>Text editor</span>
                <button onClick={() => copyToClipboard(textContent)}>
                  <Copy size={14} />
                  Copy
                </button>
              </div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste clipboard content, notes, code, or long-form text..."
              />
            </div>

            <div className="progress-panel">
              <div className="progress-meta">
                <span>{uploadStatus}</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="panel retrieve-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="panel-header">
              <div>
                <p className="eyebrow">Retrieve clips</p>
                <h2>Access shared content</h2>
              </div>
              <button className="ghost-btn" onClick={() => setPinInput('')}>
                Clear
              </button>
            </div>

            <div className="retrieve-controls">
              <div className="pin-input-wrap">
                <KeyRound size={18} />
                <input
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter PIN"
                />
              </div>
              <button className="primary-btn" onClick={retrieveContent}>
                <Eye size={16} />
                Retrieve
              </button>
            </div>

            <div className="password-wrap">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Optional password"
              />
            </div>

            <div className="info-row">
              <span>
                <Clock3 size={14} />
                Expires {formatExpiration(expiration)}
              </span>
              <span>
                <ShieldCheck size={14} />
                Secure retrieval
              </span>
            </div>

            {retrievalError && <div className="error-pill">{retrievalError}</div>}

            <div className="preview-card">
              {retrievedItem?.type === 'text' && retrievedItem.text ? (
                <>
                  <div className="preview-top">
                    <span>Text preview</span>
                    <button onClick={() => copyToClipboard(retrievedItem.text || '')}>
                      <Copy size={14} />
                    </button>
                  </div>
                  <pre>{retrievedItem.text}</pre>
                </>
              ) : retrievedItem?.files?.[0] && previewUrl && retrievedItem.files[0].mimeType.startsWith('image/') ? (
                <>
                  <div className="preview-top">
                    <span>Image preview</span>
                    <button onClick={downloadCurrentFile}>
                      <Download size={14} />
                    </button>
                  </div>
                  <img src={previewUrl} alt={retrievedItem.files[0].name} />
                </>
              ) : retrievedItem?.files?.[0] && previewUrl && retrievedItem.files[0].mimeType.startsWith('video/') ? (
                <>
                  <div className="preview-top">
                    <span>Video preview</span>
                    <button onClick={downloadCurrentFile}>
                      <Download size={14} />
                    </button>
                  </div>
                  <video controls src={previewUrl} />
                </>
              ) : retrievedItem?.files?.[0] ? (
                <>
                  <div className="preview-top">
                    <span>File preview</span>
                    <button onClick={downloadCurrentFile}>
                      <Download size={14} />
                    </button>
                  </div>
                  <div className="file-preview-box">
                    <FileText size={40} />
                    <div>
                      <strong>{retrievedItem.files[0].name}</strong>
                      <span>{formatBytes(retrievedItem.files[0].size)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-preview">
                  <HardDrive size={36} />
                  <span>No content retrieved yet</span>
                </div>
              )}
            </div>

            <div className="stats-grid">
              <div>
                <strong>{stats.uploads}</strong>
                <span>Total uploads</span>
              </div>
              <div>
                <strong>{stats.active}</strong>
                <span>Active files</span>
              </div>
              <div>
                <strong>{formatBytes(stats.storage)}</strong>
                <span>Storage used</span>
              </div>
              <div>
                <strong>{stats.downloads}</strong>
                <span>Downloads</span>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="bottom-grid">
          <div className="panel small-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h3>Recent PINs</h3>
              </div>
            </div>
            <div className="recent-list">
              {recentPins.length ? (
                recentPins.map((pin) => (
                  <button key={pin} onClick={() => setPinInput(pin)}>
                    <span>{pin}</span>
                    <Copy size={14} />
                  </button>
                ))
              ) : (
                <div className="empty-preview small">
                  <CheckCircle2 size={18} />
                  <span>No recent pins yet</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel small-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Local clipboard</p>
                <h3>Recent snippets</h3>
              </div>
            </div>
            <div className="snippet-list">
              <button onClick={() => setTextContent('const apiKey = ...')}>
                <CodeSnippet />
                const apiKey = ...
              </button>
              <button onClick={() => setTextContent('Meeting notes\n- review roadmap\n- share timeline')}>
                <CodeSnippet />
                Meeting notes
              </button>
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showPinModal && generatedPin && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pin-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button className="modal-close" onClick={() => setShowPinModal(false)}>
                <X size={16} />
              </button>
              <div className="modal-pin">{generatedPin}</div>
              <div className="modal-actions">
                <button onClick={() => copyToClipboard(generatedPin)}>
                  <Copy size={16} />
                  Copy PIN
                </button>
                <button onClick={() => setShowPinModal(false)}>
                  Close
                </button>
              </div>
              <div className="qr-wrap">
                <QRCode value={generatedPin} size={140} />
              </div>
              <div className="modal-footer">
                <span>
                  <Clock3 size={14} />
                  Expires {formatExpiration(expiration)}
                </span>
                <button onClick={() => showToast('Share intent ready.', 'info')}>
                  <QrCode size={14} />
                  Share
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast ${toast.tone}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CodeSnippet() {
  return <ImageIcon size={14} />
}

export default App
