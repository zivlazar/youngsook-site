'use client'

import Link from 'next/link'
import { useState } from 'react'
import NavSidebar from './NavSidebar'

export default function Header() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="text-sm font-sans font-normal uppercase tracking-[0.0625em]">
            Youngsook Choi
          </Link>
          <span className="text-sm font-serif font-normal not-italic text-black">Artist &amp; Researcher</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Toggle navigation"
          className="text-xl font-sans leading-none"
        >
          ☰
        </button>
      </header>
      <NavSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}
