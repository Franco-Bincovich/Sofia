import { DollarSign, RefreshCw, TrendingUp, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kpi {
  title: string
  value: string
  icon: LucideIcon
  description: string
  accent?: boolean
}

interface MesData {
  mes: string
  valor: number
}

interface AreaCosto {
  area: string
  empleados: number
  costoMensual: number
  presupuesto: number
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const KPIS: Kpi[] = [
  {
    title: "Costo total nómina",
    value: "$2.340.000",
    icon: DollarSign,
    description: "Mensual bruto — junio 2025",
  },
  {
    title: "Costo promedio / empleado",
    value: "$49.787",
    icon: Users,
    description: "Sobre 47 colaboradores",
  },
  {
    title: "Variación vs mes anterior",
    value: "+3,2 %",
    icon: TrendingUp,
    description: "vs mayo 2025",
    accent: true,
  },
  {
    title: "Costo de rotación YTD",
    value: "$180.000",
    icon: RefreshCw,
    description: "Enero–junio 2025",
  },
]

const EVOLUCION: MesData[] = [
  { mes: "Ene", valor: 2.10 },
  { mes: "Feb", valor: 2.15 },
  { mes: "Mar", valor: 2.20 },
  { mes: "Abr", valor: 2.25 },
  { mes: "May", valor: 2.31 },
  { mes: "Jun", valor: 2.34 },
]

const AREAS: AreaCosto[] = [
  { area: "Tecnología", empleados: 18, costoMensual: 900_000, presupuesto: 850_000 },
  { area: "Producto",   empleados: 12, costoMensual: 540_000, presupuesto: 560_000 },
  { area: "Ventas",     empleados:  8, costoMensual: 480_000, presupuesto: 450_000 },
  { area: "RRHH",       empleados:  5, costoMensual: 250_000, presupuesto: 260_000 },
  { area: "Finanzas",   empleados:  4, costoMensual: 170_000, presupuesto: 180_000 },
]

const TOTAL_NOMINA      = AREAS.reduce((s, a) => s + a.costoMensual, 0) // 2_340_000
const TOTAL_PRESUPUESTO = AREAS.reduce((s, a) => s + a.presupuesto,  0) // 2_300_000
const TOTAL_EMPLEADOS   = AREAS.reduce((s, a) => s + a.empleados,    0) // 47

// ─── Chart config ─────────────────────────────────────────────────────────────

const BAR_MAX_PX = 128 // matches h-32 container
const Y_MIN      = 2.0
const Y_MAX      = 2.4

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pesos(n: number): string {
  const abs = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return n < 0 ? `-$${abs}` : `$${abs}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon
  return (
    <div className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
        <span className="shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className={`mt-3 text-2xl font-bold tracking-tight ${
          kpi.accent ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        }`}
      >
        {kpi.value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
    </div>
  )
}

function EvolucionChart() {
  return (
    <section
      className="rounded-xl border bg-card p-4 md:p-6"
      aria-label="Evolución mensual del costo de nómina"
    >
      <h2 className="mb-5 text-base font-semibold text-foreground">
        Evolución mensual — 2025
      </h2>

      {/* Bar area: bars grow from bottom */}
      <div className="flex h-32 gap-3">
        {EVOLUCION.map((d) => {
          const barPx = Math.round(((d.valor - Y_MIN) / (Y_MAX - Y_MIN)) * BAR_MAX_PX)
          return (
            <div
              key={d.mes}
              className="relative flex flex-1 items-end rounded-sm bg-muted/20"
            >
              {/* Value label, floated just above the bar */}
              <span
                className="absolute left-0 right-0 text-center text-xs text-muted-foreground"
                style={{ bottom: `${barPx + 6}px` }}
              >
                ${d.valor}M
              </span>
              <div
                aria-hidden="true"
                className="w-full rounded-t-sm bg-primary"
                style={{ height: `${barPx}px` }}
              />
            </div>
          )
        })}
      </div>

      {/* Month labels */}
      <div className="mt-2 flex gap-3">
        {EVOLUCION.map((d) => (
          <div
            key={d.mes}
            className="flex-1 text-center text-xs font-medium text-muted-foreground"
          >
            {d.mes}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CostosPage() {
  const areas = AREAS.map((a) => ({
    ...a,
    costoPromedio: Math.round(a.costoMensual / a.empleados),
    pctTotal:      ((a.costoMensual / TOTAL_NOMINA) * 100).toFixed(1),
    desvio:        a.costoMensual - a.presupuesto,
  }))

  const desvioTotal = TOTAL_NOMINA - TOTAL_PRESUPUESTO // +40_000

  return (
    <div className="space-y-6">
      <PageHeader
        title="Costos de Personal"
        description="Nómina y presupuesto — junio 2025"
      />

      {/* KPIs */}
      <section aria-label="Indicadores de costos">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.title} kpi={kpi} />
          ))}
        </div>
      </section>

      {/* Bar chart */}
      <EvolucionChart />

      {/* Tabla por área */}
      <section
        className="rounded-xl border bg-card p-4 md:p-6"
        aria-label="Costos por área"
      >
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Costos por área
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Área</TableHead>
              <TableHead className="text-right">Empleados</TableHead>
              <TableHead className="text-right">Costo mensual</TableHead>
              <TableHead className="text-right">Costo promedio</TableHead>
              <TableHead className="text-right">% del total</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="text-right">Desvío</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.map((a) => (
              <TableRow key={a.area}>
                <TableCell className="font-medium">{a.area}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {a.empleados}
                </TableCell>
                <TableCell className="text-right">{pesos(a.costoMensual)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {pesos(a.costoPromedio)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {a.pctTotal}%
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {pesos(a.presupuesto)}
                </TableCell>
                <TableCell className="text-right">
                  {a.desvio > 0 ? (
                    <Badge variant="destructive">+{pesos(a.desvio)}</Badge>
                  ) : (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">
                      {pesos(a.desvio)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold">
                {TOTAL_EMPLEADOS}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {pesos(TOTAL_NOMINA)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {pesos(Math.round(TOTAL_NOMINA / TOTAL_EMPLEADOS))}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">100%</TableCell>
              <TableCell className="text-right font-semibold">
                {pesos(TOTAL_PRESUPUESTO)}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="destructive">+{pesos(desvioTotal)}</Badge>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>
    </div>
  )
}
