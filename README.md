# AptoPH

SaaS para la administración de conjuntos de propiedad horizontal.

## Estructura

```
apps/
  api/             Backend — AdonisJS 7 + Lucid (PostgreSQL)          :3333
  web/             App web de residentes — Vue 3 + Vite + Pinia        :5173
  backoffice/      Backoffice (administración, consejo, contador…)    :5174
  landing/         Landing pública con SEO (prerenderizada)            :5175
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
# Requiere PostgreSQL local con las bases `aptoph` y `aptoph_test` creadas
cp apps/api/.env.example apps/api/.env   # si no existe; luego: node ace generate:key
pnpm db:migrate
pnpm --filter @aptoph/api exec node ace db:seed   # datos demo
pnpm dev            # levanta api + ambas webs + shared en watch
```

## Scripts de la raíz

| Script | Descripción |
| --- | --- |
| `pnpm dev` | Todas las apps JS en modo desarrollo |
| `pnpm dev:api` / `dev:web` / `dev:backoffice` / `dev:landing` | Una app concreta (más sus dependencias) |
| `pnpm build` | Build de todo |
| `pnpm lint` / `typecheck` / `test` | Calidad en todo el monorepo |
| `pnpm db:migrate` | Migraciones de la API |

Para ejecutar comandos dentro de una app: `pnpm --filter @aptoph/api exec node ace make:model Unit`.

## Base de datos

| | Valor |
| --- | --- |
| Host | `127.0.0.1:5432` |
| Usuario / contraseña | Los de tu instalación local (`DB_USER` / `DB_PASSWORD` en `apps/api/.env`) |
| Bases | `aptoph` (dev), `aptoph_test` (tests) |

## Correo (SMTP · Mailjet)

Configurado con `@adonisjs/mail` en `apps/api/config/mail.ts`. Completa en `apps/api/.env`:

| Variable | Valor |
| --- | --- |
| `SMTP_HOST` / `SMTP_PORT` | `in-v3.mailjet.com` / `587` (STARTTLS obligatorio; `465` usa TLS directo) |
| `SMTP_USERNAME` | API key de Mailjet |
| `SMTP_PASSWORD` | Secret key de Mailjet |
| `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` | Remitente, que debe estar validado en Mailjet |

Los enlaces de los correos (invitaciones, recuperar contraseña, confirmar correo) usan
`BACKOFFICE_URL` y `RESIDENTS_URL`. Los límites de intentos se guardan según `LIMITER_STORE`
(`database` en dev/prod, `memory` en tests).

Verificar: `pnpm --filter @aptoph/api exec node ace mail:test tu@correo.com`

Plantillas: `apps/api/resources/views/emails/` (usan `components/email_layout.edge`) y clases en `apps/api/app/mails/`.

## Usuarios de desarrollo

Tras `node ace db:seed` (contraseña `password123`), en el conjunto *Reservas del Bosque*:

| Correo | Rol |
| --- | --- |
| `admin@aptoph.test` | Administración (lectura y escritura en el backoffice) |
| `vigilante@aptoph.test` | Vigilancia (solo lectura en el backoffice) |
| `residente@aptoph.test` | Residente + consejo de administración |

Conjunto grande para pruebas locales, **Conjunto Grande**: 5 torres de 20 pisos, 8 apartamentos
por piso (800 unidades, códigos `101`–`2008`) y coeficientes de copropiedad que suman 1. Lo crea
`database/seeders/conjunto_grande_seeder.ts`, que solo se ejecuta en `development` y también
corre con `node ace db:seed`. Para ejecutarlo solo:

```bash
pnpm --filter @aptoph/api exec node ace db:seed --files database/seeders/conjunto_grande_seeder.ts
```

| Correo (contraseña `password123`) | Rol |
| --- | --- |
| `admin@conjuntogrande.test` | Administración |
| `residente@conjuntogrande.test` | Residente, propietario de Torre 1 · 101 |

La unidad 101 trae además un familiar, dos vehículos, una mascota y dos cuotas de administración
(la del mes anterior abonada y vencida, la del mes actual pendiente) para ver la app de residentes.

### Conjunto demo público

`demo_seeder` crea **Altos del Parque (Demo)**: 3 torres, 72 apartamentos, parqueaderos y depósitos,
con registros en todos los módulos (ocupantes, vehículos, mascotas, cuotas, pagos, zonas comunes y
reservas, comunicados, PQRS, visitas, paquetes, documentos y auditoría). Las credenciales se publican
en la landing (sección «Demo»):

| Correo (contraseña `demo1234`) | Acceso |
| --- | --- |
| `admin@demo.test` | Backoffice, administración |
| `residente@demo.test` | App web, propietario de Torre 1 · 302 |

Corre en `development` y `production`, y en cada ejecución borra y recrea los datos del conjunto
demo (los usuarios demo solo pertenecen a ese conjunto).

## Backoffice (`apps/backoffice`)

Vue 3 + [droni-kit](https://www.npmjs.com/package/@dronico/droni-kit) + Tailwind 4. Inicio de sesión
(`/login`) y registro de conjuntos nuevos (`/registro`) con correo y contraseña contra la API, que
entrega un access token. La URL de la API está en `apps/backoffice/.env.development`.

Módulos: inicio (indicadores), unidades (+ ocupantes), torres y personas (personal y residentes).
Todo el personal del backoffice puede consultar; solo la administración puede crear, editar y eliminar.

## App de residentes (`apps/web`)

Vue 3 + droni-kit con la marca AptoPH. El residente inicia sesión con correo y contraseña y ve
su conjunto, sus unidades con el saldo, y el detalle de cada unidad: estado de cuenta (cobros
abiertos y vencidos), quiénes viven ahí, vehículos y mascotas. Solo ve las unidades donde es ocupante
activo (la API responde 404 para las demás). Detalles en [apps/web/README.md](apps/web/README.md).

## Landing (`apps/landing`)

Página pública de AptoPH, prerenderizada en el build para SEO (Open Graph, JSON-LD, sitemap).
Ajusta `VITE_SITE_URL` en `apps/landing/.env.production` con el dominio real antes de publicar.
Detalles en [apps/landing/README.md](apps/landing/README.md).

## Planes, registro y prueba gratis

Precio por unidad privada al mes, antes de IVA, con todas las funciones (plan **Completo**).
`packages/shared/src/billing.ts` es la única fuente para API, backoffice y landing:

| Tamaño del conjunto | Precio por unidad |
| --- | --- |
| Hasta 200 unidades | $300 |
| De 201 a 500 unidades | $400 |
| Más de 500 unidades | $500 |

Todas las unidades pagan el precio del tramo que corresponde al tamaño del conjunto. Mínimo $50.000
al mes; el pago anual cuesta 10 meses (2 gratis). El plan **Empresarial** (administradoras con varias
copropiedades) es a la medida.

Flujo: landing (`#precios`) → `admin…/registro?plan=completo&unidades=…` (backoffice) →
`POST /api/v1/auth/signup` crea usuario, conjunto (`trial`), rol de administración y suscripción de
prueba por 30 días, envía el correo de bienvenida y devuelve la sesión iniciada → panel con la guía
de primeros pasos. Desde **Plan** el administrador solicita la activación (llega
un correo a `SALES_EMAIL`); tras recibir el pago:

```bash
node ace subscription:activate <slug-del-conjunto> [--plan=completo] [--cycle=annual]
```

## Despliegue (DigitalOcean App Platform)

Una sola app (`aptoph`, región `nyc`) definida en [`.do/app.yaml`](.do/app.yaml), con buildpack Node.js.
Cada push a `main` despliega solo.

| Dominio | Componente | Plan |
| --- | --- | --- |
| `aptoph.com` | landing (estático) | gratis |
| `web.aptoph.com` | app de residentes (estático) | gratis |
| `admin.aptoph.com` | backoffice (estático) | gratis |
| `api.aptoph.com` | API AdonisJS | 512 MB, $5/mes |
| — | PostgreSQL 18 administrado `aptoph-db` (nyc1), base `aptoph` | $15/mes |

Antes de cada despliegue, el job `migrate` corre las migraciones y `demo_seeder`, que reinicia el
conjunto demo público. Los secretos (`APP_KEY`, `SMTP_*`) solo viven cifrados en la app: para
cambiar la configuración parte de `doctl apps spec get <id>` en vez de reenviar `.do/app.yaml`, que
tiene marcadores `__…__` en su lugar.

## Documentación

- [Modelo de datos](docs/database-model.md)
- [Autenticación (access tokens)](docs/authentication.md)
- [Finanzas y contabilidad](docs/finance.md)
- [Identidad de marca AptoPH](branding/README.md) — logos, colores, tipografía y tokens
