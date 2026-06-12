"use client"

import { useEffect, useState } from "react"
import {
  ArrowRight, CheckSquare, ChevronRight,
  Filter, Layers, Plus, Search, TrendingUp, X,
} from "lucide-react"
import { Tabs } from "@base-ui/react/tabs"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { NineBox } from "@/components/features/sucesion/NineBox"
import type { EmpleadoCelda } from "@/components/features/sucesion/NineBox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchAreas } from "@/services/areas"
import { fetchEmpleados } from "@/services/empleados"
import {
  completarHito, createHito, createPlanCarrera,
  fetchAnalisisPosicion, fetchHitos, fetchMapaTalento,
  fetchPlanesCarrera, updateReadiness,
} from "@/services/sucesion"
import { getEmpresaActivaId } from "@/services/empresaStore"
import type { Area } from "@/types/area"
import type { Empleado } from "@/types/empleado"
import type { EmpleadoAnalisis, EmpleadoMapa, Hito, PlanCarrera } from "@/types/sucesion"

// ─── Mapeos 9-Box ─────────────────────────────────────────────────────────────

const POTENCIAL_FILA: Record<EmpleadoMapa["potencial"], 0 | 1 | 2> = {
  alto: 0, medio: 1, bajo: 2,
}
const DESEMPENO_COL: Record<EmpleadoMapa["desempeno"], 0 | 1 | 2> = {
  bajo: 0, medio: 1, alto: 2,
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

const SELECT_CLASS =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none " +
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function nivelBadge(nivel: string | null) {
  if (!nivel) return null
  const map: Record<string, string> = {
    alto: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    medio: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    bajo: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[nivel] ?? "bg-muted text-muted-foreground"}`}>
      {nivel}
    </span>
  )
}

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
  const [empresaActivaId] = useState<string | null>(() => getEmpresaActivaId())
  const mostrarEmpresa = !empresaActivaId

  const [rawEmpleados, setRawEmpleados]   = useState<EmpleadoMapa[]>([])
  const [planes, setPlanes]               = useState<PlanCarrera[]>([])
  const [areas, setAreas]                 = useState<Area[]>([])
  const [selectedArea, setSelectedArea]   = useState<string>("")
  const [loadingMapa, setLoadingMapa]     = useState(true)
  const [loadingPlanes, setLoadingPlanes] = useState(true)
  const [errorMapa, setErrorMapa]         = useState<string | null>(null)
  const [errorPlanes, setErrorPlanes]     = useState<string | null>(null)

  // Plan modal state
  const [planOpen, setPlanOpen]               = useState(false)
  const [planEmpleados, setPlanEmpleados]     = useState<Empleado[]>([])
  const [planForm, setPlanForm]               = useState({ empleado_id: "", cargo_objetivo: "", fecha_objetivo: "", readiness: 0 })
  const [planLoading, setPlanLoading]         = useState(false)
  const [planError, setPlanError]             = useState<string | null>(null)

  // Plan detalle panel state
  const [selectedPlan, setSelectedPlan]             = useState<PlanCarrera | null>(null)
  const [hitos, setHitos]                           = useState<Hito[]>([])
  const [hitosLoading, setHitosLoading]             = useState(false)
  const [hitosError, setHitosError]                 = useState<string | null>(null)
  const [nuevoHitoOpen, setNuevoHitoOpen]           = useState(false)
  const [nuevoHitoForm, setNuevoHitoForm]           = useState({ titulo: "", descripcion: "", fecha_objetivo: "" })
  const [nuevoHitoLoading, setNuevoHitoLoading]     = useState(false)
  const [nuevoHitoError, setNuevoHitoError]         = useState<string | null>(null)
  const [readinessEdit, setReadinessEdit]           = useState(0)
  const [readinessSaving, setReadinessSaving]       = useState(false)

  // Analisis modal state
  const [analisisOpen, setAnalisisOpen]           = useState(false)
  const [analisisArea, setAnalisisArea]           = useState<string>("")
  const [analisisPosicion, setAnalisisPosicion]   = useState("")
  const [analisisRes, setAnalisisRes]             = useState<EmpleadoAnalisis[]>([])
  const [analisisLoading, setAnalisisLoading]     = useState(false)
  const [analisisError, setAnalisisError]         = useState<string | null>(null)
  const [analisisRan, setAnalisisRan]             = useState(false)

  useEffect(() => {
    fetchMapaTalento()
      .then(setRawEmpleados)
      .catch(() => setErrorMapa("No se pudo cargar el mapa de talento."))
      .finally(() => setLoadingMapa(false))

    fetchPlanesCarrera()
      .then(setPlanes)
      .catch(() => setErrorPlanes("No se pudo cargar los planes de carrera."))
      .finally(() => setLoadingPlanes(false))

    fetchAreas().then(setAreas).catch(() => setAreas([]))
  }, [])

  const empleadosFiltrados: EmpleadoCelda[] = (
    selectedArea
      ? rawEmpleados.filter((e) => e.area_id === selectedArea)
      : rawEmpleados
  ).map(toEmpleadoCelda)

  // ── Plan handlers ────────────────────────────────────────────────────────

  function openPlan() {
    setPlanForm({ empleado_id: "", cargo_objetivo: "", fecha_objetivo: "", readiness: 0 })
    setPlanError(null)
    setPlanOpen(true)
    fetchEmpleados(1, 100, undefined, "activo")
      .then((res) => setPlanEmpleados(res.items))
      .catch(() => setPlanEmpleados([]))
  }

  async function handlePlanSubmit() {
    if (!planForm.empleado_id) { setPlanError("Seleccioná un empleado."); return }
    if (!planForm.cargo_objetivo.trim()) { setPlanError("El cargo objetivo es requerido."); return }
    setPlanLoading(true)
    setPlanError(null)
    try {
      await createPlanCarrera({
        empleado_id: planForm.empleado_id,
        cargo_objetivo: planForm.cargo_objetivo.trim(),
        fecha_objetivo: planForm.fecha_objetivo || null,
        readiness: planForm.readiness,
      })
      setPlanOpen(false)
      setLoadingPlanes(true)
      fetchPlanesCarrera()
        .then(setPlanes)
        .catch(() => setErrorPlanes("No se pudo cargar los planes de carrera."))
        .finally(() => setLoadingPlanes(false))
    } catch {
      setPlanError("No se pudo crear el plan. Intentá de nuevo.")
    } finally {
      setPlanLoading(false)
    }
  }

  // ── Detalle panel handlers ───────────────────────────────────────────────

  function openDetalle(plan: PlanCarrera) {
    setSelectedPlan(plan)
    setReadinessEdit(plan.readiness)
    setHitos([])
    setHitosError(null)
    setNuevoHitoOpen(false)
    setNuevoHitoForm({ titulo: "", descripcion: "", fecha_objetivo: "" })
    setHitosLoading(true)
    fetchHitos(plan.id)
      .then(setHitos)
      .catch(() => setHitosError("No se pudieron cargar los hitos."))
      .finally(() => setHitosLoading(false))
  }

  function closeDetalle() { setSelectedPlan(null) }

  async function handleCompletarHito(hitoId: string) {
    try {
      await completarHito(hitoId)
      setHitos((prev) => prev.map((h) => h.id === hitoId ? { ...h, completado: true } : h))
      if (selectedPlan) {
        const updated = { ...selectedPlan, hitos_completados: selectedPlan.hitos_completados + 1 }
        setSelectedPlan(updated)
        setPlanes((prev) => prev.map((p) => p.id === updated.id ? updated : p))
      }
    } catch {
      toast.error("No se pudo completar el hito. Intentá de nuevo.")
    }
  }

  async function handleNuevoHito() {
    if (!nuevoHitoForm.titulo.trim()) { setNuevoHitoError("El título es requerido."); return }
    if (!selectedPlan) return
    setNuevoHitoLoading(true)
    setNuevoHitoError(null)
    try {
      const hito = await createHito(selectedPlan.id, {
        titulo: nuevoHitoForm.titulo.trim(),
        descripcion: nuevoHitoForm.descripcion.trim() || undefined,
        fecha_objetivo: nuevoHitoForm.fecha_objetivo || undefined,
      })
      setHitos((prev) => [...prev, hito])
      setNuevoHitoForm({ titulo: "", descripcion: "", fecha_objetivo: "" })
      setNuevoHitoOpen(false)
      const updated = { ...selectedPlan, hitos_total: selectedPlan.hitos_total + 1 }
      setSelectedPlan(updated)
      setPlanes((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    } catch {
      setNuevoHitoError("No se pudo agregar el hito. Intentá de nuevo.")
    } finally {
      setNuevoHitoLoading(false)
    }
  }

  async function handleSaveReadiness() {
    if (!selectedPlan || readinessEdit === selectedPlan.readiness) return
    setReadinessSaving(true)
    try {
      const updated = await updateReadiness(selectedPlan.id, readinessEdit)
      setSelectedPlan(updated)
      setPlanes((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    } catch {
      toast.error("No se pudo guardar el readiness. Intentá de nuevo.")
    }
    finally { setReadinessSaving(false) }
  }

  // ── Analisis handlers ────────────────────────────────────────────────────

  function openAnalisis() {
    setAnalisisArea(selectedArea)
    setAnalisisPosicion("")
    setAnalisisRes([])
    setAnalisisError(null)
    setAnalisisRan(false)
    setAnalisisOpen(true)
  }

  function closeAnalisis() { setAnalisisOpen(false) }

  async function handleAnalizar() {
    if (!analisisArea) { setAnalisisError("Seleccioná un área para analizar."); return }
    setAnalisisLoading(true)
    setAnalisisError(null)
    setAnalisisRan(false)
    try {
      const data = await fetchAnalisisPosicion(analisisArea, analisisPosicion)
      setAnalisisRes(data)
      setAnalisisRan(true)
    } catch {
      setAnalisisError("No se pudo obtener el análisis. Intentá de nuevo.")
    } finally {
      setAnalisisLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sucesión y Planes de Carrera"
        description="Mapa de talento y trayectorias de desarrollo"
      />

      <Tabs.Root defaultValue="mapa" className="space-y-6">
        <Tabs.List className="inline-flex gap-0.5 rounded-xl bg-muted p-1">
          <Tabs.Tab value="mapa" className={TAB_CLASS}>Mapa de Talento</Tabs.Tab>
          <Tabs.Tab value="planes" className={TAB_CLASS}>Planes de Carrera</Tabs.Tab>
        </Tabs.List>

        {/* ── Tab 1: 9-Box ──────────────────────────────────────────────── */}
        <Tabs.Panel value="mapa" className="space-y-4">
          <section className="rounded-xl border bg-card p-4 md:p-6" aria-label="Mapa 9-box de talento">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Mapa 9-Box</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Filter className="size-3.5 text-muted-foreground" />
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className={SELECT_CLASS}
                    aria-label="Filtrar por área"
                  >
                    <option value="">Todas las áreas</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <p className="hidden text-xs text-muted-foreground md:block">
                  Clic en un empleado para ver detalle
                </p>
              </div>
            </div>

            {loadingMapa && <MapaSkeleton />}
            {!loadingMapa && errorMapa && (
              <EmptyState icon={<Layers />} title="Error al cargar el mapa" description={errorMapa} />
            )}
            {!loadingMapa && !errorMapa && empleadosFiltrados.length === 0 && (
              <EmptyState
                icon={<Layers />}
                title="Sin empleados en el mapa"
                description={selectedArea
                  ? "No hay empleados en esta área con potencial y desempeño asignados."
                  : "Asigná potencial y desempeño a los empleados activos para verlos aquí."}
              />
            )}
            {!loadingMapa && !errorMapa && empleadosFiltrados.length > 0 && (
              <NineBox empleados={empleadosFiltrados} />
            )}
          </section>

          <section className="rounded-xl border bg-card p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Análisis por posición</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Encontrá los candidatos más compatibles para una posición en un área.
                </p>
              </div>
              <Button onClick={openAnalisis} className="min-h-11 shrink-0 gap-2">
                <Search className="size-4" />
                Analizar posición
              </Button>
            </div>
          </section>
        </Tabs.Panel>

        {/* ── Tab 2: Planes de carrera ───────────────────────────────────── */}
        <Tabs.Panel value="planes">
          <section className="rounded-xl border bg-card p-4 md:p-6" aria-label="Planes de carrera activos">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Planes activos</h2>
              <div className="flex items-center gap-3">
                {!loadingPlanes && !errorPlanes && planes.length > 0 && (
                  <span className="text-sm text-muted-foreground">{planes.length} colaboradores</span>
                )}
                <Button size="sm" onClick={openPlan} className="min-h-9 gap-1.5">
                  <Plus className="size-3.5" />
                  Nuevo plan
                </Button>
              </div>
            </div>

            {loadingPlanes && <PlanesSkeleton />}
            {!loadingPlanes && errorPlanes && (
              <EmptyState icon={<TrendingUp />} title="Error al cargar los planes" description={errorPlanes} />
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
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{plan.empleado_nombre}</p>
                          {mostrarEmpresa && plan.empresa_nombre && (
                            <p className="text-xs text-muted-foreground">{plan.empresa_nombre}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckSquare className="size-3.5" />
                            <span>{plan.hitos_completados}/{plan.hitos_total} hitos</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetalle(plan)}
                            className="min-h-8 gap-1 text-xs"
                          >
                            Ver detalle
                            <ChevronRight className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{plan.cargo_actual ?? "—"}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-foreground">{plan.cargo_objetivo}</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Readiness</span>
                          <span className="font-medium text-foreground">{plan.readiness}%</span>
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

      {/* ── Panel lateral: detalle del plan ───────────────────────────────── */}
      {selectedPlan && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={closeDetalle}
            aria-hidden
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl border-l"
            role="dialog"
            aria-label={`Detalle del plan de ${selectedPlan.empleado_nombre}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold text-foreground">Plan de carrera</h2>
              <Button variant="ghost" size="icon" className="size-9" onClick={closeDetalle}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Employee info */}
              <div>
                <p className="text-lg font-semibold text-foreground">{selectedPlan.empleado_nombre}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{selectedPlan.cargo_actual ?? "—"}</span>
                  <ArrowRight className="size-3.5 shrink-0" />
                  <span className="font-medium text-foreground">{selectedPlan.cargo_objetivo}</span>
                </div>
              </div>

              {/* Readiness editor */}
              <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Readiness</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {readinessEdit}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={readinessEdit}
                  onChange={(e) => setReadinessEdit(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-primary"
                  aria-label="Readiness"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
                {readinessEdit !== selectedPlan.readiness && (
                  <Button
                    size="sm"
                    className="mt-1 min-h-8 w-full"
                    onClick={handleSaveReadiness}
                    disabled={readinessSaving}
                  >
                    {readinessSaving ? "Guardando…" : "Guardar readiness"}
                  </Button>
                )}
              </div>

              {/* Hitos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Hitos
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {selectedPlan.hitos_completados}/{selectedPlan.hitos_total}
                    </span>
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-8 gap-1.5"
                    onClick={() => { setNuevoHitoOpen(true); setNuevoHitoError(null) }}
                  >
                    <Plus className="size-3.5" />
                    Agregar
                  </Button>
                </div>

                {/* Inline add form */}
                {nuevoHitoOpen && (
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="hito-titulo">
                        Título <span className="text-destructive" aria-hidden>*</span>
                      </Label>
                      <Input
                        id="hito-titulo"
                        value={nuevoHitoForm.titulo}
                        onChange={(e) => { setNuevoHitoForm((p) => ({ ...p, titulo: e.target.value })); setNuevoHitoError(null) }}
                        placeholder="Ej. Completar curso de liderazgo"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="hito-desc">
                        Descripción <span className="text-muted-foreground">(opcional)</span>
                      </Label>
                      <Input
                        id="hito-desc"
                        value={nuevoHitoForm.descripcion}
                        onChange={(e) => setNuevoHitoForm((p) => ({ ...p, descripcion: e.target.value }))}
                        placeholder="Detalles del hito…"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="hito-fecha">
                        Fecha objetivo <span className="text-muted-foreground">(opcional)</span>
                      </Label>
                      <Input
                        id="hito-fecha"
                        type="date"
                        value={nuevoHitoForm.fecha_objetivo}
                        onChange={(e) => setNuevoHitoForm((p) => ({ ...p, fecha_objetivo: e.target.value }))}
                      />
                    </div>
                    {nuevoHitoError && <p className="text-xs text-destructive">{nuevoHitoError}</p>}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-8 flex-1"
                        onClick={() => { setNuevoHitoOpen(false); setNuevoHitoError(null) }}
                        disabled={nuevoHitoLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="min-h-8 flex-1"
                        onClick={handleNuevoHito}
                        disabled={nuevoHitoLoading}
                      >
                        {nuevoHitoLoading ? "Guardando…" : "Agregar hito"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Hitos list */}
                {hitosLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                  </div>
                )}
                {!hitosLoading && hitosError && (
                  <p className="text-sm text-destructive">{hitosError}</p>
                )}
                {!hitosLoading && !hitosError && hitos.length === 0 && !nuevoHitoOpen && (
                  <p className="text-sm italic text-muted-foreground">
                    Sin hitos aún. Agregá el primero.
                  </p>
                )}
                {!hitosLoading && hitos.length > 0 && (
                  <ul className="space-y-2">
                    {hitos.map((hito) => (
                      <li key={hito.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
                        <input
                          type="checkbox"
                          checked={hito.completado}
                          disabled={hito.completado}
                          onChange={() => handleCompletarHito(hito.id)}
                          className="mt-0.5 h-4 w-4 cursor-pointer accent-primary disabled:cursor-default"
                          aria-label={`Marcar "${hito.titulo}" como completado`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${hito.completado ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {hito.titulo}
                          </p>
                          {hito.descripcion && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{hito.descripcion}</p>
                          )}
                          {hito.fecha_objetivo && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Objetivo: {new Date(hito.fecha_objetivo).toLocaleDateString("es-AR")}
                            </p>
                          )}
                        </div>
                        {hito.completado && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            ✓
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Nuevo plan de carrera ──────────────────────────────────── */}
      <Dialog open={planOpen} onOpenChange={(o) => { if (!o) setPlanOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo plan de carrera</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-empleado">
                Empleado <span className="text-destructive" aria-hidden>*</span>
              </Label>
              <select
                id="plan-empleado"
                value={planForm.empleado_id}
                onChange={(e) => { setPlanForm((p) => ({ ...p, empleado_id: e.target.value })); setPlanError(null) }}
                className={`h-9 w-full ${SELECT_CLASS}`}
              >
                <option value="">Seleccioná un empleado</option>
                {planEmpleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} {emp.apellido} — {emp.cargo}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-cargo">
                Cargo objetivo <span className="text-destructive" aria-hidden>*</span>
              </Label>
              <Input
                id="plan-cargo"
                value={planForm.cargo_objetivo}
                onChange={(e) => { setPlanForm((p) => ({ ...p, cargo_objetivo: e.target.value })); setPlanError(null) }}
                placeholder="Ej. Tech Lead, Gerente de Producto…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-fecha">
                Fecha objetivo <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="plan-fecha"
                type="date"
                value={planForm.fecha_objetivo}
                onChange={(e) => setPlanForm((p) => ({ ...p, fecha_objetivo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="plan-readiness">Readiness inicial</Label>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {planForm.readiness}%
                </span>
              </div>
              <input
                id="plan-readiness"
                type="range"
                min={0}
                max={100}
                step={5}
                value={planForm.readiness}
                onChange={(e) => setPlanForm((p) => ({ ...p, readiness: Number(e.target.value) }))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            {planError && <p className="text-xs text-destructive">{planError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setPlanOpen(false)} disabled={planLoading}>
              Cancelar
            </Button>
            <Button className="min-h-11" onClick={handlePlanSubmit} disabled={planLoading}>
              {planLoading ? "Guardando…" : "Crear plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Analizar posición ───────────────────────────────────────── */}
      <Dialog open={analisisOpen} onOpenChange={(o) => { if (!o) closeAnalisis() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Analizar posición</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="analisis-area">Área</Label>
              <select
                id="analisis-area"
                value={analisisArea}
                onChange={(e) => { setAnalisisArea(e.target.value); setAnalisisError(null) }}
                className={`h-9 w-full ${SELECT_CLASS}`}
              >
                <option value="">Seleccioná un área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="analisis-posicion">
                Posición buscada <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="analisis-posicion"
                value={analisisPosicion}
                onChange={(e) => setAnalisisPosicion(e.target.value)}
                placeholder="Ej. Tech Lead, Gerente de Producto…"
              />
            </div>

            {analisisError && <p className="text-xs text-destructive">{analisisError}</p>}

            {analisisRan && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {analisisRes.length === 0
                    ? "No hay empleados en esta área."
                    : `${analisisRes.length} empleado${analisisRes.length !== 1 ? "s" : ""} encontrado${analisisRes.length !== 1 ? "s" : ""}`}
                </p>
                {analisisRes.length > 0 && (
                  <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border">
                    {analisisRes.map((emp, idx) => (
                      <li key={emp.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {emp.nombre} {emp.apellido}
                          </p>
                          {emp.cargo && (
                            <p className="truncate text-xs text-muted-foreground">{emp.cargo}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {emp.score != null
                            ? <Badge variant="default" className="tabular-nums">{emp.score}</Badge>
                            : <Badge variant="outline">Sin score</Badge>
                          }
                          {nivelBadge(emp.potencial)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={closeAnalisis}>Cerrar</Button>
            <Button
              className="min-h-11 gap-2"
              onClick={handleAnalizar}
              disabled={analisisLoading || !analisisArea}
            >
              {analisisLoading ? "Analizando…" : (
                <><Search className="size-4" />Analizar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
