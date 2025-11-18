import { createServerSupabase } from '../../lib/supabaseServer'
import { unstable_noStore as noStore } from 'next/cache'
import type { BasketBatch, Donation, Lot } from '../../types'

type BatchDate = Pick<BasketBatch, 'created_at'>
type DonationDate = Pick<Donation, 'donated_at'>
type DiscardedLot = Pick<Lot, 'received_at'>

export const dynamic = 'force-dynamic'

const manualReport = {
  baseProducts: [
    { product: 'ACUCAR 1KG', stock: '-', minimum: '3', validity: '-', perBasket: '0' },
    { product: 'ARROZ 5KG', stock: '2', minimum: '1', validity: '06/2026', perBasket: '2' },
    { product: 'CAFE 500G', stock: '4', minimum: '1', validity: '03/2026', perBasket: '4' },
    { product: 'FEIJAO 1KG', stock: '4', minimum: '1', validity: '12/2025', perBasket: '4' },
  ],
  stockDetails: [
    {
      product: 'ARROZ 5KG',
      stock: '2 unidades',
      minimum: '1',
      validity: 'jun/2026',
      perBasket: '2 unidades',
      note: 'Limita a producao a 1 cesta.',
      status: 'ok' as const,
    },
    {
      product: 'CAFE 500G',
      stock: '4 unidades',
      minimum: '1',
      validity: 'mar/2026',
      perBasket: '4 unidades',
      note: 'Limita a producao a 1 cesta.',
      status: 'ok' as const,
    },
    {
      product: 'FEIJAO 1KG',
      stock: '4 unidades',
      minimum: '1',
      validity: 'dez/2025',
      perBasket: '4 unidades',
      note: 'Consumir ate o fim do ano.',
      status: 'alert' as const,
    },
    {
      product: 'ACUCAR 1KG',
      stock: '0 unidades',
      minimum: '3',
      validity: 'sem registro',
      perBasket: '0',
      note: 'Necessario recompor o estoque.',
      status: 'alert' as const,
    },
  ],
  cestasPossible: [
    { product: 'Arroz 5kg', stock: 2, perBasket: 2, total: 1 },
    { product: 'Cafe 500g', stock: 4, perBasket: 4, total: 1 },
    { product: 'Feijao 1kg', stock: 4, perBasket: 4, total: 1 },
  ],
  missingForTwo: [
    { product: 'Arroz 5kg', needed: 4, stock: 2, missing: 2 },
    { product: 'Cafe 500g', needed: 8, stock: 4, missing: 4 },
    { product: 'Feijao 1kg', needed: 8, stock: 4, missing: 4 },
  ],
  missingForFive: [
    { product: 'Arroz 5kg', needed: 10, stock: 2, missing: 8 },
    { product: 'Cafe 500g', needed: 20, stock: 4, missing: 16 },
    { product: 'Feijao 1kg', needed: 20, stock: 4, missing: 16 },
  ],
  expiryAlerts: [
    { product: 'Feijao 1kg', validity: 'dez/2025', status: 'Consumir em ate 1 mes.' },
    { product: 'Cafe 500g', validity: 'mar/2026', status: 'Seguro.' },
    { product: 'Arroz 5kg', validity: 'jun/2026', status: 'Seguro.' },
  ],
  urgentPurchases: [{ product: 'Feijao 1kg', quantity: '4 a 8 unidades', reason: 'Repor e evitar perda.' }],
  restockMinimum: [{ product: 'Acucar 1kg', stock: 0, minimum: 3, buy: 'Comprar 3 unidades.' }],
  purchaseForFive: [
    { product: 'Arroz 5kg', buy: 8 },
    { product: 'Cafe 500g', buy: 16 },
    { product: 'Feijao 1kg', buy: 16 },
    { product: 'Acucar 1kg', buy: 3 },
  ],
  summary: [
    'Podemos montar apenas 1 cesta completa com o estoque atual.',
    'Arroz, cafe e feijao estao no limite minimo e travam a producao.',
    'Feijao vence em dezembro de 2025 e deve ser distribuido primeiro.',
    'Acucar 1kg esta zerado e precisa voltar ao minimo rapidamente.',
    'Para produzir 5 cestas precisamos comprar 8 arrozes 5kg, 16 cafes 500g, 16 feijoes 1kg e 3 acucares 1kg.',
  ],
}

async function getReports() {
  noStore()
  const supabase = createServerSupabase()
  const { data: batchesData } = await supabase.from('basket_batches').select('created_at')
  const { data: donationsData } = await supabase.from('donations').select('donated_at')
  const { data: discardedLotsData } = await supabase
    .from('lots')
    .select('id, received_at')
    .eq('status', 'DISCARDED')
  const batches = (batchesData ?? []) as BatchDate[]
  const donations = (donationsData ?? []) as DonationDate[]
  const discardedLots = (discardedLotsData ?? []) as DiscardedLot[]
  const groupByMonth = (dates: string[]) => {
    const counts: Record<string, number> = {}
    dates.forEach((dateStr) => {
      const date = new Date(dateStr)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }
  const basketCounts = groupByMonth(batches.map((b) => b.created_at))
  const donationCounts = groupByMonth(donations.map((d) => d.donated_at))
  const discardedCounts = groupByMonth(discardedLots.map((l) => l.received_at))
  return { basketCounts, donationCounts, discardedCounts }
}

export default async function RelatoriosPage() {
  const { basketCounts, donationCounts, discardedCounts } = await getReports()
  const months = Array.from(
    new Set([
      ...Object.keys(basketCounts),
      ...Object.keys(donationCounts),
      ...Object.keys(discardedCounts),
    ])
  ).sort()
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Relatorios</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mes
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cestas montadas
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doacoes recebidas
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lotes descartados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {months.map((month) => (
                <tr key={month}>
                  <td className="px-4 py-2 whitespace-nowrap">{month}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{basketCounts[month] || 0}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{donationCounts[month] || 0}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{discardedCounts[month] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase text-gray-500 tracking-wide">Relatorio completo</p>
          <h3 className="text-2xl font-semibold">Cesta Social IC Tremembe</h3>
          <p className="text-sm text-gray-600">
            Analise baseada na planilha enviada para identificar estoque, validade e compras
            recomendadas.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">1. Tabela base processada</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 text-left">Produto</th>
                  <th className="px-4 py-2 text-left">Estoque</th>
                  <th className="px-4 py-2 text-left">Minimo</th>
                  <th className="px-4 py-2 text-left">Validade</th>
                  <th className="px-4 py-2 text-left">Qtd. por cesta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {manualReport.baseProducts.map((item) => (
                  <tr key={item.product}>
                    <td className="px-4 py-2 font-medium">{item.product}</td>
                    <td className="px-4 py-2">{item.stock}</td>
                    <td className="px-4 py-2">{item.minimum}</td>
                    <td className="px-4 py-2">{item.validity}</td>
                    <td className="px-4 py-2">{item.perBasket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">2. Estoque atual detalhado</h4>
          <div className="grid gap-4 md:grid-cols-2">
            {manualReport.stockDetails.map((item) => (
              <div
                key={item.product}
                className="border rounded-lg p-4 bg-white shadow-sm flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{item.product}</p>
                  <span
                    className={`text-xs font-medium ${
                      item.status === 'alert' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {item.status === 'alert' ? 'Atencao' : 'OK'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Estoque: {item.stock}</p>
                <p className="text-sm text-gray-600">Minimo: {item.minimum}</p>
                <p className="text-sm text-gray-600">Validade: {item.validity}</p>
                <p className="text-sm text-gray-600">Qtd. por cesta: {item.perBasket}</p>
                <p className="text-sm text-gray-800">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">3. Cestas possiveis</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 text-left">Produto</th>
                  <th className="px-4 py-2 text-left">Estoque</th>
                  <th className="px-4 py-2 text-left">Qtd. por cesta</th>
                  <th className="px-4 py-2 text-left">Cestas possiveis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {manualReport.cestasPossible.map((row) => (
                  <tr key={row.product}>
                    <td className="px-4 py-2 font-medium">{row.product}</td>
                    <td className="px-4 py-2">{row.stock}</td>
                    <td className="px-4 py-2">{row.perBasket}</td>
                    <td className="px-4 py-2">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-700 font-medium">
            Total de cestas completas possiveis agora: 1 unidade.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">4. Itens faltantes para aumentar a producao</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="font-semibold mb-2">Para 2 cestas</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left py-1">Produto</th>
                    <th className="text-left py-1">Necessario</th>
                    <th className="text-left py-1">Estoque</th>
                    <th className="text-left py-1">Faltam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {manualReport.missingForTwo.map((row) => (
                    <tr key={`two-${row.product}`}>
                      <td className="py-1">{row.product}</td>
                      <td className="py-1">{row.needed}</td>
                      <td className="py-1">{row.stock}</td>
                      <td className="py-1 text-red-600 font-medium">{row.missing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="font-semibold mb-2">Para 5 cestas</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left py-1">Produto</th>
                    <th className="text-left py-1">Necessario</th>
                    <th className="text-left py-1">Estoque</th>
                    <th className="text-left py-1">Faltam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {manualReport.missingForFive.map((row) => (
                    <tr key={`five-${row.product}`}>
                      <td className="py-1">{row.product}</td>
                      <td className="py-1">{row.needed}</td>
                      <td className="py-1">{row.stock}</td>
                      <td className="py-1 text-red-600 font-medium">{row.missing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">5. Validades prioritarias</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 text-left">Produto</th>
                  <th className="px-4 py-2 text-left">Validade</th>
                  <th className="px-4 py-2 text-left">Situacao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {manualReport.expiryAlerts.map((row) => (
                  <tr key={row.product}>
                    <td className="px-4 py-2 font-medium">{row.product}</td>
                    <td className="px-4 py-2">{row.validity}</td>
                    <td className="px-4 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">6. Recomendacoes de compra</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="font-semibold mb-2">Urgente</p>
              <ul className="space-y-2 text-sm">
                {manualReport.urgentPurchases.map((item) => (
                  <li key={item.product} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.product}</p>
                      <p className="text-gray-600">{item.reason}</p>
                    </div>
                    <span className="text-primary font-semibold">{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="font-semibold mb-2">Reposicao minima</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left py-1">Produto</th>
                    <th className="text-left py-1">Estoque</th>
                    <th className="text-left py-1">Minimo</th>
                    <th className="text-left py-1">Comprar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {manualReport.restockMinimum.map((row) => (
                    <tr key={row.product}>
                      <td className="py-1">{row.product}</td>
                      <td className="py-1">{row.stock}</td>
                      <td className="py-1">{row.minimum}</td>
                      <td className="py-1 font-medium">{row.buy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="font-semibold mb-2">Compra para montar 5 cestas completas</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left py-1">Produto</th>
                    <th className="text-left py-1">Quantidade a comprar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {manualReport.purchaseForFive.map((row) => (
                    <tr key={`buy-${row.product}`}>
                      <td className="py-1">{row.product}</td>
                      <td className="py-1 font-medium">{row.buy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-lg font-semibold">7. Resumo executivo</h4>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-2">
            {manualReport.summary.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
