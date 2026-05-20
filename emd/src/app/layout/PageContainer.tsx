import Header from './Header'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className="min-h-screen bg-background-main">
      <Header />
      <main className={`mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 space-y-6 ${className}`}>
        {children}
      </main>
    </div>
  )
}
