import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, TrendingUp, Sparkles, ExternalLink, BookOpen, Atom, Leaf, Microscope, Brain, Dna, GraduationCap, Scale, Calculator, Globe, FlaskConical, RefreshCw, AlertCircle } from 'lucide-react'
import useStore from '../store/useStore'

const DATABASES = [
  {
    id: 'scholar',
    name: 'Google Scholar',
    description: 'Cross-disciplinary search',
    icon: GraduationCap,
    color: '#2563EB',
    darkColor: '#60A5FA',
    bg: '#EFF6FF',
    darkBg: '#1e3a5f',
    url: 'https://scholar.google.com',
    count: 'Billions of articles',
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    description: 'Biomedical & life sciences',
    icon: Microscope,
    color: '#1D60E8',
    darkColor: '#60A5FA',
    bg: '#EDF5FF',
    darkBg: '#1a3860',
    url: 'https://pubmed.ncbi.nlm.nih.gov',
    count: '35M+ articles',
  },
  {
    id: 'arxiv',
    name: 'arXiv',
    description: 'Preprints across sciences',
    icon: Atom,
    color: '#155CE0',
    darkColor: '#67AAFB',
    bg: '#EBF3FF',
    darkBg: '#163660',
    url: 'https://arxiv.org',
    count: '2M+ preprints',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'High-impact research',
    icon: Leaf,
    color: '#0D58D6',
    darkColor: '#6EB0FC',
    bg: '#E8F1FF',
    darkBg: '#12335e',
    url: 'https://www.nature.com',
    count: 'Premium journals',
  },
  {
    id: 'biorxiv',
    name: 'bioRxiv',
    description: 'Biology preprints',
    icon: Dna,
    color: '#0553CC',
    darkColor: '#76B6FD',
    bg: '#E4EFFF',
    darkBg: '#0e305c',
    url: 'https://www.biorxiv.org',
    count: '200K+ preprints',
  },
  {
    id: 'science',
    name: 'Science',
    description: 'AAAS flagship journal',
    icon: Brain,
    color: '#0551BF',
    darkColor: '#7DBCFD',
    bg: '#E0ECFF',
    darkBg: '#0b2d5a',
    url: 'https://www.science.org',
    count: 'Peer-reviewed',
  },
  {
    id: 'plos',
    name: 'PLOS ONE',
    description: 'Open access research',
    icon: BookOpen,
    color: '#0A6EB4',
    darkColor: '#56C2FA',
    bg: '#E0F2FF',
    darkBg: '#0a2e50',
    url: 'https://journals.plos.org/plosone',
    count: 'Open access',
  },
  {
    id: 'ssrn',
    name: 'SSRN',
    description: 'Social sciences & economics',
    icon: Scale,
    color: '#0E7FAD',
    darkColor: '#38CBFB',
    bg: '#DCF5FF',
    darkBg: '#082e48',
    url: 'https://www.ssrn.com',
    count: '1M+ preprints',
  },
  {
    id: 'semanticscholar',
    name: 'Semantic Scholar',
    description: 'AI-powered paper search',
    icon: FlaskConical,
    color: '#0C8FAD',
    darkColor: '#22D3EE',
    bg: '#D8F4FF',
    darkBg: '#062c40',
    url: 'https://www.semanticscholar.org',
    count: '200M+ papers',
  },
  {
    id: 'jstor',
    name: 'JSTOR',
    description: 'Humanities & social sciences',
    icon: BookOpen,
    color: '#0A9BA8',
    darkColor: '#2DD4BF',
    bg: '#D4F4F6',
    darkBg: '#052e32',
    url: 'https://www.jstor.org',
    count: '12M+ articles',
  },
  {
    id: 'mathscinet',
    name: 'MathSciNet',
    description: 'Mathematics research',
    icon: Calculator,
    color: '#0AA89E',
    darkColor: '#2DD4BF',
    bg: '#CCF5F2',
    darkBg: '#042e2c',
    url: 'https://mathscinet.ams.org',
    count: 'AMS database',
  },
  {
    id: 'scopus',
    name: 'Scopus',
    description: 'Broad academic coverage',
    icon: Globe,
    color: '#0AB296',
    darkColor: '#34D9C0',
    bg: '#C8F5EF',
    darkBg: '#032e28',
    url: 'https://www.scopus.com',
    count: '90M+ records',
  },
]

const FALLBACK_TOPICS = [
  { topic: 'CRISPR gene editing', field: 'Genomics' },
  { topic: 'Neuroinflammation & cognition', field: 'Neuroscience' },
  { topic: 'mRNA vaccine mechanisms', field: 'Immunology' },
  { topic: 'Gut-brain axis microbiome', field: 'Neuroimmunology' },
  { topic: 'Protein folding AI models', field: 'Structural Biology' },
]

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function useGoogleNewsRSS() {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'FETCH_NEWS_RSS' }, (response) => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message)
          setLoading(false)
          return
        }
        if (response?.success && response.items?.length) {
          setItems(response.items)
          setFetchedAt(Date.now())
        } else {
          setError(response?.error || 'No items returned')
        }
        setLoading(false)
      })
    } else {
      setError('Chrome runtime unavailable')
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { items, loading, error, fetchedAt, refresh: fetch }
}

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


export default function DiscoveryView() {
  const { theme, researchInterest, setResearchInterest } = useStore()
  const isDark = theme === 'dark'
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredDb, setHoveredDb] = useState(null)
  const { items: newsItems, loading: newsLoading, error: newsError, fetchedAt, refresh: refreshNews } = useGoogleNewsRSS()

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
            <Sparkles size={12} style={{ color: isDark ? '#60A5FA' : '#2563EB' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#60A5FA' : '#2563EB', fontSize: 10 }}>
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
                      style={{ color: hoveredDb === db.id ? 'white' : (isDark ? db.darkColor : db.color) }}
                    />
                  </div>
                  <ExternalLink size={10} style={{ color: '#9CA3AF', marginTop: 2 }} />
                </div>
                <p className="font-semibold" style={{ fontSize: 12, color: isDark ? '#F9FAFB' : '#111827' }}>
                  {db.name}
                </p>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{db.description}</p>
                <p style={{ fontSize: 10, color: isDark ? db.darkColor : db.color, marginTop: 4, fontWeight: 500 }}>{db.count}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Trending Topics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={12} style={{ color: '#9CA3AF' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF', fontSize: 10 }}>
                Trending in Research
              </p>
              {fetchedAt && !newsLoading && (
                <span style={{ fontSize: 9, color: '#9CA3AF' }}>· {timeAgo(fetchedAt)}</span>
              )}
            </div>
            <button
              onClick={refreshNews}
              disabled={newsLoading}
              className="flex items-center justify-center rounded-lg transition-opacity"
              style={{ opacity: newsLoading ? 0.4 : 1, padding: 4 }}
              title="Refresh news"
            >
              <RefreshCw
                size={11}
                style={{ color: '#9CA3AF' }}
                className={newsLoading ? 'animate-spin' : ''}
              />
            </button>
          </div>

          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: isDark ? '#111111' : '#FFFFFF',
              borderColor: isDark ? '#1F2937' : '#E5E7EB',
            }}
          >
            {/* Skeleton loading */}
            {newsLoading && Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="px-3 py-2.5"
                style={{ borderBottom: i < 4 ? `1px solid ${isDark ? '#1F2937' : '#F3F4F6'}` : 'none' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: isDark ? '#1F2937' : '#E5E7EB' }} />
                  <div
                    className="h-2.5 rounded-full"
                    style={{ width: `${55 + (i * 13) % 35}%`, background: isDark ? '#1F2937' : '#E5E7EB' }}
                  />
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <div className="h-2 rounded-full w-16" style={{ background: isDark ? '#1A2133' : '#F3F4F6' }} />
                </div>
              </div>
            ))}

            {/* Error state — fall back to static topics */}
            {!newsLoading && newsError && FALLBACK_TOPICS.map((item, i) => (
              <motion.div
                key={item.topic}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="px-3 py-2.5 cursor-pointer"
                style={{ borderBottom: i < FALLBACK_TOPICS.length - 1 ? `1px solid ${isDark ? '#1F2937' : '#F3F4F6'}` : 'none' }}
                onClick={() => setSearchQuery(item.topic)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <PulseIndicator color={isDark ? '#60A5FA' : '#2563EB'} />
                  <span className="font-medium" style={{ fontSize: 12, color: isDark ? '#F9FAFB' : '#111827' }}>
                    {item.topic}
                  </span>
                </div>
                <div className="pl-4">
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{item.field}</span>
                </div>
              </motion.div>
            ))}

            {/* Live news items */}
            {!newsLoading && !newsError && newsItems?.map((item, i) => (
              <motion.div
                key={item.link || i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="px-3 py-2.5 cursor-pointer group"
                style={{ borderBottom: i < newsItems.length - 1 ? `1px solid ${isDark ? '#1F2937' : '#F3F4F6'}` : 'none' }}
                onClick={() => {
                  if (item.link) {
                    if (typeof chrome !== 'undefined' && chrome.tabs) {
                      chrome.tabs.create({ url: item.link })
                    } else {
                      window.open(item.link, '_blank')
                    }
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-1 shrink-0">
                    <PulseIndicator color={isDark ? '#60A5FA' : '#2563EB'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className="font-medium leading-snug"
                        style={{ fontSize: 12, color: isDark ? '#F9FAFB' : '#111827', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {item.title}
                      </span>
                      <ExternalLink size={9} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#9CA3AF' }} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {item.source && (
                        <span style={{ fontSize: 10, color: isDark ? '#60A5FA' : '#2563EB', fontWeight: 500 }}>{item.source}</span>
                      )}
                      {item.pubDate && (
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{timeAgo(item.pubDate)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Error notice below card */}
          {!newsLoading && newsError && (
            <div className="flex items-center gap-1.5 mt-2 px-1">
              <AlertCircle size={10} style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>Showing cached topics — live feed unavailable</span>
            </div>
          )}
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
