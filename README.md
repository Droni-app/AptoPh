# ApartaDock

SaaS para la administración de conjuntos de propiedad horizontal.

## Estructura

```
apps/
  api/             Backend — AdonisJS 7 + Lucid (PostgreSQL)          :3333
  web-residents/   App web de residentes — Vue 3 + Vite + Pinia        :5173
  web-admin/       Backoffice (administración, consejo, contador…)    :5174
  mobile/          App móvil de residentes — Flutter (fuera del workspace pnpm)
packages/
  shared/          Tipos/constantes TS compartidos (roles, contratos)
docker/            Scripts de inicialización de servicios locales
```

Monorepo con **pnpm workspaces** + **Turborepo**.

## Requisitos

- Node >= 24.12 (`.nvmrc`)
- pnpm 12
- Docker (para PostgreSQL)
- Flutter SDK (para `apps/mobile`)

## Primeros pasos

```bash
pnpm install
pnpm db:up          # PostgreSQL 17 en localhost:5433 (crea también apartadock_test)
cp apps/api/.env.example apps/api/.env   # si no existe; luego: node ace generate:key
pnpm db:migrate
pnpm dev            # levanta api + ambas webs + shared en watch
```

## Scripts de la raíz

| Script | Descripción |
| --- | --- |
| `pnpm dev` | Todas las apps JS en modo desarrollo |
| `pnpm dev:api` / `dev:residents` / `dev:admin` | Una app concreta (más sus dependencias) |
| `pnpm build` | Build de todo |
| `pnpm lint` / `typecheck` / `test` | Calidad en todo el monorepo |
| `pnpm db:up` / `db:down` | Levantar/bajar PostgreSQL |
| `pnpm db:migrate` | Migraciones de la API |

Para ejecutar comandos dentro de una app: `pnpm --filter @apartadock/api exec node ace make:model Unit`.

## Base de datos

| | Valor |
| --- | --- |
| Host | `127.0.0.1:5433` |
| Usuario / contraseña | `apartadock` / `apartadock` |
| Bases | `apartadock` (dev), `apartadock_test` (tests) |
