'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageCircle, AlertTriangle } from 'lucide-react'
import { fetchCustomers, sendReminder, type Customer } from '@/lib/api'

function maskPhone(phone: string): string {
  if (phone.length < 6) return phone
  return phone.slice(0, 2) + '****' + phone.slice(-4)
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800 ${className ?? ''}`} />
}

function RiskBadge({ days }: { days: number }) {
  if (days < 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-900/30 text-green-400 border border-green-700/50 px-2 py-0.5 rounded-full">
        Active
      </span>
    )
  }
  if (days < 14) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-amber-900/30 text-amber-400 border border-amber-700/50 px-2 py-0.5 rounded-full">
        <AlertTriangle size={10} /> At Risk
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-red-900/30 text-red-400 border border-red-700/50 px-2 py-0.5 rounded-full">
      <AlertTriangle size={10} /> High Risk
    </span>
  )
}

function ReminderButton({
  customer,
  onSent,
}: {
  customer: Customer
  onSent: (id: string) => void
}) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handle() {
    setSending(true)
    try {
      await sendReminder(customer.id)
      setSent(true)
      onSent(customer.id)
    } catch {
      // silent — parent handles toast
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return <span className="text-xs text-green-400 font-telugu">పంపబడింది ✓</span>
  }

  return (
    <button
      onClick={handle}
      disabled={sending}
      className="flex items-center gap-1.5 text-xs bg-green-900/30 hover:bg-green-900/60 border border-green-700/50 text-green-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-telugu"
    >
      <MessageCircle size={12} />
      {sending ? 'పంపుతున్నాం…' : 'మళ్ళీ రండి! 🙏'}
    </button>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [filter, setFilter] = useState<'all' | 'at_risk'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCustomers()
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleSent(id: string) {
    const c = customers.find((c) => c.id === id)
    if (c) showToast(`Reminder sent to ${c.name || maskPhone(c.phone)}`)
  }

  const displayed =
    filter === 'at_risk' ? customers.filter((c) => c.at_risk) : customers

  const atRiskCount = customers.filter((c) => c.at_risk).length

  return (
    <div className="p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl shadow-xl text-sm">
          ✅ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Customers</h1>
          <p className="font-telugu text-zinc-500 text-sm">కస్టమర్లు నిర్వహణ</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              filter === 'all'
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setFilter('at_risk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              filter === 'at_risk'
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertTriangle size={13} />
            At-Risk ({atRiskCount})
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 text-zinc-600">
            <p className="text-3xl mb-2">👥</p>
            <p className="font-telugu text-sm">కస్టమర్లు లేరు</p>
            <p className="text-xs mt-1">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="px-4 py-3 font-normal">Phone</th>
                  <th className="px-4 py-3 font-normal">Name</th>
                  <th className="px-4 py-3 font-normal">Loyalty 🏅</th>
                  <th className="px-4 py-3 font-normal">Last Visit</th>
                  <th className="px-4 py-3 font-normal">Days Away</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {displayed.map((customer) => {
                  const rowCls =
                    customer.days_since_visit >= 14
                      ? 'bg-red-950/20 hover:bg-red-950/30'
                      : customer.days_since_visit >= 7
                      ? 'bg-amber-950/10 hover:bg-amber-950/20'
                      : 'hover:bg-zinc-800/30'
                  return (
                    <tr key={customer.id} className={`transition-colors ${rowCls}`}>
                      <td className="px-4 py-3 font-mono text-zinc-400 text-xs">
                        {maskPhone(customer.phone)}
                      </td>
                      <td className="px-4 py-3 text-zinc-200 font-medium">
                        {customer.name || <span className="text-zinc-600 italic">Unknown</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-orange-400 font-semibold">{customer.loyalty_points}</span>
                        <span className="text-zinc-600 text-xs ml-1">pts</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {customer.last_visit
                          ? new Date(customer.last_visit).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            customer.days_since_visit >= 14
                              ? 'text-red-400 font-semibold'
                              : customer.days_since_visit >= 7
                              ? 'text-amber-400 font-semibold'
                              : 'text-zinc-400'
                          }
                        >
                          {customer.days_since_visit}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge days={customer.days_since_visit} />
                      </td>
                      <td className="px-4 py-3">
                        {customer.at_risk && (
                          <ReminderButton customer={customer} onSent={handleSent} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats footer */}
      {!loading && customers.length > 0 && (
        <div className="flex gap-6 text-sm text-zinc-500 px-1">
          <span>Total visits: <strong className="text-zinc-300">{customers.reduce((s, c) => s + c.total_visits, 0)}</strong></span>
          <span>Avg loyalty: <strong className="text-orange-400">{Math.round(customers.reduce((s, c) => s + c.loyalty_points, 0) / customers.length)} pts</strong></span>
        </div>
      )}
    </div>
  )
}
