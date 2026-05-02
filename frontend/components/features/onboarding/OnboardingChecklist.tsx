"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EmpleadoOnboarding, Seccion } from "@/types/onboarding"

interface OnboardingChecklistProps {
  empleado: EmpleadoOnboarding
  onClose: () => void
}

type CheckState = Record<string, boolean>

function buildInitialChecks(secciones: Seccion[]): CheckState {
  return Object.fromEntries(
    secciones.flatMap((s) => s.tareas.map((t) => [t.id, t.completada]))
  )
}

function sectionCounts(
  secciones: Seccion[],
  checks: CheckState,
): Record<string, { done: number; total: number }> {
  return Object.fromEntries(
    secciones.map((s) => {
      const total = s.tareas.length
      const done = s.tareas.filter((t) => checks[t.id]).length
      return [s.id, { done, total }]
    }),
  ) as Record<string, { done: number; total: number }>
}

export function OnboardingChecklist({ empleado, onClose }: OnboardingChecklistProps) {
  const [checks, setChecks] = useState<CheckState>(() =>
    buildInitialChecks(empleado.secciones),
  )

  const counts = sectionCounts(empleado.secciones, checks)
  const totalTasks = empleado.secciones.reduce((acc, s) => acc + s.tareas.length, 0)
  const doneTasks = Object.values(checks).filter(Boolean).length
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  function toggle(taskId: string) {
    setChecks((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-background shadow-xl ring-1 ring-border sm:w-[28rem]"
      role="dialog"
      aria-label={`Checklist de ${empleado.nombre} ${empleado.apellido}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {empleado.nombre} {empleado.apellido}
          </h2>
          <p className="text-xs text-muted-foreground">
            {empleado.cargo} · {empleado.area}
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

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          {empleado.secciones.map((seccion) => {
            const { done, total } = counts[seccion.id]
            const badgeVariant: "default" | "secondary" | "outline" =
              done === total ? "default" : done > 0 ? "secondary" : "outline"

            return (
              <section key={seccion.id}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    {seccion.titulo}
                  </h3>
                  <Badge variant={badgeVariant}>
                    {done}/{total}
                  </Badge>
                </div>

                <ul className="space-y-0.5" role="list">
                  {seccion.tareas.map((tarea) => {
                    const checked = checks[tarea.id]
                    return (
                      <li key={tarea.id}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(tarea.id)}
                            className="mt-0.5 size-4 shrink-0 accent-primary"
                          />
                          <span
                            className={cn(
                              "text-sm leading-snug",
                              checked
                                ? "text-muted-foreground line-through decoration-muted-foreground/60"
                                : "text-foreground",
                            )}
                          >
                            {tarea.texto}
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
