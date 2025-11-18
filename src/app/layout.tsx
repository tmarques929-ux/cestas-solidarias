import './globals.css'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import ExpiryBanner from '../components/ExpiryBanner'
import NextExpiryNotice from '../components/NextExpiryNotice'
import { Plus_Jakarta_Sans } from 'next/font/google'

export const metadata = {
  title: 'Cestas Solidarias',
  description: 'Sistema para controle de doacoes e cestas basicas',
}
export const dynamic = 'force-dynamic'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${jakarta.className} h-full`}>
      <body className="min-h-screen bg-transparent text-slate-900">
        <div className="flex min-h-screen flex-col md:flex-row">
          {/* Sidebar fixa no desktop e sobreposta no mobile */}
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">
            <Topbar />
            <main className="flex-1 bg-transparent px-4 py-6 sm:px-8">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                <NextExpiryNotice />
                <ExpiryBanner />
                <section className="rounded-3xl bg-white/80 p-4 shadow-soft ring-1 ring-white/60 backdrop-blur-lg sm:p-6">
                  {children}
                </section>
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
