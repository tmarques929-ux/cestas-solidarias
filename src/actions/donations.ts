"use server"

import { createServerSupabase } from '../lib/supabaseServer'

interface DonationItemInput {
  foodId: number
  quantity: number
  expiryDate: string | null
  donorName: string | null
}

/**
 * Server action to register a new donation.  It creates a donation record,
 * multiple lots (one for each item in the donation) and links them via
 * donation_items.  If any food is perishable, expiryDate must be provided.
 */
export async function registerDonation(
  donorName: string | null,
  items: DonationItemInput[]
) {
  const supabase = createServerSupabase()
  // Create donation header
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .insert({ donor_name: donorName })
    .select()
    .single()
  if (donationError) throw donationError
  const donationId = donation.id
  // For each item create a lot and link to donation
  for (const item of items) {
    // Create lot
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .insert({
        food_id: item.foodId,
        quantity: item.quantity,
        expiry_date: item.expiryDate,
        donor_name: item.donorName,
        status: 'AVAILABLE',
      })
      .select()
      .single()
    if (lotError) throw lotError
    // Link donation_item
    const { error: linkError } = await supabase.from('donation_items').insert({
      donation_id: donationId,
      lot_id: lot.id,
    })
    if (linkError) throw linkError
  }
  return { success: true }
}
