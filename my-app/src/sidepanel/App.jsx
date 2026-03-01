import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import TopNav from '../components/TopNav'
import DiscoveryView from '../components/DiscoveryView'
import ActivePaperView from '../components/ActivePaperView'
import VaultView from '../components/VaultView'
import SettingsView from '../components/SettingsView'

export default function App() {
  const { theme, sidebarState, setSidebarState, setActivePaper, setCurrentUrl, setCurrentSection, setViewportText } = useStore()

  // Listen for VIEWPORT_UPDATE messages from content script
  useEffect(() => {
    const handleMessage = (message) => {
      if (message.type === 'VIEWPORT_UPDATE') {
        setCurrentSection(message.data.section)
        setViewportText(message.data.viewportText)
      }
    }
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage)
      return () => chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [setCurrentSection, setViewportText])

  // On mount: request paper data for the current active tab immediately
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return
    chrome.runtime.sendMessage({ type: 'REQUEST_PAPER_DATA' }, (response) => {
      if (chrome.runtime.lastError) return
      if (response?.found && response?.data) {
        useStore.setState((s) => ({
          activePaper: response.data,
          currentUrl: response.data.url,
          sidebarState: s.sidebarState === 'discovery' ? 'active-paper' : s.sidebarState,
        }))
      }
    })
  }, [])

  // Event-driven paper detection: service worker pushes PAPER_DATA_PUSH whenever
  // the user switches tabs or a tab finishes loading — works for new tabs too.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return

    const handleMessage = (message) => {
      if (message.type === 'PAPER_DATA_PUSH') {
        if (message.found && message.data) {
          useStore.setState((s) => ({
            activePaper: message.data,
            currentUrl: message.data.url,
            sidebarState: s.sidebarState === 'discovery' ? 'active-paper' : s.sidebarState,
          }))
        } else {
          // Navigated away from a paper — clear active paper and return to discovery
          useStore.setState((s) => ({
            activePaper: null,
            sidebarState: s.sidebarState === 'active-paper' ? 'discovery' : s.sidebarState,
          }))
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  // Load persisted state from chrome.storage, then enable the persist subscriber.
  // The hydrated ref blocks the subscriber from writing empty initial state back to
  // storage before the async read completes (which would wipe saved collections).
  const hydrated = React.useRef(false)

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['apiKey', 'researchInterest', 'collections', 'folders', 'theme', 'chatMessages'], (result) => {
        if (result.apiKey) useStore.setState({ apiKey: result.apiKey })
        if (result.researchInterest) useStore.setState({ researchInterest: result.researchInterest })
        if (result.collections) useStore.setState({ collections: result.collections })
        if (result.folders) useStore.setState({ folders: result.folders })
        if (result.theme) useStore.setState({ theme: result.theme })
        if (result.chatMessages && typeof result.chatMessages === 'object') useStore.setState({ chatMessages: result.chatMessages })
        hydrated.current = true
      })
    } else {
      hydrated.current = true
    }
  }, [])

  // Persist key state to chrome.storage. Guarded by hydrated so we never write
  // the empty initial state over previously saved data on panel open.
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      if (!hydrated.current) return
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const payload = {
          apiKey: state.apiKey,
          researchInterest: state.researchInterest,
          collections: state.collections,
          folders: state.folders,
          theme: state.theme,
        }
        if (state.chatMessages && Object.keys(state.chatMessages).length > 0) {
          payload.chatMessages = state.chatMessages
        }
        chrome.storage.local.set(payload)
      }
    })
    return unsub
  }, [])

  // When background adds a definition to chat, merge into store so it appears immediately
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return
    const handleMessage = (msg) => {
      if (msg.type === 'CHAT_MESSAGES_UPDATED' && msg.paperId && Array.isArray(msg.chatMessages)) {
        useStore.setState((s) => ({
          chatMessages: { ...s.chatMessages, [msg.paperId]: msg.chatMessages },
        }))
      }
    }
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  // Re-read chat from storage when switching to Paper view so we always show latest (e.g. after Define)
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local || sidebarState !== 'active-paper') return
    chrome.storage.local.get(['chatMessages'], (result) => {
      if (result.chatMessages && typeof result.chatMessages === 'object' && Object.keys(result.chatMessages).length > 0) {
        useStore.setState((s) => ({ chatMessages: result.chatMessages }))
      }
    })
  }, [sidebarState])

  const views = {
    'discovery': <DiscoveryView />,
    'active-paper': <ActivePaperView />,
    'vault': <VaultView />,
    'settings': <SettingsView />,
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          background: theme === 'dark' ? '#0D0D0D' : '#F9FAFB',
          color: theme === 'dark' ? '#F9FAFB' : '#111827',
          fontFamily: "'Inter', system-ui, sans-serif",
          minWidth: 400,
        }}
      >
        <TopNav />
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={sidebarState}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="h-full"
            >
              {views[sidebarState] || <DiscoveryView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
