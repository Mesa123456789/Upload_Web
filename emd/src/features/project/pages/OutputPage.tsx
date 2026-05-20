import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
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
} from '../../projects/services/projects.service'
import type { Project, AdPlacement, IapItem, AdsConfig, IapConfig } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import Spinner from '../../../shared/components/Spinner'
import StepIndicator from './components/StepIndicator'

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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `emd-${project.title.replace(/\s+/g, '-').toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleExportPDF() {
    if (!project) return
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14
    const contentWidth = pageWidth - margin * 2
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

    function setText(color: [number, number, number] = ink) {
      doc.setTextColor(color[0], color[1], color[2])
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
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      setText(muted)
      doc.text('Generated by Ethical Monetization Designer', margin, pageHeight - 5)
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 5, { align: 'right' })
    }

    function title(text: string, size = 13) {
      addPageIfNeeded(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(size)
      setText(ink)
      doc.text(text, margin, y)
      y += 5
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.line(margin, y, pageWidth - margin, y)
      y += 6
    }

    function paragraph(text: string, x: number, width: number, size = 9, color = muted) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(size)
      setText(color)
      const lines = doc.splitTextToSize(text, width)
      doc.text(lines, x, y)
      y += lines.length * 4.8
    }

    function card(x: number, top: number, width: number, height: number) {
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.setFillColor(panel[0], panel[1], panel[2])
      doc.roundedRect(x, top, width, height, 3, 3, 'FD')
    }

    function keyValue(label: string, detail: string, x: number, top: number, width: number) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      setText(muted)
      doc.text(label.toUpperCase(), x, top)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      setText(ink)
      const lines = doc.splitTextToSize(detail, width)
      doc.text(lines, x, top + 5)
      return 8 + lines.length * 4
    }

    function table(headers: string[], rows: string[][], widths: number[]) {
      const startX = margin
      const headerHeight = 9
      addPageIfNeeded(headerHeight + 10)
      doc.setFillColor(warm[0], warm[1], warm[2])
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.rect(startX, y, contentWidth, headerHeight, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      setText(ink)
      let x = startX
      headers.forEach((header, index) => {
        doc.text(header, x + 2, y + 5.8)
        x += widths[index]
      })
      y += headerHeight

      if (rows.length === 0) {
        rows = [['No data added yet.', '', '', ''].slice(0, headers.length)]
      }

      rows.forEach((row, rowIndex) => {
        const wrapped = row.map((cell, index) => doc.splitTextToSize(value(cell, '-'), widths[index] - 4))
        const rowHeight = Math.max(10, ...wrapped.map((lines) => lines.length * 4 + 5))
        addPageIfNeeded(rowHeight + 4)
        if (rowIndex % 2 === 0) {
          doc.setFillColor(255, 255, 255)
        } else {
          doc.setFillColor(252, 250, 247)
        }
        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
        doc.rect(startX, y, contentWidth, rowHeight, 'FD')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        setText(muted)
        x = startX
        wrapped.forEach((lines, index) => {
          doc.text(lines, x + 2, y + 5.2)
          x += widths[index]
        })
        y += rowHeight
      })
      y += 5
    }

    doc.setFillColor(warm[0], warm[1], warm[2])
    doc.rect(0, 0, pageWidth, 38, 'F')
    doc.setFillColor(orange[0], orange[1], orange[2])
    doc.roundedRect(margin, 12, 16, 16, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text('EMD', margin + 8, 22, { align: 'center' })
    doc.setFontSize(19)
    setText(ink)
    doc.text(project.title, margin + 22, 18)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    setText(muted)
    doc.text('Ethical Monetization Designer - Monetization Overview', margin + 22, 25)
    doc.text(`Export date: ${exportDate}`, pageWidth - margin, 18, { align: 'right' })
    doc.text(`Status: ${project.status.replace('_', ' ')}`, pageWidth - margin, 25, { align: 'right' })
    y = 48

    card(margin, y, 118, 50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    setText(ink)
    doc.text('Summary', margin + 5, y + 9)
    const summaryTop = y + 18
    const summary = `${project.title} is a ${list(project.platform)} ${list(project.genre)} game for ${value(project.target_audience, 'a defined audience')}. The monetization approach uses ${adPlacements.length} ad placement(s) and ${iapItems.length} in-app purchase item(s), with a focus on optional value, clear player benefit, and pressure control.`
    y = summaryTop
    paragraph(summary, margin + 5, 108, 9)

    y = 48
    card(138, y, 58, 50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    setText(ink)
    doc.text('Revenue Mix', 143, y + 9)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`Ads ${pdfAdPercent}%`, 143, y + 22)
    doc.text(`IAP ${pdfIapPercent}%`, 174, y + 22)
    doc.setFillColor(236, 231, 224)
    doc.roundedRect(143, y + 28, 46, 5, 2, 2, 'F')
    doc.setFillColor(orange[0], orange[1], orange[2])
    doc.roundedRect(143, y + 28, Math.max(2, 46 * pdfAdPercent / 100), 5, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setText(muted)
    doc.text(`Risk score: ${riskLabel} (${riskScore}/10)`, 143, y + 40)
    doc.text(`Store: ${value(iapConfig?.store?.replace('_', ' '), 'Not configured')}`, 143, y + 45)

    y = 108
    title('Project Context')
    const contextTop = y
    card(margin, contextTop, contentWidth, 36)
    const col = contentWidth / 4
    keyValue('Genre', list(project.genre), margin + 5, contextTop + 9, col - 10)
    keyValue('Platform', list(project.platform), margin + col + 5, contextTop + 9, col - 10)
    keyValue('Audience', value(project.target_audience), margin + col * 2 + 5, contextTop + 9, col - 10)
    keyValue('Session', value(project.session_length), margin + col * 3 + 5, contextTop + 9, col - 10)
    y = contextTop + 45
    title('Core Loop')
    paragraph(value(project.core_mechanic, 'No core loop has been described yet.'), margin, contentWidth, 10)
    y += 5

    title('Monetization Flow')
    const flowTop = y
    const stages = ['Entry', 'Gameplay', 'Outcome', 'Meta']
    stages.forEach((stage, index) => {
      const x = margin + index * 45
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2])
      doc.circle(x + 10, flowTop + 10, 8, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      setText(orange)
      doc.text(String(index + 1), x + 10, flowTop + 13, { align: 'center' })
      setText(ink)
      doc.text(stage, x + 2, flowTop + 25)
      if (index < stages.length - 1) {
        doc.setDrawColor(orange[0], orange[1], orange[2])
        doc.line(x + 22, flowTop + 10, x + 39, flowTop + 10)
        doc.line(x + 36, flowTop + 7, x + 39, flowTop + 10)
        doc.line(x + 36, flowTop + 13, x + 39, flowTop + 10)
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
      [34, 64, 35, 39]
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
      [42, 38, 28, 64]
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
      [32, 45, 95]
    )

    title('Case for Ethics')
    const ethicsRows = [
      ['Frequency caps', missingCaps === 0 ? 'Pass' : `${missingCaps} placement(s) need caps`, 'Caps limit ad pressure and protect player autonomy.'],
      ['Optional value', 'Pass', 'Rewarded ads and IAP should remain optional, not required for normal progress.'],
      ['Price clarity', iapItems.every((item) => item.price_usd != null && item.description) ? 'Pass' : 'Needs review', 'Every paid item should show price and benefit clearly.'],
      ['Pressure level', riskLabel, 'Interstitials and missing caps increase pressure risk.'],
    ]
    table(['Check', 'Result', 'Explanation'], ethicsRows, [42, 38, 92])

    title('Instructor Review')
    table(
      ['Field', 'Value'],
      [
        ['Grade', project.grade == null ? 'Not graded' : `${project.grade}/100`],
        ['Comment', value(project.instructor_comment, 'No instructor comment yet')],
        ['Submitted at', value(project.submitted_at, 'Not submitted')],
        ['Graded at', value(project.graded_at, 'Not graded')],
        ['Last updated', value(project.updated_at)],
      ],
      [42, 130]
    )

    footer()
    doc.save(`emd-${safeFileName}.pdf`)
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
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
          <button onClick={handleExportCSV} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">CSV</button>
          <button onClick={handleExportPDF} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">PDF</button>
          <button onClick={handleDelete} disabled={deleting} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50">
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
        </div>

        <aside className="space-y-4">
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

          <Card>
            <h2 className="font-black text-slate-950">Case for Ethics</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Frequency caps protect player autonomy by limiting ad pressure.</li>
              <li>IAP offers remain optional with visible price and benefit.</li>
              <li>Rewarded ads are presented as player-chosen value exchanges.</li>
            </ul>
          </Card>

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
