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
    <div className="rounded-3xl border border-red-200 bg-white/90 p-4 text-sm text-slate-800 shadow-soft backdrop-blur md:sticky md:top-0 md:text-base">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
          Atencao
        </span>
        <p className="text-base font-semibold sm:text-xl">Itens criticos precisam de acao imediata.</p>
      </div>
      {expired.length > 0 && (
        <p className="mt-3 text-red-600">
          <strong>{expired.length}</strong> lote(s) vencidos:{' '}
          <span className="font-medium">{listNames(expired)}</span>
        </p>
      )}
      {expiring.length > 0 && (
        <p className="mt-1 text-amber-600">
          <strong>{expiring.length}</strong> lote(s) vencendo em ate 7 dias:{' '}
          <span className="font-medium">{listNames(expiring)}</span>
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500 sm:text-sm">
        Regularize imediatamente para evitar perdas e atualizar o estoque em Supabase.
      </p>
    </div>
  )
}
