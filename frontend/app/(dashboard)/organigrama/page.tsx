"use client"

import { useEffect, useState } from "react"
import { FileDown, Users, X } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fetchOrganigrama } from "@/services/organigrama"
import type { AreaNodoAPI, EmpleadoNodoAPI } from "@/types/organigrama"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nombre: string, apellido: string): string {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase()
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrgSkeleton() {
  return (
    <div className="flex flex-col items-center pt-4">
      <div className="h-16 w-36 animate-pulse rounded-xl bg-muted" />
      <div className="h-8 w-px bg-muted" />
      <div className="flex items-start">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative flex flex-col items-center px-4">
            <div className="h-8 w-px bg-muted" />
            <div className="h-[108px] w-36 animate-pulse rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Users className="size-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">No hay áreas cargadas aún.</p>
    </div>
  )
}

// ─── Area box (nodo del árbol) ────────────────────────────────────────────────

function AreaBox({
  area,
  isSelected,
  onClick,
}: {
  area: AreaNodoAPI
  isSelected: boolean
  onClick: () => void
}) {
  const resp = area.responsable

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-36 flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center",
        "cursor-pointer select-none transition-all duration-150",
        "hover:border-primary/40 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "border-primary shadow-md ring-2 ring-primary/20",
      )}
    >
      {resp ? (
        <>
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials(resp.nombre, resp.apellido)}
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-semibold leading-tight text-foreground">
              {resp.nombre} {resp.apellido}
            </span>
            {resp.cargo && (
              <span className="text-[0.65rem] leading-tight text-muted-foreground">
                {resp.cargo}
              </span>
            )}
            <span className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-primary/80">
              {area.nombre}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Users className="size-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-semibold text-foreground">{area.nombre}</span>
            <span className="text-[0.65rem] text-muted-foreground">Sin responsable</span>
          </div>
        </>
      )}
      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
        {area.total_empleados} {area.total_empleados === 1 ? "colaborador" : "colaboradores"}
      </span>
    </button>
  )
}

// ─── Panel lateral ────────────────────────────────────────────────────────────

function ColaboradoresPanel({
  area,
  onClose,
}: {
  area: AreaNodoAPI
  onClose: () => void
}) {
  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-background shadow-xl ring-1 ring-border sm:w-80"
      role="dialog"
      aria-label={`Colaboradores de ${area.nombre}`}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{area.nombre}</h2>
          <p className="text-xs text-muted-foreground">
            {area.total_empleados} {area.total_empleados === 1 ? "colaborador" : "colaboradores"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cerrar panel"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {area.responsable && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Responsable
            </p>
            <ColabRow empleado={area.responsable} highlight />
          </div>
        )}

        {area.empleados.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Colaboradores
            </p>
            <ul className="space-y-2" role="list">
              {area.empleados.map((emp) => (
                <li key={emp.id}>
                  <ColabRow empleado={emp} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {!area.responsable && area.empleados.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
        )}
      </div>
    </aside>
  )
}

function ColabRow({
  empleado,
  highlight = false,
}: {
  empleado: EmpleadoNodoAPI
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        highlight && "border-primary/30 bg-primary/5",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          highlight ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {initials(empleado.nombre, empleado.apellido)}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {empleado.nombre} {empleado.apellido}
        </p>
        {empleado.cargo && (
          <p className="text-xs text-muted-foreground">{empleado.cargo}</p>
        )}
      </div>
    </div>
  )
}

// ─── Árbol visual ─────────────────────────────────────────────────────────────

function OrgTree({
  areas,
  selectedId,
  onSelect,
}: {
  areas: AreaNodoAPI[]
  selectedId: string | null
  onSelect: (area: AreaNodoAPI) => void
}) {
  const isOnly = areas.length === 1

  return (
    <div className="flex flex-col items-center">
      {/* Nodo raíz */}
      <div className="flex w-36 flex-col items-center justify-center gap-0.5 rounded-xl border bg-card px-4 py-3 text-center shadow-sm">
        <span className="text-sm font-bold text-foreground">Empresa</span>
        <span className="text-xs text-muted-foreground">Organización</span>
      </div>

      {/* Línea vertical hacia la fila de áreas */}
      <div className="h-8 w-px bg-border" />

      {/* Fila de áreas con conectores en T */}
      <div className="flex items-start">
        {areas.map((area, i) => {
          const isFirst = i === 0
          const isLast = i === areas.length - 1

          return (
            <div key={area.id} className="relative flex flex-col items-center px-4">
              {/* Línea horizontal del T (no se dibuja si hay un solo nodo) */}
              {!isOnly && (
                <div
                  className={cn(
                    "absolute top-0 h-px bg-border",
                    isFirst && "left-1/2 right-0",
                    isLast && "left-0 right-1/2",
                    !isFirst && !isLast && "inset-x-0",
                  )}
                />
              )}

              {/* Línea vertical desde el T hacia el box */}
              <div className="h-8 w-px bg-border" />

              <AreaBox
                area={area}
                isSelected={selectedId === area.id}
                onClick={() => onSelect(area)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrganigramaPage() {
  const [areas, setAreas] = useState<AreaNodoAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AreaNodoAPI | null>(null)

  useEffect(() => {
    fetchOrganigrama()
      .then(setAreas)
      .catch(() => setError("No se pudo cargar el organigrama."))
      .finally(() => setLoading(false))
  }, [])

  function handleSelect(area: AreaNodoAPI) {
    setSelected((prev) => (prev?.id === area.id ? null : area))
  }

  return (
    <div>
      <PageHeader
        title="Organigrama"
        description="Estructura organizacional por área"
        action={
          <Button variant="outline" className="min-h-11">
            <FileDown className="size-4" />
            Exportar PDF
          </Button>
        }
      />

      <div className="overflow-x-auto pb-8">
        <div className="inline-flex min-w-full justify-center pt-4">
          {loading && <OrgSkeleton />}

          {!loading && error && (
            <p className="py-10 text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && areas.length === 0 && <EmptyState />}

          {!loading && !error && areas.length > 0 && (
            <OrgTree
              areas={areas}
              selectedId={selected?.id ?? null}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>

      {selected && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40"
            aria-hidden="true"
            onClick={() => setSelected(null)}
          />
          <ColaboradoresPanel area={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  )
}
