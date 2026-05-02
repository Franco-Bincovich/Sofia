"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Plus, UserCheck, X } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { OnboardingChecklist } from "@/components/features/onboarding/OnboardingChecklist"
import { fetchEmpleados } from "@/services/empleados"
import { fetchOnboardingEmpleado, fetchOnboardings, iniciarOnboarding } from "@/services/onboarding"
import type { Empleado } from "@/types/empleado"
import type { OnboardingDetalle, OnboardingInstancia } from "@/types/onboarding"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function semanaLabel(inst: OnboardingInstancia): string {
  if (inst.progreso >= 100) return "Completado"
  if (inst.tareas_total === 0) return "Semana 1"
  const semanasCompletadas = Math.floor(inst.tareas_completadas / (inst.tareas_total / 4))
  return `Semana ${Math.min(semanasCompletadas + 1, 4)}`
}

// ─── IniciarModal ──────────────────────────────────────────────────────────────

interface IniciarModalProps {
  activos: OnboardingInstancia[]
  onClose: () => void
  onSuccess: (instancia: OnboardingInstancia) => void
}

function IniciarModal({ activos, onClose, onSuccess }: IniciarModalProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loadingEmp, setLoadingEmp] = useState(true)
  const [selectedId, setSelectedId] = useState("")
  const [iniciando, setIniciando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ids = new Set(activos.map((o) => o.empleado_id))
    fetchEmpleados(1, 100, undefined, "activo")
      .then((r) => setEmpleados(r.items.filter((e) => !ids.has(e.id))))
      .catch(() => setError("No se pudieron cargar los empleados"))
      .finally(() => setLoadingEmp(false))
  }, [activos])

  async function handleIniciar() {
    if (!selectedId || iniciando) return
    setIniciando(true)
    setError(null)
    try {
      const instancia = await iniciarOnboarding(selectedId)
      onSuccess(instancia)
    } catch {
      setError("No se pudo iniciar el onboarding. Verificá que el empleado no tenga uno activo.")
      setIniciando(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-iniciar-title"
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl bg-background p-6 shadow-2xl ring-1 ring-border sm:inset-auto sm:left-1/2 sm:w-[26rem] sm:-translate-x-1/2"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2
            id="modal-iniciar-title"
            className="text-base font-semibold text-foreground"
          >
            Iniciar onboarding
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Select */}
        <div>
          <label
            htmlFor="emp-select"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Empleado
          </label>

          {loadingEmp ? (
            <div className="h-10 animate-pulse rounded-lg bg-muted" />
          ) : (
            <select
              id="emp-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="">Seleccioná un empleado…</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} {e.apellido}
                  {e.cargo ? ` — ${e.cargo}` : ""}
                </option>
              ))}
            </select>
          )}

          {!loadingEmp && !error && empleados.length === 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Todos los empleados activos ya tienen un onboarding en curso.
            </p>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleIniciar}
            disabled={!selectedId || iniciando || loadingEmp}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {iniciando ? "Iniciando…" : "Iniciar"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [onboardings, setOnboardings] = useState<OnboardingInstancia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<OnboardingDetalle | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchOnboardings()
      .then(setOnboardings)
      .catch(() => setError("No se pudieron cargar los onboardings"))
      .finally(() => setLoading(false))
  }, [])

  async function handleSelect(empleadoId: string) {
    if (detalle?.empleado_id === empleadoId) {
      setDetalle(null)
      return
    }
    setLoadingDetalle(true)
    try {
      const d = await fetchOnboardingEmpleado(empleadoId)
      setDetalle(d)
    } catch {
      // Silently fail — no bloquea la lista
    } finally {
      setLoadingDetalle(false)
    }
  }

  function handleTareaToggled(tareaId: string, completada: boolean) {
    if (!detalle) return
    const updatedTareas = detalle.tareas.map((t) =>
      t.tarea_id === tareaId ? { ...t, completada } : t,
    )
    const done = updatedTareas.filter((t) => t.completada).length
    const total = updatedTareas.length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    setDetalle({ ...detalle, tareas: updatedTareas, progreso: pct, tareas_completadas: done })
    setOnboardings((prev) =>
      prev.map((o) =>
        o.empleado_id === detalle.empleado_id
          ? { ...o, progreso: pct, tareas_completadas: done }
          : o,
      ),
    )
  }

  function handleOnboardingIniciado(instancia: OnboardingInstancia) {
    setOnboardings((prev) => [instancia, ...prev])
    setModalOpen(false)
  }

  // ─── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <PageHeader title="Onboarding" description="Cargando..." />
        <ul className="space-y-3" role="list">
          {[1, 2, 3].map((i) => (
            <li key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </ul>
      </div>
    )
  }

  // ─── Error state ─────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div>
        <PageHeader title="Onboarding" description="Error al cargar" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header + acción */}
      <div className="relative">
        <PageHeader
          title="Onboarding"
          description={`${onboardings.length} colaboradores en proceso`}
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="absolute right-0 top-0 flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Iniciar onboarding</span>
        </button>
      </div>

      {onboardings.length === 0 ? (
        <EmptyState
          icon={<UserCheck />}
          title="Sin procesos activos"
          description="No hay empleados en proceso de onboarding actualmente."
        />
      ) : (
        <ul className="space-y-3" role="list">
          {onboardings.map((inst) => (
            <li key={inst.id}>
              <button
                type="button"
                onClick={() => handleSelect(inst.empleado_id)}
                disabled={loadingDetalle}
                className="w-full rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{inst.empleado_nombre}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {inst.empleado_cargo ?? "—"} · {inst.empleado_area ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{semanaLabel(inst)}</Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Inicio: {inst.fecha_inicio}</span>
                    <span className="font-medium text-foreground">{inst.progreso}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${inst.progreso}%` }}
                    />
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Backdrop del checklist */}
      {detalle && (
        <div
          className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40"
          aria-hidden="true"
          onClick={() => setDetalle(null)}
        />
      )}

      {/* Checklist panel */}
      {detalle && (
        <OnboardingChecklist
          detalle={detalle}
          onClose={() => setDetalle(null)}
          onTareaToggled={handleTareaToggled}
        />
      )}

      {/* Modal iniciar onboarding */}
      {modalOpen && (
        <IniciarModal
          activos={onboardings}
          onClose={() => setModalOpen(false)}
          onSuccess={handleOnboardingIniciado}
        />
      )}
    </div>
  )
}
