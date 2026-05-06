"use client"

import { cn } from "@/lib/utils"
import type { AreaId, OrgEmployee } from "@/types/organigrama"

const AREA_COLORS: Record<AreaId, string> = {
  tecnologia: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  producto:   "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  rrhh:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  general:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

interface OrgNodeProps {
  employee: OrgEmployee
  isSelected: boolean
  onSelect: (employee: OrgEmployee) => void
}

function initials(nombre: string, apellido: string): string {
  return `${nombre[0]}${apellido[0]}`.toUpperCase()
}

export function OrgNode({ employee, isSelected, onSelect }: OrgNodeProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(employee)}
      className={cn(
        "flex w-28 flex-col items-center gap-2 rounded-xl border bg-card p-3",
        "cursor-pointer select-none transition-all duration-150",
        "hover:shadow-md hover:border-primary/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "border-primary shadow-md ring-2 ring-primary/20",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          AREA_COLORS[employee.area],
        )}
      >
        {initials(employee.nombre, employee.apellido)}
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-xs font-medium leading-tight text-foreground">
          {employee.nombre} {employee.apellido}
        </span>
        <span className="text-[0.65rem] leading-tight text-muted-foreground">
          {employee.cargo}
        </span>
      </div>
    </button>
  )
}
