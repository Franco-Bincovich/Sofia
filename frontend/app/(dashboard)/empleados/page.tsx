"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Upload, Users } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmpleadoModal } from "@/components/features/empleados/EmpleadoModal"
import { ImportarCSVModal } from "@/components/features/empleados/ImportarCSVModal"
import { fetchEmpleados } from "@/services/empleados"
import type { Empleado, EmpleadoListResponse } from "@/types/empleado"

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  baja: "Baja",
  licencia: "Licencia",
}

const ESTADO_VARIANTS: Record<string, "default" | "destructive" | "secondary"> = {
  activo: "default",
  baja: "destructive",
  licencia: "secondary",
}

const PAGE_SIZE = 20

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

export default function EmpleadosPage() {
  const router = useRouter()

  const [data, setData] = useState<EmpleadoListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState("")
  const [estado, setEstado] = useState("")
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const result = await fetchEmpleados(page, PAGE_SIZE, search || undefined, estado || undefined)
      setData(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [page, search, estado])

  useEffect(() => {
    load()
  }, [load])

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleEstado(value: string) {
    setEstado(value)
    setPage(1)
  }

  const items: Empleado[] = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 0

  return (
    <div>
      <PageHeader
        title="Empleados"
        description={loading ? "Cargando..." : `${total} colaboradores`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="min-h-11 gap-1.5"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" />
              Importar CSV
            </Button>
            <Button className="min-h-11" onClick={() => setNewOpen(true)}>
              <Plus />
              Nuevo empleado
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            className="pl-8"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filtrar por estado"
          className="min-h-[2rem] rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          value={estado}
          onChange={(e) => handleEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="baja">Baja</option>
          <option value="licencia">Licencia</option>
        </select>
      </div>

      {loading && <TableSkeleton />}

      {!loading && error && (
        <ErrorState action={load} />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<Users />}
          title="Sin resultados"
          description="No hay empleados que coincidan con los filtros aplicados."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Modalidad</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((emp) => (
              <TableRow
                key={emp.id}
                className="cursor-pointer"
                onClick={() => router.push(`/empleados/${emp.id}`)}
              >
                <TableCell className="font-medium">
                  {emp.nombre} {emp.apellido}
                </TableCell>
                <TableCell className="text-muted-foreground">{emp.area_nombre ?? "—"}</TableCell>
                <TableCell>{emp.cargo}</TableCell>
                <TableCell className="capitalize">{emp.modalidad_trabajo}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANTS[emp.estado] ?? "secondary"}>
                    {ESTADO_LABELS[emp.estado] ?? emp.estado}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <EmpleadoModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={() => {
          setNewOpen(false)
          load()
        }}
      />

      <ImportarCSVModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false)
          load()
        }}
      />
    </div>
  )
}
