"use client"

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabaseClient'
import { Food } from '../../types'

export default function CadastrosPage() {
  const supabase = createClient()
  const [foods, setFoods] = useState<Food[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingFood, setEditingFood] = useState<Food | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'FIXO',
    unit: '',
    perishable: true,
    in_basket: false,
    qty_per_basket: 0,
  })
  const [message, setMessage] = useState<string | null>(null)

  const fetchFoods = async () => {
    const { data } = await supabase.from('foods').select('*').order('name')
    setFoods(data as Food[])
  }

  useEffect(() => {
    fetchFoods()
  }, [])

  const openNew = () => {
    setEditingFood(null)
    setFormData({ name: '', category: 'FIXO', unit: '', perishable: true, in_basket: false, qty_per_basket: 0 })
    setShowForm(true)
  }

  const openEdit = (food: Food) => {
    setEditingFood(food)
    setFormData({
      name: food.name,
      category: food.category,
      unit: food.unit,
      perishable: food.perishable,
      in_basket: food.in_basket,
      qty_per_basket: food.qty_per_basket || 0,
    })
    setShowForm(true)
  }

  const handleDelete = async (food: Food) => {
    if (!confirm('Tem certeza que deseja remover este alimento?')) return
    await supabase.from('foods').delete().eq('id', food.id)
    fetchFoods()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.unit) {
      setMessage('Preencha todos os campos obrigatórios.')
      return
    }
    if (editingFood) {
      await supabase
        .from('foods')
        .update({
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          perishable: formData.perishable,
          in_basket: formData.in_basket,
          qty_per_basket: formData.qty_per_basket,
        })
        .eq('id', editingFood.id)
      setMessage('Alimento atualizado.')
    } else {
      await supabase.from('foods').insert({
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        perishable: formData.perishable,
        in_basket: formData.in_basket,
        qty_per_basket: formData.qty_per_basket,
      })
      setMessage('Alimento criado.')
    }
    setShowForm(false)
    fetchFoods()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Cadastros de Alimentos</h2>
      <button
        onClick={openNew}
        className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark"
      >
        Novo alimento
      </button>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md mt-4">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perecível</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Na cesta</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {foods.map((food) => (
              <tr key={food.id}>
                <td className="px-4 py-2 whitespace-nowrap">{food.name}</td>
                <td className="px-4 py-2 whitespace-nowrap">{food.category}</td>
                <td className="px-4 py-2 whitespace-nowrap">{food.unit}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {food.perishable ? 'Sim' : 'Não'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {food.in_basket ? 'Sim' : 'Não'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <button
                    onClick={() => openEdit(food)}
                    className="text-primary hover:underline mr-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(food)}
                    className="text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingFood ? 'Editar alimento' : 'Novo alimento'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                >
                  <option value="FIXO">Fixo</option>
                  <option value="OPCIONAL">Opcional</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unidade</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.perishable}
                    onChange={(e) => setFormData({ ...formData, perishable: e.target.checked })}
                  />
                  Perecível?
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.in_basket}
                    onChange={(e) => setFormData({ ...formData, in_basket: e.target.checked })}
                  />
                  Na cesta?
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantidade por cesta</label>
                <input
                  type="number"
                  min="0"
                  value={formData.qty_per_basket}
                  onChange={(e) =>
                    setFormData({ ...formData, qty_per_basket: Number(e.target.value) })
                  }
                  disabled={!formData.in_basket}
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                />
              </div>
              {message && <p className="text-sm text-red-600">{message}</p>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1 bg-gray-200 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-primary text-white rounded-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}