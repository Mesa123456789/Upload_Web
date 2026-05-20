type BadgeVariant = 'default' | 'purple' | 'green' | 'yellow' | 'red' | 'blue'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-stone-100 text-stone-700 ring-stone-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
  green: 'bg-teal-50 text-teal-700 ring-teal-200',
  yellow: 'bg-orange-50 text-orange-700 ring-orange-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}
