"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '../../lib/supabaseClient'
import { Food, Lot } from '../../types'

interface Requirement {
  food: Food
  needed: number
  available: number
  missing: number
}

interface DeliveryItemForm {
  foodId: number | null
  quantity: number
}

const perBasketQty = (food: Food) => {
  if (!food.in_basket) return 0
  if (!food.qty_per_basket || food.qty_per_basket <= 0) return 1
  return food.qty_per_basket
}

export default function CestasPage() {
  const supabase = createClient()
  const [foods, setFoods] = useState<Food[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [basketQty, setBasketQty] = useState(1)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deliveryRecipient, setDeliveryRecipient] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItemForm[]>([
    { foodId: null, quantity: 1 },
  ])
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null)
  const [deliveryLoading, setDeliveryLoading] = useState(false)

  const availableByFood = useMemo(() => {
    const map: Record<number, number> = {}
    lots.forEach((lot) => {
      map[lot.food_id] = (map[lot.food_id] || 0) + Number(lot.quantity)
    })
    return map
  }, [lots])

  const buildDefaultDeliveryItems = useCallback(() => {
    const baseItems = foods
      .filter((food) => food.in_basket && (availableByFood[food.id] ?? 0) > 0)
      .map((food) => {
        const defaultQty = perBasketQty(food)
        const available = availableByFood[food.id] ?? defaultQty
        return {
          foodId: food.id,
          quantity: Math.min(defaultQty, available),
        }
      })
    return baseItems.length ? baseItems : [{ foodId: null, quantity: 1 }]
  }, [foods, availableByFood])

  useEffect(() => {
    const fetchData = async () => {
      const { data: foodsData } = await supabase
        .from('foods')
        .select('*')
      const { data: lotsData } = await supabase
        .from('lots')
        .select('*')
        .eq('status', 'AVAILABLE')
      setFoods(foodsData as Food[])
      setLots(lotsData as Lot[])
    }
    fetchData()
  }, [supabase])

  useEffect(() => {
    if (deliveryItems.length === 0 || deliveryItems.every((item) => item.foodId === null)) {
      setDeliveryItems(buildDefaultDeliveryItems())
    }
  }, [deliveryItems, buildDefaultDeliveryItems])

  // Compute requirements whenever basketQty, foods or lots change
  useEffect(() => {
    const reqs: Requirement[] = []
    foods
      .filter((f) => f.in_basket)
      .forEach((food) => {
        const perBasket = perBasketQty(food)
        const needed = perBasket * basketQty
        const available = lots
          .filter((lot) => lot.food_id === food.id && lot.status === 'AVAILABLE')
          .reduce((acc, lot) => acc + Number(lot.quantity), 0)
        const missing = needed > available ? needed - available : 0
        reqs.push({ food, needed, available, missing })
      })
    setRequirements(reqs)
  }, [basketQty, foods, lots])

  const handleToggle = async (food: Food, value: boolean) => {
    setFoods((prev) => prev.map((f) => (f.id === food.id ? { ...f, in_basket: value } : f)))
    await supabase.from('foods').update({ in_basket: value }).eq('id', food.id)
  }

  const handleQtyPerBasketChange = async (food: Food, value: number) => {
    setFoods((prev) => prev.map((f) => (f.id === food.id ? { ...f, qty_per_basket: value } : f)))
    await supabase.from('foods').update({ qty_per_basket: value }).eq('id', food.id)
  }

  const addDeliveryItem = () => {
    setDeliveryItems((prev) => [...prev, { foodId: null, quantity: 1 }])
  }

  const updateDeliveryItem = (
    index: number,
    field: keyof DeliveryItemForm,
    value: number | null
  ) => {
    setDeliveryItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const removeDeliveryItem = (index: number) => {
    setDeliveryItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProduce = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/create-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: basketQty }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.missing) {
          setMessage(
            'Estoque insuficiente: ' +
              data.missing
                .map((m: any) => `${m.name} (faltam ${m.missingQuantity})`)
                .join(', ')
          )
        } else {
          setMessage(data.error || 'Erro na montagem')
        }
      } else {
        setMessage(`Cestas montadas com sucesso (lote ${data.batchId})`)
        // Refresh foods and lots to update quantities
        const { data: lotsData } = await supabase
          .from('lots')
          .select('*')
          .eq('status', 'AVAILABLE')
        setLots(lotsData as Lot[])
      }
    } catch (err: any) {
      setMessage(err.message)
    }
    setLoading(false)
  }

  const handleRegisterDelivery = async () => {
    setDeliveryMessage(null)
    const filteredItems = deliveryItems.filter(
      (item) => item.foodId && item.quantity && item.quantity > 0
    )
    if (!deliveryRecipient.trim()) {
      setDeliveryMessage('Informe o nome de quem recebeu a cesta.')
      return
    }
    if (!filteredItems.length) {
      setDeliveryMessage('Adicione ao menos um alimento entregue.')
      return
    }
    setDeliveryLoading(true)
    try {
      const res = await fetch('/api/register-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: deliveryRecipient.trim(),
          deliveredAt: deliveryDate,
          notes: deliveryNotes || null,
          items: filteredItems,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDeliveryMessage(data.error || 'Não foi possível registrar a entrega.')
      } else {
        setDeliveryMessage(`Entrega registrada (#${data.deliveryId}).`)
        setDeliveryRecipient('')
        setDeliveryNotes('')
        setDeliveryItems([{ foodId: null, quantity: 1 }])
      }
    } catch (err: any) {
      setDeliveryMessage(err.message)
    }
    setDeliveryLoading(false)
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Cestas Básicas</h2>
      {/* Section 6.1: Configuração do modelo de cesta */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Itens da cesta</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usar na cesta?
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade por cesta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {foods.map((food) => (
                <tr key={food.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{food.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={food.in_basket}
                      onChange={(e) => handleToggle(food, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={food.qty_per_basket || 0}
                      disabled={!food.in_basket}
                      onChange={(e) => handleQtyPerBasketChange(food, Number(e.target.value))}
                      className="w-24 px-3 py-1 border rounded-md"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Section 6.2: Montagem de novas cestas */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Montar novas cestas</h3>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Quantidade de cestas a produzir
            </label>
            <input
              type="number"
              min="1"
              value={basketQty}
              onChange={(e) => setBasketQty(Number(e.target.value))}
              className="mt-1 px-3 py-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleProduce}
            disabled={loading || requirements.some((r) => r.missing > 0)}
            className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? 'Montando...' : 'Confirmar'}
          </button>
        </div>
        {/* Show requirements summary */}
        <div className="mt-4">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alimento
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Necessário
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disponível
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Falta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requirements.map((req) => (
                <tr key={req.food.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{req.food.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{req.needed}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{req.available}</td>
                  <td
                    className={`px-4 py-2 whitespace-nowrap ${req.missing > 0 ? 'text-red-600' : ''}`}
                  >
                    {req.missing}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>

      {/* Section: Registrar entrega */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Registrar entrega de cestas</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Beneficiário</label>
            <input
              type="text"
              value={deliveryRecipient}
              onChange={(e) => setDeliveryRecipient(e.target.value)}
              className="mt-1 px-3 py-2 border rounded-md w-full"
              placeholder="Nome de quem recebeu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="mt-1 px-3 py-2 border rounded-md w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Observações</label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              className="mt-1 px-3 py-2 border rounded-md w-full"
              placeholder="Opcional"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-700">Itens entregues</p>
            <button
              type="button"
              onClick={addDeliveryItem}
              className="text-primary text-sm hover:underline"
            >
              Adicionar item
            </button>
          </div>
          {deliveryItems.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end bg-white p-3 rounded-lg shadow-sm"
            >
              <div>
                <label className="block text-xs font-medium text-gray-600">Alimento</label>
                <select
                  value={item.foodId ?? ''}
                  onChange={(e) =>
                    updateDeliveryItem(index, 'foodId', e.target.value ? Number(e.target.value) : null)
                  }
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
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
                <label className="block text-xs font-medium text-gray-600">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateDeliveryItem(index, 'quantity', Number(e.target.value) || 1)
                  }
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeDeliveryItem(index)}
                  className="text-red-600 text-sm hover:underline"
                  disabled={deliveryItems.length === 1}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleRegisterDelivery}
            disabled={deliveryLoading}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
          >
            {deliveryLoading ? 'Registrando...' : 'Registrar entrega'}
          </button>
          {deliveryMessage && <p className="text-sm text-red-600">{deliveryMessage}</p>}
        </div>
      </div>
    </div>
  )
}
