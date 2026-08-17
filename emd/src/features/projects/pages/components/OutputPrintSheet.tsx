import type { Project, AdPlacement, IapItem, AdsConfig, IapConfig } from '../../../../lib/database.types'
import type { RawSuggestion } from '../../services/chat.service'
import { useI18n } from '../../../../i18n/I18nProvider'

type PdfExportMode = 'data' | 'ai'

interface OutputPrintSheetProps {
  mode: PdfExportMode
  project: Project
  adsConfig: AdsConfig | null
  adPlacements: AdPlacement[]
  iapItems: IapItem[]
  iapConfig: IapConfig | null
  aiSuggestions: RawSuggestion[]
  exportDate: string
  pdfAdPercent: number
  pdfIapPercent: number
  riskScore: number
  riskLabel: string
  missingCaps: number
  interstitials: number
}

const CATEGORY_KEYS: Record<string, string> = {
  title: 'setup.gameTitle',
  genre: 'setup.genre',
  platform: 'setup.platform',
  target_audience: 'setup.targetAudience',
  core_mechanic: 'setup.coreLoop',
  session_length: 'setup.sessionLength',
  revenue_mix: 'output.pdf.revenueMix',
  monetization_design: 'output.flow.title',
}

function PrintTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const displayRows = rows.length > 0 ? rows : [[headers.map(() => '-').join('')]]
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="bg-primary">
          {headers.map((header) => (
            <th key={header} className="border border-line px-3 py-2 text-left font-black text-white">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {displayRows.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-background-main'}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="border border-line px-3 py-2 align-top text-muted">
                {cell || '-'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mb-3 border-b border-line pb-2">
      <h2 className="text-sm font-black text-ink">{children}</h2>
    </div>
  )
}

export default function OutputPrintSheet({
  mode,
  project,
  adsConfig,
  adPlacements,
  iapItems,
  iapConfig,
  aiSuggestions,
  exportDate,
  pdfAdPercent,
  pdfIapPercent,
  riskScore,
  riskLabel,
  missingCaps,
  interstitials,
}: OutputPrintSheetProps) {
  const { t } = useI18n()

  const value = (text: string | number | null | undefined, fallback = t('setup.notSet')) => {
    if (text === null || text === undefined || text === '') return fallback
    return String(text)
  }
  const list = (items: string[] | null | undefined) => items?.join(', ') || t('setup.notSet')
  const money = (amount: number | null) => (amount == null ? t('build.free') : `$${amount.toFixed(2)}`)

  const vagueItems = iapItems.filter((item) => !item.description).length
  const unpricedItems = iapItems.filter((item) => item.price_usd == null).length
  const stages = [t('output.stages.entry'), t('output.stages.gameplay'), t('output.stages.outcome'), t('output.stages.meta')]

  const instructorStatusLine = (() => {
    if (project.status === 'graded') return t('output.feedback.grade', { grade: project.grade ?? '-' })
    if (project.status === 'returned') return t('output.feedback.returned')
    if (project.status === 'submitted' || project.status === 'resubmitted') return t('output.feedback.pending')
    return t('output.feedback.draft')
  })()

  return (
    <div className="print-only w-full bg-background-card text-ink">
      <div className="flex items-start justify-between rounded-lg bg-background-main px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
            {mode === 'ai' ? 'AI' : 'EMD'}
          </div>
          <div>
            <h1 className="text-2xl font-black leading-tight text-ink">{project.title}</h1>
            <p className="text-xs text-muted">
              {mode === 'ai' ? t('output.pdf.aiSubtitle') : t('output.pdf.dataSubtitle')}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <p>{t('output.pdf.exportDate', { date: exportDate })}</p>
          {mode === 'ai' ? (
            <p>{t('output.pdf.risk', { level: riskLabel, score: String(riskScore) })}</p>
          ) : (
            <p>{t('output.pdf.status', { status: t(`status.${project.status}`) })}</p>
          )}
        </div>
      </div>

      {mode === 'ai' ? (
        <>
          <section className="mt-6 rounded-lg border border-line bg-background-card p-5">
            <h2 className="text-base font-black text-ink">{t('output.pdf.aiSummaryTitle')}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {riskScore >= 7 ? t('output.pdf.aiSummaryHigh') : t('output.pdf.aiSummaryReady')}
            </p>
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.recommendedFixes')}</SectionTitle>
            <PrintTable
              headers={[t('output.pdf.category'), t('output.pdf.aiRecommendation')]}
              rows={
                aiSuggestions.length > 0
                  ? aiSuggestions.map((s) => [t(CATEGORY_KEYS[s.category] ?? s.category), s.advice])
                  : [[t('output.pdf.noAiSuggestion'), t('output.pdf.noAiSuggestionHelp')]]
              }
            />
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.suggestedPitch')}</SectionTitle>
            <p className="text-sm leading-6 text-muted">
              {t('output.pdf.suggestedPitchBody', { title: project.title })}
            </p>
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.dataSnapshot')}</SectionTitle>
            <PrintTable
              headers={[t('output.pdf.metric'), t('output.pdf.currentValue')]}
              rows={[
                [t('output.pdf.gameTitle'), project.title],
                [t('output.pdf.genre'), list(project.genre)],
                [t('output.pdf.platform'), list(project.platform)],
                [t('output.pdf.targetAudience'), value(project.target_audience)],
                [t('output.pdf.adPlacements'), `${adPlacements.length}`],
                [t('output.pdf.iapItems'), `${iapItems.length}`],
                [t('output.pdf.missingAdCaps'), `${missingCaps}`],
                [t('output.pdf.interstitialPlacements'), `${interstitials}`],
                [t('output.pdf.unclearIapBenefit'), `${vagueItems}`],
                [t('output.pdf.missingIapPrice'), `${unpricedItems}`],
              ]}
            />
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.finalChecklist')}</SectionTitle>
            <PrintTable
              headers={[t('output.pdf.check'), t('output.pdf.recommendedStandard')]}
              rows={[
                [t('output.pdf.frequencyCap'), t('output.pdf.frequencyCapStandard')],
                [t('output.pdf.optionality'), t('output.pdf.optionalityStandard')],
                [t('output.pdf.priceClarity'), t('output.pdf.priceClarityStandard')],
                [t('output.pdf.pitchEvidence'), t('output.pdf.pitchEvidenceStandard')],
              ]}
            />
          </section>
        </>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-[1fr_260px] gap-4">
            <section className="rounded-lg border border-line bg-background-card p-5">
              <h2 className="text-base font-black text-ink">{t('output.pdf.summary')}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {t('output.pdf.dataSummary', {
                  title: project.title,
                  platform: list(project.platform),
                  genre: list(project.genre),
                  audience: value(project.target_audience, t('output.pdf.definedAudience')),
                  ads: String(adPlacements.length),
                  iap: String(iapItems.length),
                })}
              </p>
            </section>

            <section className="rounded-lg border border-line bg-background-card p-5">
              <h2 className="text-sm font-black text-ink">{t('output.pdf.revenueMix')}</h2>
              <div className="mt-4 flex items-center justify-between text-xs font-bold text-ink">
                <span>Ads {pdfAdPercent}%</span>
                <span>IAP {pdfIapPercent}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-line">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(2, pdfAdPercent)}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted">{t('output.pdf.riskScore', { level: riskLabel, score: String(riskScore) })}</p>
              <p className="text-xs text-muted">
                {t('output.pdf.store', { store: value(iapConfig?.store?.replace('_', ' '), t('output.pdf.notConfigured')) })}
              </p>
            </section>
          </div>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.projectContext')}</SectionTitle>
            <div className="grid grid-cols-4 gap-4 rounded-lg border border-line bg-background-card p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-muted">{t('output.pdf.genre')}</p>
                <p className="mt-1 text-sm font-bold text-ink">{list(project.genre)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-muted">{t('output.pdf.platform')}</p>
                <p className="mt-1 text-sm font-bold text-ink">{list(project.platform)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-muted">{t('output.pdf.audience')}</p>
                <p className="mt-1 text-sm font-bold text-ink">{value(project.target_audience)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-muted">{t('output.pdf.session')}</p>
                <p className="mt-1 text-sm font-bold text-ink">{value(project.session_length)}</p>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.coreLoop')}</SectionTitle>
            <p className="text-sm leading-6 text-muted">{value(project.core_mechanic, t('output.pdf.noCoreLoop'))}</p>
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.monetizationFlow')}</SectionTitle>
            <div className="relative px-4 py-2">
              <div className="absolute left-[12.5%] right-[12.5%] top-6 h-px bg-primary" />
              <div className="relative grid grid-cols-4 gap-2">
                {stages.map((stage, index) => (
                  <div key={stage} className="flex flex-col items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-sm font-black text-primary">
                      {index + 1}
                    </div>
                    <p className="text-xs font-bold text-ink">{stage}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.adsStrategy')}</SectionTitle>
            <PrintTable
              headers={[t('output.pdf.type'), t('output.pdf.triggerMoment'), t('output.pdf.frequencyCap'), t('output.pdf.notes')]}
              rows={adPlacements.map((placement) => [
                placement.placement_type,
                value(placement.trigger_point, t('output.pdf.noTriggerSet')),
                placement.frequency_cap == null ? t('output.pdf.missing') : t('output.pdf.perSession', { count: String(placement.frequency_cap) }),
                value(placement.notes, t('output.pdf.noNotes')),
              ])}
            />
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.iapCatalog')}</SectionTitle>
            <PrintTable
              headers={[t('output.pdf.item'), t('output.pdf.type'), t('output.pdf.price'), t('output.pdf.benefitDescription')]}
              rows={iapItems.map((item) => [
                item.name,
                item.item_type.replace('_', ' '),
                money(item.price_usd),
                value(item.description, t('output.pdf.noBenefit')),
              ])}
            />
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.configurationNotes')}</SectionTitle>
            <PrintTable
              headers={[t('output.pdf.area'), t('output.pdf.field'), t('output.pdf.value')]}
              rows={[
                [t('build.ads'), t('output.pdf.adNetwork'), value(adsConfig?.ad_network)],
                [t('build.ads'), t('output.pdf.revenueModel'), value(adsConfig?.revenue_model)],
                [t('build.ads'), t('output.pdf.notes'), value(adsConfig?.notes, t('output.pdf.noNotes'))],
                [t('build.iap'), t('output.pdf.storeField'), value(iapConfig?.store?.replace('_', ' '))],
                [t('build.iap'), t('output.pdf.currency'), value(iapConfig?.currency)],
                [t('build.iap'), t('output.pdf.notes'), value(iapConfig?.notes, t('output.pdf.noNotes'))],
              ]}
            />
          </section>

          <section className="mt-6">
            <SectionTitle>{t('output.pdf.caseForEthics')}</SectionTitle>
            <PrintTable
              headers={[t('output.pdf.check'), t('output.pdf.result'), t('output.pdf.explanation')]}
              rows={[
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
              ]}
            />
          </section>
        </>
      )}

      <section className="mt-6">
        <SectionTitle>{t('output.feedback.title')}</SectionTitle>
        <div className="rounded-lg border border-line bg-background-card p-5">
          <p className="text-sm font-bold text-ink">{instructorStatusLine}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {value(project.instructor_comment, t('output.pdf.noInstructorComment'))}
          </p>
        </div>
      </section>

      <div className="mt-8 border-t border-line pt-3 text-center text-[10px] text-muted">
        {t('output.pdf.generatedBy')}
      </div>
    </div>
  )
}
