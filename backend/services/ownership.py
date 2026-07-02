"""
Función central de ownership por fila para mandos_medios.

Concentra en UN solo lugar el criterio de "a qué empleados ve un usuario", para
poder cambiarlo en el futuro (p. ej. de superior-inmediato a área) tocando
únicamente este módulo. No accede a DB directo: recibe el repo por parámetro
(inyección), así que es testeable con un repo fake sin red.

Criterio vigente (superior inmediato):
    admin_rrhh / gerencia_lectura → sin restricción de ownership (ven todo).
    mandos_medios                 → su propio registro + subordinados directos.
    resto / desconocido           → no ve nada (fail-closed).

Los strings de rol son los canónicos de utils.permisos.ROLES_VALIDOS (mismo
patrón de comparación literal que puede()). Un rol nuevo que se sume a
ROLES_VALIDOS sin actualizar acá cae en [] (fail-closed), que es el default seguro.
"""
from typing import List, Optional


def ids_empleados_visibles(user_id: str, rol: str, repo) -> Optional[List[str]]:
    """
    Resuelve el conjunto de empleados visibles para un usuario según su rol.

    Contrato del retorno (clave para el caller — respetarlo exacto):
        None      → SIN restricción de ownership. El caller NO aplica filtro por
                    empleado y mantiene el comportamiento actual (por empresa).
                    Es el caso de admin_rrhh y gerencia_lectura. NUNCA se devuelve
                    la lista de todos los empleados: None ES la señal de "no filtrar".
        []        → el usuario NO ve ningún empleado (fail-closed). Caso de un
                    mando medio sin empleado vinculado, o un rol desconocido/None.
        [ids...]  → el usuario ve EXACTAMENTE esos empleados. Para mandos_medios:
                    su propio empleado_id + los ids de sus subordinados directos.

    Args:
        user_id: UUID (str) del usuario logueado (request.state.user["id"]).
        rol: Rol canónico del usuario (ver ROLES_VALIDOS en utils.permisos).
        repo: Repo con find_by_user_id(user_id) e ids_subordinados(emp_id)
              (EmpleadoOwnershipRepo o un doble de test).

    Returns:
        None, [] o [ids] según el contrato descrito arriba.
    """
    if rol in ("admin_rrhh", "gerencia_lectura"):
        return None
    if rol != "mandos_medios":
        return []  # rol desconocido / None → fail-closed

    empleado = repo.find_by_user_id(user_id)
    if not empleado:
        return []  # mando medio sin empleado vinculado → no ve nada

    emp_id = empleado["id"]
    return [emp_id, *repo.ids_subordinados(emp_id)]
