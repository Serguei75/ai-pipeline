'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchMediaJobs } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { Film } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  PENDING:           'bg-neutral-500/15 text-neutral-400',
  AVATAR_GENERATING: 'bg-violet-500/15 text-violet-400',
  BROLL_FETCHING:    'bg-blue-500/15 text-blue-400',
  ASSEMBLY_READY:    'bg-amber-500/15 text-amber-400',
  COMPLETED:         'bg-emerald-500/15 text-emerald-400',
  FAILED:            'bg-red-500/15 text-red-400',
}

export default function MediaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['media-jobs-all'],
    queryFn: () => fetchMediaJobs({ limit: 50 }),
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Film className="w-5 h-5 text-neutral-500" />
        <div>
          <h1 className="text-xl font-semibold">Media Engine</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{data?.count ?? 0} media jobs · HeyGen avatars + Pexels B-roll</p>
        </div>
      </div>
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f1f1f]">
              {['Job ID', 'Script ID', 'Channel', 'Format', 'Status', 'Created'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-neutral-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-600">Loading...</td></tr>
            ) : !data?.data.length ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-700">No media jobs yet</td></tr>
            ) : data.data.map((job) => (
              <tr key={job.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{job.id.slice(0, 12)}…</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-600">{job.scriptId.slice(0, 12)}…</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    job.channelType === 'INTELLECTUAL' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>{job.channelType}</span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">{job.contentFormat}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[job.status] ?? 'bg-neutral-500/15 text-neutral-400'}`}>
                    {job.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-600">{timeAgo(job.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
