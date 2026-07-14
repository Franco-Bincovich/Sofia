"""
Importación de nómina de empleados (CSV 27 columnas, ';', latin1).

Idempotente y tolerante: dedup por DNI (crea si es nuevo, actualiza si ya existe), y clasifica
cada fila en 3 grupos — cargados OK · cargados con faltantes (email) · no cargados (falta un
obligatorio o falló la creación). Reusa Empresa/Area/EmpleadoService (validaciones + audit).
No aborta ante error de fila. Un evento de auditoría por lote. Flujo: router → service → services.
"""
import csv
import io
from uuid import UUID

from repositories.empleado_repo import EmpleadoRepo
from schemas.area import AreaCreate
from schemas.empresa import EmpresaCreate
from schemas.importacion_nomina_empleados import (
    FilaConFaltantes, FilaNoCargada, ImportacionNominaEmpleadosResult,
    build_create, build_update,
)
from services import _nomina_empleados_transforms as tx
from services._audit_payloads_rrhh import payload_importacion_nomina
from services._nomina_cesiones import NominaCesiones
from services._nomina_proyectos import NominaProyectos
from services.area_service import AreaService
from services.audit_service import AuditService
from services.empleado_service import EmpleadoService
from services.empresa_service import EmpresaService
from utils.logger import logger


class NominaEmpleadosImportService:
    def __init__(self, usuario_id: str) -> None:
        self._usuario_id = usuario_id
        self._empresas = EmpresaService()
        self._areas = AreaService()
        self._empleados = EmpleadoService()
        self._emp_repo = EmpleadoRepo()
        self._audit = AuditService()
        self._cache_empresa: dict[str, str] = {}
        self._cache_area: dict[tuple, str] = {}
        self._empresas_primadas = False
        self._areas_primadas: set[str] = set()
        self._seen_dni: set[tuple] = set()
        self._proyectos = NominaProyectos()  # proyecto por gerencia + asignación
        self._cesiones = NominaCesiones(usuario_id)  # cesión por Fecha Ingreso Reconocida

    def importar(self, contenido: str, archivo: str) -> ImportacionNominaEmpleadosResult:
        """Procesa el CSV completo. Reporta cada fila en su grupo; no aborta por errores."""
        reader = csv.DictReader(io.StringIO(contenido), delimiter=";")
        error_headers = tx.validar_headers(reader.fieldnames)
        if error_headers:
            return ImportacionNominaEmpleadosResult(
                total=0, creados=0, actualizados=0, cargados_ok=0, con_faltantes=[],
                no_cargados=[FilaNoCargada(fila=1, empleado="(encabezados)", motivo=error_headers)])

        creados = actualizados = cargados_ok = total = 0
        con_faltantes: list[FilaConFaltantes] = []
        no_cargados: list[FilaNoCargada] = []
        for n, raw in enumerate(reader, start=2):
            total += 1
            try:
                nuevo, faltan = self._procesar_fila(raw, n)
            except Exception as exc:  # noqa: BLE001 — el lote no aborta por una fila
                no_cargados.append(FilaNoCargada(fila=n, empleado=tx.identificador(raw), motivo=str(exc)))
                continue
            creados += 1 if nuevo else 0
            actualizados += 0 if nuevo else 1
            if faltan:
                con_faltantes.append(FilaConFaltantes(fila=n, empleado=tx.identificador(raw), faltan=faltan))
            else:
                cargados_ok += 1

        self._audit.registrar(**payload_importacion_nomina(
            archivo, creados, actualizados, len(con_faltantes), len(no_cargados), self._usuario_id))
        logger.info("Import nómina empleados", extra={
            "archivo": archivo, "creados": creados, "actualizados": actualizados,
            "con_faltantes": len(con_faltantes), "no_cargados": len(no_cargados)})
        return ImportacionNominaEmpleadosResult(
            total=total, creados=creados, actualizados=actualizados, cargados_ok=cargados_ok,
            con_faltantes=con_faltantes, no_cargados=no_cargados)

    def _procesar_fila(self, raw: dict, fila: int) -> tuple[bool, list]:
        """Crea o actualiza (dedup DNI) el empleado de una fila. Devuelve (es_nuevo, faltantes).
        Lanza ValueError con motivo si falta un obligatorio o el DNI está duplicado en el archivo."""
        f = tx.parsear_fila(raw)
        faltan_oblig = tx.obligatorios_faltantes(f)
        if faltan_oblig:
            raise ValueError(f"falta {', '.join(faltan_oblig)}")

        empresa_id = self._empresa_id(f["_empresa"])
        area_id = self._area_id(empresa_id, f["_area"])
        clave = (empresa_id, f["dni"])
        if clave in self._seen_dni:
            raise ValueError("DNI duplicado dentro del archivo (fila previa ya procesada)")
        self._seen_dni.add(clave)

        email = f["email_corporativo"] if tx.email_valido(f["email_corporativo"]) else None
        faltan = [] if email else ["email"]

        existente = self._emp_repo.find_by_dni(f["dni"], UUID(empresa_id))
        if existente:
            self._empleados.update_empleado(
                UUID(existente.id), build_update(f, UUID(area_id), email), UUID(empresa_id), self._usuario_id)
            empleado_id, nuevo = existente.id, False
        else:
            empleado = self._empleados.create_empleado(
                build_create(f, UUID(empresa_id), UUID(area_id), email), self._usuario_id, UUID(empresa_id))
            empleado_id, nuevo = empleado.id, True

        if f["fecha_baja"]:
            self._emp_repo.dar_de_baja(empleado_id, f["fecha_baja"], UUID(empresa_id))
        # Gerencia → proyecto (crear/reusar) + asignar el empleado (no si está de baja).
        self._proyectos.resolver_y_asignar(
            empresa_id, f["gerencia"], empleado_id, f["roles"][0], bool(f["fecha_baja"]))
        # Fecha Ingreso Reconocida → cesión (idempotente por fecha, best-effort).
        self._cesiones.crear_si_falta(empleado_id, empresa_id, f["fecha_ingreso_reconocida"])
        return nuevo, faltan

    def _empresa_id(self, nombre: str) -> str:
        """Crea o reusa la empresa por nombre normalizado (guarda el nombre original). Cachea."""
        clave = tx.normalizar_nombre(nombre)
        if not self._empresas_primadas:
            for e in self._empresas.list_empresas().items:
                self._cache_empresa.setdefault(tx.normalizar_nombre(e.nombre), e.id)
            self._empresas_primadas = True
        if clave not in self._cache_empresa:
            empresa = self._empresas.create_empresa(EmpresaCreate(nombre=nombre.strip()), self._usuario_id)
            self._cache_empresa[clave] = empresa.id
        return self._cache_empresa[clave]

    def _area_id(self, empresa_id: str, nombre: str) -> str:
        """Crea o reusa el área por (empresa, nombre normalizado). Cachea."""
        clave = (empresa_id, tx.normalizar_nombre(nombre))
        if empresa_id not in self._areas_primadas:
            for a in self._areas.get_areas(empresa_id):
                self._cache_area.setdefault((empresa_id, tx.normalizar_nombre(a.nombre)), a.id)
            self._areas_primadas.add(empresa_id)
        if clave not in self._cache_area:
            area = self._areas.create_area(
                AreaCreate(empresa_id=empresa_id, nombre=nombre.strip()), self._usuario_id)
            self._cache_area[clave] = area.id
        return self._cache_area[clave]
