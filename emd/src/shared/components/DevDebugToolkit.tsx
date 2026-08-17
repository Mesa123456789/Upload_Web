import { useState } from 'react'
import { Bug } from 'lucide-react'
import { notify } from '../lib/toast'

// Dev-only floating panel for quickly testing UI primitives (toasts, theme
// colors, ...) without navigating through the real app flow. Renders nothing
// outside dev mode (import.meta.env.DEV is a build-time constant, so this
// branch is also dropped from production bundles by Vite's dead-code
// elimination).
//
// To add a new debug tool: write a small section component below and append
// {title, render} to SECTIONS — nothing else needs to change.

const THEME_COLOR_VARS = [
  '--color-primary',
  '--color-primary-light',
  '--color-secondary',
  '--color-background-main',
  '--color-background-card',
  '--color-ink',
  '--color-muted',
  '--color-line',
  '--color-accent',
  '--color-success',
  '--color-danger',
  '--color-warning',
]

function readThemeColors(): Array<{ name: string; value: string }> {
  if (typeof window === 'undefined') return []
  const computed = getComputedStyle(document.documentElement)
  return THEME_COLOR_VARS.map((name) => ({
    name: name.replace('--color-', ''),
    value: computed.getPropertyValue(name).trim() || 'unset',
  }))
}

function ToastSection() {
  return (
    <div style={styles.buttonGrid}>
      <button style={styles.toolBtn} onClick={() => notify.success('Test success toast')}>success</button>
      <button style={styles.toolBtn} onClick={() => notify.error('Test error toast')}>error</button>
      <button style={styles.toolBtn} onClick={() => notify.info('Test info toast')}>info</button>
      <button style={styles.toolBtn} onClick={() => notify.aiSuggestion('Test AI suggestion toast')}>aiSuggestion</button>
    </div>
  )
}

function ColorPaletteSection() {
  const [colors] = useState(readThemeColors)
  return (
    <div style={styles.swatchGrid}>
      {colors.map((c) => (
        <div key={c.name} style={styles.swatchItem}>
          <div style={{ ...styles.swatchBox, background: c.value }} />
          <div style={styles.swatchLabel}>{c.name}</div>
          <div style={styles.swatchHex}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}

const SECTIONS: Array<{ title: string; render: () => React.ReactNode }> = [
  { title: 'Toasts', render: () => <ToastSection /> },
  { title: 'Theme colors', render: () => <ColorPaletteSection /> },
]

export default function DevDebugToolkit() {
  const [isOpen, setIsOpen] = useState(false)

  if (!import.meta.env.DEV) return null

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={styles.toggleBtn}
        aria-label="Toggle dev debug toolkit"
        title="Dev debug toolkit"
      >
        <Bug size={20} color="#ffffff" strokeWidth={2} />
      </button>

      {isOpen && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Dev Debug Toolkit</span>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn} aria-label="Close">×</button>
          </div>
          <div style={styles.panelBody}>
            {SECTIONS.map((section) => (
              <div key={section.title} style={styles.section}>
                <div style={styles.sectionTitle}>{section.title}</div>
                {section.render()}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toggleBtn: {
    // Bottom-right, separate from the chat FAB (bottom-center) so they never
    // overlap regardless of viewport size.
    position: 'fixed',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(17,24,39,0.3)',
    zIndex: 2000,
  },
  panel: {
    position: 'fixed',
    bottom: 64,
    right: 16,
    width: 320,
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: '70vh',
    background: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 12,
    boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 2000,
    fontSize: 12,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#1e293b',
    flexShrink: 0,
  },
  panelTitle: { fontWeight: 700, fontSize: 12, letterSpacing: 0.3 },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
  },
  panelBody: {
    padding: 12,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  section: { display: 'flex', flexDirection: 'column', gap: 6 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#94a3b8',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  toolBtn: {
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    fontSize: 11,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  swatchGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  swatchItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  swatchBox: {
    width: '100%',
    height: 28,
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
  },
  swatchLabel: { fontSize: 11, fontWeight: 600, color: '#e2e8f0' },
  swatchHex: { fontSize: 10, color: '#94a3b8' },
}
