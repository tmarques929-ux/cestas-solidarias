import './globals.css'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import ExpiryBanner from '../components/ExpiryBanner'

export const metadata = {
  title: 'Cestas Solidárias',
  description: 'Sistema para controle de doações e cestas básicas',
}
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-screen bg-gray-100 text-gray-900">
        <div className="flex min-h-screen flex-col md:flex-row">
          {/* Sidebar fixa no desktop e sobreposta no mobile */}
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">
            <Topbar />
            <main className="flex-1 space-y-4 bg-gray-100 px-4 py-4 sm:px-6">
              {/* banner fixo com avisos */}
              <ExpiryBanner />
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
