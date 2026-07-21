"use client"

import { useState } from "react"
import { toast } from "sonner"

import { useImportarEvaluaciones } from "@/hooks/useImportarEvaluaciones"
import { construirConfirmar, type Resolucion } from "@/services/evaluacionImport"
import { RevisarPaso } from "./RevisarPaso"
import { SubirPaso } from "./SubirPaso"

// Contenedor del import (4º tab). Cablea el hook con los dos pasos; el toast final vive acá.
export function ImportarEvaluacionesPanel() {
  const imp = useImportarEvaluaciones()
  const [empresaId, setEmpresaId] = useState("")
  const [periodo, setPeriodo] = useState("")

  async function onConfirmar(resoluciones: Resolucion[]) {
    if (!imp.data) return
    const evaluados = construirConfirmar(imp.data.evaluados, resoluciones)
    try {
      const r = await imp.confirmar(empresaId, periodo.trim(), evaluados)
      const pisado = r.piso_periodo_anterior ? " (reemplazó el período anterior)" : ""
      toast.success(`Importación lista: ${r.evaluados} evaluados y ${r.resultados} notas cargadas${pisado}.`)
      imp.reiniciar()
      setPeriodo("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo confirmar la importación. Intentá de nuevo.")
    }
  }

  if (imp.paso === "revisar" && imp.data) {
    return (
      <RevisarPaso
        data={imp.data}
        empleados={imp.empleados}
        periodo={periodo}
        confirmando={imp.confirmando}
        onConfirmar={onConfirmar}
        onVolver={imp.reiniciar}
      />
    )
  }

  return (
    <SubirPaso
      empresaId={empresaId}
      periodo={periodo}
      cargando={imp.cargando}
      error={imp.error}
      onEmpresa={setEmpresaId}
      onPeriodo={setPeriodo}
      onSubmit={imp.verPreview}
    />
  )
}
