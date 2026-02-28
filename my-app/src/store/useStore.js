import { create } from 'zustand'

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

  // Collections (Vault)
  collections: [],
  addToCollection: (paper, folderId = null) => set((s) => {
    const existing = s.collections.find((p) => p.id === paper.id)
    if (existing) {
      // Update folder if paper already saved
      if (folderId !== undefined) {
        return { collections: s.collections.map((p) => p.id === paper.id ? { ...p, folderId } : p) }
      }
      return s
    }
    return { collections: [...s.collections, { ...paper, folderId, savedAt: new Date().toISOString() }] }
  }),
  removeFromCollection: (paperId) => set((s) => ({
    collections: s.collections.filter((p) => p.id !== paperId),
  })),
  updateCollectionPaper: (paperId, updates) => set((s) => ({
    collections: s.collections.map((p) => p.id === paperId ? { ...p, ...updates } : p),
  })),
  movePaperToFolder: (paperId, folderId) => set((s) => ({
    collections: s.collections.map((p) => p.id === paperId ? { ...p, folderId } : p),
  })),

  // Integrations
  integrations: {
    googleDocs: { connected: false, status: 'disconnected' },
    microsoftWord: { connected: false, status: 'disconnected' },
  },
  setIntegration: (service, data) => set((s) => ({
    integrations: { ...s.integrations, [service]: { ...s.integrations[service], ...data } },
  })),

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
