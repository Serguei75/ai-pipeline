'use client'

import { useState } from 'react'

const GW = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100'

export function CostDashboardClient() {
  const [videoId, setVideoId] = useState('')
  const [roi, setRoi] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchRoi = async () => {
    if (!videoId.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${GW}/costs/roi/${videoId.trim()}`)
      if (!res.ok) throw new Error(await res.text())
      setRoi(await res.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h2 className="text-lg font-semibold mb-4">🎥 ROI по видео</h2>
      <div className="flex gap-3 mb-4">
        <input
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          placeholder="введите videoId..."
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchRoi()}
        />
        <button
          onClick={fetchRoi}
          disabled={loading || !videoId.trim()}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? '…' : 'Посмотреть'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {roi && (
        <div className="space-y-3">
          <div className="flex gap-6">
            <span className="text-gray-400 text-sm">Video: <span className="text-white font-mono">{roi.videoId}</span></span>
            <span className="text-gray-400 text-sm">API вызовов: <span className="text-white">{roi.entriesCount}</span></span>
            <span className="text-gray-400 text-sm">Себестоимость: <span className="text-green-400 font-bold">${roi.totalCostUsd}</span></span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(roi.byModule as Record<string, number>).map(([mod, cost]) => (
              <div key={mod} className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-mono">{mod}</p>
                <p className="text-green-400 font-semibold">${cost.toFixed(6)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
