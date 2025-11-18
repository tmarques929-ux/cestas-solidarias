import Link from 'next/link'
import { createServerSupabase } from '../../lib/supabaseServer'
import { unstable_noStore as noStore } from 'next/cache'
import type { Donation } from '../../types'
import {
  CubeIcon,
  GiftIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

type QuantityOnlyLot = { quantity: number }
type ExpiringLot = { expiry_date: string; quantity: number }
type LotWithFood = {
  food_id: number
  quantity: number
  expiry_date: string | null
  foods?: { name?: string | null } | null
}
type RecentDonation = Pick<Donation, 'id' | 'donor_name' | 'donated_at'>

const numberFormatter = new Intl.NumberFormat('pt-BR')

export const dynamic = 'force-dynamic'

async function getDashboardMetrics() {
  noStore()
  const supabase = createServerSupabase()

  const { data: availableLots } = await supabase
    .from('lots')
    .select('quantity')
    .eq('status', 'AVAILABLE')
  const availableQuantities = (availableLots ?? []) as QuantityOnlyLot[]
  const totalItems = availableQuantities.reduce(
    (acc: number, lot) => acc + Number(lot.quantity),
    0
  )

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: basketThisMonth } = await supabase
    .from('basket_batches')
    .select('id')
    .gte('created_at', firstDay)
  const totalBaskets = basketThisMonth?.length ?? 0

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

  const { data: donationsData } = await supabase
    .from('donations')
    .select('id, donor_name, donated_at')
    .order('donated_at', { ascending: false })
    .limit(5)
  const donations = (donationsData ?? []) as RecentDonation[]

  const { data: lotsByFood } = await supabase
    .from('lots')
    .select('food_id, quantity, expiry_date, foods(name)')
    .eq('status', 'AVAILABLE')
  const foodMap: Record<
    number,
    { name: string; total: number; nearestExpiry: string | null }
  > = {}
  const lotsWithFood = (lotsByFood ?? []) as LotWithFood[]
  lotsWithFood.forEach((lot) => {
    const fid = lot.food_id
    const name = lot.foods?.name ?? 'Item'
    if (!foodMap[fid]) {
      foodMap[fid] = { name, total: 0, nearestExpiry: lot.expiry_date }
    }
    foodMap[fid].total += Number(lot.quantity)
    if (
      lot.expiry_date &&
      (!foodMap[fid].nearestExpiry || lot.expiry_date < foodMap[fid].nearestExpiry!)
    ) {
      foodMap[fid].nearestExpiry = lot.expiry_date
    }
  })
  const criticalFoods = Object.values(foodMap)
    .sort((a, b) => a.total - b.total)
    .slice(0, 5)

  return { totalItems, totalBaskets, expired, expiring, donations, criticalFoods }
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })

export default async function DashboardPage() {
  const { totalItems, totalBaskets, expired, expiring, donations, criticalFoods } =
    await getDashboardMetrics()

  const highlightCards = [
    {
      title: 'Itens em estoque',
      value: numberFormatter.format(totalItems),
      description: 'Disponiveis para montar cestas',
      icon: CubeIcon,
      gradient: 'from-primary to-secondary',
    },
    {
      title: 'Cestas neste mes',
      value: numberFormatter.format(totalBaskets),
      description: 'Lotes concluidos desde o dia 1',
      icon: GiftIcon,
      gradient: 'from-secondary to-primary',
    },
    {
      title: 'Itens vencidos',
      value: numberFormatter.format(expired),
      description: 'Necessitam descarte imediato',
      icon: ExclamationTriangleIcon,
      gradient: 'from-rose-500 to-orange-400',
    },
    {
      title: 'Vencendo em 7 dias',
      value: numberFormatter.format(expiring),
      description: 'Priorize na montagem das cestas',
      icon: ClockIcon,
      gradient: 'from-amber-400 to-orange-500',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Visao geral</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Monitore indicadores-chave e tenha clareza sobre doacoes, estoques e itens criticos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur"
            >
              <div className={`inline-flex rounded-2xl bg-gradient-to-r ${card.gradient} p-2 text-white`}>
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm text-slate-500">{card.title}</p>
              <p className="text-3xl font-semibold text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Ultimas doacoes</h3>
              <p className="text-sm text-slate-500">Acompanhamento em tempo real dos últimos registros.</p>
            </div>
            <Link
              href="/doacoes"
              className="inline-flex items-center rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              Ver doacoes
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {donations.length > 0 ? (
              donations.map((donation) => (
                <li
                  key={donation.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-800">{donation.donor_name || 'Anonimo'}</p>
                    <p className="text-xs text-slate-500">
                      Recebido em {formatDate(donation.donated_at)}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
                    #{donation.id}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-slate-500">
                Nenhuma doacao registrada recentemente.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Itens criticos</h3>
              <p className="text-sm text-slate-500">Priorize reabastecimento ou uso imediato.</p>
            </div>
            <span className="inline-flex rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold text-amber-700">
              {criticalFoods.length} itens
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {criticalFoods.length > 0 ? (
              criticalFoods.map((food) => (
                <div
                  key={food.name}
                  className="rounded-2xl border border-slate-100 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">{food.name}</p>
                      {food.nearestExpiry && (
                        <p className="text-xs text-slate-500">
                          Vencimento mais proximo: {formatDate(food.nearestExpiry)}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-primary">{food.total} unid.</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary"
                      style={{
                        width: `${Math.min((food.total / (criticalFoods[0]?.total || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nenhum item critico encontrado.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
