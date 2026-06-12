"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Algo salió mal</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Ocurrió un error inesperado. Podés intentar recargar la página.
      </p>
      <Button
        variant="outline"
        className="mt-6 min-h-11 px-4"
        onClick={() => unstable_retry()}
      >
        Reintentar
      </Button>
    </div>
  )
}
