/**
 * Shared TypeScript interfaces that mirror the database tables defined in
 * `supabase_tables.sql`.  These interfaces help ensure that server
 * actions and components use consistent shapes for data.
 */

export interface Food {
  id: number
  name: string
  category: 'FIXO' | 'OPCIONAL'
  unit: string
  perishable: boolean
  in_basket: boolean
  qty_per_basket: number | null
  created_at: string
}

export interface Lot {
  id: number
  food_id: number
  quantity: number
  expiry_date: string | null
  received_at: string
  donor_name: string | null
  status: 'AVAILABLE' | 'USED' | 'DISCARDED'
  discard_reason?: string | null
  discarded_at?: string | null
}

export interface Donation {
  id: number
  donor_name: string | null
  donated_at: string
}

export interface DonationItem {
  id: number
  donation_id: number
  lot_id: number
}

export interface BasketBatch {
  id: number
  created_at: string
  basket_quantity: number
  created_by: string | null
}

export interface BasketItem {
  id: number
  basket_batch_id: number
  food_id: number
  total_quantity: number
}

export interface BasketDelivery {
  id: number
  created_at: string
  recipient_name: string
  delivered_at: string
  notes: string | null
  created_by: string | null
}

export interface BasketDeliveryItem {
  id: number
  delivery_id: number
  food_id: number
  quantity: number
}
