import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabaseServer'

export async function POST(req: NextRequest) {
  const { recipientName, deliveredAt, notes, items } = await req.json()

  if (!recipientName || !deliveredAt) {
    return NextResponse.json(
      { error: 'Informe o nome do beneficiário e a data da entrega.' },
      { status: 400 }
    )
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Adicione ao menos um alimento entregue.' }, { status: 400 })
  }

  const normalizedItems = items.filter(
    (item: { foodId?: number; quantity?: number }) =>
      item.foodId && item.quantity && item.quantity > 0
  )
  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: 'Nenhum alimento válido informado.' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const createdBy = session?.user?.email ?? null

  const { data: delivery, error } = await supabase
    .from('basket_deliveries')
    .insert({
      recipient_name: recipientName,
      delivered_at: deliveredAt,
      notes,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !delivery) {
    return NextResponse.json(
      { error: error?.message || 'Não foi possível salvar a entrega.' },
      { status: 500 }
    )
  }

  const detailRows = normalizedItems.map((item) => ({
    delivery_id: delivery.id,
    food_id: item.foodId,
    quantity: item.quantity,
  }))

  const { error: itemsError } = await supabase.from('basket_delivery_items').insert(detailRows)

  if (itemsError) {
    return NextResponse.json(
      { error: itemsError.message || 'Entrega criada, mas falhou ao salvar os itens.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, deliveryId: delivery.id })
}
