import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toFixed(1)}%`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    PENDING:           'bg-amber-100 text-amber-700',
    APPROVED:          'bg-green-100 text-green-700',
    REJECTED:          'bg-red-100 text-red-700',
    DRAFT:             'bg-gray-100 text-gray-600',
    PROCESSING:        'bg-blue-100 text-blue-700',
    COMPLETED:         'bg-green-100 text-green-700',
    FAILED:            'bg-red-100 text-red-700',
    READY:             'bg-green-100 text-green-700',
    RUNNING:           'bg-blue-100 text-blue-700',
    AVATAR_GENERATING: 'bg-purple-100 text-purple-700',
    BROLL_FETCHING:    'bg-indigo-100 text-indigo-700',
    ASSEMBLY_READY:    'bg-teal-100 text-teal-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function getRetentionColor(value: number | null): string {
  if (value == null) return 'text-gray-400'
  if (value >= 80) return 'text-green-600 font-semibold'
  if (value >= 70) return 'text-amber-600 font-semibold'
  return 'text-red-600 font-semibold'
}
