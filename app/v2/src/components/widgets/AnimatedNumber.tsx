import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  dec?: number
  suffix?: string
  className?: string
  style?: React.CSSProperties
}

export function AnimatedNumber({ value, dec = 1, suffix = '', className, style }: Props) {
  const displayRef = useRef(0)
  const prevRef = useRef(0)
  const rafRef = useRef<number>(0)
  const [, bump] = useState(0)

  useEffect(() => {
    const start = prevRef.current
    const end = value
    const t0 = performance.now()
    function step(t: number) {
      const progress = Math.min((t - t0) / 900, 1)
      const ease = 1 - Math.pow(1 - progress, 4)
      displayRef.current = start + (end - start) * ease
      bump(n => n + 1)
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    prevRef.current = end
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  return (
    <span className={cn(className)} style={style}>
      {displayRef.current.toFixed(dec)}{suffix}
    </span>
  )
}
