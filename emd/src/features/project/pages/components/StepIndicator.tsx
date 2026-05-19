interface StepIndicatorProps {
  current: number // 1-4
}

const STEPS = ['Setup', 'Build', 'Guardrail', 'Output']

export default function StepIndicator({ current }: StepIndicatorProps) {
  return (
    // Horizontal progress indicator — shows all 4 steps with connectors
    <div className="flex items-center">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1
        const isCompleted = stepNum < current
        const isActive = stepNum === current

        return (
          <div key={label} className="flex items-center">
            {/* Step pill: number/checkmark + label */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-primary text-white'
                    : 'bg-black/10 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  // Checkmark for completed steps
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-sm font-bold transition-colors ${
                  isActive
                    ? 'text-gray-900'
                    : isCompleted
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector line between steps */}
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-3 h-0.5 w-8 rounded-full transition-colors ${
                  stepNum < current ? 'bg-green-400' : 'bg-black/10'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
