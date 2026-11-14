# ApartaDock

SaaS para la administración de conjuntos de propiedad horizontal.

## Estructura

```
apps/
  api/             Backend — AdonisJS 7 + Lucid (PostgreSQL)          :3333
  web-residents/   App web de residentes — Vue 3 + Vite + Pinia        :5173
  web-admin/       Backoffice (administración, consejo, contador…)    :5174
  mobile/          App móvil de residentes — Flutter (fuera del workspace pnpm)
docs/              Documentación del proyecto (modelo de datos, decisiones)
packages/
  shared/          Tipos/constantes TS compartidos (roles, contratos)
```

Monorepo con **pnpm workspaces** + **Turborepo**.

## Requisitos

- Node >= 24.12 (`.nvmrc`)
- pnpm 12
- PostgreSQL 18+ instalado localmente
- Flutter SDK (para `apps/mobile`)

## Primeros pasos

```bash
pnpm install
# Requiere PostgreSQL local con las bases `apartadock` y `apartadock_test` creadas
cp apps/api/.env.example apps/api/.env   # si no existe; luego: node ace generate:key
pnpm db:migrate
pnpm --filter @apartadock/api exec node ace db:seed   # clientes OAuth + datos demo
pnpm dev            # levanta api + ambas webs + shared en watch
```

## Scripts de la raíz

| Script | Descripción |
| --- | --- |
| `pnpm dev` | Todas las apps JS en modo desarrollo |
| `pnpm dev:api` / `dev:residents` / `dev:admin` | Una app concreta (más sus dependencias) |
| `pnpm build` | Build de todo |
| `pnpm lint` / `typecheck` / `test` | Calidad en todo el monorepo |
| `pnpm db:migrate` | Migraciones de la API |

Para ejecutar comandos dentro de una app: `pnpm --filter @apartadock/api exec node ace make:model Unit`.

## Base de datos

| | Valor |
| --- | --- |
| Host | `127.0.0.1:5432` |
| Usuario / contraseña | Los de tu instalación local (`DB_USER` / `DB_PASSWORD` en `apps/api/.env`) |
| Bases | `apartadock` (dev), `apartadock_test` (tests) |

## Correo (SMTP · Mailjet)

Configurado con `@adonisjs/mail` en `apps/api/config/mail.ts`. Completa en `apps/api/.env`:

| Variable | Valor |
| --- | --- |
| `SMTP_HOST` / `SMTP_PORT` | `in-v3.mailjet.com` / `587` (STARTTLS obligatorio; `465` usa TLS directo) |
| `SMTP_USERNAME` | API key de Mailjet |
| `SMTP_PASSWORD` | Secret key de Mailjet |
| `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` | Remitente, que debe estar validado en Mailjet |

Verificar: `pnpm --filter @apartadock/api exec node ace mail:test tu@correo.com`

Plantillas: `apps/api/resources/views/emails/` (usan `components/email_layout.edge`) y clases en `apps/api/app/mails/`.

## Usuarios de desarrollo

Tras `node ace db:seed` (contraseña `password123`), en el conjunto *Reservas del Bosque*:

| Correo | Rol |
| --- | --- |
| `admin@apartadock.test` | Administración (lectura y escritura en el backoffice) |
| `vigilante@apartadock.test` | Vigilancia (solo lectura en el backoffice) |
| `residente@apartadock.test` | Residente + consejo de administración |

## Backoffice (`apps/web-admin`)

Vue 3 + [droni-kit](https://www.npmjs.com/package/@dronico/droni-kit) + Tailwind 4. Inicia sesión con
OAuth (PKCE) contra la API; la configuración está en `apps/web-admin/.env.development`.

Módulos: inicio (indicadores), unidades (+ ocupantes), torres y personas (personal y residentes).
Todo el personal del backoffice puede consultar; solo la administración puede crear, editar y eliminar.

## Documentación

- [Modelo de datos](docs/database-model.md)
- [Autenticación (OAuth 2.1 + PKCE)](docs/authentication.md)
