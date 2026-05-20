interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  const base = 'bg-background-card rounded-xl border border-line shadow-sm p-5'
  const interactive = onClick
    ? 'cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'
    : ''

  return (
    <div className={`${base} ${interactive} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
