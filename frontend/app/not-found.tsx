import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">
        Página no encontrada
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        La página que buscás no existe o fue movida.
      </p>
      <Link
        href="/dashboard"
        className={buttonVariants({
          variant: "default",
          className: "mt-6 min-h-11 px-4",
        })}
      >
        Volver al dashboard
      </Link>
    </div>
  )
}
