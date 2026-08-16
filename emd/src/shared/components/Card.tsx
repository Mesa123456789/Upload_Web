import { motion, useReducedMotion } from 'framer-motion'
import { cardVariants, transitions } from '../motion'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  const reduceMotion = useReducedMotion()
  const base = 'ds-card p-6'
  const interactive = onClick
    ? 'cursor-pointer'
    : ''

  return (
    <motion.div
      initial={reduceMotion ? false : 'initial'}
      whileInView={reduceMotion ? undefined : 'animate'}
      viewport={{ once: true, amount: 0.16 }}
      variants={cardVariants}
      transition={transitions.slow}
      whileHover={reduceMotion ? undefined : { y: -2, scale: onClick ? 1.01 : 1.004 }}
      whileTap={reduceMotion || !onClick ? undefined : { scale: 0.99 }}
      className={`${base} motion-card ${interactive} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
