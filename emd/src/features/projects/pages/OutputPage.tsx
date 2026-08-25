import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { loadSuggestions } from '../services/chat.service'
import type { RawSuggestion } from '../services/chat.service'
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
import { useI18n } from '../../../i18n/I18nProvider'
import StepIndicator from './components/StepIndicator'
import AiSuggestionPanel from './components/AiSuggestionPanel'
import FadeInCard from '../../../shared/components/FadeInCard'
import OutputPrintSheet from './components/OutputPrintSheet'

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
  const { t, formatNumber } = useI18n()

  const [project, setProject] = useState<Project | null>(null)
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null)
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([])
  const [iapConfig, setIapConfig] = useState<IapConfig | null>(null)
  const [iapItems, setIapItems] = useState<IapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [printMode, setPrintMode] = useState<PdfExportMode | null>(null)
  const [printAiSuggestions, setPrintAiSuggestions] = useState<RawSuggestion[]>([])

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
        setError(err instanceof Error ? err.message : t('output.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  useEffect(() => {
    if (!printMode || !project) return

    const originalTitle = document.title
    const safeFileName = project.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'project'
    document.title = `emd-${safeFileName}${printMode === 'ai' ? '-ai-recommendations' : ''}`

    function handleAfterPrint() {
      document.title = originalTitle
      setPrintMode(null)
    }
    window.addEventListener('afterprint', handleAfterPrint)

    let frame1 = 0
    let frame2 = 0
    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        window.print()
      })
    })

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
      document.title = originalTitle
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
    }
  }, [printMode])

  async function handleSubmit() {
    if (!projectId || !project) return
    setSubmitting(true)
    setError(null)
    try {
      setProject(await submitProject(projectId))
      notify.success(t('output.submitSuccess'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('output.submitFailed'))
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
      setError(err instanceof Error ? err.message : t('output.resubmitFailed'))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!projectId || !project) return
    if (!window.confirm(t('output.confirmDelete', { title: project.title }))) return
    setDeleting(true)
    try {
      await deleteProject(projectId)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('output.deleteFailed'))
      setDeleting(false)
      notify.error(t('output.deleteFailed'))
    }
  }

  function handleExportCSV() {
    if (!project) return
    const rows: string[][] = [
      [t('output.pdf.projectContext')],
      [t('output.pdf.field'), t('output.pdf.value')],
      [t('output.pdf.gameTitle'), project.title],
      [t('output.pdf.genre'), (project.genre ?? []).join(', ')],
      [t('output.pdf.platform'), (project.platform ?? []).join(', ')],
      [t('output.pdf.targetAudience'), project.target_audience ?? ''],
      [t('output.pdf.coreLoop'), project.core_mechanic ?? ''],
      [t('output.pdf.session'), project.session_length ?? ''],
      [],
      [t('output.pdf.adsStrategy')],
      [t('output.pdf.type'), t('output.pdf.triggerMoment'), t('output.pdf.frequencyCap'), t('output.pdf.notes')],
      ...adPlacements.map((placement) => [
        placement.placement_type,
        placement.trigger_point ?? '',
        placement.frequency_cap == null ? t('output.pdf.missing') : t('output.pdf.perSession', { count: String(placement.frequency_cap) }),
        placement.notes ?? '',
      ]),
      [],
      [t('output.pdf.iapCatalog')],
      [t('output.pdf.item'), t('output.pdf.type'), t('output.pdf.price'), t('output.pdf.benefitDescription')],
      ...iapItems.map((item) => [
        item.name,
        item.item_type.replace('_', ' '),
        item.price_usd != null ? `$${item.price_usd.toFixed(2)}` : '',
        item.description ?? '',
      ]),
      [],
      [t('output.pdf.configurationNotes')],
      [t('output.pdf.area'), t('output.pdf.field'), t('output.pdf.value')],
      [t('build.ads'), t('output.pdf.adNetwork'), adsConfig?.ad_network ?? ''],
      [t('build.ads'), t('output.pdf.revenueModel'), adsConfig?.revenue_model ?? ''],
      [t('build.ads'), t('output.pdf.notes'), adsConfig?.notes ?? ''],
      [t('build.iap'), t('output.pdf.storeField'), iapConfig?.store?.replace('_', ' ') ?? ''],
      [t('build.iap'), t('output.pdf.currency'), iapConfig?.currency ?? ''],
      [t('build.iap'), t('output.pdf.notes'), iapConfig?.notes ?? ''],
      [],
      [t('output.pdf.caseForEthics')],
      [t('output.pdf.check'), t('output.pdf.result'), t('output.pdf.explanation')],
      [
        t('output.pdf.frequencyCap'),
        missingCaps === 0 ? t('output.pdf.pass') : t('output.pdf.capsNeed', { count: String(missingCaps) }),
        t('output.pdf.capsExplanation'),
      ],
      [t('output.pdf.optionalValue'), t('output.pdf.pass'), t('output.pdf.optionalValueExplanation')],
      [
        t('output.pdf.priceClarity'),
        iapItems.every((item) => item.price_usd != null && item.description) ? t('output.pdf.pass') : t('output.pdf.needsReview'),
        t('output.pdf.priceClarityExplanation'),
      ],
      [t('output.pdf.pressureLevel'), riskLabel, t('output.pdf.pressureExplanation')],
      [],
      [t('output.feedback.title')],
      [t('output.pdf.field'), t('output.pdf.value')],
      [t('projects.table.status'), t(`status.${project.status}`)],
      [t('output.pdf.grade'), project.grade == null ? t('output.pdf.notGraded') : `${project.grade}/100`],
      [t('output.pdf.comment'), project.instructor_comment || t('output.pdf.noInstructorComment')],
    ]

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    // à¹€à¸•à¸´à¸¡ UTF-8 BOM (\uFEFF) à¸™à¸³à¸«à¸™à¹‰à¸² â€” Excel à¹„à¸¡à¹ˆà¸­à¹ˆà¸²à¸™ charset à¸ˆà¸²à¸ Blob MIME type
    // à¹€à¸¥à¸¢ à¸–à¹‰à¸²à¹„à¸¡à¹ˆà¸¡à¸µ BOM à¸¡à¸±à¸™à¹€à¸”à¸² encoding à¹€à¸›à¹‡à¸™ ANSI/Windows-1252 à¹à¸—à¸™ UTF-8 à¹‚à¸”à¸¢
    // default à¸—à¸³à¹ƒà¸«à¹‰à¸•à¸±à¸§à¸­à¸±à¸à¸©à¸£à¹„à¸—à¸¢à¸à¸¥à¸²à¸¢à¹€à¸›à¹‡à¸™à¸ªà¸±à¸à¸¥à¸±à¸à¸©à¸“à¹Œà¸¡à¸±à¹ˆà¸§ à¹† à¸•à¸­à¸™à¹€à¸›à¸´à¸”à¹ƒà¸™à¹‚à¸›à¸£à¹à¸à¸£à¸¡à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¹ƒà¸Šà¹ˆ
    // text editor (Notepad/à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡ Linux à¸­à¹ˆà¸²à¸™à¹„à¸”à¹‰à¸›à¸à¸•à¸´à¹€à¸žà¸£à¸²à¸°à¸¡à¸±à¸™à¹€à¸”à¸² UTF-8 à¹€à¸›à¹‡à¸™à¸—à¸¸à¸™à¹€à¸”à¸´à¸¡)
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
    if (mode === 'ai') {
      setPrintAiSuggestions(await loadSuggestions(project.id))
    }
    setPrintMode(mode)
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-9 w49" />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
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
        <p className="text-sm text-red-600">{error ?? t('output.projectNotFound')}</p>
      </PageContainer>
    )
  }

  const adPercent = adPlacements.length || iapItems.length ? Math.round((adPlacements.length / Math.max(1, adPlacements.length + iapItems.length)) * 100) : 0
  const iapPercent = adPlacements.length || iapItems.length ? 100 - adPercent : 0

  const totalItems = adPlacements.length + iapItems.length
  const pdfAdPercent = totalItems ? Math.round((adPlacements.length / totalItems) * 100) : 0
  const pdfIapPercent = totalItems ? 100 - pdfAdPercent : 0
  const missingCaps = adPlacements.filter((placement) => placement.frequency_cap == null).length
  const interstitials = adPlacements.filter((placement) => placement.placement_type === 'interstitial').length
  const riskScore = Math.min(10, missingCaps * 3 + interstitials * 2 + Math.max(0, iapItems.length - 3))
  const riskLabel = riskScore >= 7 ? t('build.levels.high') : riskScore >= 4 ? t('build.levels.medium') : t('build.levels.low')
  const exportDate = new Date().toISOString().slice(0, 10)

  return (
    <PageContainer>
      <div className="no-print space-y-8">
      <StepIndicator current={4} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{t('output.title')}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t('output.subtitle')}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-orange-50">
            <DownloadIcon className="h-4 w-4 text-primary" />
            {t('output.buttons.csv')}
          </button>
          <button onClick={() => handleExportPDF('data')} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-orange-50">
            <DownloadIcon className="h-4 w-4 text-primary" />
            {t('output.buttons.pdf')}
          </button>
          <button onClick={() => handleExportPDF('ai')} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-orange-50">
            <AiIcon className="h-4 w-4 text-primary" />
            {t('output.buttons.aiPdf')}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 disabled:translate-y-0 disabled:opacity-50">
            <TrashIcon className="h-4 w-4" />
            {deleting ? t('output.buttons.deleting') : t('output.buttons.delete')}
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
              <p className="text-sm font-bold text-slate-500">{t('output.overview.label')}</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{project.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {t('output.overview.summary', {
                  title: project.title,
                  platform: (project.platform ?? [t('output.overview.fallbackPlatform')]).join(', '),
                  genre: (project.genre ?? [t('output.overview.fallbackGenre')]).join(', '),
                  audience: project.target_audience ?? t('output.overview.fallbackAudience'),
                })}
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['E', t('output.stages.entry')],
                ['G', t('output.stages.gameplay')],
                ['O', t('output.stages.outcome')],
                ['M', t('output.stages.meta')],
              ].map(([initial, stage]) => (
                <div key={stage} className="rounded-lg bg-slate-50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white font-black text-primary ring-1 ring-line">
                    {initial}
                  </div>
                  <p className="text-sm font-black text-slate-900">{stage}</p>
                </div>
              ))}
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={1}>
          <Card>
            <h2 className="mb-4 text-xl font-black text-slate-950">{t('output.flow.title')}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {adPlacements.map((placement) => (
                <div key={placement.id} className="rounded-lg border border-line bg-slate-50 p-4">
                  <Badge variant={placement.placement_type === 'interstitial' ? 'yellow' : 'green'}>{placement.placement_type}</Badge>
                  <p className="mt-3 font-black text-slate-950">{placement.trigger_point ?? t('output.flow.adPlacement')}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t('output.flow.frequencyCap', { value: placement.frequency_cap ?? t('output.flow.notSet') })}
                  </p>
                </div>
              ))}
              {iapItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-line bg-slate-50 p-4">
                  <Badge variant="purple">{item.item_type}</Badge>
                  <p className="mt-3 font-black text-slate-950">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.price_usd != null ? `$${item.price_usd}` : t('output.flow.free')} - {item.description ?? t('output.flow.benefitNotSpecified')}
                  </p>
                </div>
              ))}
            </div>
          </Card>
          </FadeInCard>
        </div>

        <aside className="space-y-4">
          <FadeInCard index={0}>
          <Card>
            <h2 className="font-black text-slate-950">{t('output.revenue.title')}</h2>
            {iapConfig?.store && (
              <p className="mt-2 text-sm font-semibold capitalize text-slate-500">
                {t('output.revenue.store', { store: iapConfig.store.replace('_', ' ') })}
              </p>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm font-bold"><span>{t('output.revenue.ads')}</span><span>{formatNumber(adPercent)}%</span></div>
                <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-accent" style={{ width: `${adPercent}%` }} /></div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm font-bold"><span>{t('output.revenue.iap')}</span><span>{formatNumber(iapPercent)}%</span></div>
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
            <h2 className="font-black text-slate-950">{t('output.ethics.title')}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>{t('output.ethics.frequency')}</li>
              <li>{t('output.ethics.iap')}</li>
              <li>{t('output.ethics.rewarded')}</li>
            </ul>
          </Card>
          </FadeInCard>

          <FadeInCard index={3}>
          <Card>
            <h2 className="font-black text-slate-950">{t('output.feedback.title')}</h2>
            <div className="mt-4">
              {project.status === 'graded' && <Badge variant="green">{t('output.feedback.grade', { grade: project.grade ?? '-' })}</Badge>}
              {project.status === 'returned' && <Badge variant="red">{t('output.feedback.returned')}</Badge>}
              {(project.status === 'submitted' || project.status === 'resubmitted') && <Badge variant="blue">{t('output.feedback.pending')}</Badge>}
              {project.status === 'draft' && <p className="text-sm text-slate-500">{t('output.feedback.draft')}</p>}
              {project.instructor_comment && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{project.instructor_comment}</p>
              )}
            </div>
          </Card>
          </FadeInCard>

          <div className="no-print sticky bottom-4 flex gap-3 rounded-lg border border-line bg-white p-3 shadow-lg">
            <button onClick={() => navigate(`/project/${projectId}/guardrail`)} className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              {t('output.buttons.back')}
            </button>
            {project.status === 'draft' || project.status === 'returned' ? (
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50">
                {submitting ? t('output.buttons.submitting') : t('output.buttons.submit')}
              </button>
            ) : (
              <button onClick={handleResubmit} disabled={submitting || project.status === 'under_review' || project.status === 'graded'} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50">
                {submitting ? t('output.buttons.opening') : t('output.buttons.editAgain')}
              </button>
            )}
          </div>
        </aside>
      </div>
      </div>

      {printMode && project && createPortal(
        <OutputPrintSheet
          mode={printMode}
          project={project}
          adsConfig={adsConfig}
          adPlacements={adPlacements}
          iapItems={iapItems}
          iapConfig={iapConfig}
          aiSuggestions={printAiSuggestions}
          exportDate={exportDate}
          pdfAdPercent={pdfAdPercent}
          pdfIapPercent={pdfIapPercent}
          riskScore={riskScore}
          riskLabel={riskLabel}
          missingCaps={missingCaps}
          interstitials={interstitials}
        />,
        document.body
      )}
    </PageContainer>
  )
}
