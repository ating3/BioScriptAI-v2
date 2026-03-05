import React from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, BookOpen, Archive, Settings, Sun, Moon, Zap } from 'lucide-react'
import useStore from '../store/useStore'
import bioscriptLogo from '../assets/BioscriptLogo.png'

const navItems = [
  { id: 'discovery', icon: FlaskConical, label: 'Discover' },
  { id: 'active-paper', icon: BookOpen, label: 'Paper' },
  { id: 'vault', icon: Archive, label: 'Vault' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

export default function TopNav() {
  const { theme, toggleTheme, sidebarState, setSidebarState, activePaper, deepResearch } = useStore()
  const isDark = theme === 'dark'

  return (
    <div
      className="flex flex-col"
      style={{
        borderBottom: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
        background: isDark ? '#252525' : '#FFFFFF',
      }}
    >
      {/* Logo Row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img
            src={bioscriptLogo}
            alt="Bioscript"
            style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }}
          />
          <span
            className="font-semibold tracking-tight"
            style={{ fontSize: 15, color: isDark ? '#DBEAFE' : '#1E3A5F' }}
          >
            Bioscript
          </span>
          {deepResearch && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: isDark ? '#1E3A5F' : '#DBEAFE', color: '#3B82F6', fontSize: 10 }}
            >
              <Zap size={9} />
              Deep
            </span>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: isDark ? '#383838' : '#EFF6FF',
            color: isDark ? '#93C5FD' : '#2563EB',
          }}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>

      {/* Nav Tabs */}
      <div className="flex px-3 pb-0 gap-1">
        {navItems.map((item) => {
          const isActive = sidebarState === item.id
          const hasPaperDot = item.id === 'active-paper' && activePaper
          return (
            <button
              key={item.id}
              onClick={() => setSidebarState(item.id)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium transition-colors"
              style={{
                color: isActive ? '#93C5FD' : isDark ? '#E2E8F0' : '#6B7280',
                background: isActive ? (isDark ? '#2E2E2E' : '#EFF6FF') : 'transparent',
                cursor: 'pointer',
                borderBottom: isActive ? `2px solid #93C5FD` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <item.icon size={13} />
              {item.label}
              {hasPaperDot && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#60A5FA', marginLeft: 1 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
