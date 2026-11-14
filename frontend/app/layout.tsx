import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Sri Lakshmi Tiffin — Owner Dashboard',
  description: 'Owner dashboard for Sri Lakshmi Tiffin Centre, Warangal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="te" className={`${inter.variable} dark`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
