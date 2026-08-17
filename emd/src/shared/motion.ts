import type { Variants, Transition } from 'framer-motion'

export const motionEase = [0.22, 1, 0.36, 1] as const

export const motionTiming = {
  instant: 0.12,
  fast: 0.16,
  base: 0.22,
  page: 0.28,
  slow: 0.34,
} as const

export const transitions = {
  fast: { duration: motionTiming.fast, ease: motionEase },
  base: { duration: motionTiming.base, ease: motionEase },
  page: { duration: motionTiming.page, ease: motionEase },
  slow: { duration: motionTiming.slow, ease: motionEase },
  spring: { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 },
} satisfies Record<string, Transition>

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
}

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
}

export const navItemVariants: Variants = {
  expanded: { opacity: 1, x: 0 },
  collapsed: { opacity: 0, x: -6 },
}

export const dropdownVariants: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
}

export const dialogBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const dialogVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
}
