import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Key, Eye, EyeOff, Save, Check, Zap, Link2, Unlink,
  Globe, FileText, AlertCircle, ChevronRight, Sparkles,
  ToggleLeft, ToggleRight, Info
} from 'lucide-react'
import useStore from '../store/useStore'

function SettingSection({ title, children, isDark }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: isDark ? '#111111' : '#FFFFFF',
        borderColor: isDark ? '#1F2937' : '#E5E7EB',
      }}
    >
      <div
        className="px-4 py-2.5 border-b"
        style={{ borderColor: isDark ? '#1F2937' : '#F3F4F6' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF', fontSize: 10 }}>
          {title}
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: isDark ? '#1F2937' : '#F9FAFB' }}>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, description, children, isDark }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF', fontSize: 10 }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange, color = '#2563EB' }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-9 h-5 rounded-full transition-colors"
      style={{ background: value ? color : '#D1D5DB' }}
    >
      <motion.div
        animate={{ x: value ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
      />
    </button>
  )
}

function IntegrationCard({ name, icon: Icon, color, status, onConnect, onDisconnect, isDark }) {
  const isConnected = status === 'connected' || status === 'synced'
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: color + '18' }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
            {name}
          </p>
          <p className="text-xs" style={{ color: isConnected ? '#15803D' : '#9CA3AF', fontSize: 10 }}>
            {isConnected ? 'Connected' : 'Not connected'}
          </p>
        </div>
      </div>
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          background: isConnected
            ? isDark ? '#1F2937' : '#F3F4F6'
            : color + '18',
          color: isConnected ? '#9CA3AF' : color,
          border: `1px solid ${isConnected ? (isDark ? '#374151' : '#E5E7EB') : color + '40'}`,
        }}
      >
        {isConnected ? (
          <>
            <Unlink size={10} />
            Disconnect
          </>
        ) : (
          <>
            <Link2 size={10} />
            Connect
          </>
        )}
      </button>
    </div>
  )
}

export default function SettingsView() {
  const {
    theme, toggleTheme,
    apiKey, setApiKey,
    researchInterest, setResearchInterest,
    deepResearch, toggleDeepResearch,
    integrations, setIntegration,
  } = useStore()
  const isDark = theme === 'dark'

  const [showKey, setShowKey] = useState(false)
  const [keyInput, setKeyInput] = useState(apiKey)
  const [saved, setSaved] = useState(false)
  const [interestInput, setInterestInput] = useState(researchInterest)

  const saveApiKey = () => {
    setApiKey(keyInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const saveInterest = () => {
    setResearchInterest(interestInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleConnect = (service) => {
    setIntegration(service, { connected: true, status: 'synced' })
  }

  const handleDisconnect = (service) => {
    setIntegration(service, { connected: false, status: 'disconnected' })
  }

  return (
    <div
      className="h-full overflow-y-auto scrollbar-thin"
      style={{ background: isDark ? '#0D0D0D' : '#F9FAFB' }}
    >
      <div className="p-4 space-y-4">

        {/* API Configuration */}
        <SettingSection title="AI Configuration" isDark={isDark}>
          <div className="px-4 py-3">
            <p className="text-xs font-medium mb-2" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
              OpenAI API Key
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-2"
              style={{
                background: isDark ? '#0D0D0D' : '#F9FAFB',
                borderColor: isDark ? '#1F2937' : '#E5E7EB',
              }}
            >
              <Key size={12} style={{ color: '#9CA3AF' }} />
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-proj-…"
                className="flex-1 bg-transparent outline-none text-xs font-mono"
                style={{ color: isDark ? '#F9FAFB' : '#111827' }}
              />
              <button onClick={() => setShowKey(!showKey)} style={{ color: '#9CA3AF' }}>
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-start gap-1.5 flex-1 p-2 rounded-lg"
                style={{ background: isDark ? '#0f1f3d' : '#EFF6FF' }}
              >
                <Info size={10} style={{ color: '#2563EB', marginTop: 1 }} />
                <p style={{ fontSize: 10, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 1.4 }}>
                  Your key is stored locally and never sent to Bioscript servers.
                </p>
              </div>
              <button
                onClick={saveApiKey}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: saved ? '#F0FDF4' : '#2563EB',
                  color: saved ? '#15803D' : 'white',
                }}
              >
                {saved ? <Check size={11} /> : <Save size={11} />}
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          <SettingRow
            label="Deep Research Mode"
            description="Use GPT-4o for higher quality analysis (uses more tokens)"
            isDark={isDark}
          >
            <Toggle value={deepResearch} onChange={toggleDeepResearch} color="#7C3AED" />
          </SettingRow>

          <SettingRow
            label="Dark Mode"
            description="Toggle between light and dark theme"
            isDark={isDark}
          >
            <Toggle value={isDark} onChange={toggleTheme} />
          </SettingRow>
        </SettingSection>

        {/* Research Focus */}
        <SettingSection title="Research Profile" isDark={isDark}>
          <div className="px-4 py-3">
            <p className="text-xs font-medium mb-1" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
              Research Interest
            </p>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF', fontSize: 10 }}>
              AI will prioritize gaps and evidence relevant to your field
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-2"
              style={{
                background: isDark ? '#0D0D0D' : '#F9FAFB',
                borderColor: isDark ? '#1F2937' : '#E5E7EB',
              }}
            >
              <Sparkles size={12} style={{ color: '#7C3AED' }} />
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                placeholder="e.g. Neuroimmunology, CRISPR, mRNA vaccines…"
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: isDark ? '#F9FAFB' : '#111827' }}
              />
            </div>
            <button
              onClick={saveInterest}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#7C3AED', color: 'white' }}
            >
              <Save size={11} />
              Save Focus
            </button>
          </div>
        </SettingSection>

        {/* Integrations */}
        <SettingSection title="Integrations" isDark={isDark}>
          <IntegrationCard
            name="Google Docs"
            icon={FileText}
            color="#15803D"
            status={integrations.googleDocs.status}
            onConnect={() => handleConnect('googleDocs')}
            onDisconnect={() => handleDisconnect('googleDocs')}
            isDark={isDark}
          />
          <IntegrationCard
            name="Microsoft Word"
            icon={FileText}
            color="#2563EB"
            status={integrations.microsoftWord.status}
            onConnect={() => handleConnect('microsoftWord')}
            onDisconnect={() => handleDisconnect('microsoftWord')}
            isDark={isDark}
          />
          <div className="px-4 py-3">
            <div
              className="p-3 rounded-lg"
              style={{ background: isDark ? '#1A1A1A' : '#F9FAFB', border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}` }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: isDark ? '#F9FAFB' : '#111827' }}>
                Generate Bibliography to Document
              </p>
              <p style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.5 }}>
                Connect Google Docs or Microsoft Word above, then use the "Bibliography" button in the Vault to automatically populate your document with formatted citations.
              </p>
            </div>
          </div>
        </SettingSection>

        {/* About */}
        <SettingSection title="About" isDark={isDark}>
          <SettingRow label="Version" isDark={isDark}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>1.0.0</span>
          </SettingRow>
          <SettingRow label="Supported Databases" isDark={isDark}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>6 sources</span>
          </SettingRow>
          <SettingRow label="Storage" description="Papers saved locally" isDark={isDark}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>chrome.storage.local</span>
          </SettingRow>
        </SettingSection>

      </div>
    </div>
  )
}
