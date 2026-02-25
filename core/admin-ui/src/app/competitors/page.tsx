'use client'

import { useState, useEffect, useCallback } from 'react'

const GW = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100'

const HOOK_META: Record<string, { emoji: string; color: string }> = {
  fear:         { emoji: '🚨', color: 'text-red-400' },
  curiosity:    { emoji: '🤔', color: 'text-blue-400' },
  surprise:     { emoji: '🤯', color: 'text-yellow-400' },
  desire:       { emoji: '✨', color: 'text-purple-400' },
  social_proof: { emoji: '🔥', color: 'text-green-400' },
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH:   'bg-red-900/40 text-red-300 border-red-700',
  MEDIUM: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  LOW:    'bg-gray-800 text-gray-500 border-gray-700',
}

type Tab = 'channels' | 'trends' | 'ideas'

export default function CompetitorsPage() {
  const [tab, setTab]           = useState<Tab>('channels')
  const [channels, setChannels] = useState<any[]>([])
  const [trends, setTrends]     = useState<any>(null)
  const [ideas, setIdeas]       = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // ─ форма добавления канала
  const [channelUrl, setChannelUrl] = useState('')
  const [niche, setNiche]           = useState('')
  const [adding, setAdding]         = useState(false)
  const [addError, setAddError]     = useState('')

  // ─ загрузка данных
  const loadChannels = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${GW}/competitors/channels`)
      if (res.ok) setChannels(await res.json())
    } finally { setLoading(false) }
  }, [])

  const loadTrends = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${GW}/competitors/trends?days=7&limit=30`)
      if (res.ok) setTrends(await res.json())
    } finally { setLoading(false) }
  }, [])

  const loadIdeas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${GW}/competitors/ideas?status=PENDING&limit=50`)
      if (res.ok) setIdeas((await res.json()).data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'channels') loadChannels()
    if (tab === 'trends')   loadTrends()
    if (tab === 'ideas')    loadIdeas()
  }, [tab, loadChannels, loadTrends, loadIdeas])

  // ─ добавить канал
  const addChannel = async () => {
    if (!channelUrl.trim()) return
    setAdding(true); setAddError('')
    try {
      const res = await fetch(`${GW}/competitors/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: channelUrl.trim(), niche: niche.trim() || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      setChannelUrl(''); setNiche('')
      await loadChannels()
    } catch (e) { setAddError((e as Error).message) }
    finally { setAdding(false) }
  }

  // ─ ручная синх
  const syncChannel = async (id: string) => {
    try {
      await fetch(`${GW}/competitors/channels/${id}/sync`, { method: 'POST' })
      await loadChannels()
    } catch {}
  }

  // ─ удалить канал
  const removeChannel = async (id: string) => {
    if (!confirm('Удалить канал?')) return
    await fetch(`${GW}/competitors/channels/${id}`, { method: 'DELETE' })
    await loadChannels()
  }

  // ─ AI-анализ канала
  const analyzeChannel = async (id: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${GW}/competitors/trends/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: id }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      const data = await res.json()
      setTab('ideas')
      await loadIdeas()
      alert(`✅ Сгенерировано ${data.ideasGenerated} идей!`)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  // ─ экспорт идеи
  const exportIdea = async (id: string) => {
    try {
      const res = await fetch(`${GW}/competitors/ideas/${id}/export`, { method: 'POST' })
      if (!res.ok) throw new Error('Error')
      setIdeas(prev => prev.filter(i => i.id !== id))
    } catch (e) { alert((e as Error).message) }
  }

  // ─ отклонить идею
  const rejectIdea = async (id: string) => {
    try {
      await fetch(`${GW}/competitors/ideas/${id}`, { method: 'DELETE' })
      setIdeas(prev => prev.filter(i => i.id !== id))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Шапка */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">🔍 Конкурентная разведка</h1>
        <p className="text-gray-400 mt-1">YouTube-мониторинг · AI-анализ · генерация идей для Topic Engine</p>
      </div>

      {/* Табы */}
      <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 w-fit">
        {([['channels', `📺 Каналы (${channels.length})`],
           ['trends',   '📈 Тренды'],
           ['ideas',    `💡 Идеи (${ideas.length})`]] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === val ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* ─── КАНАЛЫ ─── */}
      {tab === 'channels' && (
        <div className="space-y-6">
          {/* Форма добавления */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="font-semibold mb-4">➕ Добавить канал</h2>
            <div className="flex gap-3 flex-wrap">
              <input
                className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                placeholder="@ChannelHandle или youtube.com/channel/UC..."
                value={channelUrl}
                onChange={e => setChannelUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChannel()}
              />
              <input
                className="w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                placeholder="Ниша (необяз.)"
                value={niche}
                onChange={e => setNiche(e.target.value)}
              />
              <button
                onClick={addChannel}
                disabled={adding || !channelUrl.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
              >
                {adding ? '…' : 'Добавить'}
              </button>
            </div>
            {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
          </div>

          {/* Список каналов */}
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">{channels.length} каналов</p>
            <button onClick={loadChannels} className="text-blue-400 hover:text-blue-300 text-sm">↻ Обновить</button>
          </div>

          {loading && <p className="text-gray-600 text-sm">Загрузка...</p>}
          {!loading && !channels.length && (
            <div className="text-center py-16 text-gray-600">
              <p className="text-5xl mb-3">📺</p>
              <p>Нет каналов. Добавьте первый!</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {channels.map((ch: any) => (
              <div key={ch.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{ch.name}</p>
                    {ch.niche && (
                      <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">
                        {ch.niche}
                      </span>
                    )}
                  </div>
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ch.isActive ? 'bg-green-400' : 'bg-gray-600'}`} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                  <div>
                    <p>Подписчиков</p>
                    <p className="text-white font-medium">{(ch.subscriberCount ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p>Видео в БД</p>
                    <p className="text-white font-medium">{ch._count?.videos ?? 0}</p>
                  </div>
                  <div className="col-span-2">
                    <p>Последняя синхронизация</p>
                    <p className="text-white">
                      {ch.lastSyncAt ? new Date(ch.lastSyncAt).toLocaleString('ru') : 'Никогда'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => analyzeChannel(ch.id)}
                    disabled={loading}
                    className="flex-1 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors"
                  >
                    🧠 AI-анализ
                  </button>
                  <button
                    onClick={() => syncChannel(ch.id)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition-colors"
                    title="Ручная синхронизация"
                  >
                    ↻
                  </button>
                  <button
                    onClick={() => removeChannel(ch.id)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 hover:text-red-400 rounded-lg text-xs transition-colors"
                  >
                    удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── ТРЕНДЫ ─── */}
      {tab === 'trends' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">
              {trends ? `${trends.total} трендовых видео за ${trends.period}` : ''}
            </p>
            <button onClick={loadTrends} className="text-blue-400 hover:text-blue-300 text-sm">↻ Обновить</button>
          </div>

          {loading && <p className="text-gray-600 text-sm">Загрузка...</p>}
          {!loading && !trends?.total && (
            <div className="text-center py-16 text-gray-600">
              <p className="text-5xl mb-3">📈</p>
              <p>Трендов нет. Добавьте каналы и дождитесь синхронизации.</p>
            </div>
          )}

          {trends && Object.entries(trends.byNiche as Record<string, any[]>).map(([niche, videos]) => (
            <div key={niche} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="font-semibold mb-3 capitalize">
                🎯 {niche} <span className="text-gray-600 font-normal text-sm">({videos.length})</span>
              </h3>
              <div className="space-y-2">
                {videos.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 bg-gray-800/40 rounded-lg p-3">
                    {v.thumbnailUrl && (
                      <img src={v.thumbnailUrl} alt="" className="w-20 h-12 object-cover rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {v.channel?.name} · {v.viewCount.toLocaleString()} просм.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-orange-400 font-bold text-sm">
                        {Math.round(v.viewVelocity ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">просм/день</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── ИДЕИ ─── */}
      {tab === 'ideas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">{ideas.length} идей на рассмотрение</p>
            <button onClick={loadIdeas} className="text-blue-400 hover:text-blue-300 text-sm">↻ Обновить</button>
          </div>

          {loading && <p className="text-gray-600 text-sm">Загрузка...</p>}
          {!loading && !ideas.length && (
            <div className="text-center py-16 text-gray-600">
              <p className="text-5xl mb-3">💡</p>
              <p>Идей нет. Нажмите «🧠 AI-анализ» на канале.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ideas.map((idea: any) => (
              <div key={idea.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-white leading-snug">{idea.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${PRIORITY_COLOR[idea.priority] ?? PRIORITY_COLOR.MEDIUM}`}>
                    {idea.priority}
                  </span>
                </div>

                <p className="text-sm text-gray-400 mb-3 leading-relaxed">{idea.angle}</p>

                <div className="flex flex-wrap gap-2 text-xs mb-4">
                  <span className={`${HOOK_META[idea.hookType]?.color ?? 'text-gray-400'}`}>
                    {HOOK_META[idea.hookType]?.emoji} {idea.hookType}
                  </span>
                  {idea.estimatedCpm && (
                    <span className="text-green-400">💰 ${idea.estimatedCpm} CPM</span>
                  )}
                  {idea.sourceVideo && (
                    <span className="text-gray-600">
                      via {idea.sourceVideo.channel?.name}
                    </span>
                  )}
                </div>

                {idea.sourceVideo && (
                  <div className="bg-gray-800/50 rounded-lg p-2 mb-3 text-xs text-gray-500">
                    <span className="text-gray-400">📎 </span>
                    {idea.sourceVideo.title?.slice(0, 60)}...
                    <span className="ml-2 text-orange-400">
                      {Math.round(idea.sourceVideo.viewVelocity ?? 0).toLocaleString()} пр/д
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => exportIdea(idea.id)}
                    className="flex-1 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    ↗️ Экспорт в Topic Engine
                  </button>
                  <button
                    onClick={() => rejectIdea(idea.id)}
                    className="px-4 py-2 bg-gray-800 hover:bg-red-900/40 hover:text-red-400 rounded-lg text-xs transition-colors"
                  >
                    Игнор
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
