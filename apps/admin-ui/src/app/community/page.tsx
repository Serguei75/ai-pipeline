'use client'
import { useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { MessageCircle, RefreshCw, Zap, ExternalLink, CheckCircle, XCircle } from 'lucide-react'

const COMMUNITY_API = process.env.NEXT_PUBLIC_COMMUNITY_ENGINE_URL || 'http://localhost:3006'

export default function CommunityPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'comments' | 'drafts' | 'topics'>('comments')
  const [videoId, setVideoId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSync = async () => {
    if (!videoId.trim()) return
    setSyncing(true)
    setMessage(null)
    try {
      const res = await fetch(`${COMMUNITY_API}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoYoutubeId: videoId.trim() }),
      })
      const data = await res.json()
      setMessage(t.common.save + ` OK — synced ${data.synced ?? 0}`)
    } catch {
      setMessage(t.common.error)
    } finally {
      setSyncing(false)
    }
  }

  const handleClassify = async () => {
    setClassifying(true)
    setMessage(null)
    try {
      const res = await fetch(`${COMMUNITY_API}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 30 }),
      })
      const data = await res.json()
      setMessage(`Обработано: ${data.processed ?? 0} комментариев`)
    } catch {
      setMessage(t.common.error)
    } finally {
      setClassifying(false)
    }
  }

  const tabs = [
    { key: 'comments' as const, label: t.community.comments },
    { key: 'drafts' as const, label: t.community.drafts },
    { key: 'topics' as const, label: t.community.topics },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-semibold">{t.community.title}</h1>
        </div>
        <a
          href={`${COMMUNITY_API}/stats`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white"
        >
          API <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Sync row */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          placeholder={t.community.videoId}
          className="flex-1 max-w-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#3a3a3a]"
        />
        <button
          onClick={handleSync}
          disabled={syncing || !videoId.trim()}
          className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {t.community.sync}
        </button>
        <button
          onClick={handleClassify}
          disabled={classifying}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className={`w-3.5 h-3.5 ${classifying ? 'animate-pulse' : ''}`} />
          {t.community.classify}
        </button>
      </div>

      {message && (
        <p className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-3 py-2">
          {message}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1f1f1f]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg">
        {activeTab === 'comments' && (
          <CommentsList apiUrl={COMMUNITY_API} t={t} />
        )}
        {activeTab === 'drafts' && (
          <DraftsList apiUrl={COMMUNITY_API} t={t} />
        )}
        {activeTab === 'topics' && (
          <TopicsList apiUrl={COMMUNITY_API} t={t} />
        )}
      </div>
    </div>
  )
}

function CommentsList({ apiUrl, t }: { apiUrl: string; t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <div className="p-8 text-center">
      <p className="text-neutral-500 text-sm">{t.community.empty}</p>
      <p className="text-neutral-600 text-xs mt-2">
        GET {apiUrl}/comments?channelType=INTELLECTUAL&type=QUESTION
      </p>
    </div>
  )
}

function DraftsList({ apiUrl, t }: { apiUrl: string; t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <div className="p-8 text-center">
      <div className="flex justify-center gap-8 text-xs text-neutral-600">
        <div className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-500" /> {t.community.approve}</div>
        <div className="flex items-center gap-1.5"><XCircle className="w-3 h-3 text-red-500" /> {t.community.decline}</div>
      </div>
      <p className="text-neutral-500 text-sm mt-4">{t.community.pending}</p>
      <p className="text-neutral-600 text-xs mt-2">GET {apiUrl}/drafts?status=NEW</p>
    </div>
  )
}

function TopicsList({ apiUrl, t }: { apiUrl: string; t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <div className="p-8 text-center">
      <p className="text-neutral-500 text-sm">{t.community.topics}</p>
      <p className="text-neutral-600 text-xs mt-2">
        GET {apiUrl}/topics — POST {apiUrl}/topics/:id/export
      </p>
    </div>
  )
}
