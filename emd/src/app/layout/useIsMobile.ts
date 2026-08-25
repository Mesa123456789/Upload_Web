import { useEffect, useState } from 'react'

// Matches Tailwind's `md` breakpoint (768px) so JS-driven layout decisions
// (sidebar drawer vs. push) line up with the `md:` utility classes used
// alongside them.
export const MOBILE_BREAKPOINT = 768

export function getIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobile)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
