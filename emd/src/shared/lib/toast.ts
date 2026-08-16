import { toast } from 'sonner'
 
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
  // toast เฉพาะตอนมี AI suggestion ใหม่ — ไอคอน + โทนสีฮิมะ ให้ดูต่างจาก
  // toast ทั่วไป (save/error) เผื่อ user อยากแยกแยะว่าเป็นเรื่อง AI
  aiSuggestion: (message: string) =>
    toast(message, {
      icon: '💡',
      style: { background: '#EAF4FC', color: '#1A4A66', border: '1px solid #B8DCF2' },
    }),
}