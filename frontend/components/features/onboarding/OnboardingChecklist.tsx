"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { completarTarea } from "@/services/onboarding"
import type { OnboardingDetalle, TareaProgreso } from "@/types/onboarding"

const SEMANA_LABEL: Record<number, string> = {
  1: "Semana 1 — Bienvenida",
  2: "Semana 2 — Capacitación",
  3: "Semana 3 — Integración",
  4: "Semana 4 — Primer mes",
}

interface OnboardingChecklistProps {
  detalle: OnboardingDetalle
  canWrite: boolean
  onClose: () => void
  onTareaToggled: (tareaId: string, completada: boolean) => void
}

type CheckState = Record<string, boolean>

function buildInitialChecks(tareas: TareaProgreso[]): CheckState {
  return Object.fromEntries(tareas.map((t) => [t.tarea_id, t.completada]))
}

function groupBySemana(tareas: TareaProgreso[]): Map<number, TareaProgreso[]> {
  const map = new Map<number, TareaProgreso[]>()
  for (const t of tareas) {
    const list = map.get(t.semana) ?? []
    list.push(t)
    map.set(t.semana, list)
  }
  return map
}

export function OnboardingChecklist({
  detalle,
  canWrite,
  onClose,
  onTareaToggled,
}: OnboardingChecklistProps) {
  const [checks, setChecks] = useState<CheckState>(() =>
    buildInitialChecks(detalle.tareas),
  )
  const [saving, setSaving] = useState<string | null>(null)

  const total = detalle.tareas.length
  const done = Object.values(checks).filter(Boolean).length
  const overallPct = total > 0 ? Math.round((done / total) * 100) : 0

  const semanas = groupBySemana(
    [...detalle.tareas].sort((a, b) => a.semana - b.semana || a.orden - b.orden),
  )

  async function toggle(tareaId: string) {
    const currentState = checks[tareaId]
    const newState = !currentState

    setChecks((prev) => ({ ...prev, [tareaId]: newState }))
    onTareaToggled(tareaId, newState)

    if (newState) {
      setSaving(tareaId)
      try {
        await completarTarea(String(detalle.id), tareaId)
      } catch {
        toast.error("No se pudo guardar el progreso. Intentá de nuevo.")
        setChecks((prev) => ({ ...prev, [tareaId]: currentState }))
        onTareaToggled(tareaId, currentState)
      } finally {
        setSaving(null)
      }
    }
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-background shadow-xl ring-1 ring-border sm:w-[28rem]"
      role="dialog"
      aria-label={`Checklist de ${detalle.empleado_nombre}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {detalle.empleado_nombre}
          </h2>
          <p className="text-xs text-muted-foreground">
            {detalle.empleado_cargo ?? "—"} · {detalle.empleado_area ?? "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Overall progress */}
      <div className="border-b px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Progreso total</span>
          <span className="text-xs font-semibold text-foreground">{overallPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Sections by semana */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          {Array.from(semanas.entries()).map(([semana, tareas]) => {
            const secDone = tareas.filter((t) => checks[t.tarea_id]).length
            const secTotal = tareas.length
            const badgeVariant: "default" | "secondary" | "outline" =
              secDone === secTotal ? "default" : secDone > 0 ? "secondary" : "outline"

            return (
              <section key={semana}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    {SEMANA_LABEL[semana] ?? `Semana ${semana}`}
                  </h3>
                  <Badge variant={badgeVariant}>
                    {secDone}/{secTotal}
                  </Badge>
                </div>

                <ul className="space-y-0.5" role="list">
                  {tareas.map((tarea) => {
                    const checked = checks[tarea.tarea_id]
                    const isSaving = saving === tarea.tarea_id
                    return (
                      <li key={tarea.tarea_id}>
                        <label
                          className={cn(
                            "flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
                            canWrite && "cursor-pointer hover:bg-muted",
                            isSaving && "opacity-60",
                          )}
                        >
                          {canWrite && (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => !isSaving && toggle(tarea.tarea_id)}
                              disabled={isSaving}
                              className="mt-0.5 size-4 shrink-0 accent-primary"
                            />
                          )}
                          <span
                            className={cn(
                              "text-sm leading-snug",
                              checked
                                ? "text-muted-foreground line-through decoration-muted-foreground/60"
                                : "text-foreground",
                            )}
                          >
                            {tarea.titulo}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
