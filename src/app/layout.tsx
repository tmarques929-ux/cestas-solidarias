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
    <html lang="pt-BR">
      <body className="flex h-screen overflow-hidden">
        {/* Sidebar for desktop and collapsible on mobile */}
        <Sidebar />
        <div className="flex flex-col flex-1 w-0">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 bg-gray-100 space-y-4">
            {/* banner fixo com avisos */}
            <ExpiryBanner />
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
