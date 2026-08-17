import { toast } from 'sonner'
 
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
  // toast เฉพาะตอนมี AI suggestion ใหม่ — ไอคอน 💡 ให้ดูต่างจาก toast ทั่วไป (save/error)
  // เผื่อ user อยากแยกแยะว่าเป็นเรื่อง AI แต่โทนสีใช้ primary ของธีมหลัก (--color-primary)
  // แทนสีฟ้าเดิมที่ไม่เข้ากับชุด toast อื่น (richColors ของ sonner) ในระบบ
  aiSuggestion: (message: string) =>
    toast(message, {
      icon: '💡',
      style: { background: '#FFF3E8', color: '#7C2D12', border: '1px solid rgba(249,115,22,0.35)' },
    }),
}