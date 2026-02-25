'use client'
import { useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { Globe, Plus, PackageOpen } from 'lucide-react'

const LOC_API = process.env.NEXT_PUBLIC_LOCALIZATION_ENGINE_URL || 'http://localhost:3007'

const TARGET_LANGS = [
  { code: 'de', label: 'Deutsch 🇩🇪' },
  { code: 'es', label: 'Español 🇪🇸' },
  { code: 'ja', label: '日本語 🇯🇵' },
  { code: 'fr', label: 'Français 🇫🇷' },
  { code: 'pt', label: 'Português 🇧🇷' },
  { code: 'ru', label: 'Русский 🇷🇺' },
]

export default function LocalizationPage() {
  const { t } = useI18n()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    youtubeVideoId: '',
    sourceLang: 'en',
    targetLangs: ['de', 'es'],
    mode: 'SUBTITLES' as 'SUBTITLES' | 'DUBBING' | 'BOTH',
  })
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const toggleLang = (code: string) => {
    setForm((f) => ({
      ...f,
      targetLangs: f.targetLangs.includes(code)
        ? f.targetLangs.filter((l) => l !== code)
        : [...f.targetLangs, code],
    }))
  }

  const handleCreate = async () => {
    if (!form.youtubeVideoId.trim()) return
    setCreating(true)
    setMessage(null)
    try {
      const res = await fetch(`${LOC_API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setMessage(`Task created: ${data.id}`)
      setShowCreate(false)
    } catch {
      setMessage(t.common.error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-semibold">{t.localization.title}</h1>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 rounded-md text-sm hover:bg-purple-700"
        >
          <Plus className="w-3.5 h-3.5" />
          {t.localization.create}
        </button>
      </div>

      {/* Two-stage explanation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-4">
          <p className="text-xs font-medium text-purple-400 mb-1">{t.localization.stage1}</p>
          <p className="text-xs text-neutral-500">
            Субтитры (.srt) + локализованные метаданные (заголовок, описание, теги) — дёшево, тест рынка.
          </p>
        </div>
        <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-4">
          <p className="text-xs font-medium text-blue-400 mb-1">{t.localization.stage2}</p>
          <p className="text-xs text-neutral-500">
            ElevenLabs TTS на целевом языке + пакет мульти-аудио (.mp3) → загрузка на YouTube.
          </p>
        </div>
      </div>

      {message && (
        <p className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-3 py-2">
          {message}
        </p>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-medium">{t.localization.create}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">{t.localization.sourceLang}</label>
              <input
                type="text"
                value={form.youtubeVideoId}
                onChange={(e) => setForm((f) => ({ ...f, youtubeVideoId: e.target.value }))}
                placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">{t.localization.mode}</label>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as typeof form.mode }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm"
              >
                <option value="SUBTITLES">{t.localization.subtitles}</option>
                <option value="DUBBING">{t.localization.dubbing}</option>
                <option value="BOTH">{t.localization.both}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-500 mb-2 block">{t.localization.targetLangs}</label>
            <div className="flex flex-wrap gap-2">
              {TARGET_LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => toggleLang(lang.code)}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                    form.targetLangs.includes(lang.code)
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-neutral-400 hover:border-[#3a3a3a]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={creating || !form.youtubeVideoId.trim() || form.targetLangs.length === 0}
              className="px-4 py-2 bg-purple-600 rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {creating ? t.common.loading : t.common.confirm}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm hover:bg-[#222]"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Tasks list placeholder */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-8 text-center">
        <PackageOpen className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-500 text-sm">{t.localization.empty}</p>
        <p className="text-neutral-600 text-xs mt-2">
          GET {LOC_API}/tasks — POST {LOC_API}/tasks/:id/process
        </p>
      </div>
    </div>
  )
}
