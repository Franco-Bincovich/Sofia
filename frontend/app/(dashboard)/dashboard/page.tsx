"use client"

import Link from "next/link"
import { AlertTriangle, Briefcase, DollarSign, UserMinus, UserPlus, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"

// ─── Types ────────────────────────────────────────────────────────────────────

type Prioridad = "alta" | "media" | "baja"
type VacanteEstado = "En proceso" | "Nueva" | "Con candidatos"

interface Kpi {
  title: string
  value: string
  icon: LucideIcon
  description: string
}

interface AreaCount {
  area: string
  total: number
}

interface Alerta {
  id: string
  mensaje: string
  prioridad: Prioridad
  href: string
}

interface Vacante {
  id: string
  titulo: string
  area: string
  estado: VacanteEstado
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const KPIS: Kpi[] = [
  { title: "Empleados activos",  value: "47",          icon: Users,      description: "Colaboradores vigentes" },
  { title: "Ingresos este mes",  value: "3",            icon: UserPlus,  description: "+3 vs mes anterior"    },
  { title: "Bajas este mes",     value: "1",            icon: UserMinus, description: "−1 vs mes anterior"    },
  { title: "Costo total nómina", value: "$2.340.000",   icon: DollarSign, description: "Mensual bruto"        },
]

const HEADCOUNT: AreaCount[] = [
  { area: "Tecnología", total: 18 },
  { area: "Producto",   total: 12 },
  { area: "Ventas",     total: 8  },
  { area: "RRHH",       total: 5  },
  { area: "Finanzas",   total: 4  },
]

const MAX_HEADCOUNT = Math.max(...HEADCOUNT.map((h) => h.total))

const ALERTAS: Alerta[] = [
  {
    id: "1",
    mensaje: "Contrato de Ana García vence en 15 días",
    prioridad: "alta",
    href: "/empleados/3",
  },
  {
    id: "2",
    mensaje: "Onboarding de Diego Torres pendiente — semana 2",
    prioridad: "media",
    href: "/onboarding",
  },
  {
    id: "3",
    mensaje: "Vacante DevOps Senior sin actividad hace 10 días",
    prioridad: "baja",
    href: "/vacantes",
  },
]

const VACANTES: Vacante[] = [
  { id: "1", titulo: "DevOps Senior",       area: "Tecnología", estado: "En proceso"     },
  { id: "2", titulo: "Product Manager Jr.", area: "Producto",   estado: "Nueva"          },
  { id: "3", titulo: "Account Executive",   area: "Ventas",     estado: "Con candidatos" },
]

// ─── Badge maps ───────────────────────────────────────────────────────────────

const PRIORIDAD_VARIANT: Record<Prioridad, "destructive" | "secondary" | "outline"> = {
  alta:  "destructive",
  media: "secondary",
  baja:  "outline",
}

const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  alta:  "Alta",
  media: "Media",
  baja:  "Baja",
}

const VACANTE_VARIANT: Record<VacanteEstado, "default" | "secondary"> = {
  "En proceso":     "default",
  "Nueva":          "secondary",
  "Con candidatos": "default",
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
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
        {kpi.value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
    </div>
  )
}

function HeadcountBar({ area, total }: AreaCount) {
  const pct = Math.round((total / MAX_HEADCOUNT) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-sm text-muted-foreground">
        {area}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-sm font-medium text-foreground">
        {total}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Ejecutivo"
        description="Resumen del estado de la organización"
      />

      {/* KPIs — 1 col mobile / 2 col tablet / 4 col desktop */}
      <section aria-label="Indicadores clave">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.title} kpi={kpi} />
          ))}
        </div>
      </section>

      {/* Headcount chart + Alertas — stack on mobile, 2 cols on lg */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          className="rounded-xl border bg-card p-4 md:p-6"
          aria-label="Headcount por área"
        >
          <h2 className="mb-5 text-base font-semibold text-foreground">
            Headcount por área
          </h2>
          <div className="space-y-4">
            {HEADCOUNT.map((row) => (
              <HeadcountBar key={row.area} area={row.area} total={row.total} />
            ))}
          </div>
        </section>

        <section
          className="rounded-xl border bg-card p-4 md:p-6"
          aria-label="Alertas activas"
        >
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Alertas activas
          </h2>
          <ul className="divide-y divide-border" role="list">
            {ALERTAS.map((alerta) => (
              <li
                key={alerta.id}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <Link
                  href={alerta.href}
                  className="min-w-0 flex-1 text-sm text-foreground hover:text-primary hover:underline"
                >
                  {alerta.mensaje}
                </Link>
                <Badge
                  variant={PRIORIDAD_VARIANT[alerta.prioridad]}
                  className="shrink-0"
                >
                  {PRIORIDAD_LABEL[alerta.prioridad]}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Vacantes activas */}
      <section
        className="rounded-xl border bg-card p-4 md:p-6"
        aria-label="Vacantes activas"
      >
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Vacantes activas
        </h2>
        <ul className="divide-y divide-border" role="list">
          {VACANTES.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Briefcase className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{v.titulo}</p>
                <p className="text-xs text-muted-foreground">{v.area}</p>
              </div>
              <Badge variant={VACANTE_VARIANT[v.estado]}>{v.estado}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
