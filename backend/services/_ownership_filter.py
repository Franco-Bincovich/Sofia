"""
Helper de filtrado de listados por ownership + área.

Combina en UNA sola lista de empleado_ids el criterio de ownership
(services/ownership.py) y el filtro por área. Compartido por los listados de
vacaciones y ausencias para no duplicar la intersección. El repo recibe una
única lista (o None) — la lógica de combinación vive acá, no en el repo.
"""
from typing import List, Optional, Tuple

from services.ownership import ids_empleados_visibles


def resolver_filtro_empleados(
    user_id: str, rol: str, empresa_id, area_id, repo,
) -> Tuple[Optional[List[str]], bool]:
    """
    Resuelve la lista final de empleado_ids de un listado combinando ownership y área.

    Retorna (empleado_ids, vacio):
        vacio=True        → el listado es vacío; el caller NO debe consultar la tabla.
        empleado_ids=None → sin restricción por empleado (admin/gerencia sin área).
        empleado_ids=[..] → restringir el listado a exactamente esos empleados.

    Intersección: si el usuario está acotado por ownership Y además manda area_id,
    devuelve solo los empleados presentes en ambos conjuntos (nunca la unión).

    Args:
        user_id: UUID (str) del usuario logueado.
        rol: Rol canónico (ver ROLES_VALIDOS en utils.permisos).
        empresa_id: empresa activa (None = consolidado) para acotar la resolución de área.
        area_id: filtro de área opcional (None = sin filtro de área).
        repo: EmpleadoOwnershipRepo (o doble) con find_by_user_id, ids_subordinados
              e ids_empleados_por_area.
    """
    visibles = ids_empleados_visibles(user_id, rol, repo)  # None | [] | [ids]
    if visibles == []:
        return None, True                                  # mando sin subordinados → nada
    area_ids: Optional[List[str]] = None
    if area_id:
        area_ids = repo.ids_empleados_por_area(empresa_id, area_id)
        if not area_ids:
            return None, True                              # área sin miembros → nada
    if visibles is None:
        return area_ids, False                             # admin/gerencia: manda solo el área (o nada)
    if area_ids is None:
        return visibles, False                             # mando sin filtro de área
    inter = [i for i in visibles if i in set(area_ids)]    # intersección ownership ∩ área
    return (inter, False) if inter else (None, True)
