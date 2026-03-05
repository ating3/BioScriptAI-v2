import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import TopNav from '../components/TopNav'
import DiscoveryView from '../components/DiscoveryView'
import ActivePaperView from '../components/ActivePaperView'
import VaultView from '../components/VaultView'
import SettingsView from '../components/SettingsView'
import { silentSignIn } from '../lib/googleAuth'

export default function App() {
  const { theme, sidebarState, setSidebarState, setActivePaper, setCurrentUrl, setCurrentSection, setViewportText } = useStore()

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

  const hydrated = React.useRef(false)

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['apiKey', 'researchInterest', 'collections', 'folders', 'theme', 'chatMessages', 'googleUser'], (result) => {
        if (result.apiKey) useStore.setState({ apiKey: result.apiKey })
        if (result.researchInterest) useStore.setState({ researchInterest: result.researchInterest })
        if (result.collections) useStore.setState({ collections: result.collections })
        if (result.folders) useStore.setState({ folders: result.folders })
        if (result.theme) useStore.setState({ theme: result.theme })
        if (result.chatMessages && typeof result.chatMessages === 'object') useStore.setState({ chatMessages: result.chatMessages })
        if (result.googleUser) useStore.setState({ googleUser: result.googleUser })
        hydrated.current = true
        if (result.googleUser && typeof chrome !== 'undefined' && chrome.identity) {
          silentSignIn().then((session) => {
            if (session) {
              useStore.setState({ googleUser: session.user, googleToken: session.token })
            } else {
              useStore.setState({ googleUser: null, googleToken: null })
            }
          }).catch(() => {})
        }
      })
    } else {
      hydrated.current = true
    }
  }, [])

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
          googleUser: state.googleUser || null,
        }
        if (state.chatMessages && Object.keys(state.chatMessages).length > 0) {
          payload.chatMessages = state.chatMessages
        }
        chrome.storage.local.set(payload)
      }
    })
    return unsub
  }, [])

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
          background: theme === 'dark' ? '#1E1E1E' : '#F9FAFB',
          color: theme === 'dark' ? '#E2E8F0' : '#111827',
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
