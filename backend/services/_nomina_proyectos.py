"""
Helper del import de nómina: crea/reusa un proyecto por cada valor de Gerencia y asigna
al empleado. Reusa ProyectosService y AsignacionesService (nada de inserts directos).

- Proyecto por gerencia: dedup por nombre normalizado dentro de la empresa (trim+case),
  cacheado + primado desde los proyectos existentes → idempotente al reimportar.
- Asignación: UNIQUE(proyecto_id, empleado_id) en DB → si ya existe, el service tira
  ASIGNACION_DUPLICADA y acá se traga (idempotente). Empleado en baja: no se asigna.
- Best-effort: un fallo de proyecto/asignación NO rompe la carga del empleado (ya creado);
  se loguea y sigue. Gerencia vacía/"NO APLICA" llega como None (limpiada en el parser) → no hace nada.
"""
from typing import Optional
from uuid import UUID

from schemas.proyectos import AsignacionCreate, ProyectoCreate
from services import _nomina_empleados_transforms as tx
from services.asignaciones_service import AsignacionesService
from services.proyectos_service import ProyectosService
from utils.errors import AppError
from utils.logger import logger


class NominaProyectos:
    def __init__(self) -> None:
        self._proyectos = ProyectosService()
        self._asignaciones = AsignacionesService()
        self._cache: dict[tuple, str] = {}      # (empresa_id, nombre_norm) -> proyecto_id
        self._primadas: set[str] = set()

    def resolver_y_asignar(
        self, empresa_id: str, gerencia: Optional[str], empleado_id: str, rol: str, es_baja: bool,
    ) -> None:
        """Crea/reusa el proyecto de la gerencia y asigna al empleado (si no está de baja).
        Gerencia None (vacía/"NO APLICA") → no hace nada. Best-effort: nunca propaga."""
        if not gerencia:
            return
        try:
            proyecto_id = self._proyecto_id(empresa_id, gerencia)
            if not es_baja:
                self._asignar(proyecto_id, empleado_id, rol, empresa_id)
        except Exception as exc:  # noqa: BLE001 — no romper la carga del empleado ya creado
            logger.warning("No se pudo crear/asignar el proyecto de gerencia", extra={
                "gerencia": gerencia, "empleado_id": empleado_id, "error": str(exc)})

    def _proyecto_id(self, empresa_id: str, nombre: str) -> str:
        """Crea o reusa el proyecto por (empresa, nombre normalizado). Guarda nombre original."""
        clave = (empresa_id, tx.normalizar_nombre(nombre))
        if empresa_id not in self._primadas:
            for p in self._proyectos.get_all(UUID(empresa_id)).items:
                self._cache.setdefault((empresa_id, tx.normalizar_nombre(p.nombre)), str(p.id))
            self._primadas.add(empresa_id)
        if clave not in self._cache:
            creado = self._proyectos.create(ProyectoCreate(empresa_id=UUID(empresa_id), nombre=nombre.strip()))
            self._cache[clave] = str(creado.id)
        return self._cache[clave]

    def _asignar(self, proyecto_id: str, empleado_id: str, rol: str, empresa_id: str) -> None:
        """Asigna el empleado al proyecto. Si ya está asignado (reimport), es idempotente."""
        try:
            self._asignaciones.asignar(
                UUID(proyecto_id),
                AsignacionCreate(empleado_id=UUID(empleado_id), rol=rol),
                UUID(empresa_id),
            )
        except AppError as exc:
            if exc.code != "ASIGNACION_DUPLICADA":
                raise  # otros errores los captura resolver_y_asignar (warning, sin romper la fila)
