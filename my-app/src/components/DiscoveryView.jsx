import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, TrendingUp, Sparkles, ExternalLink, BookOpen, Atom, Leaf, Microscope, Brain, Dna } from 'lucide-react'
import useStore from '../store/useStore'

const DATABASES = [
  {
    id: 'pubmed',
    name: 'PubMed',
    description: 'Biomedical & life sciences',
    icon: Microscope,
    color: '#2563EB',
    bg: '#EFF6FF',
    darkBg: '#1e3a5f',
    url: 'https://pubmed.ncbi.nlm.nih.gov',
    count: '35M+ articles',
  },
  {
    id: 'arxiv',
    name: 'arXiv',
    description: 'Preprints across sciences',
    icon: Atom,
    color: '#B91C1C',
    bg: '#FEF2F2',
    darkBg: '#4c1d1d',
    url: 'https://arxiv.org',
    count: '2M+ preprints',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'High-impact research',
    icon: Leaf,
    color: '#15803D',
    bg: '#F0FDF4',
    darkBg: '#14532d',
    url: 'https://www.nature.com',
    count: 'Premium journals',
  },
  {
    id: 'biorxiv',
    name: 'bioRxiv',
    description: 'Biology preprints',
    icon: Dna,
    color: '#0891B2',
    bg: '#ECFEFF',
    darkBg: '#164e63',
    url: 'https://www.biorxiv.org',
    count: '200K+ preprints',
  },
  {
    id: 'science',
    name: 'Science',
    description: 'AAAS flagship journal',
    icon: Brain,
    color: '#7C3AED',
    bg: '#F5F3FF',
    darkBg: '#3b1f6e',
    url: 'https://www.science.org',
    count: 'Peer-reviewed',
  },
  {
    id: 'plos',
    name: 'PLOS ONE',
    description: 'Open access research',
    icon: BookOpen,
    color: '#D97706',
    bg: '#FFFBEB',
    darkBg: '#451a03',
    url: 'https://journals.plos.org/plosone',
    count: 'Open access',
  },
]

const TRENDING_TOPICS = [
  { topic: 'CRISPR gene editing', field: 'Genomics', match: 94 },
  { topic: 'Neuroinflammation & cognition', field: 'Neuroscience', match: 87 },
  { topic: 'mRNA vaccine mechanisms', field: 'Immunology', match: 82 },
  { topic: 'Gut-brain axis microbiome', field: 'Neuroimmunology', match: 79 },
  { topic: 'Protein folding AI models', field: 'Structural Biology', match: 76 },
]

function PulseIndicator({ color }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: color }}
      />
    </span>
  )
}

function MatchBar({ value, color }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1 rounded-full overflow-hidden"
        style={{ background: '#E5E7EB' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="h-full rounded-full"
          style={{ background: color || '#2563EB' }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums" style={{ color: '#6B7280', fontSize: 11 }}>
        {value}%
      </span>
    </div>
  )
}

export default function DiscoveryView() {
  const { theme, researchInterest, setResearchInterest } = useStore()
  const isDark = theme === 'dark'
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredDb, setHoveredDb] = useState(null)

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchQuery)}`
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url })
    } else {
      window.open(url, '_blank')
    }
  }

  const openDatabase = (url) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url })
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div
      className="h-full overflow-y-auto scrollbar-thin"
      style={{ background: isDark ? '#0D0D0D' : '#F9FAFB' }}
    >
      <div className="p-4 space-y-5">

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all"
            style={{
              background: isDark ? '#111111' : '#FFFFFF',
              borderColor: isDark ? '#1F2937' : '#E5E7EB',
            }}
          >
            <Search size={14} style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search papers, topics, authors…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{
                color: isDark ? '#F9FAFB' : '#111827',
                fontSize: 13,
              }}
            />
            {searchQuery && (
              <button
                type="submit"
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: '#2563EB', color: 'white', fontSize: 11 }}
              >
                Search
              </button>
            )}
          </div>
        </form>

        {/* Research Interest */}
        <div
          className="p-3 rounded-xl border"
          style={{
            background: isDark ? '#111111' : '#FFFFFF',
            borderColor: isDark ? '#1F2937' : '#E5E7EB',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} style={{ color: '#7C3AED' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7C3AED', fontSize: 10 }}>
              Research Focus
            </span>
          </div>
          <input
            type="text"
            value={researchInterest}
            onChange={(e) => setResearchInterest(e.target.value)}
            placeholder="e.g. Neuroimmunology, CRISPR, mRNA vaccines…"
            className="w-full bg-transparent outline-none"
            style={{
              fontSize: 13,
              color: isDark ? '#F9FAFB' : '#111827',
            }}
          />
          {researchInterest && (
            <p className="mt-1.5 text-xs" style={{ color: '#9CA3AF', fontSize: 11 }}>
              AI will prioritize gaps & evidence relevant to this field
            </p>
          )}
        </div>

        {/* Database Bento Grid */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF', fontSize: 10 }}>
            Research Databases
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DATABASES.map((db, i) => (
              <motion.button
                key={db.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                onClick={() => openDatabase(db.url)}
                onMouseEnter={() => setHoveredDb(db.id)}
                onMouseLeave={() => setHoveredDb(null)}
                className="relative p-3 rounded-xl border text-left transition-all overflow-hidden"
                style={{
                  background: hoveredDb === db.id
                    ? (isDark ? db.darkBg : db.bg)
                    : (isDark ? '#111111' : '#FFFFFF'),
                  borderColor: hoveredDb === db.id ? db.color + '40' : (isDark ? '#1F2937' : '#E5E7EB'),
                  transform: hoveredDb === db.id ? 'translateY(-1px)' : 'none',
                  boxShadow: hoveredDb === db.id ? `0 4px 16px ${db.color}20` : 'none',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: hoveredDb === db.id ? db.color : (isDark ? '#1F2937' : '#F3F4F6'),
                      transition: 'all 0.2s',
                    }}
                  >
                    <db.icon
                      size={14}
                      style={{ color: hoveredDb === db.id ? 'white' : db.color }}
                    />
                  </div>
                  <ExternalLink size={10} style={{ color: '#9CA3AF', marginTop: 2 }} />
                </div>
                <p className="font-semibold" style={{ fontSize: 12, color: isDark ? '#F9FAFB' : '#111827' }}>
                  {db.name}
                </p>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{db.description}</p>
                <p style={{ fontSize: 10, color: db.color, marginTop: 4, fontWeight: 500 }}>{db.count}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Trending Topics */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={12} style={{ color: '#9CA3AF' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF', fontSize: 10 }}>
              Trending in Research
            </p>
          </div>
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: isDark ? '#111111' : '#FFFFFF',
              borderColor: isDark ? '#1F2937' : '#E5E7EB',
            }}
          >
            {TRENDING_TOPICS.map((item, i) => (
              <motion.div
                key={item.topic}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="px-3 py-2.5 cursor-pointer transition-colors"
                style={{
                  borderBottom: i < TRENDING_TOPICS.length - 1
                    ? `1px solid ${isDark ? '#1F2937' : '#F3F4F6'}`
                    : 'none',
                }}
                onClick={() => setSearchQuery(item.topic)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <PulseIndicator color="#2563EB" />
                    <span className="font-medium" style={{ fontSize: 12, color: isDark ? '#F9FAFB' : '#111827' }}>
                      {item.topic}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{item.field}</span>
                  <div className="flex-1">
                    <MatchBar value={item.match} color="#2563EB" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick tip */}
        <div
          className="p-3 rounded-xl border"
          style={{
            background: isDark ? '#0f1f3d' : '#EFF6FF',
            borderColor: isDark ? '#1e3a5f' : '#BFDBFE',
          }}
        >
          <p style={{ fontSize: 11, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 1.5 }}>
            <strong>Tip:</strong> Navigate to any academic paper and Bioscript will automatically detect it and switch to Active Paper mode.
          </p>
        </div>

      </div>
    </div>
  )
}
