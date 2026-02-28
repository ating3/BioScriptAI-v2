import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Zap, FileText, Quote, Bookmark, BookmarkCheck,
  Send, Image, X, ChevronDown, Layers, Target, AlertCircle,
  Copy, Check, Loader2, Microscope, Atom, Leaf, Brain, Dna, Globe,
  Folder, FolderOpen, FolderPlus, Inbox, ScanSearch,
} from 'lucide-react'
import useStore from '../store/useStore'
import { generateBibTeX, generateAPA } from '../lib/utils'

const SOURCE_CONFIG = {
  pubmed: { label: 'PubMed', color: '#2563EB', icon: Microscope },
  arxiv: { label: 'arXiv', color: '#B91C1C', icon: Atom },
  nature: { label: 'Nature', color: '#15803D', icon: Leaf },
  science: { label: 'Science', color: '#7C3AED', icon: Brain },
  cell: { label: 'Cell', color: '#D97706', icon: Dna },
  biorxiv: { label: 'bioRxiv', color: '#0891B2', icon: Dna },
  medrxiv: { label: 'medRxiv', color: '#0891B2', icon: Microscope },
  unknown: { label: 'Web', color: '#6B7280', icon: Globe },
}

function SourceBadge({ source }) {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: config.color + '18', color: config.color, fontSize: 10 }}
    >
      <config.icon size={9} />
      {config.label}
    </span>
  )
}

function ActionPill({ icon: Icon, label, onClick, active, color }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
      style={{
        borderColor: active ? color : '#E5E7EB',
        background: active ? color + '12' : 'transparent',
        color: active ? color : '#6B7280',
      }}
    >
      <Icon size={11} />
      {label}
    </motion.button>
  )
}

function SummaryPanel({ paper, isDark }) {
  const { apiKey, researchInterest, currentSection, viewportText, deepResearch } = useStore()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const generateSummary = async () => {
    if (!apiKey) {
      setSummary({ error: 'No API key configured. Go to Settings to add your OpenAI key.' })
      return
    }
    setLoading(true)
    const systemPrompt = `You are Bioscript, an expert academic research assistant. 
${researchInterest ? `The user's research focus is: ${researchInterest}. Highlight gaps and evidence relevant to this field.` : ''}
Always structure summaries with exactly these 4 sections: **Objective**, **Methodology**, **Results**, **Limitations**.
Be concise, precise, and scientifically rigorous.`

    const userMsg = `Summarize this paper:
Title: ${paper.title}
Authors: ${(paper.authors || []).join(', ')}
Abstract: ${paper.abstract || 'Not available'}
Current section being read: ${currentSection}
${viewportText ? `Visible text: ${viewportText.slice(0, 800)}` : ''}`

    try {
      const response = await new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'CALL_LLM',
            payload: {
              apiKey,
              model: deepResearch ? 'gpt-4o' : 'gpt-4o-mini',
              systemPrompt,
              messages: [{ role: 'user', content: userMsg }],
            },
          }, (res) => {
            if (res?.success) resolve(res.data)
            else reject(new Error(res?.error || 'LLM call failed'))
          })
        } else {
          reject(new Error('Chrome runtime not available'))
        }
      })
      setSummary({ text: response })
    } catch (err) {
      setSummary({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (!summary && !loading) {
    return (
      <button
        onClick={generateSummary}
        className="w-full py-2 rounded-lg text-xs font-medium transition-colors"
        style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
      >
        Generate 4-Point Summary
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 justify-center">
        <Loader2 size={14} className="animate-spin" style={{ color: '#2563EB' }} />
        <span className="text-xs" style={{ color: '#6B7280' }}>
          {deepResearch ? 'Deep Research mode…' : 'Summarizing…'}
        </span>
      </div>
    )
  }

  if (summary?.error) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <AlertCircle size={13} style={{ color: '#B91C1C', marginTop: 1 }} />
        <p className="text-xs" style={{ color: '#B91C1C' }}>{summary.error}</p>
      </div>
    )
  }

  return (
    <div
      className="p-3 rounded-lg text-xs leading-relaxed"
      style={{
        background: isDark ? '#111111' : '#F9FAFB',
        border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
        color: isDark ? '#D1D5DB' : '#374151',
        whiteSpace: 'pre-wrap',
      }}
    >
      {summary.text}
    </div>
  )
}

// ─── Figure Picker Sheet ────────────────────────────────────────────────────
function FigurePickerSheet({ isDark, figures, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#111111' : '#FFFFFF',
          border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b" style={{ borderColor: isDark ? '#1F2937' : '#F3F4F6' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>Explain a figure</p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{figures.length} figure{figures.length !== 1 ? 's' : ''} detected on screen</p>
          </div>
          <button onClick={onClose} style={{ color: '#9CA3AF' }}><X size={14} /></button>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {figures.map((fig, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(fig)}
              className="rounded-xl overflow-hidden border text-left transition-colors"
              style={{ borderColor: isDark ? '#1F2937' : '#E5E7EB' }}
            >
              <img
                src={fig.base64}
                alt={fig.alt || `Figure ${i + 1}`}
                className="w-full object-cover"
                style={{ height: 80 }}
              />
              {(fig.caption || fig.alt) && (
                <p
                  className="px-2 py-1.5 text-xs leading-tight"
                  style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 }}
                >
                  {(fig.caption || fig.alt).slice(0, 80)}{(fig.caption || fig.alt).length > 80 ? '…' : ''}
                </p>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ChatInterface({ paper, isDark }) {
  const { apiKey, chatMessages, addChatMessage, researchInterest, currentSection, viewportText, deepResearch } = useStore()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [attachedImage, setAttachedImage] = useState(null)
  const [capturedFigures, setCapturedFigures] = useState(null)
  const [capturingFigures, setCapturingFigures] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const messages = chatMessages[paper?.id] || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim() && !attachedImage) return
    if (!apiKey) {
      addChatMessage(paper.id, {
        role: 'assistant',
        content: 'Please add your OpenAI API key in Settings to use the chat.',
        timestamp: Date.now(),
      })
      return
    }

    const userMsg = {
      role: 'user',
      content: attachedImage
        ? [
            { type: 'text', text: input || 'What does this image show?' },
            { type: 'image_url', image_url: { url: attachedImage } },
          ]
        : input,
      timestamp: Date.now(),
      image: attachedImage,
    }

    addChatMessage(paper.id, userMsg)
    setInput('')
    setAttachedImage(null)
    setIsLoading(true)
    setTimeout(scrollToBottom, 50)

    const systemPrompt = `You are Bioscript, an expert academic research assistant analyzing a scientific paper.
Paper: "${paper.title}" by ${(paper.authors || []).slice(0, 3).join(', ')}
${paper.abstract ? `Abstract: ${paper.abstract.slice(0, 500)}` : ''}
Current section: ${currentSection}
${viewportText ? `Visible content: ${viewportText.slice(0, 600)}` : ''}
${researchInterest ? `User's research focus: ${researchInterest}` : ''}
Be precise, cite specific parts of the paper when possible, and flag limitations.`

    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.content,
    }))

    try {
      const response = await new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'CALL_LLM',
            payload: {
              apiKey,
              model: deepResearch ? 'gpt-4o' : 'gpt-4o-mini',
              systemPrompt,
              messages: [...history, { role: 'user', content: userMsg.content }],
            },
          }, (res) => {
            if (res?.success) resolve(res.data)
            else reject(new Error(res?.error || 'LLM call failed'))
          })
        } else {
          reject(new Error('Chrome runtime not available in dev mode'))
        }
      })

      addChatMessage(paper.id, {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      })
    } catch (err) {
      addChatMessage(paper.id, {
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: Date.now(),
        isError: true,
      })
    } finally {
      setIsLoading(false)
      setTimeout(scrollToBottom, 50)
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setAttachedImage(ev.target.result)
      reader.readAsDataURL(file)
    }
  }, [])

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setAttachedImage(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleCaptureFigures = () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
    setCapturingFigures(true)
    chrome.runtime.sendMessage({ type: 'CAPTURE_VIEWPORT_FIGURES' }, (response) => {
      setCapturingFigures(false)
      if (chrome.runtime.lastError) return
      if (response?.success && response.figures?.length > 0) {
        if (response.figures.length === 1) {
          // Only one figure — attach it directly
          setAttachedImage(response.figures[0].base64)
          const cap = response.figures[0].caption || response.figures[0].alt
          if (cap) setInput((prev) => prev || `Explain this figure: ${cap.slice(0, 120)}`)
        } else {
          setCapturedFigures(response.figures)
        }
      } else {
        addChatMessage(paper.id, {
          role: 'assistant',
          content: 'No figures were detected in the current viewport. Try scrolling to a figure first.',
          timestamp: Date.now(),
        })
      }
    })
  }

  const handleFigureSelect = (fig) => {
    setCapturedFigures(null)
    setAttachedImage(fig.base64)
    const label = fig.caption || fig.alt
    if (label) setInput((prev) => prev || `Explain this figure: ${label.slice(0, 120)}`)
    else setInput((prev) => prev || 'Explain this figure.')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#EFF6FF' }}
            >
              <Zap size={18} style={{ color: '#2563EB' }} />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
                Ask anything about this paper
              </p>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                Methodology, statistics, limitations, implications…
              </p>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              {[
                'What are the key limitations?',
                'Explain the methodology',
                'What evidence supports the main claim?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-left px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{
                    background: isDark ? '#111111' : '#F3F4F6',
                    color: isDark ? '#D1D5DB' : '#374151',
                    border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
              style={{
                background: msg.role === 'user'
                  ? '#2563EB'
                  : msg.isError
                  ? '#FEF2F2'
                  : isDark ? '#1A1A1A' : '#FFFFFF',
                color: msg.role === 'user'
                  ? 'white'
                  : msg.isError
                  ? '#B91C1C'
                  : isDark ? '#D1D5DB' : '#374151',
                border: msg.role === 'assistant' ? `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}` : 'none',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Attached"
                  className="w-full rounded-lg mb-2 object-cover"
                  style={{ maxHeight: 120 }}
                />
              )}
              {typeof msg.content === 'string' ? msg.content : msg.content?.[0]?.text || ''}
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 rounded-xl flex items-center gap-2"
              style={{
                background: isDark ? '#1A1A1A' : '#FFFFFF',
                border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
              }}
            >
              <Loader2 size={12} className="animate-spin" style={{ color: '#2563EB' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>Thinking…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image preview */}
      {attachedImage && (
        <div className="px-3 pb-2">
          <div className="relative inline-block">
            <img src={attachedImage} alt="Attached" className="h-16 rounded-lg object-cover" />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#111827', color: 'white' }}
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Figure picker sheet */}
      <AnimatePresence>
        {capturedFigures && (
          <FigurePickerSheet
            isDark={isDark}
            figures={capturedFigures}
            onSelect={handleFigureSelect}
            onClose={() => setCapturedFigures(null)}
          />
        )}
      </AnimatePresence>

      {/* Input */}
      <div
        className="p-3 border-t"
        style={{ borderColor: isDark ? '#1F2937' : '#E5E7EB' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div
          className="flex items-end gap-2 px-3 py-2 rounded-xl border transition-all"
          style={{
            background: isDark ? '#111111' : '#FFFFFF',
            borderColor: dragOver ? '#2563EB' : isDark ? '#1F2937' : '#E5E7EB',
            boxShadow: dragOver ? '0 0 0 3px #2563EB20' : 'none',
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={dragOver ? 'Drop image here…' : 'Ask about this paper… (⌘↵ to send)'}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-xs leading-relaxed"
            style={{
              color: isDark ? '#F9FAFB' : '#111827',
              maxHeight: 80,
              fontSize: 12,
            }}
          />
          <div className="flex items-center gap-1 pb-0.5">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            <button
              onClick={handleCaptureFigures}
              disabled={capturingFigures}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: capturingFigures ? '#2563EB' : '#9CA3AF' }}
              title="Explain a figure on screen"
            >
              {capturingFigures
                ? <Loader2 size={13} className="animate-spin" />
                : <ScanSearch size={13} />}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: '#9CA3AF' }}
              title="Attach image from file"
            >
              <Image size={13} />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() && !attachedImage}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: input.trim() || attachedImage ? '#2563EB' : isDark ? '#1F2937' : '#F3F4F6',
                color: input.trim() || attachedImage ? 'white' : '#9CA3AF',
              }}
            >
              <Send size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CitationPanel({ paper, isDark }) {
  const [copied, setCopied] = useState(null)

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const bibtex = generateBibTeX(paper)
  const apa = generateAPA(paper)

  return (
    <div className="space-y-3">
      {[
        { label: 'BibTeX', content: bibtex, type: 'bibtex' },
        { label: 'APA', content: apa, type: 'apa' },
      ].map(({ label, content, type }) => (
        <div key={type}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>{label}</span>
            <button
              onClick={() => copyText(content, type)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
              style={{
                background: copied === type ? '#F0FDF4' : isDark ? '#1F2937' : '#F3F4F6',
                color: copied === type ? '#15803D' : '#6B7280',
              }}
            >
              {copied === type ? <Check size={10} /> : <Copy size={10} />}
              {copied === type ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre
            className="p-2.5 rounded-lg text-xs overflow-x-auto scrollbar-thin"
            style={{
              background: isDark ? '#111111' : '#F9FAFB',
              border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
              color: isDark ? '#D1D5DB' : '#374151',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 10,
            }}
          >
            {content}
          </pre>
        </div>
      ))}
    </div>
  )
}

// ─── Folder Picker Modal ────────────────────────────────────────────────────
function FolderPickerModal({ isDark, paper, onClose }) {
  const { folders, addFolder, addToCollection, collections } = useStore()
  const isSaved = collections.some((p) => p.id === paper.id)
  const savedPaper = collections.find((p) => p.id === paper.id)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [creating, setCreating] = useState(false)

  const FOLDER_COLORS = [
    '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
    '#D97706', '#15803D', '#0891B2', '#9CA3AF',
  ]
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0])

  const selectFolder = (folderId) => {
    addToCollection(paper, folderId)
    onClose()
  }

  const createAndSave = (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setCreating(true)
    const id = `folder-${Date.now()}`
    useStore.setState((s) => ({
      folders: [...s.folders, { id, name: newFolderName.trim(), color: newFolderColor, createdAt: new Date().toISOString() }],
    }))
    addToCollection(paper, id)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#111111' : '#FFFFFF',
          border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: isDark ? '#1F2937' : '#F3F4F6' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
              Save to folder
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF', maxWidth: 260 }}>
              {paper.title || 'Untitled Paper'}
            </p>
          </div>
          <button onClick={onClose} style={{ color: '#9CA3AF' }}><X size={14} /></button>
        </div>

        {/* Folder list */}
        <div className="p-2 max-h-52 overflow-y-auto">
          {/* Unsorted option */}
          <button
            onClick={() => selectFolder(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors"
            style={{
              background: savedPaper?.folderId == null && isSaved ? (isDark ? '#0f1f3d' : '#EFF6FF') : 'transparent',
            }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
              <Inbox size={13} style={{ color: '#9CA3AF' }} />
            </div>
            <span className="flex-1 text-sm" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>Unsorted</span>
            {savedPaper?.folderId == null && isSaved && <Check size={13} style={{ color: '#2563EB' }} />}
          </button>

          {/* User folders */}
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => selectFolder(f.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors"
              style={{
                background: savedPaper?.folderId === f.id ? (isDark ? '#0f1f3d' : '#EFF6FF') : 'transparent',
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: f.color + '22' }}
              >
                <Folder size={13} style={{ color: f.color }} />
              </div>
              <span className="flex-1 text-sm" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>{f.name}</span>
              {savedPaper?.folderId === f.id && <Check size={13} style={{ color: f.color }} />}
            </button>
          ))}

          {/* New folder inline form */}
          {showNewFolder ? (
            <form onSubmit={createAndSave} className="mt-1 px-2">
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name…"
                className="w-full px-3 py-2 rounded-xl border outline-none text-sm mb-2"
                style={{
                  background: isDark ? '#0D0D0D' : '#F9FAFB',
                  borderColor: isDark ? '#1F2937' : '#E5E7EB',
                  color: isDark ? '#F9FAFB' : '#111827',
                  fontSize: 12,
                }}
              />
              <div className="flex gap-1.5 mb-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewFolderColor(c)}
                    className="w-5 h-5 rounded-full transition-all"
                    style={{
                      background: c,
                      outline: newFolderColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: newFolderColor, color: 'white' }}
                >
                  Create & Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFolder(false)}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: isDark ? '#1F2937' : '#F3F4F6', color: '#6B7280' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left mt-1"
              style={{ color: '#9CA3AF' }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
                <FolderPlus size={13} style={{ color: '#9CA3AF' }} />
              </div>
              <span className="text-sm">New folder…</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ActivePaperView() {
  const { theme, activePaper, addToCollection, collections, currentSection, deepResearch, toggleDeepResearch } = useStore()
  const isDark = theme === 'dark'
  const [activePanel, setActivePanel] = useState('chat')
  const [showSummary, setShowSummary] = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)

  if (!activePaper) {
    return (
      <div
        className="flex flex-col h-full overflow-y-auto scrollbar-thin"
        style={{ background: isDark ? '#0D0D0D' : '#F9FAFB' }}
      >
        <div className="p-4 space-y-4">
          {/* Main notice */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border p-4"
            style={{
              background: isDark ? '#111111' : '#FFFFFF',
              borderColor: isDark ? '#1F2937' : '#E5E7EB',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)' }}
              >
                <BookOpen size={18} style={{ color: '#2563EB' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
                  No paper detected
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6B7280' }}>
                  Navigate to any academic paper and Bioscript will automatically detect it and populate this tab.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Supported sources */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#9CA3AF', fontSize: 10 }}>
              Supported Sources
            </p>
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: isDark ? '#111111' : '#FFFFFF',
                borderColor: isDark ? '#1F2937' : '#E5E7EB',
              }}
            >
              {[
                { label: 'PubMed', url: 'pubmed.ncbi.nlm.nih.gov', color: '#2563EB' },
                { label: 'arXiv', url: 'arxiv.org', color: '#B91C1C' },
                { label: 'Nature', url: 'nature.com', color: '#15803D' },
                { label: 'bioRxiv / medRxiv', url: 'biorxiv.org', color: '#0891B2' },
                { label: 'Science', url: 'science.org', color: '#7C3AED' },
                { label: 'PLOS ONE', url: 'journals.plos.org', color: '#D97706' },
              ].map((src, i, arr) => (
                <div
                  key={src.label}
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{
                    borderBottom: i < arr.length - 1 ? `1px solid ${isDark ? '#1A1A1A' : '#F3F4F6'}` : 'none',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: src.color }}
                    />
                    <span className="text-xs font-medium" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>
                      {src.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{src.url}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#9CA3AF', fontSize: 10 }}>
              How It Works
            </p>
            <div className="space-y-2">
              {[
                { step: '1', text: 'Open any paper from a supported source above' },
                { step: '2', text: 'Bioscript detects the paper and extracts metadata automatically' },
                { step: '3', text: 'Return here to chat, summarize, and cite the paper' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
                    style={{
                      background: isDark ? '#1F2937' : '#F3F4F6',
                      color: '#2563EB',
                      fontSize: 10,
                      marginTop: 1,
                    }}
                  >
                    {step}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tip */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.24 }}
            className="p-3 rounded-xl border"
            style={{
              background: isDark ? '#0f1f3d' : '#EFF6FF',
              borderColor: isDark ? '#1e3a5f' : '#BFDBFE',
            }}
          >
            <p style={{ fontSize: 11, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 1.5 }}>
              <strong>Tip:</strong> You can also use the <strong>Discover</strong> tab to search databases and open papers directly — Bioscript will detect them automatically.
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  const isSaved = collections.some((p) => p.id === activePaper.id)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AnimatePresence>
        {showFolderPicker && (
          <FolderPickerModal
            isDark={isDark}
            paper={activePaper}
            onClose={() => setShowFolderPicker(false)}
          />
        )}
      </AnimatePresence>
      {/* Paper Header */}
      <div
        className="px-4 py-3 border-b"
        style={{
          background: isDark ? '#111111' : '#FFFFFF',
          borderColor: isDark ? '#1F2937' : '#E5E7EB',
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <SourceBadge source={activePaper.source} />
              {currentSection && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background: isDark ? '#1F2937' : '#F3F4F6',
                    color: '#9CA3AF',
                    fontSize: 10,
                  }}
                >
                  § {currentSection}
                </span>
              )}
            </div>
            <h2
              className="font-semibold leading-tight line-clamp-2"
              style={{ fontSize: 13, color: isDark ? '#F9FAFB' : '#111827' }}
            >
              {activePaper.title || 'Untitled Paper'}
            </h2>
            {activePaper.authors?.length > 0 && (
              <p className="mt-1 text-xs truncate" style={{ color: '#9CA3AF' }}>
                {activePaper.authors.slice(0, 3).join(', ')}
                {activePaper.authors.length > 3 ? ` +${activePaper.authors.length - 3} more` : ''}
                {activePaper.year ? ` · ${activePaper.year}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowFolderPicker(true)}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: isSaved ? '#EFF6FF' : isDark ? '#1F2937' : '#F3F4F6',
              color: isSaved ? '#2563EB' : '#9CA3AF',
            }}
            title={isSaved ? 'Move to folder' : 'Save to folder'}
          >
            {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <ActionPill
            icon={FileText}
            label="Summary"
            onClick={() => setShowSummary(!showSummary)}
            active={showSummary}
            color="#2563EB"
          />
          <ActionPill
            icon={Quote}
            label="Cite"
            onClick={() => setActivePanel(activePanel === 'cite' ? 'chat' : 'cite')}
            active={activePanel === 'cite'}
            color="#7C3AED"
          />
          <ActionPill
            icon={Target}
            label="Key Evidence"
            onClick={() => setActivePanel('chat')}
            active={false}
            color="#15803D"
          />
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#9CA3AF', fontSize: 10 }}>Deep</span>
            <button
              onClick={toggleDeepResearch}
              className="relative w-8 h-4 rounded-full transition-colors"
              style={{ background: deepResearch ? '#7C3AED' : isDark ? '#374151' : '#D1D5DB' }}
            >
              <motion.div
                animate={{ x: deepResearch ? 16 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
              />
            </button>
          </div>
        </div>

        {/* Summary Panel */}
        <AnimatePresence>
          {showSummary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mt-3"
            >
              <SummaryPanel paper={activePaper} isDark={isDark} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activePanel === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ChatInterface paper={activePaper} isDark={isDark} />
            </motion.div>
          ) : (
            <motion.div
              key="cite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto scrollbar-thin p-4"
            >
              <CitationPanel paper={activePaper} isDark={isDark} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
