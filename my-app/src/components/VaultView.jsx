import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive, Search, Trash2, Copy, Check, ExternalLink,
  FileText, Loader2, FolderOpen, Folder, FolderPlus,
  FileCode, Quote, Sparkles, FileCheck, MoreHorizontal,
  Pencil, X, ChevronRight, Inbox, BookmarkCheck,
} from 'lucide-react'
import useStore from '../store/useStore'
import { generateBibTeX, generateAPA, truncate } from '../lib/utils'

const FOLDER_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
  '#D97706', '#15803D', '#0891B2', '#9CA3AF',
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
          background: isDark ? '#111111' : '#FFFFFF',
          border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit}>
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-3" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
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
                background: isDark ? '#0D0D0D' : '#F9FAFB',
                borderColor: isDark ? '#1F2937' : '#E5E7EB',
                color: isDark ? '#F9FAFB' : '#111827',
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
              style={{ background: isDark ? '#1F2937' : '#F3F4F6', color: isDark ? '#D1D5DB' : '#374151' }}
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
function GenerateBibliographyModal({ papers, isDark, onClose }) {
  const [format, setFormat] = useState('bibtex')
  const [copied, setCopied] = useState(false)

  const bibliography = papers
    .map((p) => format === 'bibtex' ? generateBibTeX(p) : generateAPA(p))
    .join(format === 'bibtex' ? '\n\n' : '\n')

  const copy = () => {
    navigator.clipboard.writeText(bibliography)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          background: isDark ? '#111111' : '#FFFFFF',
          border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
          maxHeight: '70vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: isDark ? '#1F2937' : '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
              Generate Bibliography
            </h3>
            <div className="flex gap-1">
              {['bibtex', 'apa'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: format === f ? '#2563EB' : isDark ? '#1F2937' : '#F3F4F6',
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
        </div>
        <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 260 }}>
          <pre
            className="p-4 text-xs"
            style={{
              color: isDark ? '#D1D5DB' : '#374151',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 10,
            }}
          >
            {bibliography}
          </pre>
        </div>
        <div className="p-4 border-t flex gap-2" style={{ borderColor: isDark ? '#1F2937' : '#E5E7EB' }}>
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: copied ? '#F0FDF4' : '#2563EB', color: copied ? '#15803D' : 'white' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: isDark ? '#1F2937' : '#F3F4F6', color: isDark ? '#D1D5DB' : '#374151' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Paper Row ──────────────────────────────────────────────────────────────
function PaperRow({ paper, folders, isDark, onMove, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors relative"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#111111' : '#F9FAFB' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; setMenuOpen(false) }}
    >
      <FileText size={14} style={{ color: '#9CA3AF', marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p
          className="font-medium leading-snug"
          style={{ fontSize: 12, color: isDark ? '#F9FAFB' : '#111827' }}
        >
          {paper.title || 'Untitled'}
        </p>
        <p className="mt-0.5 truncate" style={{ fontSize: 10, color: '#9CA3AF' }}>
          {(paper.authors || []).slice(0, 2).join(', ')}
          {paper.year ? ` · ${paper.year}` : ''}
          {paper.source ? ` · ${paper.source}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
                  minWidth: 160,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF', fontSize: 9 }}>
                    Move to folder
                  </p>
                  <button
                    onClick={() => { onMove(paper.id, null); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
                    style={{ fontSize: 11, color: paper.folderId == null ? '#2563EB' : (isDark ? '#D1D5DB' : '#374151') }}
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
                      style={{ fontSize: 11, color: paper.folderId === f.id ? f.color : (isDark ? '#D1D5DB' : '#374151') }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                      {f.name}
                      {paper.folderId === f.id && <Check size={10} className="ml-auto" />}
                    </button>
                  ))}
                </div>
                <div className="border-t p-1" style={{ borderColor: isDark ? '#1F2937' : '#F3F4F6' }}>
                  <button
                    onClick={() => { onRemove(paper.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
                    style={{ fontSize: 11, color: '#DC2626' }}
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

// ─── Main VaultView ─────────────────────────────────────────────────────────
export default function VaultView() {
  const { theme, collections, folders, removeFromCollection, movePaperToFolder, addFolder, renameFolder, deleteFolder } = useStore()
  const isDark = theme === 'dark'
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [search, setSearch] = useState('')
  const [showBibModal, setShowBibModal] = useState(false)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null)
  const [folderMenuOpen, setFolderMenuOpen] = useState(null)

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
          background: isDark ? '#0D0D0D' : '#F3F4F6',
          borderColor: isDark ? '#1F2937' : '#E5E7EB',
        }}
      >
        <div className="px-2 pt-3 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: '#9CA3AF', fontSize: 9 }}>
            Folders
          </p>
        </div>

        {/* All Papers */}
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
                ? isDark ? '#1F2937' : '#FFFFFF'
                : 'transparent',
              color: selectedFolder === item.id
                ? isDark ? '#F9FAFB' : '#111827'
                : '#6B7280',
            }}
          >
            <item.icon size={12} style={{ flexShrink: 0 }} />
            <span className="flex-1 truncate" style={{ fontSize: 11 }}>{item.label}</span>
            <span
              className="rounded-full px-1"
              style={{ fontSize: 9, background: isDark ? '#374151' : '#E5E7EB', color: '#9CA3AF' }}
            >
              {item.count}
            </span>
          </button>
        ))}

        <div className="mx-2 my-2" style={{ height: 1, background: isDark ? '#1F2937' : '#E5E7EB' }} />

        {/* User folders */}
        {folders.map((folder) => (
          <div key={folder.id} className="relative group/folder mx-1 mb-0.5">
            <button
              onClick={() => setSelectedFolder(folder.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors"
              style={{
                background: selectedFolder === folder.id
                  ? isDark ? '#1F2937' : '#FFFFFF'
                  : 'transparent',
                color: selectedFolder === folder.id
                  ? isDark ? '#F9FAFB' : '#111827'
                  : '#6B7280',
              }}
            >
              {selectedFolder === folder.id
                ? <FolderOpen size={12} style={{ color: folder.color, flexShrink: 0 }} />
                : <Folder size={12} style={{ color: folder.color, flexShrink: 0 }} />
              }
              <span className="flex-1 truncate" style={{ fontSize: 11 }}>{folder.name}</span>
              <span
                className="rounded-full px-1"
                style={{ fontSize: 9, background: isDark ? '#374151' : '#E5E7EB', color: '#9CA3AF' }}
              >
                {countFor(folder.id)}
              </span>
            </button>
            {/* Folder context menu trigger */}
            <button
              onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/folder:opacity-100 transition-opacity"
              style={{ color: '#9CA3AF', background: isDark ? '#1F2937' : '#E5E7EB' }}
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
                    background: isDark ? '#1A1A1A' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
                    minWidth: 130,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-1">
                    <button
                      onClick={() => { setEditingFolder(folder); setShowFolderForm(true); setFolderMenuOpen(null) }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
                      style={{ fontSize: 11, color: isDark ? '#D1D5DB' : '#374151' }}
                    >
                      <Pencil size={10} /> Rename
                    </button>
                    <button
                      onClick={() => { deleteFolder(folder.id); setFolderMenuOpen(null); if (selectedFolder === folder.id) setSelectedFolder('all') }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
                      style={{ fontSize: 11, color: '#DC2626' }}
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
            background: isDark ? '#111111' : '#FFFFFF',
            borderColor: isDark ? '#1F2937' : '#E5E7EB',
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ fontSize: 12, color: isDark ? '#F9FAFB' : '#111827' }}>
              {selectedFolder === 'all' ? 'All Papers'
                : selectedFolder === 'unsorted' ? 'Unsorted'
                : (folders.find((f) => f.id === selectedFolder)?.name || 'Folder')}
            </p>
            <p style={{ fontSize: 10, color: '#9CA3AF' }}>
              {visiblePapers.length} paper{visiblePapers.length !== 1 ? 's' : ''}
            </p>
          </div>
          {visiblePapers.length > 0 && (
            <button
              onClick={() => setShowBibModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0"
              style={{ background: isDark ? '#1F2937' : '#F3F4F6', color: '#6B7280', fontSize: 10 }}
              title="Generate bibliography"
            >
              <FileCheck size={10} />
              Bib
            </button>
          )}
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 mx-3 my-2 px-2.5 py-1.5 rounded-lg border"
          style={{
            background: isDark ? '#0D0D0D' : '#F9FAFB',
            borderColor: isDark ? '#1F2937' : '#E5E7EB',
          }}
        >
          <Search size={11} style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 11, color: isDark ? '#F9FAFB' : '#111827' }}
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
              {visiblePapers.map((paper) => (
                <PaperRow
                  key={paper.id}
                  paper={paper}
                  folders={folders}
                  isDark={isDark}
                  onMove={movePaperToFolder}
                  onRemove={removeFromCollection}
                />
              ))}
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
            onClose={() => setShowBibModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
