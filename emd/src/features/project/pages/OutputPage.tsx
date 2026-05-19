import { useEffect, useRef, useState } from 'react'
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
  const printRef = useRef<HTMLDivElement>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null)
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([])
  const [iapConfig, setIapConfig] = useState<IapConfig | null>(null)
  const [iapItems, setIapItems] = useState<IapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false) // dropdown state

  useEffect(() => {
    async function load() {
      if (!projectId) return
      try {
        const p = await getProject(projectId)
        setProject(p)

        const ac = await getAdsConfig(projectId)
        if (ac) {
          setAdsConfig(ac)
          const placements = await listAdPlacements(ac.id)
          setAdPlacements(placements)
        }

        const ic = await getIapConfig(projectId)
        if (ic) {
          setIapConfig(ic)
          const items = await listIapItems(ic.id)
          setIapItems(items)
        }

        // Mark project as step 4 (output reached)
        if (p.current_step < 4) {
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

  // Submit project for instructor review — flips status to 'submitted'
  async function handleSubmit() {
    if (!projectId || !project) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await submitProject(projectId)
      setProject(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  // Re-submit: navigate back to setup so student can edit.
  async function handleResubmit() {
    if (!projectId || !project) return
    setSubmitting(true)
    setError(null)
    try {
      // Mark as resubmitted first so instructor can see the intent
      await resubmitProject(projectId)
      navigate(`/project/${projectId}/setup`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-submit')
      setSubmitting(false)
    }
  }

  // Delete project — confirm first, then navigate to dashboard
  async function handleDelete() {
    if (!projectId || !project) return
    const confirmed = window.confirm(
      `Delete "${project.title}"? This cannot be undone.`
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      await deleteProject(projectId)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      setDeleting(false)
    }
  }

  // Export as CSV — builds a basic summary CSV and triggers download
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
      ...adPlacements.map((p) => [
        p.placement_type,
        p.trigger_point ?? '',
        p.frequency_cap?.toString() ?? '',
      ]),
      [],
      ['IAP Items'],
      ['Name', 'Type', 'Price USD', 'Description'],
      ...iapItems.map((i) => [
        i.name,
        i.item_type,
        i.price_usd?.toString() ?? '',
        i.description ?? '',
      ]),
    ]

    // Escape commas and quotes in CSV cells
    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `emd-${project.title.replace(/\s+/g, '-').toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Export as PDF using jsPDF — generates a structured text document and downloads it.
  function handleExportPDF() {
    if (!project) return

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 16
    const contentWidth = pageWidth - margin * 2
    let y = 20

    function addHeading(text: string) {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text(text, margin, y)
      y += 7
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, margin + contentWidth, y)
      y += 5
    }

    function addField(label: string, value: string) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text(`${label}:`, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      const lines = doc.splitTextToSize(value, contentWidth - 35)
      doc.text(lines, margin + 35, y)
      y += lines.length * 5.5
    }

    function addParagraph(text: string) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      const lines = doc.splitTextToSize(text, contentWidth)
      doc.text(lines, margin, y)
      y += lines.length * 5.5 + 2
    }

    // Title
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Monetization Plan', margin, y)
    y += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(`EMD — Ethical Monetization Designer`, margin, y)
    y += 5
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y)
    y += 12

    // Game Overview
    addHeading('Game Overview')
    addField('Game Title', project.title)
    if (project.genre?.length) addField('Genre', project.genre.join(', '))
    if (project.platform?.length) addField('Platform', project.platform.join(', '))
    if (project.target_audience) addField('Target Audience', project.target_audience)
    if (project.core_mechanic) addField('Core Mechanic', project.core_mechanic)
    if (project.session_length) addField('Session Length', project.session_length)
    y += 4

    // Ads Strategy
    addHeading('Ads Strategy')
    if (adsConfig) {
      if (adsConfig.ad_network) addField('Ad Network', adsConfig.ad_network)
      if (adsConfig.revenue_model) addField('Revenue Model', adsConfig.revenue_model.toUpperCase())
      if (adsConfig.notes) addParagraph(`Notes: ${adsConfig.notes}`)
    }
    if (adPlacements.length > 0) {
      y += 2
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Ad Placements:', margin, y)
      y += 5
      adPlacements.forEach((p) => {
        if (y > 270) { doc.addPage(); y = 20 }
        const detail = `${p.placement_type.toUpperCase()} · Trigger: ${p.trigger_point ?? 'N/A'} · Freq Cap: ${p.frequency_cap ?? 'None'}`
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(40, 40, 40)
        const lines = doc.splitTextToSize(`  • ${detail}`, contentWidth)
        doc.text(lines, margin, y)
        y += lines.length * 5.5
      })
    } else {
      addParagraph('No ad placements configured.')
    }
    y += 4

    // IAP Catalog
    addHeading('IAP Catalog')
    if (iapConfig?.store) addField('Store', iapConfig.store.replace('_', ' '))
    if (iapItems.length > 0) {
      y += 2
      iapItems.forEach((item) => {
        if (y > 270) { doc.addPage(); y = 20 }
        const price = item.price_usd != null ? `$${item.price_usd}` : 'N/A'
        const summary = `${item.name} (${item.item_type}) — ${price}`
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40, 40, 40)
        doc.text(`  • ${summary}`, margin, y)
        y += 5
        if (item.description) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(90, 90, 90)
          const lines = doc.splitTextToSize(`    ${item.description}`, contentWidth - 6)
          doc.text(lines, margin, y)
          y += lines.length * 5 + 1
        }
      })
    } else {
      addParagraph('No IAP items configured.')
    }
    y += 4

    // Footer on every page
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(160, 160, 160)
      doc.text(
        `EMD — Ethical Monetization Designer · Page ${i} of ${totalPages}`,
        margin,
        doc.internal.pageSize.getHeight() - 8
      )
    }

    const filename = `emd-${project.title.replace(/\s+/g, '-').toLowerCase()}.pdf`
    doc.save(filename)
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
        <p className="text-red-600 text-sm">{error ?? 'Project not found'}</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Hide step indicator and action buttons when printing */}
      <div className="no-print">
        <StepIndicator current={4} />

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Output & Pitch</h1>
            <p className="text-sm text-gray-500 leading-6 mt-1">Your complete Monetization Plan</p>
          </div>

          {/* Actions dropdown — Export PDF, Export CSV, Delete */}
          <div className="relative">
            <button
              onClick={() => setActionsOpen((o) => !o)}
              className="rounded-full border-2 border-gray-200 px-5 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              Actions
              <span className="text-xs">{actionsOpen ? '▲' : '▼'}</span>
            </button>
            {actionsOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-background-card border border-black/5 rounded-2xl shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => { handleExportPDF(); setActionsOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-black/5 transition-colors"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => { handleExportCSV(); setActionsOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-black/5 transition-colors"
                >
                  Export CSV
                </button>
                <div className="border-t border-black/5" />
                <button
                  onClick={() => { setActionsOpen(false); handleDelete() }}
                  disabled={deleting}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete Project'}
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Printable content */}
      <div ref={printRef} className="space-y-6">
        {/* Header for print only */}
        <div className="print:block hidden mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Monetization Plan</h1>
          <p className="text-gray-500">EMD — Ethical Monetization Designer</p>
        </div>

        {/* Game Overview */}
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
            Game Overview
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Game Title</span>
              <span className="font-bold text-gray-900 text-lg">{project.title}</span>
            </div>
            {project.genre && project.genre.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">Genre</span>
                <div className="flex flex-wrap gap-1">
                  {project.genre.map((g) => (
                    <Badge key={g} variant="blue">{g}</Badge>
                  ))}
                </div>
              </div>
            )}
            {project.platform && project.platform.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">Platform</span>
                <div className="flex flex-wrap gap-1">
                  {project.platform.map((p) => (
                    <Badge key={p} variant="default">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {project.target_audience && (
              <div>
                <span className="text-gray-500 block mb-1">Target Audience</span>
                <span className="text-gray-900">{project.target_audience}</span>
              </div>
            )}
            {project.core_mechanic && (
              <div>
                <span className="text-gray-500 block mb-1">Core Mechanic</span>
                <span className="text-gray-900">{project.core_mechanic}</span>
              </div>
            )}
            {project.session_length && (
              <div>
                <span className="text-gray-500 block mb-1">Session Length</span>
                <span className="text-gray-900">{project.session_length}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Revenue Mix */}
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
            Revenue Mix
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">
                {adPlacements.length > 0 ? '50%' : '0%'}
              </p>
              <p className="text-sm text-blue-600 mt-1 font-medium">Advertising</p>
              <p className="text-xs text-gray-400 mt-2">
                {adPlacements.length} placement{adPlacements.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-primary/10 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">
                {iapItems.length > 0 ? '50%' : '0%'}
              </p>
              <p className="text-sm text-primary mt-1 font-medium">In-App Purchase</p>
              <p className="text-xs text-gray-400 mt-2">
                {iapItems.length} item{iapItems.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>

        {/* Ads Summary */}
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
            Ads Strategy
          </p>
          {adsConfig && (
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              {adsConfig.ad_network && (
                <div>
                  <span className="text-gray-500">Network:</span>{' '}
                  <span className="text-gray-900 font-medium">{adsConfig.ad_network}</span>
                </div>
              )}
              {adsConfig.revenue_model && (
                <div>
                  <span className="text-gray-500">Model:</span>{' '}
                  <span className="text-gray-900 font-medium uppercase">{adsConfig.revenue_model}</span>
                </div>
              )}
            </div>
          )}

          {adPlacements.length === 0 ? (
            <p className="text-sm text-gray-400">No ad placements configured.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left text-xs font-bold text-gray-400 pb-2">Type</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-2">Trigger</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-2">Freq Cap</th>
                </tr>
              </thead>
              <tbody>
                {adPlacements.map((p) => (
                  <tr key={p.id} className="border-b border-black/5 last:border-0">
                    <td className="py-2.5">
                      <Badge variant={p.placement_type === 'rewarded' ? 'green' : p.placement_type === 'interstitial' ? 'yellow' : 'blue'}>
                        {p.placement_type}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-gray-700">{p.trigger_point ?? '—'}</td>
                    <td className="py-2.5 text-gray-500">{p.frequency_cap ?? 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* IAP Summary */}
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
            IAP Catalog
          </p>
          {iapConfig && iapConfig.store && (
            <p className="text-sm text-gray-500 mb-3">
              Store: <span className="font-bold text-gray-700">{iapConfig.store.replace('_', ' ')}</span>
            </p>
          )}
          {iapItems.length === 0 ? (
            <p className="text-sm text-gray-400">No IAP items configured.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left text-xs font-bold text-gray-400 pb-2">Name</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-2">Type</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-2">Price</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {iapItems.map((item) => (
                  <tr key={item.id} className="border-b border-black/5 last:border-0">
                    <td className="py-2.5 font-medium text-gray-800">{item.name}</td>
                    <td className="py-2.5">
                      <Badge variant="purple">{item.item_type}</Badge>
                    </td>
                    <td className="py-2.5 text-gray-700">
                      {item.price_usd != null ? `$${item.price_usd}` : '—'}
                    </td>
                    <td className="py-2.5 text-gray-500">{item.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Ethics placeholder */}
        <Card className="border-primary/20">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">
            Ethics Summary
          </p>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl font-bold text-primary">—</div>
            <div>
              <p className="text-sm font-bold text-gray-700">Fairness Level</p>
              <p className="text-xs text-gray-400">Pending AI analysis</p>
            </div>
          </div>
          <ul className="text-sm text-gray-500 space-y-1.5 list-disc list-inside leading-6">
            <li>No aggressive forced interstitials between every level</li>
            <li>All purchases clearly labeled with value proposition</li>
            <li>Rewarded ads are opt-in by player choice</li>
          </ul>
        </Card>
      </div>

      {/* Feedback from Instructor */}
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          Feedback from Instructor
        </p>

        {project.status === 'graded' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-green-600">
                {project.grade ?? '—'}
                <span className="text-lg font-normal text-gray-400">/100</span>
              </div>
              <Badge variant="green">Graded</Badge>
            </div>
            {project.graded_at && (
              <p className="text-xs text-gray-400">
                Graded on {new Date(project.graded_at).toLocaleDateString()}
              </p>
            )}
            {project.instructor_comment && (
              <div className="bg-background-main border border-black/5 rounded-2xl p-4 text-sm text-gray-700 whitespace-pre-line">
                {project.instructor_comment}
              </div>
            )}
          </div>
        )}

        {project.status === 'under_review' && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <Badge variant="purple">Under Review</Badge>
            <p className="text-sm text-primary">
              Your project is being reviewed by the instructor. You cannot edit it right now.
            </p>
          </div>
        )}

        {(project.status === 'submitted' || project.status === 'resubmitted') && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Badge variant="blue">
              {project.status === 'submitted' ? 'Submitted' : 'Re-submitted'}
            </Badge>
            <span>Pending instructor review</span>
          </div>
        )}

        {project.status === 'returned' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="red">Returned for Revision</Badge>
            </div>
            {project.instructor_comment && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-800 whitespace-pre-line">
                {project.instructor_comment}
              </div>
            )}
            <p className="text-xs text-gray-400">
              Edit your project and submit again when ready.
            </p>
          </div>
        )}

        {project.status === 'draft' && (
          <p className="text-sm text-gray-400">Submit your project to receive feedback.</p>
        )}
      </Card>

      {/* Bottom action row */}
      <div className="no-print flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to Dashboard
        </button>

        {/* Submit / re-submit area — behavior depends on current status */}
        <div className="flex items-center gap-3">
          {/* draft → first submit */}
          {project.status === 'draft' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}

          {/* submitted → can re-edit */}
          {project.status === 'submitted' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-600 font-bold">Submitted</span>
              <button
                onClick={handleResubmit}
                disabled={submitting}
                className="rounded-full border-2 border-orange-300 px-5 py-2 text-sm font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors"
              >
                {submitting ? '...' : 'Re-submit'}
              </button>
            </div>
          )}

          {/* resubmitted → can keep re-editing */}
          {project.status === 'resubmitted' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-600 font-bold">Re-submitted</span>
              <button
                onClick={handleResubmit}
                disabled={submitting}
                className="rounded-full border-2 border-orange-300 px-5 py-2 text-sm font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors"
              >
                {submitting ? '...' : 'Submit Again'}
              </button>
            </div>
          )}

          {/* returned → student needs to fix and submit fresh */}
          {project.status === 'returned' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}

          {/* under_review / graded → read-only, no action */}
          {(project.status === 'under_review' || project.status === 'graded') && (
            <span className="text-sm text-gray-400 italic">Read-only</span>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
