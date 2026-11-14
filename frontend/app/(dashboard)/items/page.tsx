'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  PlusCircle,
  Trash2,
  DatabaseZap,
  X,
  Pencil,
  Search,
  CheckCircle2,
  UtensilsCrossed,
  Filter,
} from 'lucide-react'
import {
  fetchMenu,
  addMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
  seedMenu,
  type MenuItem,
  type NewMenuItem,
} from '@/lib/api'

const STANDARD_CATEGORIES = ['Breakfast', 'Lunch', 'Drinks', 'Snacks', 'Special']

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800 ${className ?? ''}`} />
}

function AvailabilityToggle({
  item,
  onToggle,
}: {
  item: MenuItem
  onToggle: (id: string, v: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try {
      await onToggle(item.id, !item.available)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        item.available ? 'bg-green-500' : 'bg-zinc-700'
      } ${loading ? 'opacity-50' : ''}`}
      title={item.available ? 'Click to mark Unavailable' : 'Click to mark Available'}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          item.available ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ─── Add / Edit Item Modal ────────────────────────────────────────────────────

interface ItemModalProps {
  initialItem?: MenuItem | null
  onClose: () => void
  onSave: (item: NewMenuItem, id?: string) => Promise<void>
}

function ItemModal({ initialItem, onClose, onSave }: ItemModalProps) {
  const isEditing = Boolean(initialItem)
  const [form, setForm] = useState<NewMenuItem>({
    name_telugu: initialItem?.name_telugu || '',
    name_english: initialItem?.name_english || '',
    price: initialItem?.price || 25,
    category: initialItem?.category
      ? initialItem.category.charAt(0).toUpperCase() + initialItem.category.slice(1).toLowerCase()
      : 'Breakfast',
    description: initialItem?.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name_telugu.trim() || !form.name_english.trim() || form.price <= 0) {
      setError('Please fill in both Telugu and English names, with a price > 0.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form, initialItem?.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {isEditing ? 'Edit Menu Item (మార్చండి)' : 'Add Menu Item (కొత్త వంటకం)'}
            </h2>
            <p className="text-xs text-zinc-400 font-telugu">
              {isEditing ? 'ధర లేదా పేరు మార్చండి' : 'మెనులో కొత్త item చేర్చండి'}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 font-telugu">
              Telugu Name * (తెలుగు పేరు)
            </label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 font-telugu"
              placeholder="ఇడ్లి, దోస, పూరి, ఉప్మా..."
              value={form.name_telugu}
              onChange={(e) => setForm((f) => ({ ...f, name_telugu: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              English Name *
            </label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
              placeholder="Idli, Plain Dosa, Poori..."
              value={form.name_english}
              onChange={(e) => setForm((f) => ({ ...f, name_english: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Price (ధర ₹) *
              </label>
              <input
                type="number"
                min={1}
                step={1}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 font-bold text-orange-400"
                placeholder="30"
                value={form.price || ''}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Category (వర్గం)
              </label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {STANDARD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-2.5 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              {saving ? 'Saving…' : isEditing ? 'Update Item (మార్చు)' : 'Add Item (చేర్చు)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Menu Page ───────────────────────────────────────────────────────────

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMenu()
      setItems(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function handleToggle(id: string, available: boolean) {
    try {
      const updated = await toggleMenuItemAvailability(id, available)
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, available } : it)))
      showToast(`${updated.name_english || 'Item'} marked as ${available ? 'Available (అందుబాటులో ఉంది)' : 'Unavailable'}`)
    } catch (err) {
      showToast('Failed to update availability')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}" from the menu?`)) return
    try {
      await deleteMenuItem(id)
      setItems((prev) => prev.filter((it) => it.id !== id))
      showToast(`"${name}" deleted from menu`)
    } catch (err) {
      showToast('Failed to delete item')
    }
  }

  async function handleSaveItem(form: NewMenuItem, id?: string) {
    if (id) {
      // Update existing item
      const updated = await updateMenuItem(id, form)
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...form, id } : it)))
      showToast(`Updated "${form.name_english}" (₹${form.price})`)
    } else {
      // Add new item
      const created = await addMenuItem(form)
      setItems((prev) => [created, ...prev])
      showToast(`Added "${created.name_english}" to menu`)
    }
  }

  async function handleSeed() {
    if (!confirm('This will seed the default Warangal tiffin items (ఇడ్లి, దోస, ఉప్మా, పూరి...). Continue?')) return
    setSeeding(true)
    try {
      const res = await seedMenu()
      showToast(res.message || 'Menu seeded successfully!')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seeding failed')
    } finally {
      setSeeding(false)
    }
  }

  // Filter items by search query and category
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.name_english.toLowerCase().includes(search.toLowerCase()) ||
        item.name_telugu.toLowerCase().includes(search.toLowerCase())

      const itemCat = (item.category || 'General').toLowerCase()
      const matchesCat =
        selectedCategory === 'All' || itemCat === selectedCategory.toLowerCase()

      return matchesSearch && matchesCat
    })
  }, [items, search, selectedCategory])

  // Extract all distinct categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      if (it.category) {
        set.add(it.category.charAt(0).toUpperCase() + it.category.slice(1).toLowerCase())
      }
    })
    return ['All', ...Array.from(set)]
  }, [items])

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-800 text-white border border-emerald-700 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-bounce">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <UtensilsCrossed className="text-orange-400" size={24} />
            Menu Management <span className="font-telugu text-zinc-400 text-base font-normal">(మెను నిర్వహణ)</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage your tiffin center prices, availability, and Telugu names.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 text-xs text-zinc-300 px-3 py-2 rounded-lg transition-colors"
            title="Seed default 10 Warangal tiffin items"
          >
            <DatabaseZap size={14} />
            {seeding ? 'Seeding…' : 'Seed Default Menu'}
          </button>
          <button
            onClick={() => {
              setEditingItem(null)
              setShowModal(true)
            }}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-md shadow-orange-950"
          >
            <PlusCircle size={16} />
            + Add New Item
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
          <span className="text-xs text-zinc-500 block">Total Items (మొత్తం)</span>
          <span className="text-2xl font-bold text-zinc-100">{items.length}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
          <span className="text-xs text-green-500 block">Available (అందుబాటులో ఉన్నవి)</span>
          <span className="text-2xl font-bold text-green-400">
            {items.filter((i) => i.available).length}
          </span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
          <span className="text-xs text-red-400 block">Unavailable (అయిపోయినవి)</span>
          <span className="text-2xl font-bold text-red-400">
            {items.filter((i) => !i.available).length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Filter size={15} className="text-zinc-500 shrink-0 ml-1" />
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search item (ఇడ్లి, Dosa...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Menu Items Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="font-telugu text-lg font-semibold text-zinc-300">ఏ వంటకం కనుగొనబడలేదు</p>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            No items match your filter. Click "Seed Default Menu" or "+ Add New Item".
          </p>
          <button
            onClick={handleSeed}
            className="bg-orange-600 hover:bg-orange-500 text-white text-xs px-4 py-2 rounded-lg transition-colors"
          >
            Seed 10 Warangal Items Now
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-850 border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Telugu Name (తెలుగు)</th>
                <th className="px-5 py-3 font-semibold">English Name</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold text-center">Available?</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-zinc-800/40 transition-colors ${
                    !item.available ? 'opacity-60 bg-zinc-950/40' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-telugu text-base text-zinc-100 font-medium">
                    {item.name_telugu}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-300 font-medium">
                    {item.name_english}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-700/50 capitalize">
                      {item.category || 'General'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-base font-bold text-orange-400">
                    ₹{item.price}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <AvailabilityToggle item={item} onToggle={handleToggle} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setShowModal(true)
                        }}
                        className="p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Edit price & details"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name_english)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Delete item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <ItemModal
          initialItem={editingItem}
          onClose={() => {
            setShowModal(false)
            setEditingItem(null)
          }}
          onSave={handleSaveItem}
        />
      )}
    </div>
  )
}
