'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bars3Icon,
  CalendarIcon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  GiftIcon,
  HomeIcon,
  InboxStackIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/doacoes', label: 'Doacoes', icon: InboxStackIcon },
  { href: '/estoque', label: 'Estoque', icon: ClipboardDocumentListIcon },
  { href: '/cestas', label: 'Cestas Basicas', icon: GiftIcon },
  { href: '/validade', label: 'Validade', icon: CalendarIcon },
  { href: '/relatorios', label: 'Relatorios', icon: ChartBarSquareIcon },
  { href: '/cadastros', label: 'Cadastros', icon: Squares2X2Icon },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const toggleMenu = () => setOpen((prev) => !prev)
  const closeMenu = () => setOpen(false)

  return (
    <>
      <aside className="md:flex md:w-64 md:flex-shrink-0">
        <div className="w-full">
          {/* Botao de menu no mobile */}
          <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white md:hidden">
            <button
              type="button"
              onClick={toggleMenu}
              className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-sm font-semibold"
            >
              {open ? (
                <XMarkIcon className="h-5 w-5" aria-hidden />
              ) : (
                <Bars3Icon className="h-5 w-5" aria-hidden />
              )}
              <span>Menu</span>
            </button>
            <span className="text-sm font-semibold uppercase tracking-wide">
              Cestas Solidarias
            </span>
          </div>

          {/* Sidebar */}
          <div
            className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white shadow-xl transition-transform duration-300 md:static md:block md:h-auto md:translate-x-0 md:shadow-none ${
              open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            <div className="flex items-center justify-between border-b px-4 py-4">
              <span className="text-xl font-semibold">Cestas Solidarias</span>
              <button
                type="button"
                onClick={closeMenu}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
                aria-label="Fechar menu lateral"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav className="mt-4 space-y-1 px-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname?.startsWith(`${item.href}/`)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={closeMenu}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </aside>

      {/* Overlay para facilitar o fechamento do menu no mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </>
  )
}
