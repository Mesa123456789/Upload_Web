import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../features/auth/context/useAuth'

export default function Header() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
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

  const displayName = profile?.display_name ?? profile?.email ?? ''
  const initials = displayName
    ? displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    // Sticky top bar — card background with bottom border
    <header className="sticky top-0 z-20 bg-primary shadow-md">
      <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">

        {/* Left: Logo + app name */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/Chiang_Mai_University.svg"
            alt="CMU Logo"
            className="w-7 h-7 object-contain bg-background-card rounded-full p-0.5"
          />
          <span className="font-bold text-sm tracking-tight text-white">EMD</span>
        </Link>

        {/* Center: Role-based nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {profile?.role === 'instructor' ? (
            <>
              <Link
                to="/instructor/dashboard"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/instructor/courses"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Courses
              </Link>
              <Link
                to="/instructor/projects"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Projects
              </Link>
            </>
          ) : (
            <Link
              to="/dashboard"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right: User avatar dropdown */}
        {profile && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-8 h-8 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center hover:bg-white/30 transition-colors"
              title={displayName}
            >
              {initials}
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-background-card border border-black/5 rounded-2xl shadow-lg overflow-hidden z-30">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-black/5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-400 capitalize mt-0.5">{profile.role}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { navigate('/profile'); setDropdownOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-black/5 transition-colors"
                  >
                    Edit Profile
                  </button>
                  <div className="my-1 border-t border-black/5" />
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  )
}
