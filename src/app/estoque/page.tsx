"use client"

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabaseClient'
import { Food, Lot } from '../../types'

interface StockRow {
  food: Food
  total: number
  nearestExpiry: string | null
  status: 'ok' | 'warning' | 'danger'
}

export default function EstoquePage() {
  const supabase = createClient()
  const [foods, setFoods] = useState<Food[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [rows, setRows] = useState<StockRow[]>([])
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [foodLots, setFoodLots] = useState<Lot[]>([])

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
    // Compute rows aggregated by food
    const map: Record<number, StockRow> = {}
    foods.forEach((food) => {
      map[food.id] = {
        food,
        total: 0,
        nearestExpiry: null,
        status: 'ok',
      }
    })
    lots.forEach((lot) => {
      const row = map[lot.food_id]
      if (row) {
        row.total += Number(lot.quantity)
        if (lot.expiry_date) {
          if (!row.nearestExpiry || lot.expiry_date < row.nearestExpiry) {
            row.nearestExpiry = lot.expiry_date
          }
        }
      }
    })
    // Determine status color based on expiry
    const todayStr = new Date().toISOString().split('T')[0]
    const in7daysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const rowsArray = Object.values(map).map((row) => {
      let status: 'ok' | 'warning' | 'danger' = 'ok'
      if (row.nearestExpiry) {
        if (row.nearestExpiry < todayStr) status = 'danger'
        else if (row.nearestExpiry <= in7daysStr) status = 'warning'
      }
      return { ...row, status }
    })
    setRows(rowsArray)
  }, [foods, lots])

  const filteredRows = rows.filter((row) => {
    const matchesName = row.food.name.toLowerCase().includes(nameFilter.toLowerCase())
    const matchesCat = categoryFilter ? row.food.category === categoryFilter : true
    return matchesName && matchesCat
  })

  const openDetails = async (food: Food) => {
    setSelectedFood(food)
    const { data } = await supabase
      .from('lots')
      .select('*')
      .eq('food_id', food.id)
      .order('expiry_date', { ascending: true })
    setFoodLots(data as Lot[])
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Estoque</h2>
      <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700">Filtrar por nome</label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="mt-1 px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoria</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 px-3 py-2 border rounded-md"
            >
              <option value="">Todas</option>
              <option value="FIXO">Fixo</option>
              <option value="OPCIONAL">Opcional</option>
            </select>
          </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Alimento
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantidade
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lote próximo do vencimento
              </th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRows.map((row) => (
              <tr key={row.food.id}>
                <td className="px-4 py-2 whitespace-nowrap">{row.food.name}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {row.food.category === 'FIXO' ? 'Fixo' : 'Opcional'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{row.total}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {row.nearestExpiry ? (
                    <span
                      className={
                        row.status === 'ok'
                          ? 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs'
                          : row.status === 'warning'
                          ? 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs'
                          : 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs'
                      }
                    >
                      {row.nearestExpiry}
                    </span>
                  ) : (
                    '-' 
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <button
                    onClick={() => openDetails(row.food)}
                    className="text-primary hover:underline"
                  >
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Details modal */}
      {selectedFood && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg w-full max-w-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">
                Detalhes de {selectedFood.name}
              </h3>
              <button onClick={() => setSelectedFood(null)} className="text-gray-500">×</button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validade
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de entrada
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {foodLots.map((lot) => (
                  <tr key={lot.id}>
                    <td className="px-2 py-1 whitespace-nowrap">{lot.quantity}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{lot.expiry_date || '-'}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{new Date(lot.received_at).toLocaleDateString()}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{lot.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-right">
              <button
                onClick={() => setSelectedFood(null)}
                className="px-3 py-1 bg-primary text-white rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}