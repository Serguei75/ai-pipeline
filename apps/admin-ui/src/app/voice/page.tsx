'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchVoiceJobs } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { Mic2 } from 'lucide-react'

export default function VoicePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['voice-jobs'],
    queryFn: () => fetchVoiceJobs({ limit: 50 }),
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Mic2 className="w-5 h-5 text-neutral-500" />
        <div>
          <h1 className="text-xl font-semibold">Voice Engine</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{data?.count ?? 0} voice jobs · ElevenLabs TTS + multi-language</p>
        </div>
      </div>
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f1f1f]">
              {['Job ID', 'Script ID', 'Language', 'Voice', 'Status', 'Created'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-neutral-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-600">Loading...</td></tr>
            ) : !data?.data.length ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-700">No voice jobs yet</td></tr>
            ) : data.data.map((job) => (
              <tr key={job.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{job.id.slice(0, 12)}…</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-600">{job.scriptId.slice(0, 12)}…</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded">{job.language}</span></td>
                <td className="px-4 py-3 text-xs text-neutral-400">{job.voiceId}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    job.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' :
                    job.status === 'FAILED' ? 'bg-red-500/15 text-red-400' :
                    job.status === 'PROCESSING' ? 'bg-violet-500/15 text-violet-400' :
                    'bg-neutral-500/15 text-neutral-400'
                  }`}>{job.status}</span>
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
