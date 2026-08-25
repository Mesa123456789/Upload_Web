import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../features/auth/context/useAuth'

function navClass({ isActive }: { isActive: boolean }) {
  return `shrink-0 rounded-md px-3 py-2 text-sm font-bold transition ${
    isActive
      ? 'bg-primary text-white shadow-sm'
      : 'text-ink hover:bg-orange-50 hover:text-primary'
  }`
}

export default function Header() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const displayName = profile?.display_name ?? profile?.email ?? 'Guest'
  const initials = displayName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white shadow-sm">
      <div className="mx-auto flex min-h-20 max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white text-sm font-black tracking-tight text-primary ring-1 ring-line">
            <span className="absolute inset-2 rounded-sm bg-gradient-to-br from-primary via-secondary to-ink opacity-95" />
            <span className="relative text-white">EMD</span>
          </span>
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-sm font-black text-ink">
              Ethical Monetization Designer
            </span>
            <span className="block truncate text-xs font-semibold text-muted">
              F2P design workspace
            </span>
          </span>
        </Link>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          {profile && (
            <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg border border-line bg-white p-1 app-scrollbar">
              {profile.role === 'instructor' ? (
                <>
                  <NavLink to="/instructor/dashboard" className={navClass}>Dashboard</NavLink>
                  <NavLink to="/instructor/courses" className={navClass}>Courses</NavLink>
                  <NavLink to="/instructor/projects" className={navClass}>Projects</NavLink>
                </>
              ) : (
                <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
              )}
            </nav>
          )}

          {profile && (
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-primary/40 hover:bg-orange-50"
                title={displayName}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-success text-xs font-bold text-white">
                  {initials || '?'}
                </span>
                <span className="hidden max-w-36 truncate sm:inline">{displayName}</span>
                <span className="hidden text-muted sm:inline">v</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-white shadow-xl">
                  <div className="border-b border-line bg-orange-50 px-4 py-3">
                    <p className="truncate text-sm font-bold text-ink">{displayName}</p>
                    <p className="mt-1 text-xs font-semibold capitalize text-muted">{profile.role}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setDropdownOpen(false) }}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-orange-50"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full border-t border-line px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
