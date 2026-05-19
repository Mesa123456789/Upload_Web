interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

// Design system card — warm off-white background, subtle border and shadow
export default function Card({ children, className = '', onClick }: CardProps) {
  const base = 'bg-background-card rounded-2xl shadow-sm border border-black/5 p-6'
  const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''

  return (
    <div className={`${base} ${interactive} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
