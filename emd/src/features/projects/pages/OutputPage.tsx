import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import { registerThaiFont } from '../../../lib/pdf-thai-font'
import { preloadThaiFonts, drawThaiText, drawThaiTextLines, wrapThaiText } from '../../../lib/thai-text-renderer'
import { loadSuggestions } from '../services/chat.service'
import {
  getProject,
  updateProject,
  getAdsConfig,
  listAdPlacements,
  getIapConfig,
  listIapItems,
  submitProject,
  resubmitProject,
  deleteProject,
} from '../services/projects.service'
import type { Project, AdPlacement, IapItem, AdsConfig, IapConfig } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import { Skeleton, SkeletonCard } from '../../../shared/components/Skeleton'
import { notify } from '../../../shared/lib/toast'
import StepIndicator from './components/StepIndicator'
import AiSuggestionPanel from './components/AiSuggestionPanel'
import FadeInCard from '../../../shared/components/FadeInCard'

type PdfExportMode = 'data' | 'ai'

type IconProps = {
  className?: string
}

function DownloadIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function AiIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
      <path d="M5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6L5 15Z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 15H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

export default function OutputPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null)
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([])
  const [iapConfig, setIapConfig] = useState<IapConfig | null>(null)
  const [iapItems, setIapItems] = useState<IapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      if (!projectId) return
      try {
        const loadedProject = await getProject(projectId)
        setProject(loadedProject)

        const loadedAdsConfig = await getAdsConfig(projectId)
        if (loadedAdsConfig) {
          setAdsConfig(loadedAdsConfig)
          setAdPlacements(await listAdPlacements(loadedAdsConfig.id))
        }

        const loadedIapConfig = await getIapConfig(projectId)
        if (loadedIapConfig) {
          setIapConfig(loadedIapConfig)
          setIapItems(await listIapItems(loadedIapConfig.id))
        }

        if (loadedProject.current_step < 4) {
          await updateProject(projectId, { current_step: 4 })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load output')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  async function handleSubmit() {
    if (!projectId || !project) return
    setSubmitting(true)
    setError(null)
    try {
      setProject(await submitProject(projectId))
      notify.success('ส่งงานเรียบร้อย! รออาจารย์ตรวจนะ 🎉')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResubmit() {
    if (!projectId) return
    setSubmitting(true)
    setError(null)
    try {
      await resubmitProject(projectId)
      navigate(`/project/${projectId}/setup`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-submit')
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!projectId || !project) return
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteProject(projectId)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      setDeleting(false)
      notify.error('ลบโปรเจกต์ไม่สำเร็จ ลองใหม่')
    }
  }

  function handleExportCSV() {
    if (!project) return
    const rows: string[][] = [
      ['Field', 'Value'],
      ['Game Title', project.title],
      ['Genre', (project.genre ?? []).join(', ')],
      ['Platform', (project.platform ?? []).join(', ')],
      ['Target Audience', project.target_audience ?? ''],
      ['Core Mechanic', project.core_mechanic ?? ''],
      ['Session Length', project.session_length ?? ''],
      ['Ad Network', adsConfig?.ad_network ?? ''],
      ['Revenue Model', adsConfig?.revenue_model ?? ''],
      [],
      ['Ad Placements'],
      ['Type', 'Trigger Point', 'Frequency Cap'],
      ...adPlacements.map((placement) => [
        placement.placement_type,
        placement.trigger_point ?? '',
        placement.frequency_cap?.toString() ?? '',
      ]),
      [],
      ['IAP Items'],
      ['Name', 'Type', 'Price USD', 'Description'],
      ...iapItems.map((item) => [
        item.name,
        item.item_type,
        item.price_usd?.toString() ?? '',
        item.description ?? '',
      ]),
    ]

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    // เติม UTF-8 BOM (\uFEFF) นำหน้า — Excel ไม่อ่าน charset จาก Blob MIME type
    // เลย ถ้าไม่มี BOM มันเดา encoding เป็น ANSI/Windows-1252 แทน UTF-8 โดย
    // default ทำให้ตัวอักษรไทยกลายเป็นสัญลักษณ์มั่ว ๆ ตอนเปิดในโปรแกรมที่ไม่ใช่
    // text editor (Notepad/เครื่อง Linux อ่านได้ปกติเพราะมันเดา UTF-8 เป็นทุนเดิม)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `emd-${project.title.replace(/\s+/g, '-').toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportPDF(mode: PdfExportMode) {
    if (!project) return
    // โหลดฟอนต์ Sarabun เข้า browser ก่อน (สำหรับ canvas rendering) — ต้องรอ
    // ให้เสร็จก่อนเริ่มวาดอะไรเลย ไม่งั้น canvas จะ fallback ไปฟอนต์ default
    await preloadThaiFonts()
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    registerThaiFont(doc)
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14
    const contentWidth = pageWidth - margin * 2 // 182mm
    const orange: [number, number, number] = [245, 130, 32]
    const ink: [number, number, number] = [35, 31, 27]
    const muted: [number, number, number] = [76, 93, 116]
    const lineColor: [number, number, number] = [225, 213, 201]
    const warm: [number, number, number] = [247, 241, 234]
    const panel: [number, number, number] = [252, 249, 245]
    let y = 16

    const value = (text: string | number | null | undefined, fallback = 'Not set') => {
      if (text === null || text === undefined || text === '') return fallback
      return String(text)
    }
    const list = (items: string[] | null | undefined) => items?.join(', ') || 'Not set'
    const money = (amount: number | null) => amount == null ? 'Free / not specified' : `$${amount.toFixed(2)}`
    const safeFileName = project.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'project'
    const exportDate = new Date().toISOString().slice(0, 10)
    const totalItems = adPlacements.length + iapItems.length
    const pdfAdPercent = totalItems ? Math.round((adPlacements.length / totalItems) * 100) : 0
    const pdfIapPercent = totalItems ? 100 - pdfAdPercent : 0
    const missingCaps = adPlacements.filter((placement) => placement.frequency_cap == null).length
    const interstitials = adPlacements.filter((placement) => placement.placement_type === 'interstitial').length
    const riskScore = Math.min(10, missingCaps * 3 + interstitials * 2 + Math.max(0, iapItems.length - 3))
    const riskLabel = riskScore >= 7 ? 'High' : riskScore >= 4 ? 'Medium' : 'Low'
    const vagueItems = iapItems.filter((item) => !item.description).length
    const unpricedItems = iapItems.filter((item) => item.price_usd == null).length

    // ดึงคำแนะนำ AI จริงจาก Supabase (ai_suggestions) — เฉพาะตอน export AI PDF
    const rawSuggestions = mode === 'ai' ? await loadSuggestions(project.id) : []
    const categoryLabels: Record<string, string> = {
      title: 'ชื่อเกม',
      genre: 'แนวเกม',
      platform: 'แพลตฟอร์ม',
      target_audience: 'กลุ่มเป้าหมาย',
      core_mechanic: 'Core Loop',
      session_length: 'ความยาว Session',
      revenue_mix: 'สัดส่วนรายได้',
      monetization_design: 'การออกแบบ Monetization',
    }
    const aiSuggestions: string[][] = rawSuggestions.map((s) => [
      categoryLabels[s.category] ?? s.category,
      s.advice,
    ])

    // ความสูงบรรทัดจริง (mm) ตาม fontSize ปัจจุบัน — ต้องหารด้วย scaleFactor
    // เพราะ doc.getLineHeight() คืนค่าในหน่วยภายในของ jsPDF (pt-equivalent)
    function lineHeightMm(): number {
      return doc.getLineHeight() / doc.internal.scaleFactor
    }

    function addPageIfNeeded(height = 24) {
      if (y + height <= pageHeight - 14) return
      doc.addPage()
      y = 16
      footer()
    }

    function footer() {
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)
      drawThaiText(doc, 'Generated by Ethical Monetization Designer', margin, pageHeight - 5, {
        fontSize: 8,
        color: muted,
      })
      drawThaiText(doc, `Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 5, {
        fontSize: 8,
        color: muted,
        align: 'right',
      })
    }

    function title(text: string, size = 13) {
      addPageIfNeeded(14)
      drawThaiText(doc, text, margin, y, { fontSize: size, bold: true, color: ink })
      y += 4
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.line(margin, y, pageWidth - margin, y)
      y += 6
    }

    function paragraph(text: string, x: number, width: number, size = 9, color: [number, number, number] = muted) {
      const lines = wrapThaiText(text, width, size, false)
      const lh = lineHeightMm()
      drawThaiTextLines(doc, lines, x, y, lh, { fontSize: size, color })
      y += lines.length * lh
    }

    function card(x: number, top: number, width: number, height: number) {
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.setFillColor(panel[0], panel[1], panel[2])
      doc.roundedRect(x, top, width, height, 3, 3, 'FD')
    }

    function keyValue(label: string, detail: string, x: number, top: number, width: number) {
      drawThaiText(doc, label.toUpperCase(), x, top, { fontSize: 8, bold: true, color: muted })
      const lines = wrapThaiText(detail, width, 9, false)
      const lh = lineHeightMm()
      drawThaiTextLines(doc, lines, x, top + 5, lh, { fontSize: 9, bold: true, color: ink })
    }

    function table(headers: string[], rows: string[][], widths: number[]) {
      const startX = margin
      const headerHeight = 9
      addPageIfNeeded(headerHeight + 10)
      doc.setFillColor(warm[0], warm[1], warm[2])
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.rect(startX, y, contentWidth, headerHeight, 'FD')

      let x = startX
      headers.forEach((header, index) => {
        drawThaiText(doc, header, x + 3, y + 5.8, { fontSize: 8.5, bold: true, color: ink })
        x += widths[index]
      })
      y += headerHeight

      if (rows.length === 0) {
        rows = [['No data added yet.', '', '', ''].slice(0, headers.length)]
      }

      rows.forEach((row, rowIndex) => {
        const wrapped = row.map((cell, index) => wrapThaiText(value(cell, '-'), widths[index] - 6, 8.5, false))
        const lh = lineHeightMm()
        const rowHeight = Math.max(9, ...wrapped.map((lines) => lines.length * lh + 4.5))
        addPageIfNeeded(rowHeight + 4)

        if (rowIndex % 2 === 0) {
          doc.setFillColor(255, 255, 255)
        } else {
          doc.setFillColor(252, 250, 247)
        }

        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
        doc.rect(startX, y, contentWidth, rowHeight, 'FD')

        let cellX = startX
        wrapped.forEach((lines, index) => {
          drawThaiTextLines(doc, lines, cellX + 3, y + 5.5, lh, { fontSize: 8.5, color: muted })
          cellX += widths[index]
        })
        y += rowHeight
      })
      y += 5
    }

    if (mode === 'ai') {
      doc.setFillColor(warm[0], warm[1], warm[2])
      doc.rect(0, 0, pageWidth, 42, 'F')
      doc.setFillColor(orange[0], orange[1], orange[2])
      doc.roundedRect(margin, 12, 16, 16, 3, 3, 'F')
      drawThaiText(doc, 'AI', margin + 8, 20.5, { fontSize: 12, bold: true, color: [255, 255, 255], align: 'center', baseline: 'middle' })
      drawThaiText(doc, project.title, margin + 22, 18, { fontSize: 19, bold: true, color: ink })
      drawThaiText(doc, 'Ethical Monetization Designer - AI Recommended PDF', margin + 22, 24, { fontSize: 9, color: muted })
      drawThaiText(doc, `Export date: ${exportDate}`, pageWidth - margin, 18, { fontSize: 9, color: muted, align: 'right' })
      drawThaiText(doc, `Risk: ${riskLabel} (${riskScore}/10)`, pageWidth - margin, 24, { fontSize: 9, color: muted, align: 'right' })
      y = 50

      const aiSummaryText = riskScore >= 7
        ? 'The plan can become stronger by reducing pressure before final review. Prioritize caps, clear purchase value, and fewer interruption points.'
        : 'The plan is close to review-ready. Use the pitch to show how the design protects player choice while still supporting revenue.'

      const aiSummaryLines = wrapThaiText(aiSummaryText, contentWidth - 10, 9, false)
      const aiCardHeight = 16 + aiSummaryLines.length * lineHeightMm()

      card(margin, y, contentWidth, aiCardHeight)
      drawThaiText(doc, 'AI Recommendation Summary', margin + 5, y + 9, { fontSize: 14, bold: true, color: ink })
      const oldY = y
      y += 15
      paragraph(aiSummaryText, margin + 5, contentWidth - 10, 9)
      y = oldY + aiCardHeight + 8

      title('Recommended Fixes')
      table(
        ['Category', 'AI Recommendation'],
        aiSuggestions.length > 0 ? aiSuggestions : [['ยังไม่มีคำแนะนำ', 'คุยกับผู้ช่วย AI แล้วกดสรุปคำแนะนำก่อน export PDF']],
        [40, 142],
      )

      title('Suggested Pitch')
      paragraph(
        `${project.title} uses monetization as optional value rather than forced progress. Ads should appear at controlled moments with visible caps, while IAP items should clearly state price and player benefit. The strongest argument for this plan is that players can decline offers and still enjoy the normal game loop.`,
        margin,
        contentWidth,
        10
      )
      y += 5

      title('Data Snapshot Used by AI')
      table(
        ['Metric', 'Current value'],
        [
          ['Game title', project.title],
          ['Genre', list(project.genre)],
          ['Platform', list(project.platform)],
          ['Target audience', value(project.target_audience)],
          ['Ad placements', `${adPlacements.length}`],
          ['IAP items', `${iapItems.length}`],
          ['Missing ad caps', `${missingCaps}`],
          ['Interstitial placements', `${interstitials}`],
          ['Unclear IAP benefit', `${vagueItems}`],
          ['Missing IAP price', `${unpricedItems}`],
        ],
        [62, 120]
      )

      title('Final Checklist')
      table(
        ['Check', 'Recommended standard'],
        [
          ['Frequency cap', 'Every ad placement has a cap per session or per day.'],
          ['Optionality', 'Players can decline ads and purchases without losing normal progress.'],
          ['Price clarity', 'Every paid item has a visible price and a concrete benefit.'],
          ['Pitch evidence', 'The final pitch names caps, optionality, and clear value as ethics evidence.'],
        ],
        [52, 130]
      )

      footer()
      doc.save(`emd-${safeFileName}-ai-recommendations.pdf`)
      return
    }

    // ================= DATA MODE ================= //
    doc.setFillColor(warm[0], warm[1], warm[2])
    doc.rect(0, 0, pageWidth, 42, 'F')
    doc.setFillColor(orange[0], orange[1], orange[2])
    doc.roundedRect(margin, 12, 16, 16, 3, 3, 'F')
    drawThaiText(doc, 'EMD', margin + 8, 20.5, { fontSize: 10, bold: true, color: [255, 255, 255], align: 'center', baseline: 'middle' })
    drawThaiText(doc, project.title, margin + 22, 18, { fontSize: 19, bold: true, color: ink })
    drawThaiText(doc, 'Ethical Monetization Designer - Your Data PDF', margin + 22, 24, { fontSize: 9, color: muted })
    drawThaiText(doc, `Export date: ${exportDate}`, pageWidth - margin, 18, { fontSize: 9, color: muted, align: 'right' })
    drawThaiText(doc, `Status: ${project.status.replace('_', ' ')}`, pageWidth - margin, 24, { fontSize: 9, color: muted, align: 'right' })
    y = 50

    const summaryText = `${project.title} is a ${list(project.platform)} ${list(project.genre)} game for ${value(project.target_audience, 'a defined audience')}. The monetization approach uses ${adPlacements.length} ad placement(s) and ${iapItems.length} in-app purchase item(s), with a focus on optional value, clear player benefit, and pressure control.`
    const summaryLines = wrapThaiText(summaryText, 108, 9, false)
    const lh = lineHeightMm()
    const summaryCardHeight = Math.max(50, 18 + summaryLines.length * lh)

    card(margin, y, 118, summaryCardHeight)
    drawThaiText(doc, 'Summary', margin + 5, y + 9, { fontSize: 15, bold: true, color: ink })
    const oldY = y
    y += 15
    paragraph(summaryText, margin + 5, 108, 9)

    y = oldY
    card(138, y, 58, summaryCardHeight)
    drawThaiText(doc, 'Revenue Mix', 143, y + 9, { fontSize: 13, bold: true, color: ink })
    drawThaiText(doc, `Ads ${pdfAdPercent}%`, 143, y + 22, { fontSize: 9, bold: true, color: ink })
    drawThaiText(doc, `IAP ${pdfIapPercent}%`, 191, y + 22, { fontSize: 9, bold: true, color: ink, align: 'right' })
    doc.setFillColor(236, 231, 224)
    doc.roundedRect(143, y + 26, 48, 5, 2, 2, 'F')
    doc.setFillColor(orange[0], orange[1], orange[2])
    doc.roundedRect(143, y + 26, Math.max(2, 48 * pdfAdPercent / 100), 5, 2, 2, 'F')
    drawThaiText(doc, `Risk score: ${riskLabel} (${riskScore}/10)`, 143, y + 38, { fontSize: 8.5, color: muted })
    drawThaiText(doc, `Store: ${value(iapConfig?.store?.replace('_', ' '), 'Not configured')}`, 143, y + 43, { fontSize: 8.5, color: muted })

    y = oldY + summaryCardHeight + 10
    title('Project Context')

    const contextColW = [40, 50, 52, 40]
    const contextColX = [margin + 5, margin + 5 + 40, margin + 5 + 40 + 50, margin + 5 + 40 + 50 + 52]
    const lc1 = wrapThaiText(list(project.genre), contextColW[0] - 6, 9, false).length
    const lc2 = wrapThaiText(list(project.platform), contextColW[1] - 6, 9, false).length
    const lc3 = wrapThaiText(value(project.target_audience), contextColW[2] - 6, 9, false).length
    const lc4 = wrapThaiText(value(project.session_length), contextColW[3] - 6, 9, false).length
    const contextCardHeight = Math.max(30, 16 + Math.max(lc1, lc2, lc3, lc4) * lh)

    const contextTop = y
    card(margin, contextTop, contentWidth, contextCardHeight)
    keyValue('Genre', list(project.genre), contextColX[0], contextTop + 9, contextColW[0] - 6)
    keyValue('Platform', list(project.platform), contextColX[1], contextTop + 9, contextColW[1] - 6)
    keyValue('Audience', value(project.target_audience), contextColX[2], contextTop + 9, contextColW[2] - 6)
    keyValue('Session', value(project.session_length), contextColX[3], contextTop + 9, contextColW[3] - 6)

    y = contextTop + contextCardHeight + 8
    title('Core Loop')
    paragraph(value(project.core_mechanic, 'No core loop has been described yet.'), margin, contentWidth, 10)
    y += 5

    title('Monetization Flow')
    const flowTop = y
    const stages = ['Entry', 'Gameplay', 'Outcome', 'Meta']
    stages.forEach((stage, index) => {
      const cx = margin + 18 + (index * 48.6)
      const cy = flowTop + 10

      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.circle(cx, cy, 8, 'FD')

      drawThaiText(doc, String(index + 1), cx, cy, { fontSize: 10, bold: true, color: orange, align: 'center', baseline: 'middle' })
      drawThaiText(doc, stage, cx, cy + 16, { fontSize: 10, color: ink, align: 'center' })

      if (index < stages.length - 1) {
        const nextCx = margin + 18 + ((index + 1) * 48.6)
        doc.setDrawColor(orange[0], orange[1], orange[2])
        doc.line(cx + 12, cy, nextCx - 14, cy)
        doc.line(nextCx - 17, cy - 2.5, nextCx - 14, cy)
        doc.line(nextCx - 17, cy + 2.5, nextCx - 14, cy)
      }
    })
    y = flowTop + 34

    title('Ads Strategy')
    table(
      ['Type', 'Trigger / moment', 'Frequency cap', 'Notes'],
      adPlacements.map((placement) => [
        placement.placement_type,
        value(placement.trigger_point, 'No trigger set'),
        placement.frequency_cap == null ? 'Missing' : `${placement.frequency_cap} per session`,
        value(placement.notes, 'No notes'),
      ]),
      [30, 62, 35, 55]
    )

    title('IAP Catalog')
    table(
      ['Item', 'Type', 'Price', 'Benefit / description'],
      iapItems.map((item) => [
        item.name,
        item.item_type.replace('_', ' '),
        money(item.price_usd),
        value(item.description, 'No benefit described'),
      ]),
      [40, 32, 25, 85]
    )

    title('Configuration Notes')
    table(
      ['Area', 'Field', 'Value'],
      [
        ['Ads', 'Ad network', value(adsConfig?.ad_network)],
        ['Ads', 'Revenue model', value(adsConfig?.revenue_model)],
        ['Ads', 'Notes', value(adsConfig?.notes, 'No notes')],
        ['IAP', 'Store', value(iapConfig?.store?.replace('_', ' '))],
        ['IAP', 'Currency', value(iapConfig?.currency)],
        ['IAP', 'Notes', value(iapConfig?.notes, 'No notes')],
      ],
      [30, 50, 102]
    )

    title('Case for Ethics')
    const ethicsRows = [
      ['Frequency caps', missingCaps === 0 ? 'Pass' : `${missingCaps} placement(s) need caps`, 'Caps limit ad pressure and protect player autonomy.'],
      ['Optional value', 'Pass', 'Rewarded ads and IAP should remain optional, not required for normal progress.'],
      ['Price clarity', iapItems.every((item) => item.price_usd != null && item.description) ? 'Pass' : 'Needs review', 'Every paid item should show price and benefit clearly.'],
      ['Pressure level', riskLabel, 'Interstitials and missing caps increase pressure risk.'],
    ]
    table(['Check', 'Result', 'Explanation'], ethicsRows, [40, 32, 110])

    title('Instructor Review')
    table(
      ['Field', 'Value'],
      [
        ['Grade', project.grade == null ? 'Not graded' : `${project.grade}/100`],
        ['Comment', value(project.instructor_comment, 'No instructor comment yet')],
        ['Submitted at', value(project.submitted_at, 'Not submitted')],
        ['Graded at', value(project.graded_at, 'Not graded')],
      ],
      [50, 132]
    )

    footer()
    doc.save(`emd-${safeFileName}-data.pdf`)
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-9 w49" />
        <div className="grid gap-6 lg:grid-cols[1fr_300px]">
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </PageContainer>
    )
  }

  if (!project) {
    return (
      <PageContainer>
        <p className="text-sm text-red-600">{error ?? 'Project not found'}</p>
      </PageContainer>
    )
  }

  const adPercent = adPlacements.length || iapItems.length ? Math.round((adPlacements.length / Math.max(1, adPlacements.length + iapItems.length)) * 100) : 0
  const iapPercent = adPlacements.length || iapItems.length ? 100 - adPercent : 0

  return (
    <PageContainer>
      <div className="no-print">
        <StepIndicator current={4} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Output & Pitch</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Export-ready monetization overview for instructor review.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-orange-50">
            <DownloadIcon className="h-4 w-4 text-primary" />
            CSV
          </button>
          <button onClick={() => handleExportPDF('data')} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-orange-50">
            <DownloadIcon className="h-4 w-4 text-primary" />
            PDF
          </button>
          <button onClick={() => handleExportPDF('ai')} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-orange-50">
            <AiIcon className="h-4 w-4 text-primary" />
            PDF AI Recommended
          </button>
          <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 disabled:translate-y-0 disabled:opacity-50">
            <TrashIcon className="h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <FadeInCard index={0}>
          <Card>
            <div className="border-b border-line pb-5">
              <p className="text-sm font-bold text-slate-500">Monetization Overview</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{project.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {project.title} is a {(project.platform ?? ['game']).join(', ')} {(project.genre ?? ['F2P']).join(', ')} game for {project.target_audience ?? 'a defined audience'}.
                The plan uses opt-in value moments and avoids coercive pressure patterns.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {['Entry', 'Gameplay', 'Outcome', 'Meta'].map((stage) => (
                <div key={stage} className="rounded-lg bg-slate-50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white font-black text-primary ring-1 ring-line">
                    {stage[0]}
                  </div>
                  <p className="text-sm font-black text-slate-900">{stage}</p>
                </div>
              ))}
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={1}>
          <Card>
            <h2 className="mb-4 text-xl font-black text-slate-950">Monetization Flow</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {adPlacements.map((placement) => (
                <div key={placement.id} className="rounded-lg border border-line bg-slate-50 p-4">
                  <Badge variant={placement.placement_type === 'interstitial' ? 'yellow' : 'green'}>{placement.placement_type}</Badge>
                  <p className="mt-3 font-black text-slate-950">{placement.trigger_point ?? 'Ad placement'}</p>
                  <p className="mt-1 text-sm text-slate-500">Frequency cap: {placement.frequency_cap ?? 'Not set'}</p>
                </div>
              ))}
              {iapItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-line bg-slate-50 p-4">
                  <Badge variant="purple">{item.item_type}</Badge>
                  <p className="mt-3 font-black text-slate-950">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.price_usd != null ? `$${item.price_usd}` : 'Free'} - {item.description ?? 'Benefit not specified'}</p>
                </div>
              ))}
            </div>
          </Card>
          </FadeInCard>
        </div>

        <aside className="space-y-4">
          <FadeInCard index={0}>
          <Card>
            <h2 className="font-black text-slate-950">Revenue Mix</h2>
            {iapConfig?.store && (
              <p className="mt-2 text-sm font-semibold capitalize text-slate-500">
                Store: {iapConfig.store.replace('_', ' ')}
              </p>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm font-bold"><span>Ads</span><span>{adPercent}%</span></div>
                <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-accent" style={{ width: `${adPercent}%` }} /></div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm font-bold"><span>IAP</span><span>{iapPercent}%</span></div>
                <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-primary" style={{ width: `${iapPercent}%` }} /></div>
              </div>
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={1}>
          <AiSuggestionPanel stage="output" projectId={projectId ?? ''} />
          </FadeInCard>

          <FadeInCard index={2}>
          <Card>
            <h2 className="font-black text-slate-950">Case for Ethics</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Frequency caps protect player autonomy by limiting ad pressure.</li>
              <li>IAP offers remain optional with visible price and benefit.</li>
              <li>Rewarded ads are presented as player-chosen value exchanges.</li>
            </ul>
          </Card>
          </FadeInCard>

          <FadeInCard index={3}>
          <Card>
            <h2 className="font-black text-slate-950">Feedback from Instructor</h2>
            <div className="mt-4">
              {project.status === 'graded' && <Badge variant="green">Grade {project.grade ?? '-'}/100</Badge>}
              {project.status === 'returned' && <Badge variant="red">Returned for Revision</Badge>}
              {(project.status === 'submitted' || project.status === 'resubmitted') && <Badge variant="blue">Pending Review</Badge>}
              {project.status === 'draft' && <p className="text-sm text-slate-500">Submit your project to receive feedback.</p>}
              {project.instructor_comment && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{project.instructor_comment}</p>
              )}
            </div>
          </Card>
          </FadeInCard>

          <div className="no-print sticky bottom-4 flex gap-3 rounded-lg border border-line bg-white p-3 shadow-lg">
            <button onClick={() => navigate(`/project/${projectId}/guardrail`)} className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Back
            </button>
            {project.status === 'draft' || project.status === 'returned' ? (
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            ) : (
              <button onClick={handleResubmit} disabled={submitting || project.status === 'under_review' || project.status === 'graded'} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50">
                {submitting ? 'Opening...' : 'Edit Again'}
              </button>
            )}
          </div>
        </aside>
      </div>
    </PageContainer>
  )
}