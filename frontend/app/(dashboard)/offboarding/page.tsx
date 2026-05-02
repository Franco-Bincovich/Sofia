"use client"

import { useState } from "react"
import { UserMinus } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type MotivoEgreso = "renuncia" | "desvinculacion"
type ChecklistKey = "equipos" | "accesos" | "entrevista" | "documentacion"

interface EmpleadoOffboarding {
  id: string
  nombre: string
  apellido: string
  cargo: string
  area: string
  fechaEgreso: string
  motivo: MotivoEgreso
  checklistInicial: Record<ChecklistKey, boolean>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS: { key: ChecklistKey; label: string }[] = [
  { key: "equipos",       label: "Devolución de equipos"  },
  { key: "accesos",       label: "Revocación de accesos"  },
  { key: "entrevista",    label: "Entrevista de salida"    },
  { key: "documentacion", label: "Documentación firmada"  },
]

const MOTIVO_LABEL: Record<MotivoEgreso, string> = {
  renuncia:       "Renuncia",
  desvinculacion: "Desvinculación",
}

const MOTIVO_VARIANT: Record<MotivoEgreso, "secondary" | "destructive"> = {
  renuncia:       "secondary",
  desvinculacion: "destructive",
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const EMPLEADOS: EmpleadoOffboarding[] = [
  {
    id: "6",
    nombre: "Sofía",
    apellido: "Ruiz",
    cargo: "Account Executive",
    area: "Ventas",
    fechaEgreso: "2026-05-16",
    motivo: "renuncia",
    checklistInicial: {
      equipos:        false,
      accesos:        false,
      entrevista:     false,
      documentacion:  true,
    },
  },
  {
    id: "12",
    nombre: "Marcos",
    apellido: "Ibáñez",
    cargo: "UX Designer",
    area: "Tecnología",
    fechaEgreso: "2026-05-09",
    motivo: "desvinculacion",
    checklistInicial: {
      equipos:        true,
      accesos:        true,
      entrevista:     false,
      documentacion:  false,
    },
  },
]

// ─── State helpers ────────────────────────────────────────────────────────────

type AllChecklists = Record<string, Record<ChecklistKey, boolean>>

function buildInitialChecklists(empleados: EmpleadoOffboarding[]): AllChecklists {
  return Object.fromEntries(
    empleados.map((e) => [e.id, { ...e.checklistInicial }]),
  ) as AllChecklists
}

function calcProgress(checks: Record<ChecklistKey, boolean>): number {
  const done = CHECKLIST_ITEMS.filter((item) => checks[item.key]).length
  return Math.round((done / CHECKLIST_ITEMS.length) * 100)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OffboardingPage() {
  const [checklists, setChecklists] = useState<AllChecklists>(() =>
    buildInitialChecklists(EMPLEADOS),
  )

  function toggle(empleadoId: string, key: ChecklistKey) {
    setChecklists((prev) => ({
      ...prev,
      [empleadoId]: {
        ...prev[empleadoId],
        [key]: !prev[empleadoId][key],
      },
    }))
  }

  return (
    <div>
      <PageHeader
        title="Offboarding"
        description={`${EMPLEADOS.length} procesos activos`}
      />

      {EMPLEADOS.length === 0 ? (
        <EmptyState
          icon={<UserMinus />}
          title="Sin procesos activos"
          description="No hay empleados en proceso de offboarding actualmente."
        />
      ) : (
        <ul className="space-y-4" role="list">
          {EMPLEADOS.map((empleado) => {
            const checks = checklists[empleado.id]
            const pct = calcProgress(checks)

            return (
              <li key={empleado.id} className="rounded-xl border bg-card p-4 md:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {empleado.nombre} {empleado.apellido}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {empleado.cargo} · {empleado.area}
                    </p>
                  </div>
                  <Badge
                    variant={MOTIVO_VARIANT[empleado.motivo]}
                    className="shrink-0"
                  >
                    {MOTIVO_LABEL[empleado.motivo]}
                  </Badge>
                </div>

                {/* Fecha + barra de progreso */}
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Egreso: {empleado.fechaEgreso}
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

                {/* Checklist inline */}
                <ul
                  className="mt-4 divide-y divide-border"
                  role="list"
                  aria-label="Checklist de offboarding"
                >
                  {CHECKLIST_ITEMS.map(({ key, label }) => {
                    const checked = checks[key]
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-center gap-2.5 py-2.5 transition-colors hover:text-primary">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(empleado.id, key)}
                            className="size-4 shrink-0 accent-primary"
                          />
                          <span
                            className={cn(
                              "text-sm",
                              checked
                                ? "text-muted-foreground line-through decoration-muted-foreground/60"
                                : "text-foreground",
                            )}
                          >
                            {label}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
