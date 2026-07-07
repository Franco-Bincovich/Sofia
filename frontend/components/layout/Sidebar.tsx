"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { UserMenu } from "@/components/layout/UserMenu"
import { EmpresaSelector } from "@/components/layout/EmpresaSelector"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { NavItem } from "@/components/layout/NavItem"
import { NavGroup } from "@/components/layout/NavGroup"
import { DASHBOARD_ITEM, NAV_GROUPS, type NavLink } from "@/components/layout/nav-config"
import { getRol, puede } from "@/services/permisos"
import type { UserRol } from "@/types/auth"

/** Label del grupo que contiene la ruta activa, o null (para abrirlo por defecto). */
function grupoDeRuta(pathname: string): string | null {
  const g = NAV_GROUPS.find((grp) =>
    grp.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`)),
  )
  return g?.label ?? null
}

/** ¿El rol puede ver este item? Gating de sección (existente) + gating opcional por rol (soloRol).
 *  Sin soloRol → solo cuenta la sección (retrocompat). rol=null (pre-mount) → un item con soloRol
 *  no se muestra (null no está en ninguna lista), evitando flash hasta conocer el rol. */
function itemVisible(item: NavLink, rol: UserRol | null): boolean {
  const seccionOk = item.seccion === null || (rol !== null && puede(rol, item.seccion, item.accion ?? "read"))
  const rolOk = !item.soloRol || (rol !== null && item.soloRol.includes(rol))
  return seccionOk && rolOk
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [rol, setRol] = useState<UserRol | null>(null)
  const pathname = usePathname()
  // Acordeón: un solo grupo abierto. Arranca en el que contiene la ruta activa.
  const [openGroup, setOpenGroup] = useState<string | null>(() => grupoDeRuta(pathname))

  // El rol se lee tras montar (localStorage) para no romper la hidratación SSR.
  useEffect(() => {
    setRol(getRol())
  }, [])

  // Grupos con sus items filtrados por permiso; se descartan los que quedan vacíos.
  const visibleGroups = NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.filter((i) => itemVisible(i, rol)),
  })).filter((g) => g.items.length > 0)

  const closeMobile = () => setMobileOpen(false)
  const toggleGroup = (label: string) => setOpenGroup((cur) => (cur === label ? null : label))
  const dashActivo = pathname === DASHBOARD_ITEM.href || pathname.startsWith(`${DASHBOARD_ITEM.href}/`)

  return (
    <>
      {/* Hamburger — solo mobile */}
      <button
        className="fixed left-4 top-4 z-50 flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border transition-colors hover:bg-sidebar-accent lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-hidden="true" onClick={closeMobile} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar ring-1 ring-sidebar-border transition-transform duration-200",
          "lg:relative lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header: logo + tema + cerrar */}
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground"
            onClick={closeMobile}
          >
            <Building2 className="size-5 text-primary" />
            <span>HR Karstec</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent lg:hidden"
              onClick={closeMobile}
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <Separator />

        <div className="px-0 pt-2">
          <EmpresaSelector />
        </div>

        <Separator />

        {/* Navegación: Dashboard fijo + grupos colapsables */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1" role="list">
            <li>
              <NavItem
                href={DASHBOARD_ITEM.href}
                label={DASHBOARD_ITEM.label}
                icon={DASHBOARD_ITEM.icon}
                isActive={dashActivo}
                onClick={closeMobile}
              />
            </li>
            {visibleGroups.map((g) => (
              <NavGroup
                key={g.label}
                label={g.label}
                items={g.items}
                open={openGroup === g.label}
                onToggle={() => toggleGroup(g.label)}
                pathname={pathname}
                onNavigate={closeMobile}
              />
            ))}
          </ul>
        </nav>

        <Separator />

        <div className="p-3">
          <UserMenu />
        </div>
      </aside>
    </>
  )
}
