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
  ui/              Sistema de diseño: componentes Vue (Tailwind 4 + íconos MDI)
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

### API por módulos

La API se organiza por módulo: `auth`, `tenants`, `legal`, `property`, `finance`, `files`, `documents`,
`amenities`, `announcements`, `tickets`, `gatehouse`, `billing` y `dashboard`.

- **Migraciones:** `apps/api/database/migrations/<módulo>/`, una tabla por archivo y solo
  `createTable`, con el esquema final. Mientras no haya datos que conservar, un cambio de esquema
  se hace editando la migración de la tabla y recreando la base (`node ace migration:fresh --seed`),
  no con `alterTable`. Las carpetas corren en el orden de `config/database.ts` (un módulo solo
  referencia tablas de los anteriores); un módulo nuevo se agrega ahí.
- **Código:** `app/<tipo>/<módulo>/…` (`controllers`, `models`, `services`, `validators`,
  `transformers`, `mails`), p. ej. `#models/billing/subscription`. Los controladores de la app de
  residentes llevan el prefijo `resident_`. Lo transversal queda en la raíz de cada tipo
  (`#services/mailer`, `#validators/helpers`, `#transformers/helpers`).
- **Pruebas:** `tests/functional/<módulo>/`; `tests/functional/resident/` prueba la app de
  residentes completa.

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

### Conjunto demo

`demo_seeder` crea **Altos del Parque (Demo)**: 3 torres, 72 apartamentos, parqueaderos y depósitos,
con registros en todos los módulos (ocupantes, vehículos, mascotas, cuotas, pagos, zonas comunes y
reservas, comunicados, PQRS, visitas, parqueaderos asignados con un sorteo abierto, parqueadero de visitantes, paquetes, documentos y auditoría):

| Correo (contraseña `demo1234`) | Acceso |
| --- | --- |
| `admin@demo.test` | Backoffice, administración |
| `residente@demo.test` | App web, propietario de Torre 1 · 302 |
| `mantenimiento@demo.test` | Backoffice, personal: solo las PQRS que tiene asignadas |
| `vigilancia@demo.test` | Backoffice, vigilancia: parqueadero de visitantes y consulta de parqueaderos |

Solo corre en `development`: producción no tiene datos demo. En cada ejecución borra y recrea los
datos del conjunto.

## Backoffice (`apps/backoffice`)

Vue 3 + `@aptoph/ui` + Tailwind 4. Inicio de sesión
(`/login`) y registro de conjuntos nuevos (`/registro`) con correo y contraseña contra la API, que
entrega un access token. La URL de la API está en `apps/backoffice/.env.development`.

Módulos: inicio (indicadores), unidades (+ ocupantes), torres y personas (personal y residentes).
Todo el personal del backoffice puede consultar; solo la administración puede crear, editar y eliminar.

## App de residentes (`apps/web`)

Vue 3 + `@aptoph/ui` con la marca AptoPH. El residente inicia sesión con correo y contraseña y ve
su conjunto, sus unidades con el saldo, y el detalle de cada unidad: estado de cuenta (cobros
abiertos y vencidos), quiénes viven ahí, vehículos y mascotas. Solo ve las unidades donde es ocupante
activo (la API responde 404 para las demás). Detalles en [apps/web/README.md](apps/web/README.md).

## Sistema de diseño (`packages/ui`)

`@aptoph/ui` reúne los componentes de las dos apps: botones, campos (`UiInput`, `UiSelect`,
`UiTextarea`, `UiCheckbox`, `UiRadio`, `UiSwitch`) dentro de `UiLabel`, que les da el `id`, el
error y la ayuda; `UiForm`, `UiCard`, `UiTable` (columnas con slot por nombre y paginación),
`UiModal`, `UiTabs`, `UiDropdown`, `UiAlert`, `UiBadge`, `UiSkeleton` y los avisos (`UiToast` +
`useToast()`). Íconos: Material Design Icons (`<i class="mdi mdi-…" />`; los props `icon` reciben
la clase, p. ej. `mdi-plus`).

Cada app importa los estilos en su CSS, después de Tailwind y los tokens de marca:

```css
@import 'tailwindcss';
@import '../../../../branding/tokens.css';
@import '@aptoph/ui/theme.css';
```

El tema define los grises con el tono azul de la marca, el modo oscuro por clase (`.dark` en
`<html>`) y escanea los componentes del paquete. El backoffice usa un menú lateral cuyas secciones
están en `apps/backoffice/src/layouts/navigation.ts` (las de finanzas incluidas).

## Documentos legales

AptoPH es un servicio de **Droni.co S.A.S.** (NIT 900.354.951). La landing publica en `/legal/`
los términos y condiciones, la política de tratamiento de datos personales (Ley 1581 de 2012), el
acuerdo de encargo del tratamiento de datos (el conjunto es Responsable de los datos de sus
residentes y Droni.co su Encargado) y la política de cookies. Los textos están en
`apps/landing/src/legal/`; los datos de la empresa, las rutas y la versión vigente de cada
documento, en `packages/shared/src/legal.ts`.

Al registrar un conjunto y al aceptar una invitación la persona marca la casilla de aceptación
(`UiLegalConsent`) y la API guarda la evidencia en `legal_acceptances`. **Al cambiar un documento**
edita su texto y sube su `version`: las aceptaciones anteriores conservan la versión que se aceptó.

Las apps enlazan a la landing con `VITE_SITE_URL` (`.env.development` / `.env.production`).

## Landing (`apps/landing`)

Página pública de AptoPH, prerenderizada en el build para SEO (Open Graph, JSON-LD, sitemap).
Ajusta `VITE_SITE_URL` en `apps/landing/.env.production` con el dominio real antes de publicar.
Detalles en [apps/landing/README.md](apps/landing/README.md).

## Planes, registro y prueba gratis

Precio por unidad privada al mes, antes de IVA, con todas las funciones (plan **Completo**).
`packages/shared/src/billing.ts` es la única fuente para API, backoffice y landing:

Un solo plan (**Completo**), pago mensual: **$500 por unidad al mes**, sin importar el tamaño del
conjunto, con un mínimo de **$50.000 al mes** (lo pagan los conjuntos de hasta 100 unidades). Sin IVA.

Flujo: landing (`#precios`) → `admin…/registro?unidades=…` (backoffice) →
`POST /api/v1/auth/signup` crea usuario, conjunto (`trial`), rol de administración y suscripción de
prueba por 30 días, envía el correo de bienvenida y devuelve la sesión iniciada → panel con la guía
de primeros pasos. Desde **Plan** el administrador solicita la activación (llega
un correo a `SALES_EMAIL`); tras recibir el pago:

```bash
node ace subscription:activate <slug-del-conjunto>   # activa o renueva un mes
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

Antes de cada despliegue, el job `migrate` corre solo las migraciones: producción arranca vacía, sin
datos demo ni seeders, y cada conjunto se crea desde el registro (`admin.aptoph.com/registro`). Los secretos (`APP_KEY`, `SMTP_*`) solo viven cifrados en la app: para
cambiar la configuración parte de `doctl apps spec get <id>` en vez de reenviar `.do/app.yaml`, que
tiene marcadores `__…__` en su lugar.

## Documentación

- [Modelo de datos](docs/database-model.md)
- [Autenticación (access tokens)](docs/authentication.md)
- [Finanzas y contabilidad](docs/finance.md)
- [Comunicados](docs/announcements.md)
- [Importar torres, unidades y personas](docs/import.md)
- [PQRS](docs/tickets.md)
- [Parqueaderos del conjunto](docs/parking.md)
- [Parqueadero de visitantes](docs/visitor-parking.md)
- [Identidad de marca AptoPH](branding/README.md) — logos, colores, tipografía y tokens
