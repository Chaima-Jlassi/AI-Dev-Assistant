# AI-Dev-Assistant
An intelligent development assistant powered by LLM &amp; MCP —  helps beginner developers with code analysis, UML generation,  unit tests, and README documentation..

## Dockerized setup (frontend + server + backend + PostgreSQL)

1. Copy the Docker env template:
   ```powershell
   Copy-Item .env.docker.example .env
   ```
2. Edit `.env` values as needed (especially `JWT_SECRET`, `POSTGRES_PASSWORD`, and optional Supabase/Ollama values).
3. Build and run everything:
   ```powershell
   docker compose up --build
   ```

### Services and ports

- Frontend (Vite): `http://localhost:15173`
- Auth server (Node/Express): `http://localhost:5000`
- PostgreSQL: `localhost:5432`
- Backend assistant (Python CLI): containerized as `backend` service with interactive TTY support.

### PostgreSQL variables used

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

The auth server DB vars are wired from these values:
- `DB_HOST=postgres`
- `DB_PORT=5432`
- `DB_NAME=${POSTGRES_DB}`
- `DB_USER=${POSTGRES_USER}`
- `DB_PASSWORD=${POSTGRES_PASSWORD}`

On server startup, database bootstrap runs automatically:
- If `DB_NAME` does not exist, it is created.
- If it already exists, creation is skipped.
- Required schema (`users` table) is ensured with idempotent SQL.
