"use client"

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    // global-error reemplaza el root layout: define su propio <html> y <body>
    // y no hereda el ThemeProvider, por eso usa estilos inline autocontenidos.
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          background: "#F8FAFC",
          color: "#0F172A",
        }}
      >
        <div style={{ maxWidth: "28rem", padding: "1rem", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>
            Error crítico
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#64748B" }}>
            Ocurrió un error que impidió cargar la aplicación.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: "1.5rem",
              minHeight: "44px",
              padding: "0 1.5rem",
              border: "none",
              borderRadius: "8px",
              background: "#1A56DB",
              color: "#FFFFFF",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  )
}
