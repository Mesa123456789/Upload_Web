export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
}
 
// โครงการ์ดมาตรฐาน — แทน <Card> ที่กำลังโหลดข้อมูล (หัวเรื่อง + เนื้อหา 2-3 บรรทัด)
export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
 
// โครงแถวตาราง — ใช้กับ list/table ที่กำลังโหลด (เช่น dashboard list โปรเจกต์)
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-line py-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  )
}
 
// กลุ่ม stat card (เช่น Active Projects / Output Ready ใน dashboard)
export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-3 h-8 w-12" />
    </div>
  )
}