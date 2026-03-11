'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.replace('/admin')
    } else {
      setReady(true)
    }
  }, [router])

  function logout() {
    localStorage.removeItem('admin_token')
    router.replace('/admin')
  }

  if (!ready) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/admin/dashboard" className="font-sans uppercase tracking-[0.0625em] text-sm font-normal">
          Youngsook Choi — Admin
        </Link>
        <button
          onClick={logout}
          className="text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 hover:text-black"
        >
          Log out
        </button>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
    </div>
  )
}
