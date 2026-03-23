# Backend (NestJS + Prisma)

## Banco de dados

### SQLite (padrão — sem instalação)

1. Na pasta `backend`, crie `.env` a partir do exemplo:
   ```bash
   copy .env.example .env
   ```
2. O `.env.example` já traz `DATABASE_URL="file:./dev.db"`.
3. Rode as migrations:
   ```bash
   npm run prisma:migrate
   ```
   O arquivo `prisma/dev.db` será criado e as tabelas, aplicadas.

### PostgreSQL via Docker (opcional)

1. Na **raiz do projeto** (onde está o `docker-compose.yml`):
   ```bash
   docker compose up -d
   ```
2. No `backend/prisma/schema.prisma`, troque para PostgreSQL:
   - `provider = "sqlite"` → `provider = "postgresql"`
   - Mantenha `url = env("DATABASE_URL")`
3. No `backend/.env`:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/touchpad?schema=public"
   ```
4. Rode:
   ```bash
   npm run prisma:migrate
   ```

## Rodar o backend

```bash
npm install
npm run prisma:generate
npm run prisma:migrate   # na primeira vez ou após mudar o schema
npm run dev
```

O servidor sobe em `http://localhost:3001` (ou na porta definida em `PORT`).
