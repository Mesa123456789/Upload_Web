import { Outlet } from 'react-router-dom'
import AdminSidebar, { adminSidebarWidth } from './AdminSidebar'

// Dedicated layout for /admin/* — deliberately separate from PageContainer/
// Sidebar (the student/instructor app shell). Admin pages render their own
// heading inside <Outlet /> instead of relying on a shared page-title system.
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[var(--ds-bg)]">
      <AdminSidebar />
      <main className="min-h-screen px-6 py-8 sm:px-10" style={{ marginLeft: adminSidebarWidth }}>
        <Outlet />
      </main>
    </div>
  )
}
