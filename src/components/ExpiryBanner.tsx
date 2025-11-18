import { createServerSupabase } from '../lib/supabaseServer'

type LotWithFood = {
  expiry_date: string | null
  foods?: { name?: string | null } | null
}

export default async function ExpiryBanner() {
  const supabase = createServerSupabase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const sevenDaysStr = sevenDays.toISOString().split('T')[0]

  const { data } = await supabase
    .from('lots')
    .select('expiry_date, foods(name)')
    .eq('status', 'AVAILABLE')
    .neq('expiry_date', null)
    .lte('expiry_date', sevenDaysStr)

  const lots = (data ?? []) as LotWithFood[]

  const expired: LotWithFood[] = []
  const expiring: LotWithFood[] = []

  lots.forEach((lot) => {
    if (!lot.expiry_date) return
    if (lot.expiry_date < todayStr) {
      expired.push(lot)
    } else {
      expiring.push(lot)
    }
  })

  if (!expired.length && !expiring.length) {
    return null
  }

  const listNames = (entries: LotWithFood[]) =>
    entries
      .map((lot) => lot.foods?.name ?? 'Item sem nome')
      .filter(Boolean)
      .slice(0, 5)
      .join(', ')

  return (
    <div className="sticky top-0 z-40 mb-4 rounded-lg border-2 border-red-600 bg-red-100 p-4 shadow-lg">
      <p className="text-2xl font-bold text-red-800">ATENÇÃO: itens críticos no estoque!</p>
      {expired.length > 0 && (
        <p className="mt-2 text-red-700">
          {expired.length} lote(s) vencidos: <strong>{listNames(expired)}</strong>
        </p>
      )}
      {expiring.length > 0 && (
        <p className="mt-1 text-yellow-800">
          {expiring.length} lote(s) vencendo em até 7 dias:{' '}
          <strong>{listNames(expiring)}</strong>
        </p>
      )}
      <p className="mt-2 text-sm text-red-900">
        Regularize imediatamente para evitar perdas e atualizar o estoque.
      </p>
    </div>
  )
}
