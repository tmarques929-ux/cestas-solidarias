"use client"

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabaseClient'

export default function Topbar() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUserEmail(session?.user?.email ?? null)
    }
    getUser()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    // After sign out refresh the page so the user is redirected to login
    window.location.href = '/login'
  }

  return (
    <header className="flex flex-col gap-2 border-b bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-base font-semibold text-gray-900 sm:text-lg">Bem vindo(a)</h1>
        <p className="text-xs text-gray-500 sm:hidden">Gerencie as cestas sem precisar de um computador.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 sm:justify-end">
        {userEmail && <span className="truncate text-right">{userEmail}</span>}
        <button
          onClick={signOut}
          className="w-full rounded-md bg-primary px-3 py-2 text-center text-white transition hover:bg-primary-dark sm:w-auto"
        >
          Sair
        </button>
      </div>
    </header>
  )
}
