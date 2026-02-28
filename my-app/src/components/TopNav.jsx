import React from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, BookOpen, Archive, Settings, Sun, Moon, Zap } from 'lucide-react'
import useStore from '../store/useStore'

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
        borderBottom: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
        background: isDark ? '#111111' : '#FFFFFF',
      }}
    >
      {/* Logo Row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}
          >
            <FlaskConical size={14} color="white" strokeWidth={2.5} />
          </div>
          <span
            className="font-semibold tracking-tight"
            style={{ fontSize: 15, color: isDark ? '#F9FAFB' : '#111827' }}
          >
            Bioscript
          </span>
          {deepResearch && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'linear-gradient(135deg, #7C3AED22, #2563EB22)', color: '#7C3AED', fontSize: 10 }}
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
            background: isDark ? '#1F2937' : '#F3F4F6',
            color: isDark ? '#9CA3AF' : '#6B7280',
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
                color: isActive ? '#2563EB' : isDark ? '#9CA3AF' : '#6B7280',
                background: isActive ? (isDark ? '#0D0D0D' : '#F9FAFB') : 'transparent',
                cursor: 'pointer',
                borderBottom: isActive ? `2px solid #2563EB` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <item.icon size={13} />
              {item.label}
              {hasPaperDot && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#15803D', marginLeft: 1 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
