import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './features/auth/context/AuthContext'
import { router } from './app/router'
import './index.css'
 
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')
 
createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      {/* Toaster ตัวเดียวครอบทั้งแอป — เรียก toast จากที่ไหนก็ได้ผ่าน
          src/shared/lib/toast.ts ไม่ต้องห่อ context provider เพิ่ม */}
      <Toaster 
        position="top-right" 
        richColors 
        offset={{ top: 88 }}  // navbar 80px + เว้น 8px
      />
    </AuthProvider>
  </StrictMode>
)

