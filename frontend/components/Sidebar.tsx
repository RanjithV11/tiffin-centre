'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  MessageSquare,
  QrCode,
  Download,
  ExternalLink,
  X,
  Printer,
} from 'lucide-react'
import { getQRPreview, type QRPreviewResponse } from '@/lib/api'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  {
    href: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    labelTe: 'డాష్‌బోర్డ్',
  },
  {
    href: '/items',
    icon: UtensilsCrossed,
    label: 'Menu',
    labelTe: 'మెను',
  },
  {
    href: '/customers',
    icon: Users,
    label: 'Customers',
    labelTe: 'కస్టమర్లు',
  },
  {
    href: '/feedback',
    icon: MessageSquare,
    label: 'Feedback',
    labelTe: 'అభిప్రాయాలు',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [tableNumber, setTableNumber] = useState('1')
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState('')
  const [previewData, setPreviewData] = useState<QRPreviewResponse | null>(null)

  async function handleGenerateQR() {
    const num = parseInt(tableNumber)
    if (!num || num < 1) {
      setQrError('Please enter a valid table number (e.g. 1, 2, 3)')
      return
    }
    setQrError('')
    setQrLoading(true)
    try {
      const data = await getQRPreview(num)
      setPreviewData(data)
    } catch (err) {
      setQrError('Failed to generate QR code. Is backend running?')
    } finally {
      setQrLoading(false)
    }
  }

  function handleDownloadImage() {
    if (!previewData) return
    const a = document.createElement('a')
    a.href = previewData.data_url
    a.download = `table-${previewData.table_number}-qr.png`
    a.click()
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="text-2xl mb-0.5">🍱</div>
          <h1 className="text-orange-400 font-bold text-sm leading-tight">
            Sri Lakshmi Tiffin
          </h1>
          <p className="text-zinc-500 text-xs font-telugu">వరంగల్ | Owner Panel</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label, labelTe }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
                )}
              >
                <Icon size={18} />
                <span>
                  <span className="font-telugu text-xs block leading-tight">{labelTe}</span>
                  <span className="block leading-tight">{label}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        {/* QR Code Section */}
        <div className="px-4 pb-5 border-t border-zinc-800 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <QrCode size={15} className="text-zinc-400" />
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">
              Table QR Code
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              placeholder="Table #"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-24 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-center font-bold"
            />
            <button
              onClick={handleGenerateQR}
              disabled={qrLoading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
            >
              <QrCode size={13} />
              {qrLoading ? 'Generating...' : 'View QR'}
            </button>
          </div>
          {qrError && (
            <p className="text-red-400 text-xs mt-1">{qrError}</p>
          )}
          <p className="text-zinc-500 text-xs mt-1.5 font-telugu">
            టేబుల్ QR స్కాన్ చేసి WhatsApp ఓపెన్ అవుతుంది
          </p>
        </div>
      </aside>

      {/* QR Code Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center relative">
            <button
              onClick={() => setPreviewData(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
            >
              <X size={20} />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-3">
              Table #{previewData.table_number}
            </div>

            <h3 className="text-base font-bold text-zinc-100 mb-1">
              WhatsApp Order & Feedback QR
            </h3>
            <p className="font-telugu text-zinc-400 text-xs mb-4">
              కస్టమర్లు స్కాన్ చేసి నేరుగా మాట్లాడవచ్చు
            </p>

            {/* QR Image */}
            <div className="bg-white p-3 rounded-xl inline-block shadow-inner mb-4">
              <img
                src={previewData.data_url}
                alt={`Table ${previewData.table_number} QR`}
                className="w-56 h-auto mx-auto rounded"
              />
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleDownloadImage}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                <Download size={16} />
                Download PNG (Print Ready)
              </button>

              <a
                href={previewData.whatsapp_url}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm py-2 rounded-lg transition-colors"
              >
                <ExternalLink size={15} />
                Test on WhatsApp Web
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
