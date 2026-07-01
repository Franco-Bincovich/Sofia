"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FormatoExport } from "@/services/api"

const OPCIONES: { formato: FormatoExport; label: string }[] = [
  { formato: "pdf", label: "PDF" },
  { formato: "excel", label: "Excel" },
  { formato: "csv", label: "CSV" },
  { formato: "word", label: "Word" },
]

/** Menú "Exportar" genérico: dispara `onExport(formato)` en los 4 formatos del motor de export. */
export function ExportMenu({ onExport }: { onExport: (formato: FormatoExport) => Promise<void> }) {
  const [exportando, setExportando] = useState(false)

  async function handle(formato: FormatoExport) {
    setExportando(true)
    try {
      await onExport(formato)
      toast.success(`Exportado en ${formato.toUpperCase()}`)
    } catch {
      toast.error("No se pudo exportar. Intentá de nuevo.")
    } finally {
      setExportando(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={exportando}
        className={cn(buttonVariants({ variant: "outline" }), "min-h-11 gap-2")}
      >
        <Download className="size-4" /> Exportar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPCIONES.map((o) => (
          <DropdownMenuItem key={o.formato} className="min-h-11" onClick={() => handle(o.formato)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
