"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadarChart } from "@/components/features/assessment/RadarChart"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subdimension {
  nombre: string
  score: number
}

interface Rasgo {
  id: string
  nombre: string
  barColor: string
  bgColor: string
  subdimensiones: Subdimension[]
}

interface ResultadoDetalle {
  id: string
  evaluado: string
  cargo: string
  area: string
  perfilDominante: string
  scoreGeneral: number
  radarValues: number[]    // 6 values: Apertura, Resp., Estabilidad, Amabilidad, Social., Liderazgo
  rasgos: Rasgo[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RADAR_LABELS = ["Apertura", "Responsab.", "Estabilidad", "Amabilidad", "Sociabilidad", "Liderazgo"]

const AREAS_BASE: Omit<Rasgo, "subdimensiones">[] = [
  { id: "A1", nombre: "Apertura",        barColor: "bg-blue-500",    bgColor: "bg-blue-50/50 dark:bg-blue-900/20"    },
  { id: "R",  nombre: "Responsabilidad", barColor: "bg-emerald-500", bgColor: "bg-emerald-50/50 dark:bg-emerald-900/20" },
  { id: "E",  nombre: "Estabilidad",     barColor: "bg-amber-500",   bgColor: "bg-amber-50/50 dark:bg-amber-900/20"  },
  { id: "A2", nombre: "Amabilidad",      barColor: "bg-rose-500",    bgColor: "bg-rose-50/50 dark:bg-rose-900/20"    },
  { id: "S",  nombre: "Sociabilidad",    barColor: "bg-purple-500",  bgColor: "bg-purple-50/50 dark:bg-purple-900/20"},
]

function buildRasgos(scores: number[][]): Rasgo[] {
  const names = [
    ["Curiosidad intelectual", "Apertura estética", "Imaginación creativa", "Tolerancia a la ambigüedad", "Flexibilidad cognitiva", "Apertura emocional"],
    ["Autodisciplina", "Planificación", "Orden y meticulosidad", "Confiabilidad", "Orientación a resultados", "Deliberación"],
    ["Regulación emocional", "Resiliencia", "Tolerancia al estrés", "Autoconfianza", "Pensamiento positivo", "Control del impulso"],
    ["Empatía", "Cooperación", "Altruismo", "Humildad", "Confianza en otros", "Sensibilidad social"],
    ["Asertividad", "Energía social", "Búsqueda de emociones", "Dominancia", "Calidez social", "Positividad"],
  ]
  return AREAS_BASE.map((base, i) => ({
    ...base,
    subdimensiones: names[i].map((nombre, j) => ({ nombre, score: scores[i][j] })),
  }))
}

// ─── Mock data per result ID ──────────────────────────────────────────────────

const MOCK: Record<string, ResultadoDetalle> = {
  "1": {
    id: "1", evaluado: "Ana García", cargo: "Desarrolladora Senior", area: "Tecnología",
    perfilDominante: "Liderazgo", scoreGeneral: 82,
    radarValues: [78, 85, 62, 70, 88, 82],
    rasgos: buildRasgos([
      [82, 70, 88, 65, 79, 72],
      [90, 87, 82, 91, 85, 79],
      [60, 65, 58, 70, 67, 52],
      [75, 72, 68, 80, 65, 70],
      [92, 85, 88, 82, 90, 91],
    ]),
  },
  "2": {
    id: "2", evaluado: "Carlos López", cargo: "Product Manager", area: "Producto",
    perfilDominante: "Apertura", scoreGeneral: 75,
    radarValues: [88, 65, 78, 72, 60, 62],
    rasgos: buildRasgos([
      [90, 88, 92, 85, 87, 84],
      [68, 62, 70, 65, 60, 68],
      [80, 75, 82, 72, 78, 80],
      [70, 75, 68, 72, 74, 70],
      [60, 58, 65, 55, 62, 62],
    ]),
  },
  "3": {
    id: "3", evaluado: "María Fernández", cargo: "UX Designer", area: "Producto",
    perfilDominante: "Responsabilidad", scoreGeneral: 68,
    radarValues: [72, 82, 68, 76, 58, 64],
    rasgos: buildRasgos([
      [75, 70, 78, 68, 72, 70],
      [85, 88, 80, 84, 82, 82],
      [65, 70, 68, 72, 65, 62],
      [80, 78, 72, 76, 78, 74],
      [58, 55, 62, 55, 60, 60],
    ]),
  },
  "4": {
    id: "4", evaluado: "Diego Torres", cargo: "DevOps Engineer", area: "Tecnología",
    perfilDominante: "Estabilidad", scoreGeneral: 91,
    radarValues: [62, 90, 94, 58, 70, 80],
    rasgos: buildRasgos([
      [60, 65, 58, 62, 65, 60],
      [92, 88, 94, 90, 92, 86],
      [96, 94, 92, 98, 90, 94],
      [60, 55, 62, 58, 60, 56],
      [72, 68, 75, 70, 68, 70],
    ]),
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, barColor }: { value: number; barColor: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${barColor}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function RasgoSection({ rasgo }: { rasgo: Rasgo }) {
  const avg = Math.round(rasgo.subdimensiones.reduce((s, d) => s + d.score, 0) / rasgo.subdimensiones.length)
  return (
    <div className={`rounded-xl border p-4 ${rasgo.bgColor}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{rasgo.nombre}</h3>
        <Badge variant="outline">{avg}/100</Badge>
      </div>
      <div className="space-y-2.5">
        {rasgo.subdimensiones.map((sub) => (
          <div key={sub.nombre}>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{sub.nombre}</span>
              <span className="font-medium text-foreground">{sub.score}</span>
            </div>
            <ProgressBar value={sub.score} barColor={rasgo.barColor} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssessmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const resultado = MOCK[id] ?? null

  if (!resultado) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4 min-h-11 gap-2" onClick={() => router.push("/assessment")}>
          <ArrowLeft className="size-4" /> Volver
        </Button>
        <EmptyState icon={<ArrowLeft />} title="Resultado no encontrado" description="El perfil solicitado no existe o fue eliminado." />
      </div>
    )
  }

  function handleDownload(tipo: string) {
    console.log(`Descargar reporte ${tipo} para ${resultado?.evaluado}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-4 min-h-11 gap-2" onClick={() => router.push("/assessment")}>
          <ArrowLeft className="size-4" /> Volver a Assessment
        </Button>
      </div>

      <PageHeader
        title={resultado.evaluado}
        description={`${resultado.cargo} · ${resultado.area}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{resultado.perfilDominante}</Badge>
            <Badge variant="default">Score {resultado.scoreGeneral}</Badge>
          </div>
        }
      />

      {/* ── Sección 1: Radar chart ──────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-4 md:p-6">
        <h2 className="mb-6 text-base font-semibold text-foreground">Perfil 360°</h2>
        <div className="mx-auto max-w-sm">
          <RadarChart values={resultado.radarValues} labels={RADAR_LABELS} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RADAR_LABELS.map((label, i) => (
            <div key={label} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold text-foreground">{resultado.radarValues[i]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sección 2: AREAS — 30 subdimensiones ──────────────────────── */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-foreground">Modelo AREAS — 30 dimensiones</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {resultado.rasgos.map((rasgo) => (
            <RasgoSection key={rasgo.id} rasgo={rasgo} />
          ))}
        </div>
      </section>

      {/* ── Sección 3: Descargar reportes ─────────────────────────────── */}
      <section className="rounded-xl border bg-card p-4 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Descargar reportes</h2>
        <div className="flex flex-wrap gap-3">
          {(["Ejecutivo", "Comercial", "Competencias"] as const).map((tipo) => (
            <Button
              key={tipo}
              variant="outline"
              className="min-h-11 gap-2"
              onClick={() => handleDownload(tipo)}
            >
              <Download className="size-4" />
              Reporte {tipo}
            </Button>
          ))}
        </div>
      </section>
    </div>
  )
}
