"use client"

import { Tabs } from "@base-ui/react/tabs"
import { ArrowRight, CheckSquare } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { NineBox } from "@/components/features/sucesion/NineBox"
import type { EmpleadoCelda } from "@/components/features/sucesion/NineBox"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanCarrera {
  id: string
  empleado: string
  cargoActual: string
  cargoObjetivo: string
  readiness: number // 0–100
  hitosCompletados: number
  hitosTotal: number
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const EMPLEADOS_MAPA: EmpleadoCelda[] = [
  { id: "1", nombre: "Ana García",      cargo: "Desarrolladora Senior", area: "Tecnología", fila: 0, columna: 2 },
  { id: "2", nombre: "Carlos López",    cargo: "Product Manager",       area: "Producto",   fila: 0, columna: 1 },
  { id: "3", nombre: "Diego Torres",    cargo: "DevOps Engineer",       area: "Tecnología", fila: 1, columna: 2 },
  { id: "4", nombre: "María Fernández", cargo: "UX Designer",           area: "Producto",   fila: 1, columna: 1 },
  { id: "5", nombre: "Martín Díaz",     cargo: "HR Business Partner",   area: "RRHH",       fila: 2, columna: 2 },
  { id: "6", nombre: "Lucía Morales",   cargo: "Analista Contable",     area: "Finanzas",   fila: 1, columna: 0 },
]

const PLANES: PlanCarrera[] = [
  {
    id: "1",
    empleado:         "Ana García",
    cargoActual:      "Desarrolladora Senior",
    cargoObjetivo:    "Tech Lead",
    readiness:        75,
    hitosCompletados: 6,
    hitosTotal:       8,
  },
  {
    id: "2",
    empleado:         "Carlos López",
    cargoActual:      "Product Manager",
    cargoObjetivo:    "Head of Product",
    readiness:        45,
    hitosCompletados: 3,
    hitosTotal:       6,
  },
  {
    id: "3",
    empleado:         "Diego Torres",
    cargoActual:      "DevOps Engineer",
    cargoObjetivo:    "SRE Lead",
    readiness:        60,
    hitosCompletados: 4,
    hitosTotal:       7,
  },
  {
    id: "4",
    empleado:         "María Fernández",
    cargoActual:      "UX Designer",
    cargoObjetivo:    "Design Lead",
    readiness:        30,
    hitosCompletados: 2,
    hitosTotal:       5,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAB_CLASS =
  "rounded-lg px-5 py-2 text-sm font-medium text-muted-foreground outline-none " +
  "transition-colors hover:text-foreground " +
  "data-active:bg-background data-active:text-foreground data-active:shadow-sm " +
  "focus-visible:ring-2 focus-visible:ring-ring/50"

function readinessBarColor(pct: number): string {
  if (pct >= 70) return "bg-emerald-500"
  if (pct >= 40) return "bg-amber-500"
  return "bg-rose-500"
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SucesionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sucesión y Planes de Carrera"
        description="Mapa de talento y trayectorias de desarrollo"
      />

      <Tabs.Root defaultValue="mapa" className="space-y-6">
        {/* Tab list */}
        <Tabs.List className="inline-flex gap-0.5 rounded-xl bg-muted p-1">
          <Tabs.Tab value="mapa" className={TAB_CLASS}>
            Mapa de Talento
          </Tabs.Tab>
          <Tabs.Tab value="planes" className={TAB_CLASS}>
            Planes de Carrera
          </Tabs.Tab>
        </Tabs.List>

        {/* ── Tab 1: 9-box ──────────────────────────────────────────────── */}
        <Tabs.Panel value="mapa">
          <section
            className="rounded-xl border bg-card p-4 md:p-6"
            aria-label="Mapa 9-box de talento"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-foreground">Mapa 9-Box</h2>
              <p className="text-xs text-muted-foreground">
                Clic en un empleado para ver detalle
              </p>
            </div>
            <NineBox empleados={EMPLEADOS_MAPA} />
          </section>
        </Tabs.Panel>

        {/* ── Tab 2: Planes de carrera ───────────────────────────────────── */}
        <Tabs.Panel value="planes">
          <section
            className="rounded-xl border bg-card p-4 md:p-6"
            aria-label="Planes de carrera activos"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Planes activos</h2>
              <span className="text-sm text-muted-foreground">
                {PLANES.length} colaboradores
              </span>
            </div>

            <ul className="divide-y divide-border" role="list">
              {PLANES.map((plan) => (
                <li key={plan.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3">
                    {/* Name + hitos counter */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-foreground">{plan.empleado}</p>
                      <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckSquare className="size-3.5" />
                        <span>
                          {plan.hitosCompletados}/{plan.hitosTotal} hitos
                        </span>
                      </div>
                    </div>

                    {/* Career path: cargo actual → cargo objetivo */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{plan.cargoActual}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {plan.cargoObjetivo}
                      </span>
                    </div>

                    {/* Readiness progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Readiness</span>
                        <span className="font-medium text-foreground">
                          {plan.readiness}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={plan.readiness}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Readiness de ${plan.empleado}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${readinessBarColor(plan.readiness)}`}
                          style={{ width: `${plan.readiness}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
