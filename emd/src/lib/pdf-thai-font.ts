import type jsPDF from 'jspdf'
import { SARABUN_REGULAR_BASE64, SARABUN_BOLD_BASE64 } from './thai-fonts'
 
let registered = false
 
export function registerThaiFont(doc: jsPDF): void {
  doc.addFileToVFS('Sarabun-Regular.ttf', SARABUN_REGULAR_BASE64)
  doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal')
  doc.addFileToVFS('Sarabun-Bold.ttf', SARABUN_BOLD_BASE64)
  doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold')
 
  // jsPDF default lineHeightFactor (1.15) ออกแบบมาสำหรับฟอนต์ Latin
  // ภาษาไทยมีสระบน/วรรณยุกต์ที่กินพื้นที่แนวตั้งเพิ่ม พอใช้ค่า default
  // สระ/วรรณยุกต์ของบรรทัดบนจะไปทับกับตัวอักษรบรรทัดล่าง — ปรับเป็น 1.3
  // (ทดสอบแล้วว่าพอดี ไม่ทับกัน และไม่เปลืองพื้นที่หน้าเกินจำเป็น)
  doc.setLineHeightFactor(1.3)
 
  registered = true
}
 
// เผื่อเช็คใน dev ว่าลืม register ก่อนใช้ไหม (ไม่ throw — แค่เตือน)
export function assertThaiFontRegistered(): void {
  if (!registered) {
    console.warn('[pdf-thai-font] ยังไม่ได้เรียก registerThaiFont(doc) — ข้อความไทยจะเพี้ยน')
  }
}