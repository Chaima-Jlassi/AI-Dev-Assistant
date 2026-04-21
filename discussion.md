# PostgreSQL connection guide (from this project config)

From `docker-compose.yml`, the PostgreSQL container uses:
- **Host port**: `5432`
- **Database**: `POSTGRES_DB` (default: `ai_dev_assistant`)
- **User**: `POSTGRES_USER` (default: `postgres`)
- **Password**: `POSTGRES_PASSWORD` (default: `postgres`)

From `server/.env.example`, there is a local template with `DB_PORT=5432`.

## Do I need to install psql locally?

No. Since your PostgreSQL container is already running, you can use the `psql` client **inside the container image**.

Use:

```bash
docker exec -it ai-dev-postgres psql -U postgres -d ai_dev_assistant
```

This is the easiest option and is a smart choice for quick queries/admin work.

You can also run one-shot SQL without interactive shell:

```bash
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant -c "SELECT now();"
```

## What about a Python virtual environment?

Yes, you can use a venv + Python DB driver (for example `psycopg`) **if your goal is writing scripts/app code**.
It is not the best option just to manually inspect DB quickly.

### If you still want Python (no local psql)

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install psycopg[binary]
python -c "import psycopg; conn=psycopg.connect('postgresql://postgres:postgres@localhost:5432/ai_dev_assistant'); cur=conn.cursor(); cur.execute('select now()'); print(cur.fetchone()); conn.close()"
```

## Connecting to your friend’s DB from your PC

If the DB is on your friend’s machine, `localhost` on your PC will not reach it. You need:
1. Friend machine IP/hostname reachable from your network (or VPN/tunnel).
2. PostgreSQL configured for remote clients (`listen_addresses`).
3. `pg_hba.conf` rule allowing your IP/user/database.
4. Firewall/router allowing inbound DB port.
5. Correct credentials and actual port mapping they used.

### Run these on your friend PC first (exact commands)

```bash
docker ps --filter "name=ai-dev-postgres"
docker port ai-dev-postgres 5432
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant -c "SHOW listen_addresses;"
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant -c "SELECT current_database(), current_user;"
```

If `docker port` returns `0.0.0.0:5432`, your side can use port `5432`.

### Connect from your PC without installing psql (Dockerized client)

```bash
docker run --rm -it postgres:16-alpine psql -h FRIEND_PC_IP -p 5432 -U postgres -d ai_dev_assistant
```

## Missing info I need from you to finalize one exact remote command

1. `FRIEND_PC_IP` (for example `192.168.x.x`)
2. Result of `docker port ai-dev-postgres 5432` from friend PC
3. Confirmation that firewall allows that port

After you send these, the final command line will be fully concrete with no unresolved values.

## Saved pending question (to fill later)

Please send:
1. Friend PC IPv4 address
2. Output of `docker port ai-dev-postgres 5432` from friend PC
3. Whether inbound firewall on that port is allowed

## Can you connect if you are not on the same network?

Yes, but only if you create a network path between both machines.

Important clarification:
- `psql` is only a **client tool**.
- The actual DB server is PostgreSQL running in the `ai-dev-postgres` container.
- A DB is **not automatically reachable from internet** just because PostgreSQL exists.

### Safe and practical options

1. **VPN between both PCs** (recommended: Tailscale/ZeroTier/WireGuard)
   - After VPN is up, use the friend VPN IP with:
   ```bash
   docker run --rm -it postgres:16-alpine psql -h FRIEND_VPN_IP -p 5432 -U postgres -d ai_dev_assistant
   ```

2. **SSH tunnel** (recommended when friend has SSH reachable)
   - On your PC:
   ```bash
   ssh -L 15432:localhost:5432 FRIEND_SSH_USER@FRIEND_PUBLIC_IP
   ```
   - In another terminal on your PC:
   ```bash
   docker run --rm -it postgres:16-alpine psql -h host.docker.internal -p 15432 -U postgres -d ai_dev_assistant
   ```

3. **Direct public exposure of PostgreSQL port** (possible but least safe)
   - Needs router port-forward + strict firewall + strong password + TLS + `pg_hba.conf` restrictions.
   - Avoid this unless you must.

## Migrate friend DB to your PC (dump/restore)

Yes, it is possible and common. Standard workflow is: **dump on friend PC -> transfer file -> restore on your PC**.

1. On friend PC (export SQL dump):
```bash
docker exec -t ai-dev-postgres pg_dump -U postgres -d ai_dev_assistant > backup.sql
```

2. Transfer `backup.sql` to your PC.

3. On your PC (import into your running DB):
```bash
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant < backup.sql
```

If you need everything (all DBs + roles), use `pg_dumpall` instead of `pg_dump`.

## Steps to create and access the project database (from docker-compose)

Below are the exact DB values used by `docker-compose.yml`:

- **Container name**: `ai-dev-postgres`
- **DB name**: `ai_dev_assistant` (from `POSTGRES_DB`, default)
- **DB user**: `postgres` (from `POSTGRES_USER`, default)
- **DB password**: `postgres` (from `POSTGRES_PASSWORD`, default)
- **Host port**: `5432`
- **Server-to-DB host inside Docker network**: `postgres`

### 1. (Optional) Set custom DB credentials in `.env`

If you want values different from defaults, create/update `.env` in the project root:

```powershell
POSTGRES_DB=ai_dev_assistant
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

If this file is missing, Docker will use the defaults shown above.

### 2. Start the PostgreSQL service

```powershell
docker compose up -d postgres
```

### 3. Verify PostgreSQL is healthy

```powershell
docker ps --filter "name=ai-dev-postgres"
docker exec -i ai-dev-postgres pg_isready -U postgres -d ai_dev_assistant
```

### 4. Create the database manually (only if needed)

`POSTGRES_DB` is created automatically on first initialization.  
Use this only if you need to create another DB or recreate after changes:

```powershell
docker exec -i ai-dev-postgres psql -U postgres -d postgres -c "CREATE DATABASE ai_dev_assistant;"
```

### 5. Connect and confirm

```powershell
docker exec -it ai-dev-postgres psql -U postgres -d ai_dev_assistant
```

Then run:

```sql
SELECT current_database(), current_user;
```

Expected result:
- `current_database = ai_dev_assistant`
- `current_user = postgres`

## Local verification run (executed now)

You asked whether step 4 is required after completing steps 1 to 3.

**Answer:** you do **not** need step 4 in your current state, because the database already exists and is reachable.

### Commands executed

```powershell
docker ps --filter "name=ai-dev-postgres" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
docker exec -i ai-dev-postgres pg_isready -U postgres -d ai_dev_assistant
docker exec -i ai-dev-postgres psql -U postgres -d postgres -tAc "SELECT datname FROM pg_database WHERE datname='ai_dev_assistant';"
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant -tAc "SELECT current_database(), current_user;"
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

### Actual results

- Container status: `ai-dev-postgres` is **Up (healthy)** and mapped on `0.0.0.0:5432->5432/tcp`
- Readiness check: `/var/run/postgresql:5432 - accepting connections`
- DB existence check returned: `ai_dev_assistant`
- Identity query returned: `ai_dev_assistant|postgres`
- Public tables count: `1`

### Comment

Your DB is already created and working correctly.  
Step 4 (`CREATE DATABASE ai_dev_assistant;`) is only needed if:
- you are creating a different database name, or
- this database was dropped and must be recreated.

## How to check the DB content

Use these commands to inspect what is inside `ai_dev_assistant`.

### Option A: interactive mode (best for exploration)

Open psql:

```powershell
docker exec -it ai-dev-postgres psql -U postgres -d ai_dev_assistant
```

Inside psql, run:

```sql
\dt
```
- Lists all tables in the current database.

```sql
\d+ users
```
- Shows table structure (replace `users` with your table name).

```sql
SELECT * FROM users LIMIT 20;
```
- Shows sample rows (replace `users` with your table name).

Exit:

```sql
\q
```

### Option B: one-shot commands from PowerShell

List all public tables:

```powershell
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant -c "\dt"
```

Count rows in a table:

```powershell
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant -c "SELECT COUNT(*) FROM users;"
```

Preview first 20 rows:

```powershell
docker exec -i ai-dev-postgres psql -U postgres -d ai_dev_assistant -c "SELECT * FROM users LIMIT 20;"
```

### Quick interpretation

- If `\dt` shows tables, the schema exists.
- If `SELECT COUNT(*)` returns a number > 0, data was inserted.
- If `SELECT * ... LIMIT 20` returns rows, your DB content is available and queryable.
