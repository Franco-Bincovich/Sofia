"use client"

import { useRef, useState } from "react"
import { ExternalLink, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCertificadoUrl, uploadCertificado } from "@/services/capacitaciones"

interface Props {
  asignacionId: string
  hasCertificado: boolean
  canWrite: boolean
  onUploaded: () => void
}

export function CertificadoCell({ asignacionId, hasCertificado, canWrite, onUploaded }: Props) {
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleView() {
    setLoadingUrl(true)
    setError("")
    try {
      const url = await getCertificadoUrl(asignacionId)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      setError("No se pudo obtener el certificado")
    } finally {
      setLoadingUrl(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError("")
    try {
      await uploadCertificado(asignacionId, file)
      onUploaded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        {hasCertificado ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={loadingUrl}
            onClick={handleView}
            aria-label="Ver certificado"
          >
            <ExternalLink className="size-3" />
            {loadingUrl ? "..." : "Ver"}
          </Button>
        ) : null}
        {canWrite && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              aria-label={hasCertificado ? "Cambiar certificado" : "Subir certificado"}
            >
              <Upload className="size-3" />
              {uploading ? "..." : hasCertificado ? "Cambiar" : "Subir"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />
          </>
        )}
        {!hasCertificado && !canWrite && <span className="text-xs text-muted-foreground">—</span>}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
