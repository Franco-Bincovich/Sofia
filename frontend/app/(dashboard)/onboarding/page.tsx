"use client"

import { useState } from "react"
import { ChevronRight, UserCheck } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { OnboardingChecklist } from "@/components/features/onboarding/OnboardingChecklist"
import type { EmpleadoOnboarding, SeccionId } from "@/types/onboarding"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEMANA_LABEL: Record<SeccionId, string> = {
  "pre-ingreso": "Pre-ingreso",
  "semana-1":    "Semana 1",
  "semana-2":    "Semana 2",
  "mes-1":       "Mes 1",
}

function calcProgress(empleado: EmpleadoOnboarding): number {
  const tareas = empleado.secciones.flatMap((s) => s.tareas)
  if (tareas.length === 0) return 0
  return Math.round((tareas.filter((t) => t.completada).length / tareas.length) * 100)
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const EMPLEADOS: EmpleadoOnboarding[] = [
  {
    id: "4",
    nombre: "Diego",
    apellido: "Torres",
    cargo: "DevOps Engineer",
    area: "Tecnología",
    fechaIngreso: "2026-04-21",
    semanaActual: "semana-2",
    secciones: [
      {
        id: "pre-ingreso",
        titulo: "Pre-ingreso",
        tareas: [
          { id: "pi-1", texto: "Enviar carta de bienvenida",         completada: true  },
          { id: "pi-2", texto: "Preparar workstation",               completada: true  },
          { id: "pi-3", texto: "Configurar accesos iniciales",       completada: true  },
          { id: "pi-4", texto: "Notificar al equipo de Tecnología",  completada: true  },
        ],
      },
      {
        id: "semana-1",
        titulo: "Semana 1",
        tareas: [
          { id: "s1-1", texto: "Reunión de inducción con RRHH",      completada: true  },
          { id: "s1-2", texto: "Presentación al equipo",             completada: true  },
          { id: "s1-3", texto: "Revisión de procedimientos internos", completada: true  },
          { id: "s1-4", texto: "Configurar cuentas de trabajo",      completada: true  },
        ],
      },
      {
        id: "semana-2",
        titulo: "Semana 2",
        tareas: [
          { id: "s2-1", texto: "Primera evaluación de integración",  completada: true  },
          { id: "s2-2", texto: "Asignar buddy de equipo",            completada: true  },
          { id: "s2-3", texto: "Revisar objetivos del período",      completada: false },
          { id: "s2-4", texto: "Completar capacitaciones obligatorias", completada: false },
        ],
      },
      {
        id: "mes-1",
        titulo: "Mes 1",
        tareas: [
          { id: "m1-1", texto: "Evaluación de primer mes",           completada: false },
          { id: "m1-2", texto: "Feedback del supervisor",            completada: false },
          { id: "m1-3", texto: "Confirmar período de prueba",        completada: false },
          { id: "m1-4", texto: "Establecer plan de desarrollo",      completada: false },
        ],
      },
    ],
  },
  {
    id: "11",
    nombre: "Valentina",
    apellido: "Herrera",
    cargo: "Talent Acquisition",
    area: "RRHH",
    fechaIngreso: "2026-04-28",
    semanaActual: "semana-1",
    secciones: [
      {
        id: "pre-ingreso",
        titulo: "Pre-ingreso",
        tareas: [
          { id: "pi-1", texto: "Enviar carta de bienvenida",         completada: true  },
          { id: "pi-2", texto: "Preparar workstation",               completada: true  },
          { id: "pi-3", texto: "Configurar accesos iniciales",       completada: true  },
          { id: "pi-4", texto: "Notificar al equipo de RRHH",        completada: true  },
        ],
      },
      {
        id: "semana-1",
        titulo: "Semana 1",
        tareas: [
          { id: "s1-1", texto: "Reunión de inducción con RRHH",      completada: true  },
          { id: "s1-2", texto: "Presentación al equipo",             completada: true  },
          { id: "s1-3", texto: "Revisión de procedimientos internos", completada: false },
          { id: "s1-4", texto: "Configurar cuentas de trabajo",      completada: false },
        ],
      },
      {
        id: "semana-2",
        titulo: "Semana 2",
        tareas: [
          { id: "s2-1", texto: "Primera evaluación de integración",  completada: false },
          { id: "s2-2", texto: "Asignar buddy de equipo",            completada: false },
          { id: "s2-3", texto: "Revisar objetivos del período",      completada: false },
          { id: "s2-4", texto: "Completar capacitaciones obligatorias", completada: false },
        ],
      },
      {
        id: "mes-1",
        titulo: "Mes 1",
        tareas: [
          { id: "m1-1", texto: "Evaluación de primer mes",           completada: false },
          { id: "m1-2", texto: "Feedback del supervisor",            completada: false },
          { id: "m1-3", texto: "Confirmar período de prueba",        completada: false },
          { id: "m1-4", texto: "Establecer plan de desarrollo",      completada: false },
        ],
      },
    ],
  },
  {
    id: "8",
    nombre: "Laura",
    apellido: "Sánchez",
    cargo: "Product Analyst",
    area: "Producto",
    fechaIngreso: "2026-03-02",
    semanaActual: "mes-1",
    secciones: [
      {
        id: "pre-ingreso",
        titulo: "Pre-ingreso",
        tareas: [
          { id: "pi-1", texto: "Enviar carta de bienvenida",         completada: true  },
          { id: "pi-2", texto: "Preparar workstation",               completada: true  },
          { id: "pi-3", texto: "Configurar accesos iniciales",       completada: true  },
          { id: "pi-4", texto: "Notificar al equipo de Producto",    completada: true  },
        ],
      },
      {
        id: "semana-1",
        titulo: "Semana 1",
        tareas: [
          { id: "s1-1", texto: "Reunión de inducción con RRHH",      completada: true  },
          { id: "s1-2", texto: "Presentación al equipo",             completada: true  },
          { id: "s1-3", texto: "Revisión de procedimientos internos", completada: true  },
          { id: "s1-4", texto: "Configurar cuentas de trabajo",      completada: true  },
        ],
      },
      {
        id: "semana-2",
        titulo: "Semana 2",
        tareas: [
          { id: "s2-1", texto: "Primera evaluación de integración",  completada: true  },
          { id: "s2-2", texto: "Asignar buddy de equipo",            completada: true  },
          { id: "s2-3", texto: "Revisar objetivos del período",      completada: true  },
          { id: "s2-4", texto: "Completar capacitaciones obligatorias", completada: true  },
        ],
      },
      {
        id: "mes-1",
        titulo: "Mes 1",
        tareas: [
          { id: "m1-1", texto: "Evaluación de primer mes",           completada: true  },
          { id: "m1-2", texto: "Feedback del supervisor",            completada: true  },
          { id: "m1-3", texto: "Confirmar período de prueba",        completada: true  },
          { id: "m1-4", texto: "Establecer plan de desarrollo",      completada: false },
        ],
      },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = EMPLEADOS.find((e) => e.id === selectedId) ?? null

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div>
      <PageHeader
        title="Onboarding"
        description={`${EMPLEADOS.length} colaboradores en proceso`}
      />

      {EMPLEADOS.length === 0 ? (
        <EmptyState
          icon={<UserCheck />}
          title="Sin procesos activos"
          description="No hay empleados en proceso de onboarding actualmente."
        />
      ) : (
        <ul className="space-y-3" role="list">
          {EMPLEADOS.map((empleado) => {
            const pct = calcProgress(empleado)
            return (
              <li key={empleado.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(empleado.id)}
                  className="w-full rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {empleado.nombre} {empleado.apellido}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {empleado.cargo} · {empleado.area}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">
                        {SEMANA_LABEL[empleado.semanaActual]}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Ingreso: {empleado.fechaIngreso}
                      </span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Backdrop */}
      {selected && (
        <div
          className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40"
          aria-hidden="true"
          onClick={() => setSelectedId(null)}
        />
      )}

      {/* Checklist panel */}
      {selected && (
        <OnboardingChecklist
          empleado={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
