'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  Users,
  Star,
  AlertTriangle,
  PlusCircle,
  UtensilsCrossed,
  Bell,
  MessageCircle,
  X,
  Send,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import {
  fetchDashboardStats,
  fetchTopItems,
  fetchRetention,
  fetchFeedback,
  fetchMenu,
  createOrder,
  sendTestBotMessage,
  type DashboardStats,
  type TopItem,
  type RetentionData,
  type FeedbackEntry,
  type MenuItem,
} from '@/lib/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayTelugu(): string {
  const now = new Date()
  return now.toLocaleDateString('te-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= value ? 'text-yellow-400' : 'text-zinc-700'}>
          ★
        </span>
      ))}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-800 ${className ?? ''}`} />
  )
}

function StatCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  labelTe: string
  labelEn: string
  value: string | number
  sub?: string
  accent?: string
}

function StatCard({ icon, labelTe, labelEn, value, sub, accent = 'text-orange-400' }: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-2 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-telugu text-xs text-zinc-500">{labelTe}</p>
          <p className="text-xs text-zinc-500">{labelEn}</p>
        </div>
        <div className="text-zinc-600">{icon}</div>
      </div>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  )
}

const PIE_COLORS = ['#22c55e', '#f97316', '#ef4444']

// ─── WhatsApp Bot Simulator Modal ─────────────────────────────────────────────

interface ChatMessage {
  sender: 'bot' | 'user'
  text: string
  time: string
}

function WhatsAppSimulatorModal({ onClose, onMessageSent }: { onClose: () => void; onMessageSent: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'నమస్కారం! 🙏 Sri Lakshmi Tiffin Center, Warangal కి స్వాగతం!\nమీ పేరు చెప్పండి:',
      time: 'Just now',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)

  const quickReplies = [
    'రాజు',
    '1 (చాలా బాగుంది ⭐⭐⭐⭐⭐)',
    'దోస చాలా క్రిస్పీగా బాగుంది!',
    'menu',
    'points',
  ]

  async function handleSend(textToSend?: string) {
    const text = (textToSend || inputText).trim()
    if (!text || loading) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = { sender: 'user', text, time: now }
    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setLoading(true)

    try {
      const res = await sendTestBotMessage(text, '+919848012345')
      const botMsg: ChatMessage = { sender: 'bot', text: res.reply, time: now }
      setMessages((prev) => [...prev, botMsg])
      onMessageSent()
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Error connecting to bot. Make sure backend is running.', time: now },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[580px] overflow-hidden">
        {/* WhatsApp Header */}
        <div className="bg-emerald-800 px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-xl">
              🍱
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight">Sri Lakshmi Tiffin (Bot)</h3>
              <p className="text-xs text-emerald-200">Online • Telugu WhatsApp Assistant</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-950/70">
          <div className="text-center">
            <span className="text-[11px] bg-zinc-800/80 text-zinc-400 px-3 py-1 rounded-full font-telugu">
              కస్టమర్ అనుభవం (Live WhatsApp Simulation)
            </span>
          </div>

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line shadow ${
                  m.sender === 'user'
                    ? 'bg-emerald-700 text-white rounded-tr-none'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-none font-telugu'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 px-1">{m.time}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-850 px-3 py-1.5 rounded-full w-fit">
              <span className="animate-spin text-orange-400">⏳</span> Bot typing in Telugu...
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-800 flex gap-1.5 overflow-x-auto text-xs no-scrollbar">
          {quickReplies.map((qr, i) => (
            <button
              key={i}
              onClick={() => handleSend(qr.split(' ')[0])}
              className="whitespace-nowrap bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-700 text-[11px] transition-colors"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
          <input
            type="text"
            placeholder="Type in Telugu or English (e.g. 5, దోస బాగుంది)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Order Modal ──────────────────────────────────────────────────────────

function AddOrderModal({ onClose, onOrderAdded }: { onClose: () => void; onOrderAdded: () => void }) {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingMenu, setLoadingMenu] = useState(true)

  useEffect(() => {
    fetchMenu()
      .then((m) => setMenu(m.filter((i) => i.available)))
      .finally(() => setLoadingMenu(false))
  }, [])

  function updateQty(id: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [id]: next }
    })
  }

  const selectedItems = menu.filter((m) => (quantities[m.id] || 0) > 0)
  const totalAmount = selectedItems.reduce(
    (sum, m) => sum + m.price * (quantities[m.id] || 0),
    0,
  )

  async function handlePlaceOrder() {
    if (selectedItems.length === 0) return
    setSubmitting(true)
    try {
      await createOrder({
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || '+919848012345',
        items: selectedItems.map((m) => ({
          menu_item_id: m.id,
          quantity: quantities[m.id],
        })),
      })
      onOrderAdded()
      onClose()
    } catch (err) {
      alert('Failed to place order. Make sure backend is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Take Walk-in Order (కొత్త ఆర్డర్)</h3>
            <p className="text-xs text-zinc-400 font-telugu">కస్టమర్ ఆర్డర్ వేసి సేవ్ చేయండి</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X size={20} />
          </button>
        </div>

        {/* Customer fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Customer Name (పేరు)</label>
            <input
              type="text"
              placeholder="e.g. రమేష్ / Ramesh"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Phone # (ఫోన్ నంబర్)</label>
            <input
              type="text"
              placeholder="e.g. 9848012345"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100"
            />
          </div>
        </div>

        {/* Item Selection List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Select Items</p>
          {loadingMenu ? (
            <p className="text-sm text-zinc-500 py-4 text-center">Loading menu items...</p>
          ) : menu.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No available menu items found.</p>
          ) : (
            menu.map((item) => {
              const qty = quantities[item.id] || 0
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    qty > 0
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-zinc-850/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <span className="font-telugu text-sm text-zinc-200 font-medium mr-2">
                      {item.name_telugu}
                    </span>
                    <span className="text-xs text-zinc-400">({item.name_english})</span>
                    <span className="block text-xs font-bold text-orange-400">₹{item.price}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      disabled={qty === 0}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 text-sm font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-zinc-100">{qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Total & Place Order */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block">Total Amount</span>
            <span className="text-xl font-bold text-green-400">₹{totalAmount}</span>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={totalAmount === 0 || submitting}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle2 size={16} />
            {submitting ? 'Placing...' : `Confirm Order (₹${totalAmount})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [retention, setRetention] = useState<RetentionData | null>(null)
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Modals state
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showBotModal, setShowBotModal] = useState(false)

  async function loadData() {
    try {
      const [s, ti, ret, fb] = await Promise.all([
        fetchDashboardStats(),
        fetchTopItems(30),
        fetchRetention(),
        fetchFeedback(),
      ])
      setStats(s)
      setTopItems(ti.slice(0, 5))
      setRetention(ret)
      setFeedback(fb.slice(0, 5))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleManualRefresh() {
    setRefreshing(true)
    loadData()
  }

  const retentionPie = retention
    ? [
        { name: 'New (కొత్త)', value: retention.new_customers },
        { name: 'Returning (పాత)', value: retention.returning_customers },
        { name: 'At-Risk (రాని)', value: retention.at_risk_customers },
      ]
    : []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            🍱 Sri Lakshmi Tiffin <span className="text-orange-400">— Warangal</span>
          </h1>
          <p className="font-telugu text-zinc-400 text-sm mt-0.5">{todayTelugu()}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-300 px-2.5 py-2 rounded-lg transition-colors"
            title="Refresh dashboard stats"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-orange-400' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setShowBotModal(true)}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shadow-md shadow-emerald-950"
          >
            <MessageCircle size={16} />
            💬 Test WhatsApp Bot
          </button>

          <button
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-md shadow-orange-950"
          >
            <PlusCircle size={16} />
            + Add Order
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>⚠️ {error} — Make sure the backend is running at http://localhost:8000</span>
          <button onClick={loadData} className="underline text-xs ml-4">Retry</button>
        </div>
      )}

      {/* 4 Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp size={22} />}
            labelTe="ఈరోజు ఆదాయం"
            labelEn="Today's Revenue"
            value={stats ? `₹${stats.today_revenue.toLocaleString('en-IN')}` : '₹0'}
            accent="text-green-400"
          />
          <StatCard
            icon={<Users size={22} />}
            labelTe="మొత్తం customers"
            labelEn="Total Customers"
            value={stats?.total_customers ?? 0}
            accent="text-blue-400"
          />
          <StatCard
            icon={<Star size={22} />}
            labelTe="సగటు rating"
            labelEn="Avg Rating"
            value={stats ? `${stats.avg_rating.toFixed(1)} ⭐` : '4.6 ⭐'}
            accent="text-yellow-400"
          />
          <StatCard
            icon={<AlertTriangle size={22} />}
            labelTe="రాని customers"
            labelEn="At-Risk"
            value={stats?.at_risk_count ?? 0}
            accent="text-red-400"
            sub="Not visited in 7+ days"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Bar Chart: Top Items */}
        <div className="xl:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
              🏆 Top Selling Items
              <span className="font-telugu text-zinc-500 font-normal">(అత్యధిక అమ్మకాలు)</span>
            </h2>
            <span className="text-xs text-orange-400 font-telugu">లైవ్ డేటా</span>
          </div>

          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : topItems.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-zinc-600 text-sm">
              No orders yet. Click "+ Add Order" above to place one!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topItems} margin={{ top: 0, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="name_telugu"
                  tick={{ fill: '#a1a1aa', fontSize: 12, fontFamily: 'Noto Sans Telugu' }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    color: '#f4f4f5',
                  }}
                  formatter={(val: number, _name: string, props: { payload?: TopItem }) => [
                    `${val} orders (₹${props.payload?.revenue?.toLocaleString('en-IN') ?? ''})`,
                    props.payload?.name_english ?? '',
                  ]}
                />
                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart: Retention */}
        <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">
            👥 Customer Retention
            <span className="font-telugu text-zinc-500 ml-2 font-normal">(కస్టమర్లు)</span>
          </h2>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : !retention ? (
            <div className="h-56 flex items-center justify-center text-zinc-600 text-sm">
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={retentionPie}
                  cx="50%"
                  cy="45%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ value }) => value}
                  labelLine={false}
                >
                  {retentionPie.map((_entry, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconSize={10}
                  formatter={(value) => (
                    <span className="text-xs text-zinc-400 font-telugu">{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    color: '#f4f4f5',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Feedback Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300">
            💬 Recent Customer Feedback
            <span className="font-telugu text-zinc-500 ml-2 font-normal">(ఇటీవలి అభిప్రాయాలు)</span>
          </h2>
          <button
            onClick={() => router.push('/feedback')}
            className="text-xs text-orange-400 hover:underline font-telugu"
          >
            అన్నీ చూడండి →
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : feedback.length === 0 ? (
          <p className="text-sm text-zinc-600 py-6 text-center font-telugu">
            ఇంకా ఫీడ్‌బ్యాక్ రాలేదు. WhatsApp Bot ని టెస్ట్ చేయండి!
          </p>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <div
                key={f.id}
                className="bg-zinc-850 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-200">{f.customer_name}</span>
                    <StarRating value={f.rating} />
                    <span className="text-xs text-zinc-500 font-mono">
                      {f.customer_phone ? f.customer_phone.slice(0, 4) + '****' + f.customer_phone.slice(-3) : ''}
                    </span>
                  </div>
                  {f.comment && (
                    <p className="font-telugu text-sm text-zinc-300 leading-relaxed">
                      "{f.comment}"
                    </p>
                  )}
                </div>
                <div className="text-xs text-zinc-500 shrink-0">
                  {f.sentiment === 'positive' && (
                    <span className="bg-green-900/30 text-green-400 border border-green-700/50 px-2 py-0.5 rounded-full font-telugu">
                      సంతోషం 😊
                    </span>
                  )}
                  {f.sentiment === 'neutral' && (
                    <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full font-telugu">
                      సాధారణం 😐
                    </span>
                  )}
                  {f.sentiment === 'negative' && (
                    <span className="bg-red-900/30 text-red-400 border border-red-700/50 px-2 py-0.5 rounded-full font-telugu">
                      నిరాశ 😞
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Modals */}
      {showOrderModal && (
        <AddOrderModal
          onClose={() => setShowOrderModal(false)}
          onOrderAdded={handleManualRefresh}
        />
      )}

      {showBotModal && (
        <WhatsAppSimulatorModal
          onClose={() => setShowBotModal(false)}
          onMessageSent={handleManualRefresh}
        />
      )}
    </div>
  )
}
