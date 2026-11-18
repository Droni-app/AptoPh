# AptoPH · App web de residentes

Portal para residentes y propietarios: inicio de sesión con correo y contraseña contra la API y consulta
de la información de su conjunto.

```bash
pnpm dev:api   # API en :3333
pnpm dev:web   # esta app en http://localhost:5173
```

Usuario de prueba local (seeder `conjunto_grande_seeder`): `residente@conjuntogrande.test` /
`password123`.

## Pantallas

| Ruta | Qué muestra | API |
| --- | --- | --- |
| `/login` | Inicio de sesión con correo y contraseña | `POST /api/v1/auth/login` |
| `/conjuntos` | Selector, si el usuario es residente en más de un conjunto | `GET /api/v1/account/tenants` |
| `/` | Conjunto (torres, unidades), mis unidades con saldo y estado (al día / pendiente / en mora) | `GET /api/v1/resident/home` |
| `/unidades/:id` | Datos de la unidad, estado de cuenta, hogar, vehículos y mascotas | `GET /api/v1/resident/units/:id` |
| `/perfil` | Datos de la cuenta y cerrar sesión | `GET /api/v1/account/profile` |

El hogar se muestra sin documentos ni datos de contacto de los demás ocupantes.

## Estructura

- `src/stores/auth.ts`: access token de la API en `localStorage` (dura 30 días; ver `docs/authentication.md`).
- `src/stores/tenant.ts`: conjuntos donde el usuario tiene rol `resident`; el activo va en `X-Tenant-Id`.
- `src/lib/format.ts`: dinero (COP), fechas, periodos, coeficientes y áreas en `es-CO`.
- `src/components/BrandLogo.vue`: logo de `branding/logo` (versión blanca en modo oscuro).
- Estilos: Tailwind 4 + `branding/tokens.css` (escalas `brand`/`mint`/`coral`, Plus Jakarta Sans e
  Inter) y `branding/droni-kit-theme.css` (compartido con el backoffice) para los componentes de
  droni-kit.
- Ilustraciones de `branding/` en `src/assets/img`: cabeceras de Reservas, Portería y PQRS
  (`PageHeader` con `art`), la de comunidad en el login y el inicio, y los estados vacíos
  (`EmptyState`).

## Variables (`.env.development`)

| Variable | Valor local |
| --- | --- |
| `VITE_API_URL` | `http://localhost:3333` |

## Scripts

`pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`.
