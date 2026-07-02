"use client"

import { useState } from "react"
import { Check, Copy, KeyRound } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PasswordRevealModalProps {
  open: boolean
  username: string
  password: string
  onClose: () => void
}

/**
 * Muestra la contraseña temporal UNA sola vez tras crear el usuario, con botón Copiar
 * y aviso de que no se vuelve a mostrar. La lista de usuarios se refresca al cerrar este modal.
 */
export function PasswordRevealModal({ open, username, password, onClose }: PasswordRevealModalProps) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(password)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* si el navegador bloquea el portapapeles, el usuario copia manualmente */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            Usuario creado
          </DialogTitle>
          <DialogDescription>
            Contraseña temporal de <span className="font-medium text-foreground">{username}</span>.
            La deberá cambiar en su primer ingreso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
          <code className="flex-1 break-all font-mono text-sm">{password}</code>
          <Button type="button" variant="outline" size="sm" className="min-h-9 shrink-0" onClick={copiar}>
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiado ? "Copiada" : "Copiar"}
          </Button>
        </div>

        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          Guardala ahora: no se vuelve a mostrar.
        </p>

        <DialogFooter>
          <Button type="button" className="min-h-11" onClick={onClose}>
            Entendido, cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
