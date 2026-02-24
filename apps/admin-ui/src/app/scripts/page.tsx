'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchScripts } from '@/lib/api'
import { formatDuration, timeAgo } from '@/lib/utils'
import { FileText } from 'lucide-react'

const STATUSES = ['', 'PENDING', 'GENERATING', 'COMPLETED', 'FAILED']
const CHANNELS = ['', 'INTELLECTUAL', 'FUEL']
const HOOK_COLORS: Record<string, string> = {
  FEAR:      'bg-red-500/15 text-red-400',
  CURIOSITY: 'bg-violet-500/15 text-violet-400',
  SURPRISE:  'bg-amber-500/15 text-amber-400',
  DESIRE:    'bg-pink-500/15 text-pink-400',
  URGENCY:   'bg-orange-500/15 text-orange-400',
}

export default function ScriptsPage() {
  const [status, setStatus] = useState('')
  const [channelType, setChannelType] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['scripts', status, channelType],
    queryFn: () => fetchScripts({ status: status || undefined, channelType: channelType || undefined, limit: 50 }),
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Scripts</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{data?.count ?? 0} scripts generated</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === s ? 'bg-violet-600 text-white' : 'bg-[#111] border border-[#1f1f1f] text-neutral-400 hover:text-white'
              }`}>
              {s || 'All Status'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {CHANNELS.map((c) => (
            <button key={c} onClick={() => setChannelType(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                channelType === c ? 'bg-blue-600 text-white' : 'bg-[#111] border border-[#1f1f1f] text-neutral-400 hover:text-white'
              }`}>
              {c || 'All Channels'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f1f1f]">
              {['Script ID', 'Channel', 'Format', 'Hook', 'Score', 'Duration', 'Status', 'Created'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-neutral-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-600">Loading...</td></tr>
            ) : data?.data.map((script) => (
              <tr key={script.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{script.id.slice(0, 12)}…</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    script.channelType === 'INTELLECTUAL' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>{script.channelType}</span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">{script.contentFormat}</td>
                <td className="px-4 py-3">
                  {script.hookEmotionType ? (
                    <span className={`text-xs px-2 py-0.5 rounded ${HOOK_COLORS[script.hookEmotionType] ?? ''}`}>
                      {script.hookEmotionType}
                    </span>
                  ) : <span className="text-neutral-700">—</span>}
                </td>
                <td className="px-4 py-3 font-mono text-sm">
                  {script.hookScore ? <span className="text-violet-400">{script.hookScore}</span> : <span className="text-neutral-700">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-400">{formatDuration(script.estimatedDurationSec)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    script.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' :
                    script.status === 'GENERATING' ? 'bg-violet-500/15 text-violet-400' :
                    script.status === 'FAILED' ? 'bg-red-500/15 text-red-400' :
                    'bg-neutral-500/15 text-neutral-400'
                  }`}>{script.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-600">{timeAgo(script.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
