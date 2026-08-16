type BadgeVariant = 'default' | 'purple' | 'green' | 'yellow' | 'red' | 'blue'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
  purple: 'bg-violet-100 text-violet-700 ring-violet-200',
  green: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  red: 'bg-red-100 text-red-700 ring-red-200',
  blue: 'bg-blue-100 text-blue-700 ring-blue-200',
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${variantClasses[variant]} ${className}`}>
      <span className="ds-one-line">{children}</span>
    </span>
  )
}
