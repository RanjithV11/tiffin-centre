'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  UtensilsCrossed,
  Star,
  MessageCircle,
  CheckCircle2,
  Phone,
  Sparkles,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react'
import {
  fetchMenu,
  submitCustomerFeedback,
  type MenuItem,
  type CustomerFeedbackInput,
} from '@/lib/api'

function CustomerMenuContent() {
  const searchParams = useSearchParams()
  const tableParam = searchParams.get('table') || '1'

  const [menu, setMenu] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('All')
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Feedback form state
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState('')

  useEffect(() => {
    fetchMenu()
      .then((items) => setMenu(items))
      .finally(() => setLoading(false))
  }, [])

  function updateQty(id: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [id]: next }
    })
  }

  const selectedItems = useMemo(() => {
    return menu.filter((m) => (quantities[m.id] || 0) > 0)
  }, [menu, quantities])

  const totalAmount = useMemo(() => {
    return selectedItems.reduce(
      (sum, m) => sum + m.price * (quantities[m.id] || 0),
      0,
    )
  }, [selectedItems, quantities])

  const totalItemCount = useMemo(() => {
    return selectedItems.reduce((sum, m) => sum + (quantities[m.id] || 0), 0)
  }, [selectedItems, quantities])

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>()
    menu.forEach((m) => {
      if (m.category) {
        set.add(m.category.charAt(0).toUpperCase() + m.category.slice(1).toLowerCase())
      }
    })
    return ['All', ...Array.from(set)]
  }, [menu])

  const filteredItems = useMemo(() => {
    return menu.filter((item) => {
      if (selectedCat === 'All') return true
      return (item.category || '').toLowerCase() === selectedCat.toLowerCase()
    })
  }, [menu, selectedCat])

  // Build WhatsApp order link
  const whatsappOrderUrl = useMemo(() => {
    const waNumber = '919848012345'
    if (selectedItems.length === 0) {
      const msg = encodeURIComponent(`నమస్కారం! Table ${tableParam} నుండి మెను ఆర్డర్ చేయాలనుకుంటున్నాను.`)
      return `https://wa.me/${waNumber}?text=${msg}`
    }

    const itemLines = selectedItems
      .map((it) => `• ${it.name_english} (${it.name_telugu}) x ${quantities[it.id]} = ₹${it.price * quantities[it.id]}`)
      .join('\n')

    const message = `నమస్కారం! 🙏 Sri Lakshmi Tiffin Center\n📍 Table #${tableParam} ఆర్డర్:\n\n${itemLines}\n\n💰 Total Amount: ₹${totalAmount}\nదయచేసి confirm చేయండి.`
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
  }, [selectedItems, quantities, totalAmount, tableParam])

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingFeedback(true)
    try {
      const res = await submitCustomerFeedback({
        rating,
        comment,
        phone,
        name,
        table_number: parseInt(tableParam) || 1,
      })
      setFeedbackSuccess(res.message || 'ధన్యవాదాలు! మీ అభిప్రాయం రికార్డ్ అయింది. 🎁')
      setComment('')
    } catch {
      setFeedbackSuccess('అభిప్రాయం సమర్పించడంలో సమస్య. దయచేసి మళ్ళీ ప్రయత్నించండి.')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const quickPraise = [
    'దోస చాలా క్రిస్పీగా బాగుంది! 😋',
    'ఇడ్లి సాంబార్ అద్భుతం! ⭐',
    'చట్నీ చాలా టేస్టీగా ఉంది!',
    'సర్వీస్ బాగుంది 👍',
  ]

  return (
    <div className="max-w-md mx-auto min-h-screen bg-zinc-950 text-zinc-100 pb-28">
      {/* Top Banner */}
      <div className="bg-gradient-to-b from-orange-600/30 via-zinc-900 to-zinc-950 px-5 pt-7 pb-5 border-b border-zinc-800 text-center relative">
        <span className="text-3xl mb-1 block">🍱</span>
        <h1 className="text-xl font-bold font-telugu text-orange-400">
          శ్రీ లక్ష్మి టిఫిన్ సెంటర్
        </h1>
        <p className="text-xs text-zinc-400 font-medium">Sri Lakshmi Tiffin — Warangal</p>
        <p className="font-telugu text-xs text-zinc-500 mt-1">
          వేడి వేడి & తాజా బ్రేక్‌ఫాస్ట్ • రుచికరమైన భోజనం
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-orange-300">
          📍 Table #{tableParam}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-3 sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800/80 flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCat === cat
                ? 'bg-orange-600 text-white shadow-md shadow-orange-950'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat === 'All' ? 'అన్నీ (All)' : cat}
          </button>
        ))}
      </div>

      {/* Menu List */}
      <div className="p-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-telugu">
          <UtensilsCrossed size={14} className="text-orange-400" />
          ఈరోజు మెను (Today's Menu)
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 font-telugu text-sm">
            ఈ కేటగిరీలో వంటకాలు లేవు.
          </div>
        ) : (
          filteredItems.map((item) => {
            const qty = quantities[item.id] || 0
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  !item.available
                    ? 'bg-zinc-900/40 border-zinc-800/50 opacity-60'
                    : qty > 0
                    ? 'bg-orange-950/20 border-orange-500/40'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-telugu font-bold text-base text-zinc-100">
                      {item.name_telugu}
                    </h3>
                    {!item.available && (
                      <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full font-telugu">
                        అయిపోయింది
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{item.name_english}</p>
                  <span className="text-sm font-bold text-orange-400 mt-1 block">
                    ₹{item.price}
                  </span>
                </div>

                {item.available && (
                  <div className="flex items-center gap-2">
                    {qty > 0 && (
                      <>
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center text-sm"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-sm text-zinc-100">
                          {qty}
                        </span>
                      </>
                    )}
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 ${
                        qty > 0
                          ? 'bg-orange-600 text-white'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-orange-400 border border-zinc-700'
                      }`}
                    >
                      {qty === 0 ? '+ Add' : '+'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Customer Feedback & Rating Form */}
      <div className="m-4 mt-6 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-yellow-400" size={18} />
          <div>
            <h3 className="font-bold text-sm text-zinc-100 font-telugu">
              మీ అభిప్రాయం చెప్పండి (Feedback & Points)
            </h3>
            <p className="text-xs text-zinc-400">
              రేటింగ్ ఇవ్వండి — <span className="text-yellow-400 font-bold">10 Loyalty Points 🎁</span> పొందండి!
            </p>
          </div>
        </div>

        {feedbackSuccess ? (
          <div className="bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 p-4 rounded-xl text-center text-sm font-telugu flex flex-col items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={24} />
            {feedbackSuccess}
            <button
              onClick={() => setFeedbackSuccess('')}
              className="text-xs text-zinc-400 underline mt-1"
            >
              ఇంకో రివ్యూ ఇవ్వండి
            </button>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            {/* Stars */}
            <div className="flex items-center justify-center gap-2 py-2 bg-zinc-850 rounded-xl">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    size={28}
                    className={
                      s <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-zinc-600'
                    }
                  />
                </button>
              ))}
            </div>

            {/* Quick praises */}
            <div className="flex flex-wrap gap-1.5">
              {quickPraise.map((qp, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setComment(qp)}
                  className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-700 font-telugu transition-colors"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Comment input */}
            <input
              type="text"
              placeholder="మీ అభిప్రాయం రాయండి (ఉదా: దోస బాగుంది)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-telugu"
            />

            {/* Phone for Loyalty Points */}
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="మీ మొబైల్ నంబర్ (Points కోసం)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={submittingFeedback || !phone}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1 font-telugu"
              >
                {submittingFeedback ? '...' : 'సమర్పించండి'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Floating Bottom Order Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur z-30 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-zinc-400 block font-telugu">
              {totalItemCount > 0
                ? `${totalItemCount} వంటకాలు ఎంపికయ్యాయి`
                : 'వంటకం ఎంచుకోండి లేదా'}
            </span>
            <span className="text-lg font-bold text-orange-400">
              {totalAmount > 0 ? `₹${totalAmount}` : 'WhatsApp ఆర్డర్'}
            </span>
          </div>

          <a
            href={whatsappOrderUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-950 font-telugu"
          >
            <MessageCircle size={18} />
            {totalItemCount > 0 ? `ఆర్డర్ చేయండి (₹${totalAmount})` : 'WhatsApp లో మాట్లాడండి'}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function CustomerMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
          Loading menu...
        </div>
      }
    >
      <CustomerMenuContent />
    </Suspense>
  )
}
