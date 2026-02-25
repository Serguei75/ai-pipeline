import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import { Sidebar } from '@/components/sidebar'
import { I18nProvider } from '@/components/i18n-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Pipeline — Панель управления',
  description: 'YouTube AI Content Pipeline — Control Center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#0a0a0a] text-white min-h-screen antialiased">
        <I18nProvider>
          <Providers>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </Providers>
        </I18nProvider>
      </body>
    </html>
  )
}
