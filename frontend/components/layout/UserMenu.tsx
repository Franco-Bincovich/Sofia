"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, LogOut, Settings } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { clearSession, getSession } from "@/services/api"
import { ROL_LABEL, type UserInfo } from "@/types/auth"

/** Menú de usuario: lee el usuario real de la sesión y cablea el logout. */
export function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    setUser(getSession()?.user ?? null)
  }, [])

  function handleLogout() {
    clearSession()
    router.replace("/login")
  }

  const nombre = user ? `${user.nombre} ${user.apellido}`.trim() : "Sin sesión"
  const iniciales =
    (user ? `${user.nombre[0] ?? ""}${user.apellido[0] ?? ""}`.toUpperCase() : "") || "HR"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar size="sm">
          <AvatarFallback>{iniciales}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col text-left">
          <span className="truncate text-sm font-medium">{nombre}</span>
          <span className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        {user && (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {ROL_LABEL[user.rol]}
          </DropdownMenuLabel>
        )}
        <DropdownMenuItem onClick={() => router.push("/configuracion")}>
          <Settings className="size-4" />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/cambiar-password")}>
          <KeyRound className="size-4" />
          Cambiar contraseña
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
