'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isCustomerRoute = pathname.startsWith('/menu') || pathname.startsWith('/table')

  if (isCustomerRoute) {
    return (
      <main className="w-full min-h-screen bg-zinc-950 text-zinc-100">
        {children}
      </main>
    )
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
        {children}
      </main>
    </>
  )
}
