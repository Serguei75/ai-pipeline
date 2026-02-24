'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Film,
  BarChart3,
  Zap,
  Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',          label: 'Dashboard',  icon: LayoutDashboard, port: null },
  { href: '/topics',    label: 'Topics',     icon: Lightbulb,       port: '3001' },
  { href: '/scripts',   label: 'Scripts',    icon: FileText,        port: '3002' },
  { href: '/voice',     label: 'Voice',      icon: Mic,             port: '3003' },
  { href: '/media',     label: 'Media',      icon: Film,            port: '3004' },
  { href: '/analytics', label: 'Analytics',  icon: BarChart3,       port: '3005' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-gray-950 text-white flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 rounded-lg p-1.5">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">AI Pipeline</p>
            <p className="text-xs text-gray-500 mt-0.5">Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, port }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {port && (
                <span className={cn('text-xs', active ? 'text-blue-200' : 'text-gray-600')}>:{port}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-600">v1.0.0 · 6 modules</p>
        <p className="text-xs text-gray-700 mt-0.5">Ports 3000–3005</p>
      </div>
    </aside>
  )
}
