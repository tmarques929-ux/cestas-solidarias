'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  InboxStackIcon,
  ClipboardDocumentListIcon,
  GiftIcon,
  CalendarIcon,
  ChartBarSquareIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/doacoes', label: 'Doações', icon: InboxStackIcon },
  { href: '/estoque', label: 'Estoque', icon: ClipboardDocumentListIcon },
  { href: '/cestas', label: 'Cestas Básicas', icon: GiftIcon },
  { href: '/validade', label: 'Validade', icon: CalendarIcon },
  { href: '/relatorios', label: 'Relatórios', icon: ChartBarSquareIcon },
  { href: '/cadastros', label: 'Cadastros', icon: Squares2X2Icon },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex-shrink-0">
      {/* Mobile menu button */}
      <div className="p-2 bg-primary text-white md:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2"
        >
          <span className="material-icons">menu</span>
          <span>Cestas Solidárias</span>
        </button>
      </div>
      {/* Sidebar */}
      <div
        className={`${open ? 'block' : 'hidden'} md:block bg-white shadow-lg h-full w-64 fixed md:static md:translate-x-0 z-40`}
      >
        <div className="flex items-center justify-center py-4 border-b">
          <span className="text-xl font-semibold">Cestas Solidárias</span>
        </div>
        <nav className="mt-4">
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium gap-3 hover:bg-gray-100 ${active ? 'bg-gray-100 font-semibold' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
