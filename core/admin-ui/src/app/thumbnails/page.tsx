'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ThumbnailABTest, ThumbnailJob } from '@/lib/types'

const GW = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100'

const HOOK_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  fear:         { emoji: '🚨', label: 'Fear',         color: 'text-red-400' },
  curiosity:    { emoji: '🤔', label: 'Curiosity',    color: 'text-blue-400' },
  surprise:     { emoji: '🤯', label: 'Surprise',     color: 'text-yellow-400' },
  desire:       { emoji: '✨', label: 'Desire',       color: 'text-purple-400' },
  social_proof: { emoji: '🔥', label: 'Social Proof', color: 'text-green-400' },
}

const STATUS_COLORS: Record<string, string> = {
  RUNNING:   'bg-blue-900/50 text-blue-300 border-blue-700',
  COMPLETED: 'bg-green-900/50 text-green-300 border-green-700',
  CANCELLED: 'bg-gray-800 text-gray-500 border-gray-700',
}

export default function ThumbnailsPage() {
  const [tab, setTab] = useState<'generate' | 'ab-tests' | 'gallery'>('generate')
  const [prompt, setPrompt] = useState('')
  const [videoId, setVideoId] = useState('')
  const [provider, setProvider] = useState('MOCK')
  const [hooks, setHooks] = useState(['fear', 'curiosity', 'surprise'])
  const [mode, setMode] = useState<'single' | 'ab'>('ab')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [tests, setTests] = useState<ThumbnailABTest[]>([])
  const [jobs, setJobs] = useState<ThumbnailJob[]>([])
  const [testsLoading, setTestsLoading] = useState(false)

  const loadTests = useCallback(async () => {
    setTestsLoading(true)
    try {
      const res = await fetch(`${GW}/thumbnails/ab-tests`)
      if (res.ok) setTests(await res.json())
    } finally {
      setTestsLoading(false)
    }
  }, [])

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch(`${GW}/thumbnails?page=1`)
      if (res.ok) {
        const data = await res.json()
        setJobs(data.data ?? [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (tab === 'ab-tests') loadTests()
    if (tab === 'gallery') loadJobs()
  }, [tab, loadTests, loadJobs])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      if (mode === 'ab') {
        const res = await fetch(`${GW}/thumbnails/ab-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: videoId || `vid-${Date.now()}`,
            basePrompt: prompt,
            hookTypes: hooks,
            providerOverride: provider,
          }),
        })
        if (!res.ok) throw new Error(await res.text())
        setResult(await res.json())
      } else {
        const res = await fetch(`${GW}/thumbnails/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, videoId: videoId || undefined, providerOverride: provider }),
        })
        if (!res.ok) throw new Error(await res.text())
        setResult(await res.json())
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const selectWinner = async (testId: string, variantId?: string) => {
    try {
      const res = await fetch(`${GW}/thumbnails/ab-tests/${testId}/winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantId ? { variantId } : {}),
      })
      if (res.ok) await loadTests()
    } catch {}
  }

  const toggleHook = (h: string) =>
    setHooks((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">🎨 Обложки</h1>
        <p className="text-gray-400 mt-1">Генерация и A/B тестирование YouTube-обложек</p>
      </div>

      {/* Табы */}
      <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 w-fit">
        {[['generate', '➕ Генерация'], ['ab-tests', '📊 A/B Тесты'], ['gallery', '🖼️ Галерея']] as const
          .filter(([val]) => ['generate', 'ab-tests', 'gallery'].includes(val))
          .map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === val ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Таб генерации */}
      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Форма */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="font-semibold mb-4">Настройки</h2>

            {/* Режим */}
            <div className="flex gap-2 mb-4">
              {[['ab', 'A/B Тест (3 варианта)'], ['single', 'Один вариант']] as const}
              {(['ab', 'single'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all border ${
                    mode === m
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {m === 'ab' ? 'A/B Тест (3 варианта)' : 'Один вариант'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Prompt *</label>
                <textarea
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="YouTube thumbnail: AI revolution 2026, bold text..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Video ID (необязательно)</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  placeholder="abc123..."
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Провайдер</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="MOCK">Mock (для теста)</option>
                  <option value="HUGGINGFACE">HuggingFace FLUX.1-schnell (Free)</option>
                  <option value="FAL">FAL.AI Flux/schnell ($0.003/img)</option>
                  <option value="CLOUDFLARE">Cloudflare Workers AI (Free)</option>
                </select>
              </div>

              {mode === 'ab' && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Hook-типы (выберите мин. 2)</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(HOOK_LABELS).map(([h, meta]) => (
                      <button
                        key={h}
                        onClick={() => toggleHook(h)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                          hooks.includes(h)
                            ? 'bg-blue-900/50 border-blue-600 ' + meta.color
                            : 'border-gray-700 text-gray-500 hover:border-gray-600'
                        }`}
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl font-medium transition-colors mt-2"
              >
                {loading ? '⏳ Генерирую...' : mode === 'ab' ? '⚡ Создать A/B тест' : '✨ Сгенерировать'}
              </button>
            </div>
          </div>

          {/* Результат */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="font-semibold mb-4">Результат</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-950/30 rounded-lg p-3">{error}</p>}
            {!result && !error && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                <p className="text-5xl mb-3">🎨</p>
                <p className="text-sm">Здесь появятся обложки</p>
              </div>
            )}
            {result && mode === 'single' && (
              <div className="space-y-3">
                <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                  {result.imageUrl ? (
                    <img src={result.imageUrl} alt="thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600 text-sm">Нет изображения</div>
                  )}
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Провайдер: <span className="text-gray-300">{result.provider}</span></p>
                  <p>Модель: <span className="text-gray-300 font-mono">{result.model}</span></p>
                  <p>Стоимость: <span className="text-green-400">${result.costUsd ?? 0}</span></p>
                  <p>Время: <span className="text-gray-300">{result.durationMs}ms</span></p>
                </div>
              </div>
            )}
            {result && mode === 'ab' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Тест <span className="font-mono text-blue-400">{result.testId}</span> создан</p>
                {result.variants?.map((v: any) => (
                  <div key={v.variantId} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                    <span className="text-2xl">{HOOK_LABELS[v.hookType]?.emoji ?? '🎨'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <span className={HOOK_LABELS[v.hookType]?.color ?? 'text-gray-300'}>
                          {HOOK_LABELS[v.hookType]?.label ?? v.hookType}
                        </span>
                      </p>
                      {v.imageUrl ? (
                        <img src={v.imageUrl} alt={v.hookType} className="w-32 h-18 object-cover rounded mt-1" />
                      ) : (
                        <p className="text-xs text-gray-600 mt-0.5">{v.error ?? 'Генерируется...'}</p>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setTab('ab-tests')}
                  className="w-full py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
                >
                  Перейти к тестам →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Таб A/B тестов */}
      {tab === 'ab-tests' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-sm">{tests.length} тестов</p>
            <button onClick={loadTests} className="text-sm text-blue-400 hover:text-blue-300">↻ Обновить</button>
          </div>
          {testsLoading && <p className="text-gray-600 text-sm">Загрузка...</p>}
          {!testsLoading && !tests.length && (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">🔬</p>
              <p>Тестов пока нет. Создайте первый A/B тест →</p>
            </div>
          )}
          <div className="space-y-4">
            {tests.map((test) => (
              <div key={test.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs text-gray-600">{test.id}</span>
                    <p className="text-sm text-gray-300 mt-0.5">Video: <span className="text-white font-medium">{test.videoId}</span></p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[test.status]}`}>{test.status}</span>
                </div>

                {/* Варианты */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {test.variants.map((v) => (
                    <div
                      key={v.id}
                      className={`rounded-lg border p-3 ${
                        v.isWinner ? 'border-green-600 bg-green-900/20' : 'border-gray-700 bg-gray-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${HOOK_LABELS[v.hookType]?.color ?? 'text-gray-300'}`}>
                          {HOOK_LABELS[v.hookType]?.emoji} {HOOK_LABELS[v.hookType]?.label ?? v.hookType}
                        </span>
                        {v.isWinner && <span className="text-xs text-green-400">🏆 Победитель</span>}
                      </div>
                      {v.imageUrl ? (
                        <img src={v.imageUrl} alt={v.hookType} className="w-full aspect-video object-cover rounded mb-2" />
                      ) : (
                        <div className="w-full aspect-video bg-gray-700/50 rounded mb-2 flex items-center justify-center text-gray-600 text-xs">
                          Нет изображения
                        </div>
                      )}
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>CTR: <span className="text-white">{v.ctr != null ? (v.ctr * 100).toFixed(2) + '%' : '—'}</span></p>
                        <p>Показов: <span className="text-white">{v.impressions}</span> · Кликов: <span className="text-white">{v.clicks}</span></p>
                      </div>
                      {test.status === 'RUNNING' && (
                        <button
                          onClick={() => selectWinner(test.id, v.id)}
                          className="mt-2 w-full py-1 text-xs border border-gray-700 hover:border-green-600 hover:text-green-400 rounded-lg transition-colors"
                        >
                          Выбрать победителем
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {test.status === 'RUNNING' && (
                  <button
                    onClick={() => selectWinner(test.id)}
                    className="w-full py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    ⚡ Авто-выбор по макс. CTR
                  </button>
                )}
                {test.status === 'COMPLETED' && test.winnerCtr != null && (
                  <p className="text-center text-sm text-green-400">CTR победителя: {(test.winnerCtr * 100).toFixed(2)}%</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Таб галереи */}
      {tab === 'gallery' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-sm">{jobs.length} генераций</p>
            <button onClick={loadJobs} className="text-sm text-blue-400 hover:text-blue-300">↻ Обновить</button>
          </div>
          {!jobs.length && <p className="text-center py-16 text-gray-600">Нет генераций</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {jobs.map((job) => (
              <div key={job.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="aspect-video bg-gray-800">
                  {job.imageUrl ? (
                    <img src={job.imageUrl} alt="thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-700 text-xs">
                      {job.status === 'FAILED' ? '❌ Ошибка' : '⏳'}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-600 font-mono truncate">{job.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{job.prompt.slice(0, 40)}...</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-blue-400">{job.provider}</span>
                    <span className="text-xs text-green-400">${job.costUsd ?? '0'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
