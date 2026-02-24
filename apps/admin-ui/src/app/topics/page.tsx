'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchTopics, createTopic } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { Plus, Lightbulb, Search } from 'lucide-react'

const NICHES = ['FINANCE', 'SAAS', 'EDUCATION', 'HEALTH', 'TECH', 'MARKETING', 'CRYPTO']

export default function TopicsPage() {
  const qc = useQueryClient()
  const [niche, setNiche] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', niche: 'FINANCE' })

  const { data, isLoading } = useQuery({
    queryKey: ['topics', niche],
    queryFn: () => fetchTopics({ niche: niche || undefined, limit: 50 }),
  })

  const mutation = useMutation({
    mutationFn: createTopic,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] })
      setShowForm(false)
      setForm({ title: '', niche: 'FINANCE' })
    },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Topics</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{data?.count ?? 0} topics tracked</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Topic
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">Add Topic</p>
          <input
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-violet-600"
            placeholder="Topic title e.g. AI is replacing financial advisors"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="flex items-center gap-3">
            <select
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
            >
              {NICHES.map((n) => <option key={n}>{n}</option>)}
            </select>
            <button
              disabled={!form.title || mutation.isPending}
              onClick={() => mutation.mutate(form)}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {mutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
          {mutation.isError && (
            <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>
          )}
        </div>
      )}

      {/* Niche filter */}
      <div className="flex items-center gap-2">
        {['', ...NICHES].map((n) => (
          <button
            key={n}
            onClick={() => setNiche(n)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              niche === n ? 'bg-violet-600 text-white' : 'bg-[#111] border border-[#1f1f1f] text-neutral-400 hover:text-white'
            }`}
          >
            {n || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f1f1f]">
              {['Title', 'Niche', 'Hook Score', 'Status', 'Research', 'Created'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-neutral-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-600">Loading...</td></tr>
            ) : data?.data.map((topic) => (
              <tr key={topic.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm text-neutral-200 max-w-xs truncate">{topic.title}</p>
                  <p className="text-xs text-neutral-600 font-mono">{topic.id.slice(0, 8)}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded">{topic.niche}</span>
                </td>
                <td className="px-4 py-3">
                  {topic.hookScore ? (
                    <span className="text-sm font-mono text-violet-400">{topic.hookScore}</span>
                  ) : <span className="text-neutral-700">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    topic.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' :
                    topic.status === 'PENDING' ? 'bg-neutral-500/15 text-neutral-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>{topic.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">{topic.researchStatus}</td>
                <td className="px-4 py-3 text-xs text-neutral-600">{timeAgo(topic.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
