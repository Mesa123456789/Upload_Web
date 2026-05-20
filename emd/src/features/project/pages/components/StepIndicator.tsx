interface StepIndicatorProps {
  current: number
}

const STEPS = ['Setup', 'Build', 'Guardrail', 'Output']

export default function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto app-scrollbar">
          {STEPS.map((label, index) => {
            const step = index + 1
            const isDone = step < current
            const isActive = step === current

            return (
              <div key={label} className="flex shrink-0 items-center">
                <div
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : step}
                  </span>
                  {label}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`mx-2 h-px w-8 ${step < current ? 'bg-emerald-300' : 'bg-line'}`} />
                )}
              </div>
            )
          })}
        </div>
        <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
          Step {current} of 4
        </span>
      </div>
    </div>
  )
}
