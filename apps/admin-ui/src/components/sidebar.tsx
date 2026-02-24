'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Lightbulb, FileText, Mic2, Film, BarChart3, Zap } from 'lucide-react'

const NAV = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/topics',    label: 'Topics',    icon: Lightbulb },
  { href: '/scripts',   label: 'Scripts',   icon: FileText },
  { href: '/voice',     label: 'Voice',     icon: Mic2 },
  { href: '/media',     label: 'Media',     icon: Film },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
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
        {NAV.map(({ href, label, icon: Icon }) => {
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
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer badge */}
      <div className="p-4 border-t border-[#1f1f1f]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs text-neutral-600">6/6 modules built</p>
        </div>
        <p className="text-[10px] text-neutral-700 mt-0.5">v1.0.0 · production-ready</p>
      </div>
    </aside>
  )
}
