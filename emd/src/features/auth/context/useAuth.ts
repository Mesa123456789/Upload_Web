import { useContext } from 'react'
import { AuthContext } from './AuthContext'

// Custom hook — throws if used outside AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
