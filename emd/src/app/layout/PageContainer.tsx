import Header from './Header'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

// Full-page wrapper — warm background, centered content, consistent spacing.
// Every page should be wrapped in this component.
export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className="min-h-screen bg-background-main">
      <Header />
      <main className={`max-w-5xl mx-auto p-4 md:p-6 space-y-6 ${className}`}>
        {children}
      </main>
    </div>
  )
}
