'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Lightbulb, FileText, Mic2, Film, BarChart3, Zap } from 'lucide-react'
import { useLanguage, type Locale } from '@/contexts/language'

const NAV_KEYS = [
  { href: '/',          key: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/topics',    key: 'nav.topics',    icon: Lightbulb },
  { href: '/scripts',   key: 'nav.scripts',   icon: FileText },
  { href: '/voice',     key: 'nav.voice',     icon: Mic2 },
  { href: '/media',     key: 'nav.media',     icon: Film },
  { href: '/analytics', key: 'nav.analytics', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { locale, setLocale, t } = useLanguage()

  return (
    <aside className="w-56 min-h-screen bg-[#111] border-r border-[#1f1f1f] flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#1f1f1f]">
        <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-blue-500 rounded-lg flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">AI Pipeline</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Control Center</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_KEYS.map(({ href, key, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-violet-600/15 text-violet-400 font-medium'
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {t(key)}
            </Link>
          )
        })}
      </nav>

      {/* Language toggle + Footer */}
      <div className="p-3 border-t border-[#1f1f1f] space-y-3">
        {/* Language switcher */}
        <div className="flex bg-[#1a1a1a] rounded-lg p-0.5">
          {(['en', 'ru'] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                locale === l
                  ? 'bg-violet-600 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <span>{l === 'en' ? '🇬🇧' : '🇷🇺'}</span>
              <span>{l === 'en' ? 'EN' : 'РУ'}</span>
            </button>
          ))}
        </div>

        {/* Build info */}
        <div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-neutral-600">{t('nav.modules_built')}</p>
          </div>
          <p className="text-[10px] text-neutral-700 mt-0.5">{t('nav.version')}</p>
        </div>
      </div>
    </aside>
  )
}
