import { NextRequest, NextResponse } from 'next/server'
import { createBaskets } from '../../../actions/baskets'
import { createServerSupabase } from '../../../lib/supabaseServer'

export async function POST(req: NextRequest) {
  const { quantity } = await req.json()
  if (!quantity || quantity <= 0) {
    return NextResponse.json({ success: false, error: 'Quantidade inválida' }, { status: 400 })
  }
  // Get current user to record who created the batch
  const supabase = createServerSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userEmail = session?.user?.email ?? null
  const result = await createBaskets(quantity, userEmail)
  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }
  return NextResponse.json(result)
}
