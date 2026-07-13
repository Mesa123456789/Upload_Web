import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
 
export default function FadeInCard({
  children,
  index = 0,
}: {
  children: ReactNode
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.06, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}