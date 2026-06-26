"use client"

import { useState } from "react"
import { Download, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import type { Empresa } from "@/types/empresa"

const TEMPLATE_ROWS = [
  "nombre,apellido,email_corporativo,rol,area,tipo_contrato,modalidad_trabajo,fecha_ingreso,dni,cuil,legajo",
  "Juan,Pérez,juan.perez@empresa.com,Desarrollador Senior,Tecnología,efectivo,hibrido,2024-01-15,12345678,20-12345678-9,EMP001",
].join("\n")

function downloadTemplate(): void {
  const blob = new Blob([TEMPLATE_ROWS], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "template_empleados.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export interface UploadStepProps {
  empresas: Empresa[]
  empresaId: string
  empresaLoading: boolean
  onEmpresaChange: (id: string) => void
  file: File | null
  onFile: (file: File) => void
  onError: (msg: string) => void
  error: string
  loading: boolean
  onCancel: () => void
  onPreview: () => void
}

/** Paso 1: elegir empresa destino + cargar el archivo CSV. */
export function UploadStep(props: UploadStepProps) {
  const { empresas, empresaId, empresaLoading, onEmpresaChange, file, onFile, onError, error, loading, onCancel, onPreview } = props
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.toLowerCase().endsWith(".csv")) onFile(dropped)
    else onError("Solo se aceptan archivos .csv")
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) onFile(selected)
    e.target.value = ""
  }

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Empresa destino <span className="text-destructive">*</span>
          </label>
          {empresaLoading ? (
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
          ) : (
            <select
              value={empresaId}
              onChange={(e) => onEmpresaChange(e.target.value)}
              className="min-h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Seleccioná una empresa...</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          )}
          <p className="text-xs text-muted-foreground">
            Todos los empleados importados se asignarán a esta empresa. Las áreas disponibles también se filtran por empresa.
          </p>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={[
            "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3",
            "rounded-xl border-2 border-dashed p-6 transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
          ].join(" ")}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("csv-file-input")?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") document.getElementById("csv-file-input")?.click() }}
        >
          <Upload className="size-8 text-muted-foreground" />
          {file ? (
            <div className="text-center">
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-medium text-foreground">Arrastrá tu archivo CSV aquí</p>
              <p className="text-sm text-muted-foreground">o hacé clic para seleccionarlo</p>
            </div>
          )}
          <input id="csv-file-input" type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        </div>

        <Button type="button" variant="outline" size="sm" className="min-h-9 gap-1.5" onClick={downloadTemplate}>
          <Download className="size-4" />
          Descargar template CSV
        </Button>

        <div className="rounded-lg border bg-muted/30 p-3 text-xs">
          <p className="mb-1.5 font-medium text-foreground">Columnas del template:</p>
          <p className="font-mono text-muted-foreground">
            nombre, apellido, email_corporativo, rol, area, tipo_contrato, modalidad_trabajo, fecha_ingreso, <strong>dni</strong>, cuil, legajo
          </p>
          <div className="mt-2 grid grid-cols-1 gap-1 text-muted-foreground sm:grid-cols-2">
            <span><strong>tipo_contrato:</strong> efectivo | plazo_fijo | contratado | pasantia</span>
            <span><strong>modalidad_trabajo:</strong> presencial | remoto | hibrido</span>
            <span><strong>fecha_ingreso:</strong> YYYY-MM-DD</span>
            <span><strong>area:</strong> nombre exacto del área en la empresa</span>
            <span className="sm:col-span-2">
              <strong>dni:</strong> requerido — identifica al empleado. Si ya existe en la empresa seleccionada, sus datos se actualizarán.
            </span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="button" className="min-h-11" disabled={!file || !empresaId || loading} onClick={onPreview}>
          {loading ? (<><Loader2 className="size-4 animate-spin" />Procesando...</>) : "Vista previa"}
        </Button>
      </DialogFooter>
    </>
  )
}
