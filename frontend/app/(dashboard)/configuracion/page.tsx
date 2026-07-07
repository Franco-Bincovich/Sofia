"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, KeyRound, Lock, LogOut, Unlink, UserCircle } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { CambiarPasswordForm } from "@/components/features/usuarios/CambiarPasswordForm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { clearSession, getSession } from "@/services/api"
import {
  disconnectIntegracion,
  fetchIntegraciones,
  getGoogleAuthUrl,
  saveAnthropicKey,
  saveZernioKey,
} from "@/services/integraciones"
import type { Integracion } from "@/services/integraciones"
import { ROL_LABEL, type Session } from "@/types/auth"

// ── Manejador del callback OAuth (necesita Suspense por useSearchParams) ──────

function OAuthPopupHandler() {
  const searchParams = useSearchParams()
  const oauth = searchParams.get("oauth")

  useEffect(() => {
    if (!oauth) return
    try {
      if (window.opener) {
        window.opener.postMessage(
          { type: "oauth_complete", provider: oauth },
          window.location.origin,
        )
        window.close()
      }
    } catch {
      // opener podría estar bloqueado; no hace nada
    }
  }, [oauth])

  return null
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [integraciones, setIntegraciones] = useState<Integracion[]>([])
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState("")
  const [savingKey, setSavingKey] = useState(false)
  const [zernioKey, setZernioKey] = useState("")
  const [savingZernioKey, setSavingZernioKey] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false)

  const load = async () => {
    try {
      const data = await fetchIntegraciones()
      setIntegraciones(data)
    } catch {
      // muestra estado desconectado si falla
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSession(getSession())
    load()

    const handleMessage = (e: MessageEvent<{ type: string; provider: string }>) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === "oauth_complete" && e.data.provider === "google") {
        load()
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const google = integraciones.find((i) => i.tipo === "google")
  const anthropic = integraciones.find((i) => i.tipo === "anthropic")
  const zernio = integraciones.find((i) => i.tipo === "zernio")

  const handleGoogleConnect = async () => {
    setConnectingGoogle(true)
    try {
      const { auth_url } = await getGoogleAuthUrl()
      window.open(auth_url, "google_oauth", "width=600,height=700")
    } finally {
      setConnectingGoogle(false)
    }
  }

  const handleGoogleDisconnect = async () => {
    setDisconnectingGoogle(true)
    try {
      await disconnectIntegracion("google")
      await load()
    } catch {
      toast.error("No se pudo desconectar la cuenta de Google. Intentá de nuevo.")
    } finally {
      setDisconnectingGoogle(false)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return
    setSavingKey(true)
    try {
      await saveAnthropicKey(apiKey.trim())
      setApiKey("")
      await load()
    } catch {
      toast.error("No se pudo guardar la clave de API. Intentá de nuevo.")
    } finally {
      setSavingKey(false)
    }
  }

  const handleSaveZernioKey = async () => {
    if (!zernioKey.trim()) return
    setSavingZernioKey(true)
    try {
      await saveZernioKey(zernioKey.trim())
      setZernioKey("")
      await load()
    } catch {
      toast.error("No se pudo guardar la clave de Zernio. Intentá de nuevo.")
    } finally {
      setSavingZernioKey(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    router.push("/login")
  }

  return (
    <>
      <Suspense fallback={null}>
        <OAuthPopupHandler />
      </Suspense>

      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Configuración"
          description="Conectá tus cuentas y administrá tu perfil"
        />

        <div className="mt-6 space-y-4">
          {/* ── Google / Gmail ────────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-border">
                <span className="text-lg font-bold text-[#4285F4]">G</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Google / Gmail</h2>
                  {google?.connected && (
                    <Badge variant="secondary" className="ml-auto">
                      <CheckCircle2 className="mr-1 size-3" />
                      Conectado
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Conectá tu cuenta de Gmail para recibir y procesar emails de candidatos
                  automáticamente
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            {loading ? (
              <div className="h-9 animate-pulse rounded-md bg-muted" />
            ) : google?.connected ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{google.email_cuenta}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoogleDisconnect}
                  disabled={disconnectingGoogle}
                >
                  <Unlink className="mr-2 size-4" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button onClick={handleGoogleConnect} disabled={connectingGoogle}>
                <span className="mr-2 font-bold text-[#4285F4]">G</span>
                {connectingGoogle ? "Abriendo…" : "Conectar con Google"}
              </Button>
            )}
          </div>

          {/* ── Anthropic / IA ────────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-50 ring-1 ring-border">
                <KeyRound className="size-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Inteligencia Artificial (Anthropic)</h2>
                  {anthropic?.connected && (
                    <Badge variant="secondary" className="ml-auto">
                      <CheckCircle2 className="mr-1 size-3" />
                      Configurada
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Si tenés tu propia API key de Anthropic podés usarla. Si no, el sistema
                  usa la key compartida.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              {anthropic?.connected && (
                <p className="text-sm text-muted-foreground">
                  Key actual:{" "}
                  <span className="font-mono tracking-widest">••••••••</span>
                </p>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="api-key" className="mb-1.5 block text-sm">
                    {anthropic?.connected ? "Nueva key (reemplaza la actual)" : "API Key"}
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-ant-…"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSaveApiKey}
                  disabled={savingKey || !apiKey.trim()}
                >
                  {savingKey ? "Guardando…" : anthropic?.connected ? "Actualizar" : "Guardar"}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Zernio / LinkedIn ────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0A66C2]/10 ring-1 ring-border">
                <span className="text-sm font-bold text-[#0A66C2]">Z</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Zernio (LinkedIn)</h2>
                  {zernio?.connected && (
                    <Badge variant="secondary" className="ml-auto">
                      <CheckCircle2 className="mr-1 size-3" />
                      Configurado
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Conectá tu cuenta de{" "}
                  <a
                    href="https://zernio.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Zernio
                  </a>{" "}
                  para publicar vacantes en LinkedIn y otras redes automáticamente.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              {zernio?.connected && (
                <p className="text-sm text-muted-foreground">
                  Key actual:{" "}
                  <span className="font-mono tracking-widest">••••••••</span>
                </p>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="zernio-key" className="mb-1.5 block text-sm">
                    {zernio?.connected ? "Nueva API key (reemplaza la actual)" : "API Key de Zernio"}
                  </Label>
                  <Input
                    id="zernio-key"
                    type="password"
                    placeholder="zrn_…"
                    value={zernioKey}
                    onChange={(e) => setZernioKey(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSaveZernioKey}
                  disabled={savingZernioKey || !zernioKey.trim()}
                >
                  {savingZernioKey ? "Guardando…" : zernio?.connected ? "Actualizar" : "Guardar"}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Cambiar contraseña ────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-border">
                <Lock className="size-5 text-primary" />
              </div>
              <h2 className="font-semibold">Cambiar contraseña</h2>
            </div>

            <Separator className="my-4" />

            <CambiarPasswordForm forced={false} />
          </div>

          {/* ── Perfil de usuario ─────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-border">
                <UserCircle className="size-5 text-primary" />
              </div>
              <h2 className="font-semibold">Mi perfil</h2>
            </div>

            <Separator className="my-4" />

            {session ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="mt-0.5 font-medium">
                      {session.user.nombre} {session.user.apellido}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="mt-0.5 font-medium">{session.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rol</p>
                    <p className="mt-0.5 font-medium">
                      {ROL_LABEL[session.user.rol] ?? session.user.rol}
                    </p>
                  </div>
                </div>
                <Separator />
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 size-4" />
                  Cerrar sesión
                </Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                Cerrar sesión
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
