"""
Servicio del catálogo de tipos de ausencia (global, sin empresa).
Flujo: router → service → repository → DB

Extraído de AusenciasService (T18.4b) para descargar líneas del service de ausencias
tras instrumentar audit. Los tipos son globales: no pertenecen a ninguna empresa y no
se auditan acá (no son eventos críticos de T18).
"""
from typing import Optional

from repositories.tipos_ausencia_repo import TiposAusenciaRepo
from schemas.ausencias import (
    TipoAusenciaCreate, TipoAusenciaListResponse, TipoAusenciaResponse,
)
from utils.errors import AppError


class TiposAusenciaService:
    def __init__(self, repo: Optional[TiposAusenciaRepo] = None) -> None:
        self._repo = repo or TiposAusenciaRepo()

    def get_tipos(self) -> TipoAusenciaListResponse:
        """Retorna todos los tipos de ausencia activos. Catálogo global, sin filtro de empresa."""
        items = self._repo.find_all()
        return TipoAusenciaListResponse(items=items, total=len(items))

    def create_tipo(self, data: TipoAusenciaCreate) -> TipoAusenciaResponse:
        """
        Crea un tipo de ausencia nuevo disponible para todas las empresas.

        Raises:
            AppError: TIPO_NOMBRE_VACIO (422) si el nombre está en blanco.
            AppError: TIPO_DUPLICADO (422) si el nombre ya existe.
        """
        if not data.nombre.strip():
            raise AppError("El nombre del tipo no puede estar vacío", "TIPO_NOMBRE_VACIO", 422)
        try:
            return self._repo.create(data.nombre.strip())
        except AppError:
            raise
        except Exception:
            raise AppError("El tipo de ausencia ya existe", "TIPO_DUPLICADO", 422)
