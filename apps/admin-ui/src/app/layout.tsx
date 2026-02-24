import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Sidebar } from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'AI Pipeline — Admin',
  description: 'YouTube AI Content Pipeline Control Center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white min-h-screen antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
