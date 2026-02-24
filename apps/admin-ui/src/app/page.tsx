'use client'

import { useQuery, useQueries } from '@tanstack/react-query'
import {
  checkServiceHealth, fetchTopics, fetchScripts, fetchMediaJobs,
  type ServiceName,
} from '@/lib/api'
import { formatNumber, timeAgo } from '@/lib/utils'
import {
  Activity, Lightbulb, FileText, Mic2, Film, BarChart3,
  RefreshCw, AlertCircle, CheckCircle2, WifiOff,
} from 'lucide-react'

const SERVICE_META: Record<ServiceName, { name: string; port: number; icon: React.ElementType; description: string }> = {
  topic:     { name: 'Topic Engine',     port: 3001, icon: Lightbulb, description: 'Trend discovery & niche analysis' },
  script:    { name: 'Script Engine',    port: 3002, icon: FileText,  description: 'AI script generation & hooks' },
  voice:     { name: 'Voice Engine',     port: 3003, icon: Mic2,      description: 'ElevenLabs TTS & localization' },
  media:     { name: 'Media Engine',     port: 3004, icon: Film,      description: 'HeyGen avatars & Pexels B-roll' },
  analytics: { name: 'Analytics Engine', port: 3005, icon: BarChart3, description: 'YouTube metrics & ROI' },
}

const STATUS_STYLES = {
  ok:      { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Online' },
  error:   { dot: 'bg-amber-400',   text: 'text-amber-400',   label: 'Error' },
  offline: { dot: 'bg-red-500',     text: 'text-red-400',     label: 'Offline' },
}

const HOOK_COLORS: Record<string, string> = {
  FEAR:      'bg-red-500/15 text-red-400',
  CURIOSITY: 'bg-violet-500/15 text-violet-400',
  SURPRISE:  'bg-amber-500/15 text-amber-400',
  DESIRE:    'bg-pink-500/15 text-pink-400',
  URGENCY:   'bg-orange-500/15 text-orange-400',
}

const SCRIPT_STATUS_STYLES: Record<string, string> = {
  COMPLETED:  'bg-emerald-500/15 text-emerald-400',
  GENERATING: 'bg-violet-500/15 text-violet-400',
  PENDING:    'bg-neutral-500/15 text-neutral-400',
  FAILED:     'bg-red-500/15 text-red-400',
}

export default function DashboardPage() {
  const services = Object.keys(SERVICE_META) as ServiceName[]

  const healthQueries = useQueries({
    queries: services.map((service) => ({
      queryKey: ['health', service],
      queryFn: () => checkServiceHealth(service),
      refetchInterval: 30_000,
    })),
  })

  const { data: topicsData } = useQuery({
    queryKey: ['topics', 'recent'],
    queryFn: () => fetchTopics({ limit: 8 }),
  })

  const { data: scriptsData } = useQuery({
    queryKey: ['scripts', 'recent'],
    queryFn: () => fetchScripts({ limit: 8 }),
  })

  const { data: mediaData } = useQuery({
    queryKey: ['media-jobs', 'recent'],
    queryFn: () => fetchMediaJobs({ limit: 6 }),
  })

  const onlineCount = healthQueries.filter((q) => q.data?.status === 'ok').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pipeline Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {onlineCount}/{services.length} services online
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <Activity className="w-3.5 h-3.5" />
          Auto-refresh every 30s
        </div>
      </div>

      {/* Pipeline Health */}
      <section>
        <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Service Health</h2>
        <div className="grid grid-cols-5 gap-3">
          {services.map((service, i) => {
            const meta = SERVICE_META[service]
            const health = healthQueries[i]
            const status = health.isLoading ? 'offline' : (health.data?.status ?? 'offline')
            const style = STATUS_STYLES[status]
            const Icon = meta.icon
            return (
              <div key={service} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-neutral-400" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ${status === 'ok' ? 'animate-pulse' : ''}`} />
                    <span className={`text-xs ${style.text}`}>{health.isLoading ? 'Checking...' : style.label}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">{meta.name}</p>
                  <p className="text-xs text-neutral-600 mt-0.5">{meta.description}</p>
                </div>
                <p className="text-xs text-neutral-700 font-mono">:{meta.port}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Activity Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Scripts */}
        <section className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-500" />
              <h2 className="text-sm font-medium">Recent Scripts</h2>
            </div>
            {scriptsData && (
              <span className="text-xs text-neutral-600">{scriptsData.count} total</span>
            )}
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {scriptsData?.data.map((script) => (
              <div key={script.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-neutral-600">{script.id.slice(0, 8)}</span>
                    <span className="text-xs text-neutral-500">{script.channelType}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {script.hookEmotionType && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${HOOK_COLORS[script.hookEmotionType] ?? 'bg-neutral-500/15 text-neutral-400'}`}>
                        {script.hookEmotionType}
                      </span>
                    )}
                    {script.hookScore && (
                      <span className="text-[10px] text-neutral-600">score {script.hookScore}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${SCRIPT_STATUS_STYLES[script.status] ?? 'bg-neutral-500/15 text-neutral-400'}`}>
                    {script.status}
                  </span>
                  <p className="text-[10px] text-neutral-700 mt-1">{timeAgo(script.createdAt)}</p>
                </div>
              </div>
            )) ?? (
              <div className="px-4 py-8 text-center text-sm text-neutral-700">No scripts yet</div>
            )}
          </div>
        </section>

        {/* Right column: Topics + Media */}
        <div className="space-y-4">
          {/* Recent Topics */}
          <section className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-neutral-500" />
              <h2 className="text-sm font-medium">Recent Topics</h2>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {topicsData?.data.slice(0, 4).map((topic) => (
                <div key={topic.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-sm text-neutral-300 truncate">{topic.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-neutral-600">{topic.niche}</span>
                    {topic.hookScore && (
                      <span className="text-xs font-mono text-violet-400">{topic.hookScore}</span>
                    )}
                  </div>
                </div>
              )) ?? (
                <div className="px-4 py-6 text-center text-sm text-neutral-700">No topics yet</div>
              )}
            </div>
          </section>

          {/* Media Jobs */}
          <section className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center gap-2">
              <Film className="w-4 h-4 text-neutral-500" />
              <h2 className="text-sm font-medium">Media Jobs</h2>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {mediaData?.data.slice(0, 4).map((job) => (
                <div key={job.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-neutral-600">{job.id.slice(0, 8)}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{job.channelType} · {job.contentFormat}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${SCRIPT_STATUS_STYLES[job.status] ?? 'bg-neutral-500/15 text-neutral-400'}`}>
                    {job.status}
                  </span>
                </div>
              )) ?? (
                <div className="px-4 py-6 text-center text-sm text-neutral-700">No media jobs</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
