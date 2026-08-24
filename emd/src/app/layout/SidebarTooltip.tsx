import type { ReactNode } from 'react'

interface CollapsedTooltipProps {
  children: ReactNode
  label: string
  enabled: boolean
}

// Shared by Sidebar and AdminSidebar so collapsed-state tooltips look and
// behave identically across both.
export default function CollapsedTooltip({ children, label, enabled }: CollapsedTooltipProps) {
  return (
    <span className="group relative flex min-w-0">
      {children}
      {enabled && (
        <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#201316] px-2.5 py-1.5 text-xs font-bold text-white opacity-0 shadow-[0_10px_24px_rgba(32,19,22,0.22)] transition group-hover:opacity-100">
          {label}
        </span>
      )}
    </span>
  )
}
