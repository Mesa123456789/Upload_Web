import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './app/router'
import { AuthProvider } from './features/auth/context/AuthContext'
import { I18nProvider } from './i18n/I18nProvider'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors offset={{ top: 88 }} />
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
)
