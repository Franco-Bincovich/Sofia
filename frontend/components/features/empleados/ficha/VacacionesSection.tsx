"use client"

import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Section } from "@/components/features/empleados/ficha/_primitives"
import { fetchVacacionesEmpleado } from "@/services/vacaciones"
import type { EstadoVacacion, SolicitudVacaciones } from "@/types/vacaciones"

// Mismo lenguaje y colores que el módulo de Vacaciones.
const ESTADO_LABELS: Record<EstadoVacacion, string> = {
  planificada: "Planificada",
  tomada: "Tomada",
  cancelada: "Cancelada",
}
const ESTADO_VARIANTS: Record<EstadoVacacion, "default" | "secondary" | "destructive"> = {
  planificada: "default",
  tomada: "secondary",
  cancelada: "destructive",
}

/**
 * Sección autoabastecida: vacaciones de un empleado en su ficha.
 * Fetchea el endpoint dedicado (GET /vacaciones/empleado/{id}) y maneja
 * loading/error/vacío. Solo lectura; la gestión vive en el módulo de Vacaciones.
 */
export function VacacionesSection({ empleadoId }: { empleadoId: string }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudVacaciones[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!empleadoId) return
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchVacacionesEmpleado(empleadoId)
      .then((res) => { if (!cancelled) setSolicitudes(res.items) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [empleadoId])

  return (
    <Section title="Vacaciones">
      <div className="col-span-full">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            No se pudieron cargar las vacaciones.
          </p>
        ) : solicitudes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin vacaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudes.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{s.fecha_desde}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.fecha_hasta}</TableCell>
                    <TableCell>{s.dias}</TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VARIANTS[s.estado]}>{ESTADO_LABELS[s.estado]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Section>
  )
}
