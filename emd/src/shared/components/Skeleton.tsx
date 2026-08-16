export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`motion-shimmer rounded-[16px] bg-[linear-gradient(110deg,rgba(226,232,240,0.78),rgba(248,250,252,0.9),rgba(226,232,240,0.78))] ${className}`}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="ds-card-soft p-5">
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-line py-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="ds-card-soft p-5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-3 h-8 w-12" />
    </div>
  )
}

export function RouteLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--ds-bg)] p-6">
      <div className="mx-auto max-w-6xl space-y-6 pt-16">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-[24px]" />
          <Skeleton className="h-28 rounded-[24px]" />
          <Skeleton className="h-28 rounded-[24px]" />
          <Skeleton className="h-28 rounded-[24px]" />
        </div>
        <Skeleton className="h-64 rounded-[28px]" />
      </div>
    </div>
  )
}

export function ProjectDetailSkeleton() {
  return (
    <PageSkeleton>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-48 rounded-[24px]" />
          <Skeleton className="h-48 rounded-[24px]" />
        </div>
      </div>
    </PageSkeleton>
  )
}

function PageSkeleton({ children }: { children: React.ReactNode }) {
  return <div className="space-y-8">{children}</div>
}
