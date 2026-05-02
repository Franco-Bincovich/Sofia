import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RadarChartProps {
  values: number[]   // exactly 6, each 0–100
  labels: string[]   // exactly 6
  className?: string
}

// ─── Chart geometry constants ─────────────────────────────────────────────────

const N          = 6
const CX         = 150
const CY         = 150
const MAX_R      = 100  // radius for 100% value
const LABEL_R    = 130  // radius for axis labels
const START      = -Math.PI / 2  // start at top

const ANGLES = Array.from({ length: N }, (_, i) => START + (i * 2 * Math.PI) / N)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function xy(r: number, angle: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function polyPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const { x, y } = xy((v / 100) * MAX_R, ANGLES[i])
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

function gridPoints(frac: number): string {
  return ANGLES.map((a) => {
    const { x, y } = xy(frac * MAX_R, a)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")
}

function anchor(i: number): "middle" | "start" | "end" {
  const c = Math.cos(ANGLES[i])
  if (c > 0.1) return "start"
  if (c < -0.1) return "end"
  return "middle"
}

function bline(i: number): "auto" | "hanging" | "central" {
  const s = Math.sin(ANGLES[i])
  if (s < -0.1) return "auto"
  if (s > 0.1) return "hanging"
  return "central"
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RadarChart({ values, labels, className }: RadarChartProps) {
  return (
    // Horizontal padding gives space for labels that overflow the viewBox
    <div className={cn("px-14", className)}>
      <svg
        viewBox="0 0 300 300"
        className="w-full"
        style={{ overflow: "visible" }}
        role="img"
        aria-label="Radar chart del perfil conductual"
      >
        {/* Background grid hexagons at 20 / 40 / 60 / 80 / 100 % */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac) => (
          <polygon
            key={frac}
            points={gridPoints(frac)}
            fill="none"
            className="stroke-muted-foreground/25"
            strokeWidth={0.8}
          />
        ))}

        {/* Axis spokes */}
        {ANGLES.map((a, i) => {
          const end = xy(MAX_R, a)
          return (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={end.x.toFixed(1)} y2={end.y.toFixed(1)}
              className="stroke-muted-foreground/25"
              strokeWidth={0.8}
            />
          )
        })}

        {/* Data polygon */}
        <polygon
          points={polyPoints(values)}
          className="fill-primary/20 stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Value dots */}
        {values.map((v, i) => {
          const { x, y } = xy((v / 100) * MAX_R, ANGLES[i])
          return (
            <circle
              key={i}
              cx={x.toFixed(1)} cy={y.toFixed(1)}
              r={3.5}
              className="fill-primary stroke-background"
              strokeWidth={2}
            />
          )
        })}

        {/* Axis labels */}
        {labels.map((label, i) => {
          const { x, y } = xy(LABEL_R, ANGLES[i])
          return (
            <text
              key={i}
              x={x.toFixed(1)} y={y.toFixed(1)}
              textAnchor={anchor(i)}
              dominantBaseline={bline(i)}
              fontSize={11}
              fontWeight={500}
              className="fill-foreground"
            >
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
