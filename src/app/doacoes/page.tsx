"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '../../lib/supabaseClient'
import { Food } from '../../types'

interface DonationItemForm {
  foodId: number | null
  quantity: number
  expiryDate: string | null
}

interface DonationHistoryEntry {
  donationId: number
  donationItemId: number
  lotId: number
  donorName: string | null
  donatedAt: string
  foodId: number
  foodName: string
  perishable: boolean
  quantity: number
  expiryDate: string | null
}

export default function DoacoesPage() {
  const supabase = createClient()
  const [donorName, setDonorName] = useState('')
  const [items, setItems] = useState<DonationItemForm[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [history, setHistory] = useState<DonationHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [editingLotId, setEditingLotId] = useState<number | null>(null)
  const [editQuantity, setEditQuantity] = useState(1)
  const [editExpiry, setEditExpiry] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    const fetchFoods = async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('name')
      if (!error && data) setFoods(data as Food[])
    }
    fetchFoods()
  }, [supabase])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    const { data, error } = await supabase
      .from('donations')
      .select(
        'id, donor_name, donated_at, donation_items(id, lot_id, lots(id, food_id, quantity, expiry_date, foods(name, perishable)))'
      )
      .order('donated_at', { ascending: false })
      .limit(50)
    if (error) {
      setHistoryError(error.message)
      setHistory([])
    } else {
      const entries: DonationHistoryEntry[] = []
      data?.forEach((donation: any) => {
        donation.donation_items?.forEach((item: any) => {
          const lot = item.lots
          const food = lot?.foods
          if (!lot || !food) return
          entries.push({
            donationId: donation.id,
            donationItemId: item.id,
            lotId: lot.id,
            donorName: donation.donor_name,
            donatedAt: donation.donated_at,
            foodId: lot.food_id,
            foodName: food.name,
            perishable: !!food.perishable,
            quantity: Number(lot.quantity),
            expiryDate: lot.expiry_date,
          })
        })
      })
      setHistory(entries)
    }
    setHistoryLoading(false)
  }, [supabase])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const addItem = () => {
    setItems((prev) => [...prev, { foodId: null, quantity: 1, expiryDate: null }])
  }

  const updateItem = (index: number, field: keyof DonationItemForm, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const perishableHasIssues = useMemo(() => {
    return items.some((item) => {
      if (!item.foodId) return false
      const food = foods.find((f) => f.id === item.foodId)
      if (!food?.perishable) return false
      if (!item.expiryDate) return true
      const selected = new Date(item.expiryDate)
      selected.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selected < today
    })
  }, [items, foods])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setValidationError(null)
    try {
      const { data: donationData, error: donationError } = await supabase
        .from('donations')
        .insert({ donor_name: donorName || null })
        .select()
        .single()
      if (donationError) throw donationError
      const donationId = donationData.id

      for (const item of items) {
        if (!item.foodId) continue
        const food = foods.find((f) => f.id === item.foodId)
        if (food?.perishable) {
          if (!item.expiryDate) {
            setValidationError(`Informe a validade para ${food.name}.`)
            throw new Error(`O alimento ${food.name} é perecível. Informe a validade.`)
          }
          const selected = new Date(item.expiryDate)
          selected.setHours(0, 0, 0, 0)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (selected < today) {
            setValidationError(`A validade de ${food.name} não pode ser no passado.`)
            throw new Error(`A validade de ${food.name} não pode ser no passado.`)
          }
        }
        const { data: lotData, error: lotError } = await supabase
          .from('lots')
          .insert({
            food_id: item.foodId,
            quantity: item.quantity,
            expiry_date: item.expiryDate,
            donor_name: donorName || null,
            status: 'AVAILABLE',
          })
          .select()
          .single()
        if (lotError) throw lotError
        const { error: linkError } = await supabase.from('donation_items').insert({
          donation_id: donationId,
          lot_id: lotData.id,
        })
        if (linkError) throw linkError
      }
      setMessage('Doação registrada com sucesso!')
      setDonorName('')
      setItems([])
      await loadHistory()
    } catch (err: any) {
      setMessage(err.message)
    }
    setLoading(false)
  }

  const startEdit = (entry: DonationHistoryEntry) => {
    setEditingLotId(entry.lotId)
    setEditQuantity(entry.quantity)
    setEditExpiry(entry.expiryDate)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingLotId(null)
    setEditQuantity(1)
    setEditExpiry(null)
    setEditError(null)
  }

  const saveEdit = async () => {
    if (editingLotId == null) return
    const entry = history.find((h) => h.lotId === editingLotId)
    if (!entry) return
    if (editQuantity <= 0) {
      setEditError('Quantidade deve ser maior que zero.')
      return
    }
    if (entry.perishable && !editExpiry) {
      setEditError('Informe a validade para itens perecíveis.')
      return
    }
    setEditLoading(true)
    setEditError(null)
    const { error } = await supabase
      .from('lots')
      .update({
        quantity: editQuantity,
        expiry_date: editExpiry || null,
      })
      .eq('id', editingLotId)
    if (error) {
      setEditError(error.message)
    } else {
      await loadHistory()
      cancelEdit()
    }
    setEditLoading(false)
  }

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Registrar Doação</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Nome do doador (opcional)</label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-4 md:mt-0 px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark"
          >
            Adicionar item
          </button>
        </div>
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => {
              const selectedFood = foods.find((f) => f.id === item.foodId)
              return (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alimento</label>
                    <select
                      value={item.foodId ?? ''}
                      onChange={(e) => updateItem(index, 'foodId', Number(e.target.value) || null)}
                      className="mt-1 w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Selecione...</option>
                      {foods.map((food) => (
                        <option key={food.id} value={food.id}>
                          {food.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Validade</label>
                    <input
                      type="date"
                      value={item.expiryDate ?? ''}
                      onChange={(e) => updateItem(index, 'expiryDate', e.target.value || null)}
                      className="mt-1 w-full px-3 py-2 border rounded-md"
                      disabled={selectedFood ? !selectedFood.perishable : false}
                    />
                    {selectedFood?.perishable && (() => {
                      if (!item.expiryDate) {
                        return (
                          <p className="text-xs text-red-600 mt-1">
                            Obrigatório para itens perecíveis
                          </p>
                        )
                      }
                      const inputDate = new Date(item.expiryDate)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      if (inputDate < today) {
                        return (
                          <p className="text-xs text-red-600 mt-1">
                            Data não pode ser anterior a hoje
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {(message || validationError) && (
          <p className="text-sm text-center text-red-600">
            {validationError || message}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || items.length === 0 || perishableHasIssues}
          className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Registrar doação'}
        </button>
      </form>
    </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Histórico de doações</h3>
          {historyLoading && <span className="text-sm text-gray-500">Carregando...</span>}
        </div>
        {historyError && <p className="text-sm text-red-600">{historyError}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Doador</th>
                <th className="px-4 py-2 text-left">Alimento</th>
                <th className="px-4 py-2 text-left">Quantidade</th>
                <th className="px-4 py-2 text-left">Validade</th>
                <th className="px-4 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map((entry) => {
                const isEditing = editingLotId === entry.lotId
                return (
                  <tr key={entry.donationItemId}>
                    <td className="px-4 py-2">
                      {new Date(entry.donatedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2">{entry.donorName || 'Anônimo'}</td>
                    <td className="px-4 py-2">{entry.foodName}</td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(Number(e.target.value))}
                          className="w-24 border rounded-md px-2 py-1"
                        />
                      ) : (
                        entry.quantity
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editExpiry ?? ''}
                          onChange={(e) => setEditExpiry(e.target.value || null)}
                          className="border rounded-md px-2 py-1"
                          disabled={!entry.perishable}
                        />
                      ) : entry.expiryDate ? (
                        new Date(entry.expiryDate).toLocaleDateString('pt-BR')
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={editLoading}
                            className="text-primary hover:underline disabled:opacity-50"
                          >
                            Salvar
                          </button>
                          <button onClick={cancelEdit} className="text-gray-500 hover:underline">
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(entry)}
                          className="text-primary hover:underline"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {history.length === 0 && !historyLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    Nenhuma doação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editError && <p className="text-sm text-red-600">{editError}</p>}
      </div>
    </div>
  )
}
