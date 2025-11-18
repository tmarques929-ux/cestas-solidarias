"use server"

import { createServerSupabase } from '../lib/supabaseServer'
import type { Food, Lot } from '../types'

type BasketFood = Pick<Food, 'id' | 'name' | 'qty_per_basket' | 'in_basket'>

const perBasketQty = (food: BasketFood) => {
  if (!food.in_basket) return 0
  if (!food.qty_per_basket || food.qty_per_basket <= 0) return 1
  return food.qty_per_basket
}

/**
 * Server action to assemble baskets.  It verifies that enough stock is
 * available for the requested number of baskets.  If stock is sufficient,
 * it consumes lots in FIFO order (by expiry date) and records the
 * consumption in basket_batches and basket_items.
 *
 * @param quantity - number of baskets to produce
 * @param createdBy - email of the user creating the baskets (for audit)
 */
export async function createBaskets(quantity: number, createdBy: string | null) {
  const supabase = createServerSupabase()
  // Fetch all foods that are part of the basket model
  const { data: foodsData, error: foodsError } = await supabase
    .from('foods')
    .select('id, name, qty_per_basket')
    .eq('in_basket', true)
  if (foodsError) throw foodsError
  const foods = (foodsData ?? []) as BasketFood[]
  // Build required amounts
  const required: Record<number, number> = {}
  foods.forEach((food) => {
    const perBasket = perBasketQty(food)
    required[food.id] = perBasket * quantity
  })
  // Fetch available lots grouped by food and sorted by expiry
  const { data: lotsData } = await supabase
    .from('lots')
    .select('*')
    .eq('status', 'AVAILABLE')
    .order('expiry_date', { ascending: true })
  const allLots = (lotsData ?? []) as Lot[]
  const lotsByFood: Record<number, Lot[]> = {}
  allLots.forEach((lot) => {
    if (!lotsByFood[lot.food_id]) lotsByFood[lot.food_id] = []
    lotsByFood[lot.food_id].push(lot)
  })
  // Verify stock
  const missing: { id: number; name: string; missingQuantity: number }[] = []
  foods.forEach((food) => {
    const available = (lotsByFood[food.id] || []).reduce(
      (acc, lot) => acc + Number(lot.quantity),
      0
    )
    const needed = required[food.id]
    if (available < needed) {
      missing.push({ id: food.id, name: food.name, missingQuantity: needed - available })
    }
  })
  if (missing.length > 0) {
    return { success: false, missing }
  }
  // Consume lots
  const consumed: { foodId: number; total: number }[] = []
  for (const food of foods) {
    let remaining = required[food.id]
    const lots = lotsByFood[food.id] || []
    let totalConsumed = 0
    for (const lot of lots) {
      if (remaining <= 0) break
      const lotQuantity = Number(lot.quantity)
      if (lotQuantity <= remaining) {
        // Use entire lot
        await supabase
          .from('lots')
          .update({ quantity: 0, status: 'USED' })
          .eq('id', lot.id)
        totalConsumed += lotQuantity
        remaining -= lotQuantity
      } else {
        // Use part of the lot
        await supabase
          .from('lots')
          .update({ quantity: lotQuantity - remaining })
          .eq('id', lot.id)
        totalConsumed += remaining
        remaining = 0
      }
    }
    consumed.push({ foodId: food.id, total: totalConsumed })
  }
  // Create basket batch
  const { data: batchData, error: batchError } = await supabase
    .from('basket_batches')
    .insert({ basket_quantity: quantity, created_by: createdBy })
    .select()
    .single()
  if (batchError) throw batchError
  const batchId = batchData.id
  // Insert basket_items records
  for (const item of consumed) {
    await supabase.from('basket_items').insert({
      basket_batch_id: batchId,
      food_id: item.foodId,
      total_quantity: item.total,
    })
  }
  return { success: true, batchId }
}
