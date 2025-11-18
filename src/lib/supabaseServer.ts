import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''

function assertEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
}

/**
 * Creates a Supabase client configured for server components, server actions
 * and route handlers. Cookies are read/written through Next.js helpers.
 */
export function createServerSupabase() {
  assertEnv()
  return createServerComponentClient(
    { cookies },
    {
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    }
  )
}
