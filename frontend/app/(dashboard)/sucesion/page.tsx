"use client"

import { useEffect, useState } from "react"
import { ArrowRight, CheckSquare, Layers, TrendingUp } from "lucide-react"
import { Tabs } from "@base-ui/react/tabs"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { NineBox } from "@/components/features/sucesion/NineBox"
import type { EmpleadoCelda } from "@/components/features/sucesion/NineBox"
import { fetchMapaTalento, fetchPlanesCarrera } from "@/services/sucesion"
import type { EmpleadoMapa, PlanCarrera } from "@/types/sucesion"

// ─── Mapeos 9-Box ─────────────────────────────────────────────────────────────

const POTENCIAL_FILA: Record<EmpleadoMapa["potencial"], 0 | 1 | 2> = {
  alto: 0,
  medio: 1,
  bajo: 2,
}

const DESEMPENO_COL: Record<EmpleadoMapa["desempeno"], 0 | 1 | 2> = {
  bajo: 0,
  medio: 1,
  alto: 2,
}

function toEmpleadoCelda(e: EmpleadoMapa): EmpleadoCelda {
  return {
    id: e.id,
    nombre: `${e.nombre} ${e.apellido}`.trim(),
    cargo: e.cargo ?? "",
    area: e.area_nombre ?? "",
    fila: POTENCIAL_FILA[e.potencial],
    columna: DESEMPENO_COL[e.desempeno],
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Skeletons ────────────────────────────────────────────────────────────────

function MapaSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-6 w-32 rounded bg-muted" />
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="min-h-[100px] rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}

function PlanesSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="animate-pulse py-4 space-y-2">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-56 rounded bg-muted" />
          <div className="h-1.5 w-full rounded-full bg-muted" />
        </li>
      ))}
    </ul>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SucesionPage() {
  const [empleados, setEmpleados] = useState<EmpleadoCelda[]>([])
  const [planes, setPlanes] = useState<PlanCarrera[]>([])
  const [loadingMapa, setLoadingMapa] = useState(true)
  const [loadingPlanes, setLoadingPlanes] = useState(true)
  const [errorMapa, setErrorMapa] = useState<string | null>(null)
  const [errorPlanes, setErrorPlanes] = useState<string | null>(null)

  useEffect(() => {
    fetchMapaTalento()
      .then((data) => setEmpleados(data.map(toEmpleadoCelda)))
      .catch(() => setErrorMapa("No se pudo cargar el mapa de talento."))
      .finally(() => setLoadingMapa(false))
  }, [])

  useEffect(() => {
    fetchPlanesCarrera()
      .then(setPlanes)
      .catch(() => setErrorPlanes("No se pudo cargar los planes de carrera."))
      .finally(() => setLoadingPlanes(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sucesión y Planes de Carrera"
        description="Mapa de talento y trayectorias de desarrollo"
      />

      <Tabs.Root defaultValue="mapa" className="space-y-6">
        <Tabs.List className="inline-flex gap-0.5 rounded-xl bg-muted p-1">
          <Tabs.Tab value="mapa" className={TAB_CLASS}>
            Mapa de Talento
          </Tabs.Tab>
          <Tabs.Tab value="planes" className={TAB_CLASS}>
            Planes de Carrera
          </Tabs.Tab>
        </Tabs.List>

        {/* ── Tab 1: 9-Box ──────────────────────────────────────────────── */}
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

            {loadingMapa && <MapaSkeleton />}

            {!loadingMapa && errorMapa && (
              <EmptyState
                icon={<Layers />}
                title="Error al cargar el mapa"
                description={errorMapa}
              />
            )}

            {!loadingMapa && !errorMapa && empleados.length === 0 && (
              <EmptyState
                icon={<Layers />}
                title="Sin empleados en el mapa"
                description="Asigná potencial y desempeño a los empleados activos para verlos aquí."
              />
            )}

            {!loadingMapa && !errorMapa && empleados.length > 0 && (
              <NineBox empleados={empleados} />
            )}
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
              {!loadingPlanes && !errorPlanes && planes.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {planes.length} colaboradores
                </span>
              )}
            </div>

            {loadingPlanes && <PlanesSkeleton />}

            {!loadingPlanes && errorPlanes && (
              <EmptyState
                icon={<TrendingUp />}
                title="Error al cargar los planes"
                description={errorPlanes}
              />
            )}

            {!loadingPlanes && !errorPlanes && planes.length === 0 && (
              <EmptyState
                icon={<TrendingUp />}
                title="Sin planes de carrera"
                description="Todavía no hay planes de carrera activos registrados."
              />
            )}

            {!loadingPlanes && !errorPlanes && planes.length > 0 && (
              <ul className="divide-y divide-border" role="list">
                {planes.map((plan) => (
                  <li key={plan.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-foreground">{plan.empleado_nombre}</p>
                        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckSquare className="size-3.5" />
                          <span>
                            {plan.hitos_completados}/{plan.hitos_total} hitos
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {plan.cargo_actual ?? "—"}
                        </span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {plan.cargo_objetivo}
                        </span>
                      </div>

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
                          aria-label={`Readiness de ${plan.empleado_nombre}`}
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
            )}
          </section>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
