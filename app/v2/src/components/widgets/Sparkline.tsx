interface Props {
  data: number[]
  color: string
  id: string
  w?: number
  h?: number
}

export function Sparkline({ data, color, id, w = 60, h = 20 }: Props) {
  if (!data || data.length < 2) return null
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1
  const pts = data.map((v, i) =>
    `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - mn) / rng) * (h - 4)).toFixed(1)}`
  ).join(' ')
  const gid = `s${id}`
  return (
    <svg width={w} height={h} className="spark">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`${w},${h} 0,${h} ${pts}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
