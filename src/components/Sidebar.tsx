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
      <aside className="md:flex md:w-72 md:flex-shrink-0">
        <div className="w-full">
          {/* Botao de menu no mobile */}
          <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-r from-primary to-secondary px-4 py-3 text-white md:hidden">
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
            className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-surface/95 text-white shadow-2xl transition-transform duration-300 md:static md:block md:h-auto md:translate-x-0 md:shadow-soft ${
              open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary-light">Cestas</p>
                  <span className="text-xl font-semibold">Solidarias</span>
                </div>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="rounded-md p-1 text-white/70 hover:bg-white/10 md:hidden"
                  aria-label="Fechar menu lateral"
                >
                  <XMarkIcon className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <nav className="mt-6 flex-1 space-y-1 px-4">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname?.startsWith(`${item.href}/`)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-white text-surface shadow-lg'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                      onClick={closeMenu}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                      {item.label}
                      {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                    </Link>
                  )
                })}
              </nav>
              <div className="mt-auto space-y-3 border-t border-white/10 px-5 py-6">
                <p className="text-sm text-white/80">Precisa registrar uma nova entrega ou doacao?</p>
                <Link
                  href="/doacoes"
                  onClick={closeMenu}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-secondary/30 transition hover:opacity-90"
                >
                  Nova doacao
                </Link>
              </div>
            </div>
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
