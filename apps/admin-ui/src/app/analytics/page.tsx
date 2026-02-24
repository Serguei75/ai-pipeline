'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  fetchChannelDashboard, fetchHookPerformance, fetchNicheReport, fetchRevenueEstimate,
  type HookPerformanceItem, type NichePerformanceItem,
} from '@/lib/api'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { TrendingUp, Users, Tv2, Eye, DollarSign, MousePointerClick } from 'lucide-react'

const HOOK_COLORS: Record<string, string> = {
  FEAR:      'bg-red-500/15 text-red-400',
  CURIOSITY: 'bg-violet-500/15 text-violet-400',
  SURPRISE:  'bg-amber-500/15 text-amber-400',
  DESIRE:    'bg-pink-500/15 text-pink-400',
  URGENCY:   'bg-orange-500/15 text-orange-400',
}

const PERF_STYLES = {
  above:   'bg-emerald-500/15 text-emerald-400',
  at:      'bg-blue-500/15 text-blue-400',
  below:   'bg-red-500/15 text-red-400',
  no_data: 'bg-neutral-500/15 text-neutral-500',
}
const PERF_LABELS = { above: '↑ Above', at: '≈ At', below: '↓ Below', no_data: 'No data' }

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center gap-2 text-neutral-500 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-neutral-600 mt-1">{sub}</p>}
    </div>
  )
}

function HookBar({ value }: { value: number | null }) {
  const v = value ?? 0
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-[#1a1a1a] rounded-full h-1.5">
        <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(v, 100)}%` }} />
      </div>
      <span className="text-xs text-neutral-400 w-10 text-right">{value?.toFixed(1) ?? '—'}%</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [channelType, setChannelType] = useState<'INTELLECTUAL' | 'FUEL'>('INTELLECTUAL')
  const [estimateForm, setEstimateForm] = useState({ niche: 'FINANCE', targetViews: 50000 })
  const [showEstimate, setShowEstimate] = useState(false)

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', channelType],
    queryFn: () => fetchChannelDashboard(channelType),
  })

  const { data: hooksData } = useQuery({
    queryKey: ['hooks'],
    queryFn: fetchHookPerformance,
  })

  const { data: nicheData } = useQuery({
    queryKey: ['niches'],
    queryFn: fetchNicheReport,
  })

  const { data: estimate, isFetching: estimateFetching, refetch: fetchEstimate } = useQuery({
    queryKey: ['estimate', estimateForm.niche, estimateForm.targetViews],
    queryFn: () => fetchRevenueEstimate({ niche: estimateForm.niche, markets: ['US', 'AU'], targetViews: estimateForm.targetViews }),
    enabled: showEstimate,
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header + Channel selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-neutral-500 mt-0.5">YouTube metrics · Hook performance · ROI</p>
        </div>
        <div className="flex bg-[#111] border border-[#1f1f1f] rounded-lg p-0.5">
          {(['INTELLECTUAL', 'FUEL'] as const).map((c) => (
            <button key={c} onClick={() => setChannelType(c)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                channelType === c ? 'bg-violet-600 text-white' : 'text-neutral-500 hover:text-white'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard icon={Eye}            label="Total Views"  value={dashboard ? formatNumber(dashboard.totalViews) : '—'} />
        <StatCard icon={DollarSign}     label="Total Revenue" value={formatCurrency(dashboard?.totalRevenue ?? null)} />
        <StatCard icon={TrendingUp}     label="Avg CPM"        value={dashboard?.avgCpm ? `$${dashboard.avgCpm.toFixed(2)}` : '—'} />
        <StatCard icon={MousePointerClick} label="Avg CTR"    value={dashboard?.avgCtr ? `${dashboard.avgCtr.toFixed(1)}%` : '—'} />
        <StatCard icon={TrendingUp}     label="Avg Retention"  value={dashboard?.avgRetention ? `${dashboard.avgRetention.toFixed(1)}%` : '—'} />
        <StatCard icon={Tv2}            label="CTV Watch%"     value={dashboard?.ctvPercentage ? `${dashboard.ctvPercentage.toFixed(1)}%` : '—'} sub="Benchmark: 45%" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Hook Performance */}
        <section className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f1f1f]">
            <h2 className="text-sm font-medium">Hook Performance</h2>
            <p className="text-xs text-neutral-600 mt-0.5">Sorted by retention at 8 seconds — the hook decision window</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                {['Emotion', 'Retention @8s', 'CTR', 'Avg Views', 'Avg Revenue', 'Videos'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-neutral-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {hooksData?.data.map((hook: HookPerformanceItem, i) => (
                <tr key={hook.emotionType} className="hover:bg-white/[0.015]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500 w-4">{i + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${HOOK_COLORS[hook.emotionType] ?? 'bg-neutral-500/15 text-neutral-400'}`}>
                        {hook.emotionType}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><HookBar value={hook.avgRetentionAt8Sec} /></td>
                  <td className="px-4 py-3 text-sm">{hook.avgCtr?.toFixed(1) ?? '—'}%</td>
                  <td className="px-4 py-3 text-sm font-mono">{formatNumber(hook.avgViews)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400">{hook.avgRevenue ? `$${hook.avgRevenue.toFixed(0)}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{hook.videoCount}</td>
                </tr>
              )) ?? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-700">No data — publish videos first</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Niche CPM */}
        <section className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f1f1f]">
            <h2 className="text-sm font-medium">Niche CPM vs Benchmark</h2>
            <p className="text-xs text-neutral-600 mt-0.5">Actual CPM compared to Q1 2026 US market data</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                {['Niche', 'Actual CPM', 'Benchmark', 'vs Market', 'Videos', 'Total Views'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-neutral-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {nicheData?.data.map((niche: NichePerformanceItem) => (
                <tr key={niche.niche} className="hover:bg-white/[0.015]">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-neutral-200">{niche.niche}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {niche.avgCpm ? <span className="text-emerald-400">${niche.avgCpm.toFixed(2)}</span> : <span className="text-neutral-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {niche.benchmarkCpmMin ? `$${niche.benchmarkCpmMin}–$${niche.benchmarkCpmMax}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${PERF_STYLES[niche.performanceVsBenchmark]}`}>
                      {PERF_LABELS[niche.performanceVsBenchmark]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{niche.videoCount}</td>
                  <td className="px-4 py-3 text-sm font-mono text-neutral-400">{formatNumber(niche.totalViews)}</td>
                </tr>
              )) ?? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-700">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {/* Revenue Estimator */}
      <section className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
        <h2 className="text-sm font-medium mb-1">Revenue Estimator</h2>
        <p className="text-xs text-neutral-600 mb-4">Estimate earnings before publishing — based on niche CPM benchmarks (RPM = CPM × 0.55)</p>
        <div className="flex items-end gap-3">
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Niche</label>
            <select
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={estimateForm.niche}
              onChange={(e) => setEstimateForm({ ...estimateForm, niche: e.target.value })}
            >
              {['FINANCE', 'SAAS', 'EDUCATION', 'HEALTH', 'TECH', 'MARKETING', 'CRYPTO'].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Target Views</label>
            <input
              type="number"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm w-32 focus:outline-none"
              value={estimateForm.targetViews}
              onChange={(e) => setEstimateForm({ ...estimateForm, targetViews: parseInt(e.target.value) || 0 })}
            />
          </div>
          <button
            onClick={() => { setShowEstimate(true); fetchEstimate() }}
            className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {estimateFetching ? 'Calculating...' : 'Estimate'}
          </button>

          {estimate && (
            <div className="flex items-center gap-6 ml-4 pl-4 border-l border-[#1f1f1f]">
              <div>
                <p className="text-xs text-neutral-600">Est. Revenue</p>
                <p className="text-xl font-semibold text-emerald-400">{formatCurrency(estimate.estimatedRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">RPM</p>
                <p className="text-sm font-mono">${estimate.estimatedRpm.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Benchmark CPM</p>
                <p className="text-sm font-mono">${estimate.benchmarkCpmAvg.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Break-even</p>
                <p className="text-sm font-mono">{formatNumber(estimate.breakEvenViews)} views = $10</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
