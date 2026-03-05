import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive, Search, Trash2, Copy, Check, ExternalLink,
  FileText, Loader2, FolderOpen, Folder, FolderPlus,
  FileCode, Quote, Sparkles, FileCheck, MoreHorizontal,
  Pencil, X, ChevronRight, Inbox, BookmarkCheck,
  Link2, Unlink, LogIn, AlertCircle,
} from 'lucide-react'
import useStore from '../store/useStore'
import { generateBibTeX, generateAPA, truncate } from '../lib/utils'
import { syncCitationsToDoc, createGoogleDoc, getDocMetadata, parseDocId } from '../lib/googleDocs'

const FOLDER_COLORS = [
  '#2563EB', '#2563EB', '#2563EB', '#2563EB',
  '#2563EB', '#1D4ED8', '#0891B2', '#9CA3AF',
]

// ─── Create/Rename Folder Modal ────────────────────────────────────────────
function FolderFormModal({ isDark, initial, onConfirm, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || FOLDER_COLORS[0])

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onConfirm(name.trim(), color)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#252525' : '#FFFFFF',
          border: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit}>
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-3" style={{ color: isDark ? '#E2E8F0' : '#111827' }}>
              {initial ? 'Rename Folder' : 'New Folder'}
            </h3>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name…"
              className="w-full px-3 py-2 rounded-xl border outline-none text-sm mb-3"
              style={{
                background: isDark ? '#1E1E1E' : '#F9FAFB',
                borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
                color: isDark ? '#E2E8F0' : '#111827',
              }}
            />
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: color, color: 'white' }}
            >
              {initial ? 'Save' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: isDark ? '#3A3A3A' : '#F3F4F6', color: isDark ? '#CBD5E1' : '#4A4A4A' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Bibliography Modal ─────────────────────────────────────────────────────
function GenerateBibliographyModal({ papers, isDark, onClose, linkedDoc, googleToken }) {
  const [format, setFormat] = useState(linkedDoc?.citationFormat || 'apa')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null) // 'success' | 'error'
  const [exportError, setExportError] = useState('')

  const bibliography = papers
    .map((p) => format === 'bibtex' ? generateBibTeX(p) : generateAPA(p))
    .join(format === 'bibtex' ? '\n\n' : '\n')

  const copy = () => {
    navigator.clipboard.writeText(bibliography)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportToDoc = async () => {
    if (!linkedDoc?.googleDocId || !googleToken) return
    setExporting(true)
    setExportResult(null)
    setExportError('')
    try {
      const citations = papers.map((p) => format === 'bibtex' ? generateBibTeX(p) : generateAPA(p))
      await appendCitationsToDoc(googleToken, linkedDoc.googleDocId, linkedDoc.name, citations)
      setExportResult('success')
      setTimeout(() => setExportResult(null), 3000)
    } catch (err) {
      setExportResult('error')
      setExportError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#252525' : '#FFFFFF',
          border: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
          maxHeight: '70vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: isDark ? '#3A3A3A' : '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm" style={{ color: isDark ? '#E2E8F0' : '#111827' }}>
              Generate Bibliography
            </h3>
            <div className="flex gap-1">
              {['bibtex', 'apa'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: format === f ? '#2563EB' : isDark ? '#3A3A3A' : '#F3F4F6',
                    color: format === f ? 'white' : '#6B7280',
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            {papers.length} paper{papers.length !== 1 ? 's' : ''} selected
          </p>
          {linkedDoc?.googleDocId && (
            <div
              className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg"
              style={{ background: isDark ? '#1e3a5f' : '#EFF6FF' }}
            >
              <Link2 size={9} style={{ color: '#1D4ED8', flexShrink: 0 }} />
              <p className="truncate flex-1" style={{ fontSize: 10, color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                Linked: {linkedDoc.googleDocTitle || linkedDoc.name}
              </p>
              <a
                href={linkedDoc.googleDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1D4ED8', flexShrink: 0 }}
              >
                <ExternalLink size={9} />
              </a>
            </div>
          )}
        </div>
        <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 220 }}>
          <pre
            className="p-4 text-xs"
            style={{
              color: isDark ? '#CBD5E1' : '#4A4A4A',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 10,
            }}
          >
            {bibliography}
          </pre>
        </div>
        {exportResult === 'error' && (
          <div className="px-4 pb-2">
            <p style={{ fontSize: 10, color: '#2563EB' }}>{exportError}</p>
          </div>
        )}
        <div className="p-4 border-t flex gap-2 flex-wrap" style={{ borderColor: isDark ? '#3A3A3A' : '#E5E7EB' }}>
          {linkedDoc?.googleDocId && googleToken && (
            <button
              onClick={exportToDoc}
              disabled={exporting}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors flex-shrink-0"
              style={{
                background: exportResult === 'success' ? '#EFF6FF' : isDark ? '#1e3a5f' : '#EFF6FF',
                color: exportResult === 'success' ? '#1D4ED8' : '#1D4ED8',
                border: `1px solid ${isDark ? '#1e3a5f' : '#BFDBFE'}`,
                opacity: exporting ? 0.7 : 1,
              }}
            >
              {exporting
                ? <Loader2 size={11} className="animate-spin" />
                : exportResult === 'success'
                ? <Check size={11} />
                : <Link2 size={11} />}
              {exporting ? 'Exporting…' : exportResult === 'success' ? 'Exported!' : 'Export to Doc'}
            </button>
          )}
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: copied ? '#EFF6FF' : '#2563EB', color: copied ? '#1D4ED8' : 'white' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: isDark ? '#3A3A3A' : '#F3F4F6', color: isDark ? '#CBD5E1' : '#4A4A4A' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Single Paper Citation Modal ───────────────────────────────────────────
function SinglePaperCitationModal({ paper, isDark, onClose, linkedDoc, googleToken }) {
  const [format, setFormat] = useState(linkedDoc?.citationFormat || 'apa')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)
  const [exportError, setExportError] = useState('')

  const citation = format === 'bibtex' ? generateBibTeX(paper) : generateAPA(paper)

  const copy = () => {
    navigator.clipboard.writeText(citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportToDoc = async () => {
    if (!linkedDoc?.googleDocId || !googleToken) return
    setExporting(true)
    setExportResult(null)
    setExportError('')
    try {
      await appendCitationsToDoc(googleToken, linkedDoc.googleDocId, linkedDoc.name, [citation])
      setExportResult('success')
      setTimeout(() => setExportResult(null), 3000)
    } catch (err) {
      setExportResult('error')
      setExportError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#252525' : '#FFFFFF',
          border: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
          maxHeight: '70vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: isDark ? '#3A3A3A' : '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm" style={{ color: isDark ? '#E2E8F0' : '#111827' }}>
              Citation
            </h3>
            <div className="flex gap-1">
              {['bibtex', 'apa'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: format === f ? '#2563EB' : isDark ? '#3A3A3A' : '#F3F4F6',
                    color: format === f ? 'white' : '#6B7280',
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs mt-1 truncate" style={{ color: '#9CA3AF' }}>
            {paper.title || 'Untitled'}
          </p>
          {linkedDoc?.googleDocId && (
            <div
              className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg"
              style={{ background: isDark ? '#1e3a5f' : '#EFF6FF' }}
            >
              <Link2 size={9} style={{ color: '#1D4ED8', flexShrink: 0 }} />
              <p className="truncate flex-1" style={{ fontSize: 10, color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                Linked: {linkedDoc.googleDocTitle || linkedDoc.name}
              </p>
              <a
                href={linkedDoc.googleDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1D4ED8', flexShrink: 0 }}
              >
                <ExternalLink size={9} />
              </a>
            </div>
          )}
        </div>
        <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 220 }}>
          <pre
            className="p-4 text-xs"
            style={{
              color: isDark ? '#CBD5E1' : '#4A4A4A',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 10,
            }}
          >
            {citation}
          </pre>
        </div>
        {exportResult === 'error' && (
          <div className="px-4 pb-2">
            <p style={{ fontSize: 10, color: '#2563EB' }}>{exportError}</p>
          </div>
        )}
        <div className="p-4 border-t flex gap-2 flex-wrap" style={{ borderColor: isDark ? '#3A3A3A' : '#E5E7EB' }}>
          {linkedDoc?.googleDocId && googleToken && (
            <button
              onClick={exportToDoc}
              disabled={exporting}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors flex-shrink-0"
              style={{
                background: exportResult === 'success' ? '#EFF6FF' : isDark ? '#1e3a5f' : '#EFF6FF',
                color: '#1D4ED8',
                border: `1px solid ${isDark ? '#1e3a5f' : '#BFDBFE'}`,
                opacity: exporting ? 0.7 : 1,
              }}
            >
              {exporting
                ? <Loader2 size={11} className="animate-spin" />
                : exportResult === 'success'
                ? <Check size={11} />
                : <Link2 size={11} />}
              {exporting ? 'Exporting…' : exportResult === 'success' ? 'Exported!' : 'Export to Doc'}
            </button>
          )}
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: copied ? '#EFF6FF' : '#2563EB', color: copied ? '#1D4ED8' : 'white' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: isDark ? '#3A3A3A' : '#F3F4F6', color: isDark ? '#CBD5E1' : '#4A4A4A' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Paper Row ──────────────────────────────────────────────────────────────
function PaperRow({ paper, folders, isDark, onMove, onRemove, citationFormat, linkedDoc, googleToken }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showCiteModal, setShowCiteModal] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors relative"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#252525' : '#F9FAFB' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; setMenuOpen(false) }}
    >
      <FileText size={14} style={{ color: '#9CA3AF', marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p
          className="font-medium leading-snug"
          style={{ fontSize: 12, color: isDark ? '#E2E8F0' : '#111827' }}
        >
          {paper.title || 'Untitled'}
        </p>
        <p className="mt-0.5 truncate" style={{ fontSize: 10, color: '#9CA3AF' }}>
          {(paper.authors || []).slice(0, 2).join(', ')}
          {paper.year ? ` · ${paper.year}` : ''}
          {paper.source ? ` · ${paper.source}` : ''}
        </p>
      </div>
      <AnimatePresence>
        {showCiteModal && (
          <SinglePaperCitationModal
            paper={paper}
            isDark={isDark}
            linkedDoc={linkedDoc}
            googleToken={googleToken}
            onClose={() => setShowCiteModal(false)}
          />
        )}
      </AnimatePresence>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => setShowCiteModal(true)}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ color: '#9CA3AF' }}
          title="Get citation"
        >
          <Quote size={11} />
        </button>
        <button
          onClick={() => window.open(paper.url, '_blank')}
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ color: '#9CA3AF' }}
          title="Open paper"
        >
          <ExternalLink size={11} />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ color: '#9CA3AF' }}
            title="More options"
          >
            <MoreHorizontal size={11} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-7 z-50 rounded-xl shadow-lg overflow-hidden"
                style={{
                  background: isDark ? '#2E2E2E' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
                  minWidth: 160,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#9CA3AF', fontSize: 9 }}>
                    Move to folder
                  </p>
                  <button
                    onClick={() => { onMove(paper.id, null); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
                    style={{ fontSize: 11, color: paper.folderId == null ? '#2563EB' : (isDark ? '#CBD5E1' : '#4A4A4A') }}
                  >
                    <Inbox size={11} />
                    Unsorted
                    {paper.folderId == null && <Check size={10} className="ml-auto" />}
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { onMove(paper.id, f.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
                      style={{ fontSize: 11, color: paper.folderId === f.id ? f.color : (isDark ? '#CBD5E1' : '#4A4A4A') }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                      {f.name}
                      {paper.folderId === f.id && <Check size={10} className="ml-auto" />}
                    </button>
                  ))}
                </div>
                <div className="border-t p-1" style={{ borderColor: isDark ? '#3A3A3A' : '#F3F4F6' }}>
                  <button
                    onClick={() => { onRemove(paper.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
                    style={{ fontSize: 11, color: '#2563EB' }}
                  >
                    <Trash2 size={11} />
                    Remove from vault
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

const CITATION_FORMATS = [
  { id: 'apa', label: 'APA', description: 'Author, A. A. (Year). Title…' },
  { id: 'bibtex', label: 'BibTeX', description: '@article{key, author=…}' },
]

// ─── Link Google Doc Modal ─────────────────────────────────────────────────
function LinkDocModal({ folder, isDark, googleToken, googleUser, onLink, onClose }) {
  const [mode, setMode] = useState('new') // 'new' | 'existing'
  const [docInput, setDocInput] = useState('')
  const [citationFormat, setCitationFormat] = useState('apa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLink = async (e) => {
    e.preventDefault()
    if (!googleToken) return
    setLoading(true)
    setError('')
    try {
      let doc
      if (mode === 'new') {
        doc = await createGoogleDoc(googleToken, `${folder.name} – Bibliography`)
      } else {
        const docId = parseDocId(docInput)
        if (!docId) throw new Error('Invalid Google Doc URL or ID')
        doc = await getDocMetadata(googleToken, docId)
      }
      onLink(folder.id, doc.id, doc.title, doc.url, citationFormat)
      window.open(doc.url, '_blank')
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to link document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#252525' : '#FFFFFF',
          border: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleLink}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#1D4ED818' }}
              >
                <Link2 size={14} style={{ color: '#1D4ED8' }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: isDark ? '#E2E8F0' : '#111827' }}>
                  Link Google Doc
                </h3>
                <p style={{ fontSize: 10, color: '#9CA3AF' }}>
                  Citations from "{folder.name}" will auto-populate here
                </p>
              </div>
            </div>

            {!googleUser ? (
              <div
                className="flex items-start gap-2 p-3 rounded-xl"
                style={{ background: isDark ? '#2E2E2E' : '#EFF6FF', border: `1px solid ${isDark ? '#4A4A4A' : '#BFDBFE'}` }}
              >
                <AlertCircle size={13} style={{ color: '#2563EB', marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 10, color: isDark ? '#93C5FD' : '#1E40AF', lineHeight: 1.5 }}>
                  Sign in with Google first (Settings → Google Account) to link a Google Doc.
                </p>
              </div>
            ) : (
              <>
                {/* Doc source toggle */}
                <div className="flex gap-1 mb-3 p-0.5 rounded-lg" style={{ background: isDark ? '#3A3A3A' : '#F3F4F6' }}>
                  {[['new', 'Create new doc'], ['existing', 'Use existing doc']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMode(val)}
                      className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors"
                      style={{
                        background: mode === val ? (isDark ? '#4A4A4A' : '#FFFFFF') : 'transparent',
                        color: mode === val ? (isDark ? '#E2E8F0' : '#111827') : '#9CA3AF',
                        boxShadow: mode === val ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {mode === 'new' ? (
                  <div
                    className="p-3 rounded-xl mb-3"
                    style={{ background: isDark ? '#1e3a5f' : '#EFF6FF', border: `1px solid ${isDark ? '#1e3a5f' : '#BFDBFE'}` }}
                  >
                    <p style={{ fontSize: 10, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 1.5 }}>
                      A new Google Doc titled <strong>"{folder.name} – Bibliography"</strong> will be created in your Google Drive and opened automatically.
                    </p>
                  </div>
                ) : (
                  <div className="mb-3">
                    <p className="text-xs mb-1.5" style={{ color: isDark ? '#CBD5E1' : '#4A4A4A', fontSize: 10 }}>
                      Paste a Google Doc URL or document ID:
                    </p>
                    <input
                      autoFocus
                      type="text"
                      value={docInput}
                      onChange={(e) => setDocInput(e.target.value)}
                      placeholder="https://docs.google.com/document/d/…"
                      className="w-full px-3 py-2 rounded-xl border outline-none text-xs"
                      style={{
                        background: isDark ? '#1E1E1E' : '#F9FAFB',
                        borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
                        color: isDark ? '#E2E8F0' : '#111827',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                )}

                {/* Citation format selector */}
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: isDark ? '#CBD5E1' : '#4A4A4A', fontSize: 10 }}>
                    Citation format for this doc
                  </p>
                  <div className="flex gap-2">
                    {CITATION_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setCitationFormat(fmt.id)}
                        className="flex-1 flex flex-col items-start px-3 py-2 rounded-xl border transition-all"
                        style={{
                          background: citationFormat === fmt.id
                            ? (isDark ? '#0f1f3d' : '#EFF6FF')
                            : (isDark ? '#1E1E1E' : '#F9FAFB'),
                          borderColor: citationFormat === fmt.id ? '#2563EB' : (isDark ? '#3A3A3A' : '#E5E7EB'),
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                            style={{
                              borderColor: citationFormat === fmt.id ? '#2563EB' : '#9CA3AF',
                              background: citationFormat === fmt.id ? '#2563EB' : 'transparent',
                            }}
                          />
                          <span className="text-xs font-semibold" style={{ color: citationFormat === fmt.id ? '#2563EB' : (isDark ? '#E2E8F0' : '#111827') }}>
                            {fmt.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace', lineHeight: 1.3 }}>
                          {fmt.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="mt-2 text-xs" style={{ color: '#2563EB', fontSize: 10 }}>
                    {error}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="px-4 pb-4 flex gap-2">
            {googleUser && (
              <button
                type="submit"
                disabled={loading || (mode === 'existing' && !docInput.trim())}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: loading ? '#9CA3AF' : '#1D4ED8',
                  color: 'white',
                  opacity: (loading || (mode === 'existing' && !docInput.trim())) ? 0.6 : 1,
                }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                {loading ? 'Linking…' : mode === 'new' ? 'Create & Link' : 'Link Doc'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: isDark ? '#3A3A3A' : '#F3F4F6', color: isDark ? '#CBD5E1' : '#4A4A4A' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Main VaultView ─────────────────────────────────────────────────────────
export default function VaultView() {
  const {
    theme, collections, folders,
    removeFromCollection, movePaperToFolder,
    addFolder, renameFolder, deleteFolder,
    linkFolderToDoc, unlinkFolderDoc,
    googleUser, googleToken,
  } = useStore()
  const isDark = theme === 'dark'
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [search, setSearch] = useState('')
  const [showBibModal, setShowBibModal] = useState(false)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)
  const [folderMenuOpen, setFolderMenuOpen] = useState(null)
  const [showLinkDocModal, setShowLinkDocModal] = useState(false)
  const [linkingFolder, setLinkingFolder] = useState(null)

  const visiblePapers = useMemo(() => {
    let list = collections
    if (selectedFolder === 'all') {
      // show all
    } else if (selectedFolder === 'unsorted') {
      list = list.filter((p) => !p.folderId)
    } else {
      list = list.filter((p) => p.folderId === selectedFolder)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.authors || []).join(' ').toLowerCase().includes(q) ||
          (p.source || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [collections, selectedFolder, search])

  const countFor = (folderId) =>
    folderId === 'unsorted'
      ? collections.filter((p) => !p.folderId).length
      : collections.filter((p) => p.folderId === folderId).length

  const selectedFolderObj = folders.find((f) => f.selectedFolder === selectedFolder)
  const activeColor =
    selectedFolder === 'all' || selectedFolder === 'unsorted'
      ? '#2563EB'
      : (folders.find((f) => f.id === selectedFolder)?.color || '#2563EB')

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Folder Sidebar ── */}
      <div
        className="flex flex-col border-r overflow-y-auto"
        style={{
          width: 140,
          flexShrink: 0,
          background: isDark ? '#1E1E1E' : '#F3F4F6',
          borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
        }}
      >
        <div className="px-2 pt-3 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: isDark ? '#94A3B8' : '#9CA3AF', fontSize: 9 }}>
            Folders
          </p>
        </div>

        {/* All Papers / Unsorted */}
        {[
          { id: 'all', label: 'All Papers', icon: Archive, count: collections.length },
          { id: 'unsorted', label: 'Unsorted', icon: Inbox, count: countFor('unsorted') },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedFolder(item.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mx-1 mb-0.5 text-left transition-colors"
            style={{
              width: 'calc(100% - 8px)',
              background: selectedFolder === item.id
                ? isDark ? '#3A3A3A' : '#FFFFFF'
                : 'transparent',
              color: selectedFolder === item.id
                ? isDark ? '#E2E8F0' : '#111827'
                : '#6B7280',
            }}
          >
            <item.icon size={12} style={{ flexShrink: 0 }} />
            <span className="flex-1 truncate" style={{ fontSize: 11 }}>{item.label}</span>
            <span
              className="rounded-full px-1"
              style={{ fontSize: 9, background: isDark ? '#4A4A4A' : '#E5E7EB', color: '#9CA3AF' }}
            >
              {item.count}
            </span>
          </button>
        ))}

        <div className="mx-2 my-2" style={{ height: 1, background: isDark ? '#3A3A3A' : '#E5E7EB' }} />

        {/* User folders */}
        {folders.map((folder) => (
          <div key={folder.id} className="relative group/folder mx-1 mb-0.5">
            <button
              onClick={() => setSelectedFolder(folder.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
              style={{
                background: selectedFolder === folder.id
                  ? isDark ? '#3A3A3A' : '#FFFFFF'
                  : 'transparent',
                color: selectedFolder === folder.id
                  ? isDark ? '#E2E8F0' : '#111827'
                  : '#6B7280',
              }}
            >
              {selectedFolder === folder.id
                ? <FolderOpen size={12} style={{ color: folder.color, flexShrink: 0 }} />
                : <Folder size={12} style={{ color: folder.color, flexShrink: 0 }} />
              }
              <span className="flex-1 truncate" style={{ fontSize: 11 }}>{folder.name}</span>
              {folder.googleDocId && (
                <span title="Linked to Google Doc" style={{ flexShrink: 0 }}>
                  <Link2 size={8} style={{ color: '#1D4ED8' }} />
                </span>
              )}
              <span
                className="rounded-full px-1"
                style={{ fontSize: 9, background: isDark ? '#4A4A4A' : '#E5E7EB', color: '#9CA3AF' }}
              >
                {countFor(folder.id)}
              </span>
            </button>
            {/* Folder context menu trigger */}
            <button
              onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/folder:opacity-100 transition-opacity"
              style={{ color: '#9CA3AF', background: isDark ? '#3A3A3A' : '#E5E7EB' }}
            >
              <MoreHorizontal size={10} />
            </button>
            <AnimatePresence>
              {folderMenuOpen === folder.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-8 z-50 rounded-xl shadow-lg overflow-hidden"
                  style={{
                    background: isDark ? '#2E2E2E' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
                    minWidth: 130,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-1">
                    <button
                      onClick={() => { setEditingFolder(folder); setShowFolderForm(true); setFolderMenuOpen(null) }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
                      style={{ fontSize: 11, color: isDark ? '#CBD5E1' : '#4A4A4A' }}
                    >
                      <Pencil size={10} /> Rename
                    </button>
                    {folder.googleDocId ? (
                      <button
                        onClick={() => { unlinkFolderDoc(folder.id); setFolderMenuOpen(null) }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
                        style={{ fontSize: 11, color: '#9CA3AF' }}
                      >
                        <Unlink size={10} /> Unlink Doc
                      </button>
                    ) : (
                      <button
                        onClick={() => { setLinkingFolder(folder); setShowLinkDocModal(true); setFolderMenuOpen(null) }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
                        style={{ fontSize: 11, color: '#1D4ED8' }}
                      >
                        <Link2 size={10} /> Link Google Doc
                      </button>
                    )}
                    <button
                      onClick={() => { deleteFolder(folder.id); setFolderMenuOpen(null); if (selectedFolder === folder.id) setSelectedFolder('all') }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
                      style={{ fontSize: 11, color: '#2563EB' }}
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* New folder button */}
        <button
          onClick={() => { setEditingFolder(null); setShowFolderForm(true) }}
          className="mx-1 mt-1 mb-3 flex items-center gap-1.5 px-2 py-1.5 rounded-lg w-full text-left transition-colors"
          style={{ color: '#9CA3AF', fontSize: 11 }}
        >
          <FolderPlus size={12} />
          New folder
        </button>
      </div>

      {/* ── Papers Panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div
          className="px-3 py-2.5 border-b flex items-center gap-2"
          style={{
            background: isDark ? '#252525' : '#FFFFFF',
            borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ fontSize: 12, color: isDark ? '#E2E8F0' : '#111827' }}>
              {selectedFolder === 'all' ? 'All Papers'
                : selectedFolder === 'unsorted' ? 'Unsorted'
                : (folders.find((f) => f.id === selectedFolder)?.name || 'Folder')}
            </p>
            <p style={{ fontSize: 10, color: '#9CA3AF' }}>
              {visiblePapers.length} paper{visiblePapers.length !== 1 ? 's' : ''}
            </p>
          </div>
          {selectedFolder !== 'all' && selectedFolder !== 'unsorted' && (() => {
            const fObj = folders.find((f) => f.id === selectedFolder)
            return fObj?.googleDocId ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={fObj.googleDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                  style={{ background: isDark ? '#1e3a5f' : '#EFF6FF', color: '#1D4ED8', fontSize: 10 }}
                  title={`Open linked doc: ${fObj.googleDocTitle}`}
                >
                  <Link2 size={9} />
                  Doc
                </a>
                <button
                  onClick={() => { unlinkFolderDoc(fObj.id) }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ color: '#9CA3AF' }}
                  title="Unlink Google Doc"
                >
                  <Unlink size={9} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setLinkingFolder(fObj); setShowLinkDocModal(true) }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                style={{ background: isDark ? '#3A3A3A' : '#F3F4F6', color: '#6B7280', fontSize: 10 }}
                title="Link a Google Doc to this folder"
              >
                <Link2 size={9} />
                Link Doc
              </button>
            )
          })()}
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 mx-3 my-2 px-2.5 py-1.5 rounded-lg border"
          style={{
            background: isDark ? '#1E1E1E' : '#F9FAFB',
            borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
          }}
        >
          <Search size={11} style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 11, color: isDark ? '#E2E8F0' : '#111827' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: '#9CA3AF' }}>
              <X size={10} />
            </button>
          )}
        </div>

        {/* Paper list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
          {visiblePapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Archive size={24} style={{ color: '#D1D5DB' }} />
              <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                {collections.length === 0
                  ? 'Save papers using the bookmark icon on any paper'
                  : search
                  ? 'No papers match your search'
                  : 'No papers in this folder'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 mt-1">
              {visiblePapers.map((paper) => {
                const paperFolder = paper.folderId ? folders.find((f) => f.id === paper.folderId) : null
                const activeFolderObj = selectedFolder !== 'all' && selectedFolder !== 'unsorted'
                  ? folders.find((f) => f.id === selectedFolder)
                  : paperFolder
                return (
                  <PaperRow
                    key={paper.id}
                    paper={paper}
                    folders={folders}
                    isDark={isDark}
                    onMove={movePaperToFolder}
                    onRemove={removeFromCollection}
                    citationFormat={activeFolderObj?.citationFormat || 'apa'}
                    linkedDoc={activeFolderObj || null}
                    googleToken={googleToken}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showFolderForm && (
          <FolderFormModal
            isDark={isDark}
            initial={editingFolder}
            onConfirm={(name, color) => {
              if (editingFolder) renameFolder(editingFolder.id, name)
              else addFolder(name, color)
            }}
            onClose={() => { setShowFolderForm(false); setEditingFolder(null) }}
          />
        )}
        {showBibModal && (
          <GenerateBibliographyModal
            papers={visiblePapers}
            isDark={isDark}
            linkedDoc={selectedFolder !== 'all' && selectedFolder !== 'unsorted'
              ? folders.find((f) => f.id === selectedFolder)
              : null}
            googleToken={googleToken}
            onClose={() => setShowBibModal(false)}
          />
        )}
        {showLinkDocModal && linkingFolder && (
          <LinkDocModal
            folder={linkingFolder}
            isDark={isDark}
            googleToken={googleToken}
            googleUser={googleUser}
            onLink={linkFolderToDoc}
            onClose={() => { setShowLinkDocModal(false); setLinkingFolder(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
