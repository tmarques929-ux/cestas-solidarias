"use client"

import Link from 'next/link'

export default function Topbar() {
  return (
    <header className="flex flex-col gap-3 border-b border-white/40 bg-white/70 px-4 py-4 shadow-soft backdrop-blur-lg sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Painel</p>
        <h1 className="text-lg font-semibold text-slate-900 sm:text-2xl">Bem vindo(a)</h1>
        <p className="text-xs text-slate-500 sm:text-sm">Acompanhe estoque, cestas e doacoes em tempo real.</p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center">
        <Link
          href="/doacoes"
          className="inline-flex w-full items-center justify-center rounded-full border border-primary/30 bg-white/80 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
        >
          Nova doacao
        </Link>
      </div>
    </header>
  )
}
