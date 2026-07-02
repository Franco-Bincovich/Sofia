"use client"

import { useEffect, useState } from "react"
import { Building2, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId, setEmpresaActivaId } from "@/services/empresaStore"
import type { Empresa } from "@/types/empresa"

/**
 * Selector de empresa activa. Persiste en localStorage vía empresaStore.
 * Al cambiar, recarga la página para que todos los listados usen la nueva empresa.
 */
export function EmpresaSelector() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [current, setCurrent] = useState<string>("todas")

  useEffect(() => {
    setCurrent(getEmpresaActivaId() ?? "todas")
    fetchEmpresas()
      .then((res) => setEmpresas(res.items.filter((e) => e.activa)))
      .catch(() => {})
  }, [])

  if (empresas.length === 0) return null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setEmpresaActivaId(val === "todas" ? null : val)
    window.location.reload()
  }

  return (
    <div className="px-3 pb-2">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
          <Building2 className="size-3.5 text-sidebar-foreground/60" />
        </div>
        <select
          value={current}
          onChange={handleChange}
          aria-label="Empresa activa"
          className={cn(
            "w-full appearance-none rounded-lg border border-sidebar-border",
            "bg-sidebar-accent py-1.5 pl-7 pr-7 text-xs font-medium",
            "text-sidebar-foreground transition-colors",
            "hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "cursor-pointer",
          )}
        >
          <option value="todas">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <ChevronsUpDown className="size-3 text-sidebar-foreground/60" />
        </div>
      </div>
      {current !== "todas" && (
        <p className="text-xs text-muted-foreground mt-1 truncate px-1">
          {empresas.find((e) => e.id === current)?.nombre}
        </p>
      )}
    </div>
  )
}
