"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload, XCircle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { confirmarImportacion, previewImportacionCSV } from "@/services/importacion"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import type { ImportacionPreview } from "@/types/importacion"
import type { Empresa } from "@/types/empresa"

// ─── Template CSV ─────────────────────────────────────────────────────────────

const TEMPLATE_ROWS = [
  "nombre,apellido,email_corporativo,cargo,rol,area,tipo_contrato,modalidad_trabajo,fecha_ingreso,dni,cuil,legajo",
  "Juan,Pérez,juan.perez@empresa.com,Desarrollador Senior,,Tecnología,efectivo,hibrido,2024-01-15,12345678,20-12345678-9,EMP001",
].join("\n")

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_ROWS], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "template_empleados.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "preview" | "confirm"

export interface ImportarCSVModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportarCSVModal({ open, onClose, onSuccess }: ImportarCSVModalProps) {
  const [step, setStep] = useState<Step>("upload")
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<ImportacionPreview | null>(null)

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setEmpresaId] = useState("")
  const [empresaLoading, setEmpresaLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmpresaLoading(true)
    fetchEmpresas()
      .then((res) => {
        const activas = res.items.filter((e) => e.activa)
        setEmpresas(activas)
        const activeId = getEmpresaActivaId()
        if (activeId && activas.some((e) => e.id === activeId)) {
          setEmpresaId(activeId)
        } else if (activas.length === 1) {
          setEmpresaId(activas[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setEmpresaLoading(false))
  }, [open])

  function resetAndClose() {
    if (loading || confirming) return
    setStep("upload")
    setFile(null)
    setPreview(null)
    setError("")
    onClose()
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.toLowerCase().endsWith(".csv")) {
      setFile(dropped)
      setError("")
    } else {
      setError("Solo se aceptan archivos .csv")
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError("")
    }
    e.target.value = ""
  }

  async function handlePreview() {
    if (!file || !empresaId) return
    setLoading(true)
    setError("")
    try {
      const result = await previewImportacionCSV(file, empresaId)
      setPreview(result)
      setStep("preview")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al procesar el archivo.")
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!preview || !empresaId) return
    setConfirming(true)
    setError("")
    try {
      await confirmarImportacion(preview.filas_validas, empresaId)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al importar empleados.")
      setConfirming(false)
    }
  }

  const validCount = preview?.filas_validas.length ?? 0
  const errorCount = preview?.errores.length ?? 0
  const updateCount = preview?.filas_validas.filter((f) => f.es_actualizacion).length ?? 0
  const newCount = validCount - updateCount
  const empresaNombre = empresas.find((e) => e.id === empresaId)?.nombre ?? ""

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose() }}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Importar empleados desde CSV"}
            {step === "preview" && "Vista previa de importación"}
            {step === "confirm" && "Confirmar importación"}
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-4 py-2">
            {/* Empresa destino */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Empresa destino <span className="text-destructive">*</span>
              </label>
              {empresaLoading ? (
                <div className="h-9 animate-pulse rounded-lg bg-muted" />
              ) : (
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="min-h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Seleccioná una empresa...</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted-foreground">
                Todos los empleados importados se asignarán a esta empresa. Las áreas disponibles también se filtran por empresa.
              </p>
            </div>

            {/* Dropzone */}
            <div
              role="button"
              tabIndex={0}
              className={[
                "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3",
                "rounded-xl border-2 border-dashed p-6 transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
              ].join(" ")}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("csv-file-input")?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  document.getElementById("csv-file-input")?.click()
                }
              }}
            >
              <Upload className="size-8 text-muted-foreground" />
              {file ? (
                <div className="text-center">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-medium text-foreground">Arrastrá tu archivo CSV aquí</p>
                  <p className="text-sm text-muted-foreground">o hacé clic para seleccionarlo</p>
                </div>
              )}
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 gap-1.5"
              onClick={downloadTemplate}
            >
              <Download className="size-4" />
              Descargar template CSV
            </Button>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <p className="mb-1.5 font-medium text-foreground">Columnas del template:</p>
              <p className="font-mono text-muted-foreground">
                nombre, apellido, email_corporativo, cargo, rol, area,
                tipo_contrato, modalidad_trabajo, fecha_ingreso, <strong>dni</strong>, cuil, legajo
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
        )}

        {/* ── STEP 2: Preview ─────────────────────────────────────────────── */}
        {step === "preview" && preview && (
          <div className="space-y-3 py-2">
            <div className="flex flex-wrap gap-4 text-sm">
              {newCount > 0 && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  {newCount} alta{newCount !== 1 ? "s" : ""} nueva{newCount !== 1 ? "s" : ""}
                </span>
              )}
              {updateCount > 0 && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                  {updateCount} actualización{updateCount !== 1 ? "es" : ""} (DNI ya existe)
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <XCircle className="size-4" />
                  {errorCount} error{errorCount !== 1 ? "es" : ""}
                </span>
              )}
            </div>

            {updateCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Las filas marcadas con <strong>Actualizará</strong> tienen un DNI ya registrado en <strong>{empresaNombre}</strong>.
                Al confirmar, los datos del empleado existente se sobrescribirán con los del CSV.
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Fila</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nombre</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">DNI</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Área</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Cargo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.filas_validas.map((fila) => (
                    <tr
                      key={`v-${fila.fila}`}
                      className={[
                        "border-b last:border-0",
                        fila.es_actualizacion ? "bg-amber-500/5" : "bg-emerald-500/5",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{fila.fila}</td>
                      <td className="px-3 py-2">
                        {fila.es_actualizacion ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3.5" />
                            Actualizará
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" />
                            Alta nueva
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">{fila.nombre} {fila.apellido}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{fila.dni}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fila.email_corporativo}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fila.area_nombre}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fila.cargo}</td>
                      <td className="px-3 py-2 text-muted-foreground">—</td>
                    </tr>
                  ))}
                  {preview.errores.map((err, idx) => (
                    <tr
                      key={`e-${err.fila}-${idx}`}
                      className="border-b bg-destructive/5 last:border-0"
                    >
                      <td className="px-3 py-2 text-muted-foreground">{err.fila}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                          <XCircle className="size-3.5" />
                          Error
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={5}>—</td>
                      <td className="px-3 py-2 text-xs text-destructive">{err.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirm ─────────────────────────────────────────────── */}
        {step === "confirm" && (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-emerald-500" />
            <p className="text-lg font-semibold text-foreground">
              {newCount > 0 && `${newCount} alta${newCount !== 1 ? "s" : ""} nueva${newCount !== 1 ? "s" : ""}`}
              {newCount > 0 && updateCount > 0 && " · "}
              {updateCount > 0 && `${updateCount} actualización${updateCount !== 1 ? "es" : ""}`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Empresa: <strong>{empresaNombre}</strong>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Los empleados nuevos se crearán con estado "activo".
              Los existentes (identificados por DNI) se actualizarán con los datos del CSV.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={resetAndClose}
            disabled={loading || confirming}
          >
            Cancelar
          </Button>

          {step === "upload" && (
            <Button
              type="button"
              className="min-h-11"
              disabled={!file || !empresaId || loading}
              onClick={handlePreview}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Vista previa"
              )}
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => { setStep("upload"); setPreview(null) }}
              >
                Volver
              </Button>
              <Button
                type="button"
                className="min-h-11"
                disabled={validCount === 0}
                onClick={() => setStep("confirm")}
              >
                Confirmar {validCount} operación{validCount !== 1 ? "es" : ""}
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setStep("preview")}
                disabled={confirming}
              >
                Volver
              </Button>
              <Button
                type="button"
                className="min-h-11"
                disabled={confirming}
                onClick={handleConfirm}
              >
                {confirming ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  "Sí, importar"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
