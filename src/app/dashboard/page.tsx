import { createServerSupabase } from '../../lib/supabaseServer'
import { unstable_noStore as noStore } from 'next/cache'
import type { Donation } from '../../types'

type QuantityOnlyLot = { quantity: number }
type ExpiringLot = { expiry_date: string; quantity: number }
type LotWithFood = {
  food_id: number
  quantity: number
  expiry_date: string | null
  foods?: { name?: string | null } | null
}
type RecentDonation = Pick<Donation, 'id' | 'donor_name' | 'donated_at'>

export const dynamic = 'force-dynamic'

async function getDashboardMetrics() {
  noStore() // disable caching for dynamic metrics
  const supabase = createServerSupabase()

  // Total items in stock (available lots)
  const { data: availableLots } = await supabase
    .from('lots')
    .select('quantity')
    .eq('status', 'AVAILABLE')
  const availableQuantities = (availableLots ?? []) as QuantityOnlyLot[]
  const totalItems = availableQuantities.reduce(
    (acc: number, lot) => acc + Number(lot.quantity),
    0
  )

  // Cestas montadas no mês
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: basketThisMonth } = await supabase
    .from('basket_batches')
    .select('id')
    .gte('created_at', firstDay)
  const totalBaskets = basketThisMonth?.length ?? 0

  // Items vencidos/vencendo
  const today = new Date().toISOString().split('T')[0]
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const { data: allLots } = await supabase
    .from('lots')
    .select('expiry_date, quantity')
    .eq('status', 'AVAILABLE')
    .neq('expiry_date', null)
  let expired = 0
  let expiring = 0
  const expiringLots = (allLots ?? []) as ExpiringLot[]
  expiringLots.forEach((lot) => {
    const expiry = lot.expiry_date
    if (expiry < today) expired += Number(lot.quantity)
    else if (expiry <= in7days) expiring += Number(lot.quantity)
  })

  // Últimas doações
  const { data: donationsData } = await supabase
    .from('donations')
    .select('id, donor_name, donated_at')
    .order('donated_at', { ascending: false })
    .limit(5)
  const donations = (donationsData ?? []) as RecentDonation[]

  // Top 5 alimentos mais críticos (low stock or soon to expire)
  // We'll compute by grouping available lots by food_id and ordering by quantity ascending
  const { data: lotsByFood } = await supabase
    .from('lots')
    .select('food_id, quantity, expiry_date, foods(name)')
    .eq('status', 'AVAILABLE')
  const foodMap: Record<number, { name: string; total: number; nearestExpiry: string | null }> = {}
  const lotsWithFood = (lotsByFood ?? []) as LotWithFood[]
  lotsWithFood.forEach((lot) => {
    const fid = lot.food_id
    const name = lot.foods?.name ?? 'Item'
    if (!foodMap[fid]) {
      foodMap[fid] = { name, total: 0, nearestExpiry: lot.expiry_date }
    }
    foodMap[fid].total += Number(lot.quantity)
    if (lot.expiry_date && (!foodMap[fid].nearestExpiry || lot.expiry_date < foodMap[fid].nearestExpiry!)) {
      foodMap[fid].nearestExpiry = lot.expiry_date
    }
  })
  const criticalFoods = Object.values(foodMap)
    .sort((a, b) => a.total - b.total)
    .slice(0, 5)

  return { totalItems, totalBaskets, expired, expiring, donations, criticalFoods }
}

export default async function DashboardPage() {
  const { totalItems, totalBaskets, expired, expiring, donations, criticalFoods } =
    await getDashboardMetrics()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Total de itens em estoque</h3>
          <p className="text-3xl font-bold">{totalItems}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Cestas montadas no mês</h3>
          <p className="text-3xl font-bold">{totalBaskets}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Itens vencidos / vencendo</h3>
          <p className="text-xl font-bold text-red-600">{expired}</p>
          <p className="text-xl font-bold text-yellow-600">{expiring}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Últimas doações</h3>
          <ul className="divide-y divide-gray-200">
            {donations && donations.length > 0 ? (
              donations.map((donation) => (
                <li key={donation.id} className="py-2">
                  <p className="font-medium">{donation.donor_name || 'Anônimo'}</p>
                  <p className="text-sm text-gray-500">{new Date(donation.donated_at).toLocaleDateString()}</p>
                </li>
              ))
            ) : (
              <li className="py-2 text-gray-500">Nenhuma doação registrada.</li>
            )}
          </ul>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Top 5 alimentos críticos</h3>
          <ul className="divide-y divide-gray-200">
            {criticalFoods.length > 0 ? (
              criticalFoods.map((food) => (
                <li key={food.name} className="py-2 flex justify-between">
                  <span>{food.name}</span>
                  <span className="font-medium">{food.total}</span>
                </li>
              ))
            ) : (
              <li className="py-2 text-gray-500">Nenhum item crítico.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
