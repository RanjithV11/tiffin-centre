'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchFeedback, type FeedbackEntry } from '@/lib/api'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800 ${className ?? ''}`} />
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'text-yellow-400' : 'text-zinc-700'}>
          ★
        </span>
      ))}
    </span>
  )
}

function SentimentBadge({ sentiment }: { sentiment: FeedbackEntry['sentiment'] }) {
  const map = {
    positive: { label: 'సంతోషం 😊', cls: 'bg-green-900/40 text-green-400 border-green-700/50' },
    neutral:  { label: 'సాధారణం 😐', cls: 'bg-zinc-800 text-zinc-400 border-zinc-700'          },
    negative: { label: 'నిరాశ 😞',   cls: 'bg-red-900/40 text-red-400 border-red-700/50'       },
  }
  const { label, cls } = map[sentiment] ?? map.neutral
  return (
    <span className={`font-telugu text-xs px-2.5 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400 w-6 text-right">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 w-6">{count}</span>
    </div>
  )
}

export default function FeedbackPage() {
  const [all, setAll] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchFeedback()
      setAll(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const displayed = ratingFilter !== null ? all.filter((f) => f.rating === ratingFilter) : all

  const avgRating =
    all.length === 0 ? 0 : all.reduce((s, f) => s + f.rating, 0) / all.length

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    r,
    count: all.filter((f) => f.rating === r).length,
  }))

  const sentimentCounts = {
    positive: all.filter((f) => f.sentiment === 'positive').length,
    neutral:  all.filter((f) => f.sentiment === 'neutral').length,
    negative: all.filter((f) => f.sentiment === 'negative').length,
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Customer Feedback</h1>
        <p className="font-telugu text-zinc-500 text-sm mt-0.5">అభిప్రాయాలు</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Summary Panel */}
      {!loading && all.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rating Distribution */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Rating Summary</h2>
              <div className="text-right">
                <span className="text-2xl font-bold text-yellow-400">{avgRating.toFixed(1)}</span>
                <span className="text-zinc-500 text-xs ml-1">/ 5</span>
                <div className="mt-0.5">
                  <StarRating value={Math.round(avgRating)} />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              {ratingCounts.map(({ r, count }) => (
                <RatingBar key={r} label={`${r}★`} count={count} total={all.length} />
              ))}
            </div>
            <p className="text-xs text-zinc-600">{all.length} total reviews</p>
          </div>

          {/* Sentiment Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">Sentiment Overview</h2>
            <div className="space-y-2">
              {[
                { key: 'positive' as const, emoji: '😊', label: 'సంతోషం', cls: 'bg-green-900/30 border-green-700/50 text-green-400' },
                { key: 'neutral'  as const, emoji: '😐', label: 'సాధారణం', cls: 'bg-zinc-800 border-zinc-700 text-zinc-400'          },
                { key: 'negative' as const, emoji: '😞', label: 'నిరాశ',   cls: 'bg-red-900/30 border-red-700/50 text-red-400'        },
              ].map(({ key, emoji, label, cls }) => (
                <div
                  key={key}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${cls}`}
                >
                  <span className="font-telugu text-sm">
                    {emoji} {label}
                  </span>
                  <span className="font-semibold">{sentimentCounts[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500 mr-1">Filter by rating:</span>
        <button
          onClick={() => setRatingFilter(null)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            ratingFilter === null
              ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All ({all.length})
        </button>
        {[5, 4, 3, 2, 1].map((r) => {
          const count = ratingCounts.find((x) => x.r === r)?.count ?? 0
          return (
            <button
              key={r}
              onClick={() => setRatingFilter(r)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                ratingFilter === r
                  ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {'★'.repeat(r)} ({count})
            </button>
          )
        })}
      </div>

      {/* Feedback Timeline */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 text-zinc-600">
            <p className="text-3xl mb-2">💬</p>
            <p className="font-telugu text-sm">అభిప్రాయాలు లేవు</p>
            <p className="text-xs mt-1">No feedback matching this filter</p>
          </div>
        ) : (
          displayed.map((fb) => (
            <div
              key={fb.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Rating circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-lg ${
                    fb.rating >= 4
                      ? 'bg-green-900/40 text-green-400'
                      : fb.rating === 3
                      ? 'bg-amber-900/40 text-amber-400'
                      : 'bg-red-900/40 text-red-400'
                  }`}
                >
                  {fb.rating}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200">
                      {fb.customer_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-zinc-600 font-mono">{fb.customer_phone}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-xs text-zinc-600">
                      {new Date(fb.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <StarRating value={fb.rating} />
                  <p className="text-sm text-zinc-300 leading-relaxed mt-1">
                    {fb.comment || <span className="italic text-zinc-600">No comment</span>}
                  </p>
                </div>

                {/* Sentiment */}
                <div className="shrink-0">
                  <SentimentBadge sentiment={fb.sentiment} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
