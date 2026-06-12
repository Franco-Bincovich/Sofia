"use client"

import type { SolicitudVacaciones } from "@/types/vacaciones"

export type CategoriaVisual = "pedida" | "vacaciones" | "semana_free" | "dia_free" | "permiso"

export const CATEGORY_COLORS: Record<CategoriaVisual, string> = {
  pedida:      "bg-amber-400/80",
  vacaciones:  "bg-emerald-500/70",
  semana_free: "bg-violet-500/70",
  dia_free:    "bg-cyan-500/70",
  permiso:     "bg-rose-500/70",
}

const LEGEND_ITEMS: { cat: CategoriaVisual; label: string }[] = [
  { cat: "vacaciones",  label: "Vacaciones gozadas" },
  { cat: "pedida",      label: "Vacaciones pedidas" },
  { cat: "semana_free", label: "Semana free"        },
  { cat: "dia_free",    label: "Día free"           },
  { cat: "permiso",     label: "Permiso especial"   },
]

/** Mapea tipo + estado de una solicitud a la categoría visual del mapa. */
export function deriveVisualCategory(s: SolicitudVacaciones): CategoriaVisual {
  if (s.tipo === "semana_free") return "semana_free"
  if (s.tipo === "dia_free") return "dia_free"
  if (s.tipo === "permiso_especial") return "permiso"
  // tipo "vacaciones": distinguir pedida (planificada) vs gozada (tomada)
  return s.estado === "planificada" ? "pedida" : "vacaciones"
}

export function MapaLeyenda() {
  return (
    <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      {LEGEND_ITEMS.map(({ cat, label }) => (
        <span key={cat} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 shrink-0 rounded-sm ${CATEGORY_COLORS[cat]}`} />
          {label}
        </span>
      ))}
    </div>
  )
}
