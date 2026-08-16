import type jsPDF from 'jspdf'
import { SARABUN_REGULAR_BASE64, SARABUN_BOLD_BASE64 } from './thai-fonts'
 
let fontsLoadedPromise: Promise<void> | null = null
 
// โหลดฟอนต์ Sarabun เข้า browser ผ่าน FontFace API — ต้องทำก่อนใช้ ctx.font
// กับ canvas เพราะ canvas พึ่งฟอนต์ที่ "ลงทะเบียน" กับ browser แล้วเท่านั้น
// (คนละขั้นตอนกับ registerThaiFont ที่ฝังฟอนต์เข้า jsPDF — ต้องทำทั้งคู่)
async function ensureThaiFontLoaded(): Promise<void> {
  if (fontsLoadedPromise) return fontsLoadedPromise
 
  fontsLoadedPromise = (async () => {
    const regularFont = new FontFace(
      'Sarabun',
      `url(data:font/ttf;base64,${SARABUN_REGULAR_BASE64})`,
      { weight: 'normal' },
    )
    const boldFont = new FontFace(
      'Sarabun',
      `url(data:font/ttf;base64,${SARABUN_BOLD_BASE64})`,
      { weight: 'bold' },
    )
    const [loadedRegular, loadedBold] = await Promise.all([regularFont.load(), boldFont.load()])
    document.fonts.add(loadedRegular)
    document.fonts.add(loadedBold)
  })()
 
  return fontsLoadedPromise
}
 
export interface DrawTextOptions {
  fontSize: number // pt (หน่วยเดียวกับที่ใช้กับ doc.setFontSize เดิม)
  bold?: boolean
  color?: [number, number, number] // RGB 0-255
  align?: 'left' | 'center' | 'right'
  baseline?: 'alphabetic' | 'middle' // 'middle' ใช้จัดข้อความกลางวงกลม/กล่อง (เช่นเลขใน flow stage)
  maxWidthMm?: number // ถ้าระบุ จะ wrap คำอัตโนมัติ (ทดแทน splitTextToSize)
}
 
// devicePixelRatio จำลอง — render ที่ความละเอียดสูงกว่าจริงเพื่อความคมชัด
// ตอนถูกบีบลงไปอยู่ใน PDF (ที่มักจะ scale ลง)
const RENDER_SCALE = 4
 
// 1mm = 96/25.4 px ที่ความละเอียด 96 DPI มาตรฐานเว็บ — ใช้แปลงระหว่างหน่วย
// mm (ที่ jsPDF/เอกสารใช้) กับ px (ที่ canvas ใช้)
const PX_PER_MM = 96 / 25.4
 
function mmToPx(mm: number): number {
  return mm * PX_PER_MM * RENDER_SCALE
}
 
function pxToMm(px: number): number {
  return px / (PX_PER_MM * RENDER_SCALE)
}
 
// วัดความกว้างข้อความเป็น mm (ทดแทน doc.getTextWidth())
export function measureThaiTextMm(text: string, fontSizePt: number, bold = false): number {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  const fontPx = fontSizePt * RENDER_SCALE * 1.333 // pt → px ตามมาตรฐานเว็บ (1pt = 1.333px ที่ 96dpi)
  ctx.font = `${bold ? 'bold' : 'normal'} ${fontPx}px Sarabun, sans-serif`
  const width = ctx.measureText(text).width
  return pxToMm(width)
}
 
// wrap ข้อความให้พอดีกับความกว้างที่กำหนด (ทดแทน doc.splitTextToSize)
// ใช้ canvas measureText วัดทีละคำ แทนการพึ่ง jsPDF's glyph width table
// (ซึ่งไม่รู้จัก glyph ไทยอยู่แล้ว ตามที่เจอปัญหามาก่อนหน้า)
export function wrapThaiText(text: string, maxWidthMm: number, fontSizePt: number, bold = false): string[] {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return [text]
  const fontPx = fontSizePt * RENDER_SCALE * 1.333
  ctx.font = `${bold ? 'bold' : 'normal'} ${fontPx}px Sarabun, sans-serif`
  const maxWidthPx = mmToPx(maxWidthMm)
 
  // ภาษาไทยไม่มีเว้นวรรคระหว่างคำเสมอไป — ตัดที่เว้นวรรคก่อน ถ้าคำเดียวยาว
  // เกินความกว้างที่กำหนด ค่อยตัดเป็นรายอักขระ (กันคำยาวเกินบรรทัดไม่ wrap เลย)
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
 
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width <= maxWidthPx) {
      currentLine = testLine
    } else if (currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      // คำเดียวก็ยาวเกินบรรทัด — ตัดเป็นรายอักขระ
      let chunk = ''
      for (const ch of word) {
        const testChunk = chunk + ch
        if (ctx.measureText(testChunk).width <= maxWidthPx) {
          chunk = testChunk
        } else {
          if (chunk) lines.push(chunk)
          chunk = ch
        }
      }
      currentLine = chunk
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines.length > 0 ? lines : ['']
}
 
// วาดข้อความไทย 1 บรรทัดเป็นรูปภาพ ฝังลง PDF ที่ตำแหน่ง (x, y) — x,y หน่วย mm
// y คือ baseline ตำแหน่งเดียวกับที่ doc.text() ใช้ (เพื่อสลับใช้แทนกันได้ง่าย)
export function drawThaiText(doc: jsPDF, text: string, x: number, y: number, options: DrawTextOptions): void {
  if (!text) return
  const { fontSize, bold = false, color = [0, 0, 0], align = 'left', baseline = 'alphabetic' } = options
 
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
 
  const fontPx = fontSize * RENDER_SCALE * 1.333
  const fontStr = `${bold ? 'bold' : 'normal'} ${fontPx}px Sarabun, sans-serif`
  ctx.font = fontStr
 
  // วัดขนาดจริงก่อนสร้าง canvas ขนาดจริง (ขนาดเริ่มต้น 10x10 ใช้แค่วัด)
  const metrics = ctx.measureText(text)
  const textWidthPx = metrics.width
  // ascent/descent ใช้ประมาณความสูงบรรทัด เผื่อพื้นที่สระบน-ล่างของไทยให้พอ
  const ascent = metrics.actualBoundingBoxAscent || fontPx * 0.9
  const descent = metrics.actualBoundingBoxDescent || fontPx * 0.35
  // padding กันสระ/วรรณยุกต์ที่ยื่นเกิน bounding box ปกติถูกตัด (พบบ่อยกับ
  // ตัวอักษรไทยที่มีสระ-วรรณยุกต์ซ้อนสูง เช่น ปุ๊ ดู๊)
  const padTop = fontPx * 0.35
  const padBottom = fontPx * 0.15
  const padX = fontPx * 0.1
 
  canvas.width = Math.ceil(textWidthPx + padX * 2)
  canvas.height = Math.ceil(ascent + descent + padTop + padBottom)
 
  // ตั้ง font ใหม่อีกครั้ง — resize canvas ใน browser จะ reset ctx state ทั้งหมด
  ctx.font = fontStr
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, padX, padTop + ascent)
 
  const dataUrl = canvas.toDataURL('image/png')
  const widthMm = pxToMm(canvas.width)
  const heightMm = pxToMm(canvas.height)
 
  // คำนวณ x ตาม align — ทดแทน { align: 'center' | 'right' } ของ doc.text()
  let drawX = x
  if (align === 'center') drawX = x - widthMm / 2
  else if (align === 'right') drawX = x - widthMm
 
  // คำนวณ y ตาม baseline:
  // - 'alphabetic' (default): y คือ baseline ปกติ เหมือน doc.text() เดิม
  // - 'middle': y คือจุดกึ่งกลางแนวตั้งของข้อความ (ใช้กับเลขกลางวงกลม/badge)
  let drawY: number
  if (baseline === 'middle') {
    drawY = y - heightMm / 2
  } else {
    const baselineOffsetMm = pxToMm(padTop + ascent)
    drawY = y - baselineOffsetMm
  }
 
  doc.addImage(dataUrl, 'PNG', drawX, drawY, widthMm, heightMm)
}
 
// วาดข้อความไทยหลายบรรทัด (ทดแทนการส่ง array ให้ doc.text() เดิม)
// คืนค่าจำนวนบรรทัดที่วาดจริง ไว้คำนวณ y ที่ขยับต่อ
export function drawThaiTextLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  lineHeightMm: number,
  options: DrawTextOptions,
): number {
  lines.forEach((line, i) => {
    drawThaiText(doc, line, x, y + i * lineHeightMm, options)
  })
  return lines.length
}
 
// เรียกครั้งเดียวตอนเริ่ม handleExportPDF (await ก่อนเริ่มวาดอะไรเลย)
// หลังจากนั้นฟังก์ชัน measure/wrap/draw ข้างบนจะใช้ฟอนต์ได้ทันทีแบบ sync
export async function preloadThaiFonts(): Promise<void> {
  await ensureThaiFontLoaded()
}