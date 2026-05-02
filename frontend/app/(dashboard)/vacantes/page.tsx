"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { VacanteModal } from "@/components/features/vacantes/VacanteModal"
import { fetchVacantes } from "@/services/vacantes"
import type { EstadoVacante, Vacante } from "@/types/vacantes"

const ESTADO_LABELS: Record<EstadoVacante, string> = {
  nueva: "Nueva",
  en_proceso: "En proceso",
  con_candidatos: "Con candidatos",
  cerrada: "Cerrada",
}

const ESTADO_VARIANTS: Record<EstadoVacante, "default" | "secondary" | "destructive" | "outline"> = {
  nueva: "outline",
  en_proceso: "default",
  con_candidatos: "secondary",
  cerrada: "destructive",
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

function formatFecha(raw: string | null): string {
  if (!raw) return "—"
  const d = new Date(raw)
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function VacantesPage() {
  const router = useRouter()
  const [vacantes, setVacantes] = useState<Vacante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [estadoFilter, setEstadoFilter] = useState<EstadoVacante | "">("")
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchVacantes(estadoFilter || undefined)
      setVacantes(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [estadoFilter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader
        title="Vacantes"
        description={loading ? "Cargando..." : `${vacantes.length} vacante${vacantes.length !== 1 ? "s" : ""}`}
        action={
          <Button className="min-h-11" onClick={() => setModalOpen(true)}>
            <Plus />
            Nueva vacante
          </Button>
        }
      />

      <div className="mb-4">
        <select
          aria-label="Filtrar por estado"
          className="min-h-[2rem] rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value as EstadoVacante | "")}
        >
          <option value="">Todos los estados</option>
          <option value="nueva">Nueva</option>
          <option value="en_proceso">En proceso</option>
          <option value="con_candidatos">Con candidatos</option>
          <option value="cerrada">Cerrada</option>
        </select>
      </div>

      {loading && <TableSkeleton />}

      {!loading && error && <ErrorState action={load} />}

      {!loading && !error && vacantes.length === 0 && (
        <EmptyState
          icon={<Briefcase />}
          title="Sin resultados"
          description="No hay vacantes que coincidan con el filtro seleccionado."
        />
      )}

      {!loading && !error && vacantes.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de apertura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacantes.map((vacante) => (
              <TableRow
                key={vacante.id}
                className="cursor-pointer"
                onClick={() => router.push(`/vacantes/${vacante.id}`)}
              >
                <TableCell className="font-medium">{vacante.titulo}</TableCell>
                <TableCell className="text-muted-foreground">
                  {vacante.area_nombre ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANTS[vacante.estado]}>
                    {ESTADO_LABELS[vacante.estado]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFecha(vacante.fecha_apertura ?? vacante.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <VacanteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          load()
        }}
      />
    </div>
  )
}
