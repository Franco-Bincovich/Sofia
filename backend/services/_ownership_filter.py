"""
Resolvers de filtrado de listados por ownership (base → + área → + empleado puntual).

Fuente ÚNICA compartida por vacaciones, ausencias y (Fase 2) el resto de los módulos
con datos de empleados — para no duplicar la intersección. La lógica vive acá; el
repo recibe una sola lista (o None).

Contrato de la CAPA BASE (services/ownership.ids_empleados_visibles):
    None  → sin restricción (admin/gerencia): ve todo.
    []    → no ve ningún empleado (fail-closed).
    [ids] → ve exactamente esos.

⚠️ Contrato de la CAPA DE FILTRO (las funciones de este módulo) = (empleado_ids, vacio).
El `None` significa DOS cosas OPUESTAS según `vacio` — mirarlo solo abre datos ajenos:
    (None,  False) → sin restricción: el caller NO filtra por empleado, ve todo.
    (None,  True)  → VACÍO / fail-closed: el caller NO debe consultar la tabla.
    ([ids], False) → restringir EXACTO a esos empleados.
"""
from typing import List, Optional, Tuple

from services.ownership import ids_empleados_visibles


def resolver_filtro_empleados(
    user_id: str, rol: str, empresa_id, area_id, repo,
) -> Tuple[Optional[List[str]], bool]:
    """
    Ownership ∩ área. Retorna (empleado_ids, vacio) — contrato de la tupla en el
    docstring del módulo (⚠️ el `None` depende de `vacio`).

    Traduce el `[]` del base a (None, True): el fail-closed pasa a viajar en `vacio`,
    NO en la lista. Intersección: si hay ownership Y area_id, devuelve solo los de
    AMBOS conjuntos (nunca la unión).

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


def resolver_empleado_ids(
    user_id: str, rol: str, empresa_id, area_id, empleado_id, repo,
) -> Tuple[Optional[List[str]], bool]:
    """
    Ownership ∩ área ∩ empleado puntual (superset de resolver_filtro_empleados).

    Retorna (empleado_ids, vacio) con el MISMO contrato de la tupla (ver módulo). Con
    empleado_id=None es IDÉNTICO a resolver_filtro_empleados. Si se provee, acota a ese
    único empleado SOLO si cae dentro del alcance de ownership.

    ⚠️ Un empleado_id FUERA del alcance del mando devuelve (None, True) = VACÍO
    (fail-closed), NO el empleado filtrado. Es intencional (un mando no ve ni gestiona
    ajenos); no lo "corrijas" pensando que es un bug.
    """
    empleado_ids, vacio = resolver_filtro_empleados(user_id, rol, empresa_id, area_id, repo)
    if empleado_id and not vacio:
        eid = str(empleado_id)
        if empleado_ids is None or eid in empleado_ids:
            empleado_ids = [eid]              # dentro del alcance → acotar a ese empleado
        else:
            empleado_ids, vacio = None, True  # fuera del alcance del mando → vacío
    return empleado_ids, vacio
