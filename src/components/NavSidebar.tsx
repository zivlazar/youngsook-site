'use client'

import Link from 'next/link'

interface NavSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function NavSidebar({ isOpen, onClose }: NavSidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col pt-16 px-8 shadow-lg`}
      >
        <nav>
          <h2 className="sr-only">Menu</h2>
          <ul className="space-y-6">
            {[
              { label: 'Introduction', href: '/about' },
              { label: 'Recent Works', href: '/works' },
              { label: 'Archives', href: '/archives' },
              { label: 'Contact', href: '/contact' },
            ].map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className="text-sm font-sans uppercase tracking-widest hover:opacity-60 transition-opacity"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}
