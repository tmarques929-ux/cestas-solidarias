import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { createServerSupabase } from '../lib/supabaseServer'

type LotWithFood = {
  expiry_date: string | null
  foods?: { name?: string | null } | null
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })

export default async function NextExpiryNotice() {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('lots')
    .select('expiry_date, foods(name)')
    .eq('status', 'AVAILABLE')
    .neq('expiry_date', null)
    .order('expiry_date', { ascending: true, nullsLast: true })
    .limit(1)

  const upcoming = (data ?? [])[0] as LotWithFood | undefined

  if (error) {
    return (
      <div className="rounded-3xl bg-rose-100 p-4 text-sm text-rose-700 shadow-soft">
        Nao foi possivel carregar o proximo vencimento: {error.message}
      </div>
    )
  }

  if (!upcoming || !upcoming.expiry_date) {
    return (
      <div className="rounded-3xl bg-gradient-to-r from-slate-200 to-slate-100 p-4 text-sm text-slate-700 shadow-soft">
        Nenhum alimento com data de validade cadastrada no momento.
      </div>
    )
  }

  const alreadyExpired = new Date(upcoming.expiry_date) < new Date()
  const stateLabel = alreadyExpired ? 'Ja venceu' : 'Vence em breve'

  return (
    <div className="rounded-3xl bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 p-4 text-white shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-white/20 p-2">
            <ExclamationTriangleIcon className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em]">{stateLabel}</p>
            <p className="text-lg font-semibold">
              {upcoming.foods?.name ?? 'Item sem nome'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.3em] opacity-80">
            Data de validade
          </p>
          <p className="text-2xl font-bold">{formatDate(upcoming.expiry_date)}</p>
        </div>
      </div>
    </div>
  )
}
