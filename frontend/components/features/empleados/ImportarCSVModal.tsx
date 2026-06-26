"use client"

import { useState, useEffect } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UploadStep } from "@/components/features/empleados/import/UploadStep"
import { PreviewStep } from "@/components/features/empleados/import/PreviewStep"
import { ConfirmStep } from "@/components/features/empleados/import/ConfirmStep"
import { ResultStep } from "@/components/features/empleados/import/ResultStep"
import { confirmarImportacion, previewImportacionCSV } from "@/services/importacion"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import type { ImportacionPreview, ImportacionResult } from "@/types/importacion"
import type { Empresa } from "@/types/empresa"

type Step = "upload" | "preview" | "confirm" | "result"

const TITULO: Record<Step, string> = {
  upload: "Importar empleados desde CSV",
  preview: "Vista previa de importación",
  confirm: "Confirmar importación",
  result: "Resultado de la importación",
}

export interface ImportarCSVModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportarCSVModal({ open, onClose, onSuccess }: ImportarCSVModalProps) {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<ImportacionPreview | null>(null)
  const [result, setResult] = useState<ImportacionResult | null>(null)
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
        if (activeId && activas.some((e) => e.id === activeId)) setEmpresaId(activeId)
        else if (activas.length === 1) setEmpresaId(activas[0].id)
      })
      .catch(() => {})
      .finally(() => setEmpresaLoading(false))
  }, [open])

  // Al cerrar tras una importación, refresca la lista (la recarga ocurre al cerrar, no al confirmar).
  function resetAndClose() {
    if (loading || confirming) return
    if (result) onSuccess()
    setStep("upload")
    setFile(null)
    setPreview(null)
    setResult(null)
    setError("")
    onClose()
  }

  async function handlePreview() {
    if (!file || !empresaId) return
    setLoading(true)
    setError("")
    try {
      setPreview(await previewImportacionCSV(file, empresaId))
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
      setResult(await confirmarImportacion(preview.filas_validas, empresaId))
      setStep("result")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al importar empleados.")
    } finally {
      setConfirming(false)
    }
  }

  const validCount = preview?.filas_validas.length ?? 0
  const updateCount = preview?.filas_validas.filter((f) => f.es_actualizacion).length ?? 0
  const newCount = validCount - updateCount
  const empresaNombre = empresas.find((e) => e.id === empresaId)?.nombre ?? ""

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose() }}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITULO[step]}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <UploadStep
            empresas={empresas} empresaId={empresaId} empresaLoading={empresaLoading}
            onEmpresaChange={setEmpresaId} file={file}
            onFile={(f) => { setFile(f); setError("") }} onError={setError}
            error={error} loading={loading} onCancel={resetAndClose} onPreview={handlePreview}
          />
        )}

        {step === "preview" && preview && (
          <PreviewStep
            preview={preview} empresaNombre={empresaNombre}
            onCancel={resetAndClose} onBack={() => { setStep("upload"); setPreview(null) }}
            onContinue={() => setStep("confirm")}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            newCount={newCount} updateCount={updateCount} empresaNombre={empresaNombre}
            confirming={confirming} error={error}
            onCancel={resetAndClose} onBack={() => setStep("preview")} onConfirm={handleConfirm}
          />
        )}

        {step === "result" && result && <ResultStep result={result} onClose={resetAndClose} />}
      </DialogContent>
    </Dialog>
  )
}
