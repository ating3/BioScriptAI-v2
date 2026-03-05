import { create } from 'zustand'
import { syncCitationsToDoc } from '../lib/googleDocs'
import { generateBibTeX, generateAPA } from '../lib/utils'

// Debounce timers and in-flight guards keyed by folderId
const syncTimers = {}
const syncInFlight = {}

function scheduleFolderSync(folderId, getFolderFn, getPapersFn, getTokenFn) {
  clearTimeout(syncTimers[folderId])
  syncTimers[folderId] = setTimeout(async () => {
    if (syncInFlight[folderId]) return
    const token = getTokenFn()
    if (!token) return
    const folder = getFolderFn()
    if (!folder?.googleDocId) return
    syncInFlight[folderId] = true
    const papers = getPapersFn().slice().sort((a, b) => {
      const lastName = (p) => {
        const first = (p.authors?.[0] || '')
        // Handle "Last, First" and "First Last" formats
        const parts = first.includes(',') ? first.split(',')[0] : first.split(' ').pop()
        return parts.toLowerCase()
      }
      return lastName(a).localeCompare(lastName(b))
    })
    const citations = papers.map((p) =>
      folder.citationFormat === 'bibtex' ? generateBibTeX(p) : generateAPA(p)
    )
    try {
      await syncCitationsToDoc(token, folder.googleDocId, folder.name, citations)
    } catch (e) {
      console.warn('[BioScript] Sync failed for', folder.name, e.message)
    } finally {
      syncInFlight[folderId] = false
    }
  }, 800)
}

const useStore = create((set, get) => ({
  // Theme
  theme: 'light',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

  // Sidebar state: 'discovery' | 'active-paper' | 'vault' | 'settings'
  sidebarState: 'discovery',
  setSidebarState: (state) => set({ sidebarState: state }),

  // Active paper
  activePaper: null,
  setActivePaper: (paper) => set({ activePaper: paper, sidebarState: paper ? 'active-paper' : 'discovery' }),

  // Current URL & section
  currentUrl: '',
  currentSection: 'Body',
  viewportText: '',
  setCurrentUrl: (url) => set({ currentUrl: url }),
  setCurrentSection: (section) => set({ currentSection: section }),
  setViewportText: (text) => set({ viewportText: text }),

  // Chat messages per paper
  chatMessages: {},
  addChatMessage: (paperId, message) => set((s) => ({
    chatMessages: {
      ...s.chatMessages,
      [paperId]: [...(s.chatMessages[paperId] || []), message],
    },
  })),
  clearChat: (paperId) => set((s) => ({
    chatMessages: { ...s.chatMessages, [paperId]: [] },
  })),

  // Research Interest / Project
  researchInterest: '',
  setResearchInterest: (interest) => set({ researchInterest: interest }),

  // Deep Research toggle
  deepResearch: false,
  toggleDeepResearch: () => set((s) => ({ deepResearch: !s.deepResearch })),

  // API Key
  apiKey: '',
  setApiKey: (key) => set({ apiKey: key }),

  // Google Account
  googleUser: null,       // { name, email, picture, sub }
  googleToken: null,      // OAuth access token (ephemeral, not persisted)
  setGoogleUser: (user) => set({ googleUser: user }),
  setGoogleToken: (token) => set({ googleToken: token }),
  clearGoogleSession: () => set({ googleUser: null, googleToken: null }),

  // Folders (Vault project folders)
  folders: [],
  addFolder: (name, color) => set((s) => {
    const id = `folder-${Date.now()}`
    return { folders: [...s.folders, { id, name, color: color || '#2563EB', createdAt: new Date().toISOString() }] }
  }),
  renameFolder: (folderId, name) => set((s) => ({
    folders: s.folders.map((f) => f.id === folderId ? { ...f, name } : f),
  })),
  deleteFolder: (folderId) => set((s) => ({
    folders: s.folders.filter((f) => f.id !== folderId),
    collections: s.collections.map((p) => p.folderId === folderId ? { ...p, folderId: null } : p),
  })),
  linkFolderToDoc: (folderId, docId, docTitle, docUrl, citationFormat) => {
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === folderId
          ? { ...f, googleDocId: docId, googleDocTitle: docTitle, googleDocUrl: docUrl, citationFormat: citationFormat || 'apa' }
          : f
      ),
    }))
    // Immediately sync existing papers into the newly linked doc
    scheduleFolderSync(
      folderId,
      () => get().folders.find((f) => f.id === folderId),
      () => get().collections.filter((p) => p.folderId === folderId),
      () => get().googleToken
    )
  },
  unlinkFolderDoc: (folderId) => set((s) => ({
    folders: s.folders.map((f) =>
      f.id === folderId
        ? { ...f, googleDocId: null, googleDocTitle: null, googleDocUrl: null, citationFormat: null }
        : f
    ),
  })),

  // Collections (Vault)
  collections: [],
  addToCollection: (paper, folderId = null) => {
    set((s) => {
      const existing = s.collections.find((p) => p.id === paper.id)
      if (existing) {
        if (folderId !== undefined) {
          return { collections: s.collections.map((p) => p.id === paper.id ? { ...p, folderId } : p) }
        }
        return s
      }
      return { collections: [...s.collections, { ...paper, folderId, savedAt: new Date().toISOString() }] }
    })
    const targetFolderId = folderId
    if (targetFolderId) {
      scheduleFolderSync(
        targetFolderId,
        () => get().folders.find((f) => f.id === targetFolderId),
        () => get().collections.filter((p) => p.folderId === targetFolderId),
        () => get().googleToken
      )
    }
  },
  removeFromCollection: (paperId) => {
    const affectedFolderIds = new Set(
      get().collections.filter((p) => p.id === paperId).map((p) => p.folderId).filter(Boolean)
    )
    set((s) => ({ collections: s.collections.filter((p) => p.id !== paperId) }))
    for (const fid of affectedFolderIds) {
      scheduleFolderSync(
        fid,
        () => get().folders.find((f) => f.id === fid),
        () => get().collections.filter((p) => p.folderId === fid),
        () => get().googleToken
      )
    }
  },
  updateCollectionPaper: (paperId, updates) => set((s) => ({
    collections: s.collections.map((p) => p.id === paperId ? { ...p, ...updates } : p),
  })),
  movePaperToFolder: (paperId, newFolderId) => {
    const oldFolderIds = new Set(
      get().collections.filter((p) => p.id === paperId).map((p) => p.folderId).filter(Boolean)
    )
    set((s) => ({
      collections: s.collections.map((p) => p.id === paperId ? { ...p, folderId: newFolderId } : p),
    }))
    const foldersToSync = new Set([...oldFolderIds, newFolderId].filter(Boolean))
    for (const fid of foldersToSync) {
      scheduleFolderSync(
        fid,
        () => get().folders.find((f) => f.id === fid),
        () => get().collections.filter((p) => p.folderId === fid),
        () => get().googleToken
      )
    }
  },

  // Loading states
  isLoading: false,
  loadingMessage: '',
  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

  // Tooltip definition
  tooltipWord: null,
  tooltipDefinition: null,
  tooltipPosition: null,
  setTooltip: (word, definition, position) => set({ tooltipWord: word, tooltipDefinition: definition, tooltipPosition: position }),
  clearTooltip: () => set({ tooltipWord: null, tooltipDefinition: null, tooltipPosition: null }),
}))

export default useStore
