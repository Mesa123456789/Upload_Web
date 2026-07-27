import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cardVariants, transitions } from '../motion'
 
export default function FadeInCard({
  children,
  index = 0,
}: {
  children: ReactNode
  index?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : 'initial'}
      animate={reduceMotion ? undefined : 'animate'}
      variants={cardVariants}
      transition={reduceMotion ? undefined : { ...transitions.page, delay: index * 0.045 }}
    >
      {children}
    </motion.div>
  )
}
