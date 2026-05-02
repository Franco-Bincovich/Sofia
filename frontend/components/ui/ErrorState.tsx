import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  description?: string
  action?: () => void
}

export function ErrorState({
  title = "Algo salió mal",
  description = "Ocurrió un error inesperado. Intentá de nuevo en unos instantes.",
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button variant="outline" className="mt-5 min-h-11" onClick={action}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
