"use client"

import { useState } from "react"

import { fetchEmpleadosSeleccionables } from "@/services/empleados"
import {
  confirmarImportEvaluaciones, previewImportEvaluaciones,
} from "@/services/evaluacionImport"
import type { EmpleadoSeleccionable } from "@/types/empleado"
import type { ConfirmarResponse, EvaluadoConfirm, PreviewResponse } from "@/types/evaluacionImport"

type Paso = "subir" | "revisar"

// Orquesta red + estado del import. La resolución editable vive en RevisarPaso; acá solo
// el preview (con los empleados de la empresa para los selectores) y el confirmar.
export function useImportarEvaluaciones() {
  const [paso, setPaso] = useState<Paso>("subir")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PreviewResponse | null>(null)
  const [empleados, setEmpleados] = useState<EmpleadoSeleccionable[]>([])
  const [confirmando, setConfirmando] = useState(false)

  async function verPreview(empresaId: string, periodo: string, notas: File, desglose: File) {
    setCargando(true)
    setError(null)
    try {
      const [prev, emps] = await Promise.all([
        previewImportEvaluaciones(empresaId, periodo, notas, desglose),
        fetchEmpleadosSeleccionables(empresaId),
      ])
      setData(prev)
      setEmpleados(emps)
      setPaso("revisar")
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer los archivos. Revisá el formato e intentá de nuevo.")
    } finally {
      setCargando(false)
    }
  }

  async function confirmar(
    empresaId: string, periodo: string, evaluados: EvaluadoConfirm[],
  ): Promise<ConfirmarResponse> {
    setConfirmando(true)
    try {
      return await confirmarImportEvaluaciones(empresaId, periodo, evaluados)
    } finally {
      setConfirmando(false)
    }
  }

  function reiniciar() {
    setPaso("subir")
    setData(null)
    setEmpleados([])
    setError(null)
  }

  return { paso, cargando, error, data, empleados, confirmando, verPreview, confirmar, reiniciar }
}
