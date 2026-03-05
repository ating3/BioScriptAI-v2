import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Key, Eye, EyeOff, Save, Check, Sparkles, Info, LogOut, LogIn, User
} from 'lucide-react'
import useStore from '../store/useStore'
import { signInWithGoogle, signOut } from '../lib/googleAuth'

function SettingSection({ title, children, isDark }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: isDark ? '#252525' : '#FFFFFF',
        borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
      }}
    >
      <div
        className="px-4 py-2.5 border-b"
        style={{ borderColor: isDark ? '#3A3A3A' : '#F3F4F6' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#93C5FD' : '#2563EB', fontSize: 10 }}>
          {title}
        </p>
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, description, children, isDark }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium" style={{ color: isDark ? '#E2E8F0' : '#111827' }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: isDark ? '#94A3B8' : '#9CA3AF', fontSize: 10 }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange, color = '#3B82F6' }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-9 h-5 rounded-full transition-colors"
      style={{ background: value ? color : '#CBD5E1' }}
    >
      <motion.div
        animate={{ x: value ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
      />
    </button>
  )
}

export default function SettingsView() {
  const {
    theme, toggleTheme,
    apiKey, setApiKey,
    researchInterest, setResearchInterest,
    deepResearch, toggleDeepResearch,
    googleUser, googleToken, setGoogleUser, setGoogleToken, clearGoogleSession,
  } = useStore()
  const isDark = theme === 'dark'

  const [showKey, setShowKey] = useState(false)
  const [keyInput, setKeyInput] = useState(apiKey)
  const [saved, setSaved] = useState(false)
  const [interestInput, setInterestInput] = useState(researchInterest)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

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

  const handleSignIn = async () => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const { token, user } = await signInWithGoogle()
      setGoogleUser(user)
      setGoogleToken(token)
    } catch (e) {
      setAuthError(e.message || 'Sign-in failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    setAuthLoading(true)
    try {
      await signOut(googleToken)
    } catch {}
    clearGoogleSession()
    setAuthLoading(false)
  }

  return (
    <div
      className="h-full overflow-y-auto scrollbar-thin"
      style={{ background: isDark ? '#1E1E1E' : '#F9FAFB' }}
    >
      <div className="p-4 space-y-4">

        {/* Appearance */}
        <SettingSection title="Appearance" isDark={isDark}>
          <SettingRow
            label="Dark Mode"
            description="Toggle between light and dark theme"
            isDark={isDark}
          >
            <Toggle value={isDark} onChange={toggleTheme} color="#3B82F6" />
          </SettingRow>
        </SettingSection>

        {/* API Configuration */}
        <SettingSection title="AI Configuration" isDark={isDark}>
          <div className="px-4 py-3">
            <p className="text-xs font-medium mb-2" style={{ color: isDark ? '#E2E8F0' : '#111827' }}>
              OpenAI API Key
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-2"
              style={{
                background: isDark ? '#2E2E2E' : '#F9FAFB',
                borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
              }}
            >
              <Key size={12} style={{ color: isDark ? '#93C5FD' : '#2563EB' }} />
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-proj-…"
                className="flex-1 bg-transparent outline-none text-xs font-mono"
                style={{ color: isDark ? '#E2E8F0' : '#111827' }}
              />
              <button onClick={() => setShowKey(!showKey)} style={{ color: isDark ? '#93C5FD' : '#2563EB' }}>
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-start gap-1.5 flex-1 p-2 rounded-lg"
                style={{ background: isDark ? '#1E3A5F' : '#EFF6FF' }}
              >
                <Info size={10} style={{ color: '#3B82F6', marginTop: 1 }} />
                <p style={{ fontSize: 10, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 1.4 }}>
                  Your key is stored locally and never sent to Bioscript servers.
                </p>
              </div>
              <button
                onClick={saveApiKey}
                onMouseEnter={e => { if (!saved) e.currentTarget.style.background = isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)' }}
                onMouseLeave={e => { if (!saved) e.currentTarget.style.background = isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(147, 197, 253, 0.4)' }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: saved ? (isDark ? '#1E3A5F' : '#EFF6FF') : (isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(147, 197, 253, 0.4)'),
                  color: saved ? '#60A5FA' : (isDark ? 'white' : '#1E40AF'),
                }}
              >
                {saved ? <Check size={11} /> : <Save size={11} />}
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

        </SettingSection>

        {/* Research Focus */}
        <SettingSection title="Research Profile" isDark={isDark}>
          <div className="px-4 py-3">
            <p className="text-xs font-medium mb-1" style={{ color: isDark ? '#E2E8F0' : '#111827' }}>
              Research Interest
            </p>
            <p className="text-xs mb-2" style={{ color: isDark ? '#94A3B8' : '#9CA3AF', fontSize: 10 }}>
              AI will prioritize gaps and evidence relevant to your field
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-2"
              style={{
                background: isDark ? '#2E2E2E' : '#F9FAFB',
                borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
              }}
            >
              <Sparkles size={12} style={{ color: '#60A5FA' }} />
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                placeholder="e.g. Neuroimmunology, CRISPR, mRNA vaccines…"
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: isDark ? '#E2E8F0' : '#111827' }}
              />
            </div>
            <button
              onClick={saveInterest}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(147, 197, 253, 0.4)' }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(147, 197, 253, 0.4)', color: isDark ? 'white' : '#1E40AF' }}
            >
              <Save size={11} />
              Save Focus
            </button>
          </div>
        </SettingSection>

        {/* Google Account */}
        <SettingSection title="Google Account" isDark={isDark}>
          {googleUser ? (
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                {googleUser.picture ? (
                  <img
                    src={googleUser.picture}
                    alt={googleUser.name}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: isDark ? '#1E3A5F' : '#DBEAFE' }}
                  >
                    <User size={18} style={{ color: '#3B82F6' }} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: isDark ? '#E2E8F0' : '#111827' }}>
                    {googleUser.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: isDark ? '#94A3B8' : '#9CA3AF', fontSize: 10 }}>
                    {googleUser.email}
                  </p>
                </div>
              </div>
              <div
                className="flex items-start gap-1.5 p-2 rounded-lg mb-3"
                style={{ background: isDark ? '#1E3A5F' : '#EFF6FF' }}
              >
                <Check size={10} style={{ color: '#3B82F6', marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 10, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 1.4 }}>
                  Your vault data is tied to this Google account. Link folders to Google Docs in the Vault tab.
                </p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={authLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: isDark ? '#2E2E2E' : '#F3F4F6',
                  color: '#60A5FA',
                  border: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
                  opacity: authLoading ? 0.6 : 1,
                }}
              >
                <LogOut size={11} />
                {authLoading ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : (
            <div className="px-4 py-3">
              <p className="text-xs mb-2" style={{ color: isDark ? '#94A3B8' : '#9CA3AF', lineHeight: 1.5, fontSize: 10 }}>
                Sign in to sync your vault across devices and connect project folders to Google Docs for automatic citation export.
              </p>
              {authError && (
                <p className="text-xs mb-2" style={{ color: '#60A5FA', fontSize: 10 }}>
                  {authError}
                </p>
              )}
              <button
                onClick={handleSignIn}
                disabled={authLoading}
                onMouseEnter={e => { if (!authLoading) e.currentTarget.style.background = isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)' }}
                onMouseLeave={e => { if (!authLoading) e.currentTarget.style.background = authLoading ? (isDark ? '#2E2E2E' : '#F3F4F6') : (isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(147, 197, 253, 0.4)') }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: authLoading ? (isDark ? '#2E2E2E' : '#F3F4F6') : (isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(147, 197, 253, 0.4)'),
                  color: authLoading ? (isDark ? '#94A3B8' : '#9CA3AF') : (isDark ? 'white' : '#1E40AF'),
                  opacity: authLoading ? 0.8 : 1,
                }}
              >
                <LogIn size={12} />
                {authLoading ? 'Signing in…' : 'Sign in with Google'}
              </button>
            </div>
          )}
        </SettingSection>

        {/* About */}
        <SettingSection title="About" isDark={isDark}>
          <SettingRow label="Version" isDark={isDark}>
            <span style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#9CA3AF' }}>1.0.0</span>
          </SettingRow>
        </SettingSection>

      </div>
    </div>
  )
}
