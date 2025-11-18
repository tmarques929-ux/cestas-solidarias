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
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm">
      <h1 className="text-lg font-semibold">Bem-vindo(a)</h1>
      <div className="flex items-center gap-3">
        {userEmail && <span className="text-sm text-gray-600">{userEmail}</span>}
        <button
          onClick={signOut}
          className="px-3 py-1 text-sm text-white bg-primary rounded-md hover:bg-primary-dark"
        >
          Sair
        </button>
      </div>
    </header>
  )
}