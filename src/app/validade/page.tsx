"use client"

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabaseClient'
import { Lot, Food } from '../../types'

type LotWithFood = Pick<Lot, 'id' | 'quantity' | 'expiry_date' | 'received_at' | 'status'> & {
  foods?: Pick<Food, 'id' | 'name'> | null
}

export default function ValidadePage() {
  const supabase = createClient()
  const [lots, setLots] = useState<LotWithFood[]>([])
  const [filter, setFilter] = useState<'all' | 'expired' | '7days' | '30days'>('all')
  const [lotToDiscard, setLotToDiscard] = useState<LotWithFood | null>(null)
  const [discardReason, setDiscardReason] = useState('Validade expirada')
  const [discardError, setDiscardError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLots = async () => {
      const { data } = await supabase
        .from('lots')
        .select('id, quantity, expiry_date, received_at, status, foods(id, name)')
        .eq('status', 'AVAILABLE')
        .neq('expiry_date', null)
        .order('expiry_date', { ascending: true })
      const normalized = (data ?? []).map((lot) => ({
        ...lot,
        foods: Array.isArray(lot.foods) ? lot.foods[0] ?? null : lot.foods,
      })) as LotWithFood[]
      setLots(normalized)
    }
    fetchLots()
  }, [supabase])

  const discardLot = async (lot: LotWithFood) => {
    setLotToDiscard(lot)
    setDiscardReason('Validade expirada')
    setDiscardError(null)
  }

  const confirmDiscard = async () => {
    if (!lotToDiscard) return
    if (!discardReason.trim()) {
      setDiscardError('Informe o motivo do descarte.')
      return
    }
    await supabase
      .from('lots')
      .update({
        status: 'DISCARDED',
        discard_reason: discardReason.trim(),
        discarded_at: new Date().toISOString(),
      })
      .eq('id', lotToDiscard.id)
    setLots((prev) => prev.filter((l) => l.id !== lotToDiscard.id))
    setLotToDiscard(null)
  }
  const cancelDiscard = () => {
    setLotToDiscard(null)
    setDiscardReason('Validade expirada')
    setDiscardError(null)
  }

  const today = new Date()
  const filterFn = (lot: LotWithFood) => {
    const expiry = new Date(lot.expiry_date!)
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    switch (filter) {
      case 'expired':
        return diffDays < 0
      case '7days':
        return diffDays >= 0 && diffDays <= 7
      case '30days':
        return diffDays >= 0 && diffDays <= 30
      default:
        return true
    }
  }
  const filteredLots = lots.filter(filterFn)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Controle de Validade</h2>
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-md ${filter === 'all' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-3 py-1 rounded-md ${filter === 'expired' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Vencidos
        </button>
        <button
          onClick={() => setFilter('7days')}
          className={`px-3 py-1 rounded-md ${filter === '7days' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Vencendo em 7 dias
        </button>
        <button
          onClick={() => setFilter('30days')}
          className={`px-3 py-1 rounded-md ${filter === '30days' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Vencendo em 30 dias
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Alimento
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantidade
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Validade
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dias restantes
              </th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLots.map((lot) => {
              const expiry = new Date(lot.expiry_date!)
              const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              return (
                <tr key={lot.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{lot.foods?.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{lot.quantity}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{lot.expiry_date}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {diffDays < 0 ? 'Vencido' : diffDays}
                  </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={() => discardLot(lot)}
                        className="text-red-600 hover:underline"
                      >
                        Descartar
                      </button>
                    </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {lotToDiscard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold">Descartar lote</h3>
            <p className="text-sm text-gray-600">
              Informe o motivo para descartar o lote de{' '}
              <span className="font-medium">{lotToDiscard.foods?.name}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700">Motivo</label>
              <textarea
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value)}
                className="mt-1 w-full border rounded-md px-3 py-2"
                rows={3}
                placeholder="Ex.: Validade expirada"
              />
              {discardError && <p className="text-sm text-red-600 mt-1">{discardError}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={cancelDiscard} className="px-4 py-2 rounded-md border">
                Cancelar
              </button>
              <button
                onClick={confirmDiscard}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Confirmar descarte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
