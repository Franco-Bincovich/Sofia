# HR Karstec — Sofia

Plataforma interna de gestión del ciclo de vida del empleado.

## Requisitos

- Python 3.11+
- Node.js 20+
- Cuenta en Supabase (proyecto creado con los 4 buckets: `documentos`, `cvs`, `avatars`, `reportes`)
- API key de Anthropic
- API key de Resend

## Instalación

```bash
git clone https://github.com/Franco-Bincovich/Sofia
cd Sofia
cp .env.example .env  # completar todos los valores
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install pre-commit
pre-commit install
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Cómo correr

| Servicio | Comando | URL |
|---------|---------|-----|
| Backend | `cd backend && uvicorn main:app --reload` | http://localhost:8000 |
| Frontend | `cd frontend && npm run dev` | http://localhost:3000 |
| Health check | — | http://localhost:8000/health |

## Tests

```bash
# Backend
cd backend && pytest tests/ -v

# Linting
cd backend && ruff check . --fix && ruff format .
cd frontend && npm run lint
```

## Documentación interna

- `CLAUDE.md` — contexto del proyecto para Claude Code
- `docs/RRHH/BASES-DE-DESARROLLO.md` — arquitectura y bases de desarrollo
- `docs/RRHH/ORDEN-Y-LEGIBILIDAD.md` — convenciones de código
- `docs/RRHH/SEGURIDAD-PENTEST.md` — seguridad y vulnerabilidades
- `docs/RRHH/UX-UI.md` — diseño de interfaces
- `docs/ARCHITECTURE.md` — decisiones de arquitectura del proyecto
- `docs/CHANGELOG.md` — historial de cambios
