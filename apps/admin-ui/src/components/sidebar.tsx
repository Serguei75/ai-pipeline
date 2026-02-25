'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Lightbulb, FileText, Mic2,
  Film, BarChart3, MessageCircle, Globe, ChevronRight,
} from 'lucide-react'
import { useI18n } from './i18n-provider'
import { LOCALES } from '@/lib/i18n'

export function Sidebar() {
  const pathname = usePathname()
  const { t, locale, setLocale } = useI18n()

  const NAV = [
    { href: '/',             label: t.sidebar.dashboard,    icon: LayoutDashboard },
    { href: '/topics',       label: t.sidebar.topics,       icon: Lightbulb },
    { href: '/scripts',      label: t.sidebar.scripts,      icon: FileText },
    { href: '/voice',        label: t.sidebar.voice,        icon: Mic2 },
    { href: '/media',        label: t.sidebar.media,        icon: Film },
    { href: '/analytics',    label: t.sidebar.analytics,    icon: BarChart3 },
    { href: '/community',    label: t.sidebar.community,    icon: MessageCircle },
    { href: '/localization', label: t.sidebar.localization, icon: Globe },
  ]

  return (
    <aside className="w-56 min-h-screen bg-[#111] border-r border-[#1f1f1f] flex flex-col shrink-0">
      {/* Logo + Language switcher */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#1f1f1f]">
        <div>
          <p className="text-sm font-semibold leading-none">AI Pipeline</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            {locale === 'ru' ? 'Панель управления' : 'Control Center'}
          </p>
        </div>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as 'en' | 'ru')}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-[10px] px-1.5 py-1 cursor-pointer text-neutral-300 hover:border-[#3a3a3a] transition-colors"
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-[#1f1f1f] text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-neutral-600" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1f1f1f]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs text-neutral-600">{t.sidebar.footerModules}</p>
        </div>
        <p className="text-[10px] text-neutral-700 mt-0.5">{t.sidebar.footerVersion}</p>
      </div>
    </aside>
  )
}
