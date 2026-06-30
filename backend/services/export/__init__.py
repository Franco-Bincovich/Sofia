"""Motor de export genérico (PDF/Excel/CSV/Word). Punto de entrada: build_export."""
from services.export._empaquetado import Descarga
from services.export.engine import build_export

__all__ = ["build_export", "Descarga"]
