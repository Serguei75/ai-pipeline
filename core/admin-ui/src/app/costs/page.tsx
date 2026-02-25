import { apiFetch } from '@/lib/api'
import type { CostSummary, DailyCost } from '@/lib/types'
import { CostDashboardClient } from './CostDashboardClient'

export const dynamic = 'force-dynamic'

export default async function CostsPage() {
  const [summary, daily] = await Promise.all([
    apiFetch<CostSummary>('/costs/summary', undefined, 30),
    apiFetch<DailyCost>('/costs/daily?days=14', undefined, 30),
  ])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Шапка */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">💰 Расходы API</h1>
        <p className="text-gray-400 mt-1">Глобальный трекер затрат: OpenAI · ElevenLabs · FAL.AI · HuggingFace</p>
      </div>

      {/* Карточки-ключевые метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Всего потрачено"
          value={`$${summary?.totalCostUsd ?? '0.000000'}`}
          sub="с запуска"
          accent="text-green-400"
        />
        <StatCard
          label="API вызовов"
          value={String(summary?.totalApiCalls ?? 0)}
          sub="все модули"
          accent="text-blue-400"
        />
        <StatCard
          label="Модулей"
          value={String(summary?.byModule?.length ?? 0)}
          sub="отслеживается"
          accent="text-purple-400"
        />
        <StatCard
          label="Провайдеров"
          value={String(summary?.byProvider?.length ?? 0)}
          sub="интеграций"
          accent="text-orange-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* По модулю */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-lg font-semibold mb-4">📦 По модулю</h2>
          {!summary?.byModule?.length ? (
            <EmptyState text="Данных пока нет" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2">Модуль</th>
                  <th className="text-right py-2">Запросов</th>
                  <th className="text-right py-2">Стоимость</th>
                </tr>
              </thead>
              <tbody>
                {summary.byModule.map((m) => (
                  <tr key={m.module} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 font-mono text-xs text-blue-300">{m.module}</td>
                    <td className="py-2 text-right text-gray-400">{m.requests}</td>
                    <td className="py-2 text-right text-green-400 font-semibold">${m.costUsd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* По провайдеру */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-lg font-semibold mb-4">🎭 По провайдеру</h2>
          {!summary?.byProvider?.length ? (
            <EmptyState text="Данных пока нет" />
          ) : (
            <div className="space-y-3">
              {summary.byProvider.map((p) => (
                <ProviderBar
                  key={p.provider}
                  provider={p.provider}
                  costUsd={p.costUsd}
                  requests={p.requests}
                  total={Number(summary.totalCostUsd)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Дневной график */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-lg font-semibold mb-4">📅 Динамика расходов за 14 дней</h2>
        {!daily?.data?.length ? (
          <EmptyState text="Данных пока нет" />
        ) : (
          <div className="space-y-2">
            {daily.data.map((d) => (
              <DailyRow key={d.date} date={d.date} cost={d.totalCost} />
            ))}
          </div>
        )}
      </div>

      {/* Клиентская часть — фильтр по videoId */}
      <CostDashboardClient />
    </div>
  )
}

// ─── Компоненты ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-gray-600 text-xs mt-1">{sub}</p>
    </div>
  )
}

function ProviderBar({ provider, costUsd, requests, total }: { provider: string; costUsd: string; requests: number; total: number }) {
  const pct = total > 0 ? (Number(costUsd) / total) * 100 : 0
  const colors: Record<string, string> = {
    openai: 'bg-emerald-500', elevenlabs: 'bg-purple-500',
    huggingface: 'bg-yellow-500', fal: 'bg-orange-500',
    cloudflare: 'bg-blue-500', internal: 'bg-gray-500',
  }
  const color = colors[provider.toLowerCase()] || 'bg-gray-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300 capitalize">{provider}</span>
        <span className="text-gray-500">{requests} запр · <span className="text-green-400">${costUsd}</span></span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  )
}

function DailyRow({ date, cost }: { date: string; cost: number }) {
  const maxBar = 100
  const barW = Math.min(cost * 1000, maxBar)
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500 w-24 shrink-0">{date.slice(5)}</span>
      <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full bg-green-700/70 rounded"
          style={{ width: `${Math.max(barW, cost > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="text-green-400 w-24 text-right font-mono">${cost.toFixed(6)}</span>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-gray-600 text-sm text-center py-8">{text}</p>
}
