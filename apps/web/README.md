# AptoPH · App web de residentes

Portal para residentes y propietarios: inicio de sesión con OAuth 2.1 + PKCE contra la API y consulta
de la información de su conjunto.

```bash
pnpm dev:api   # API en :3333
pnpm dev:web   # esta app en http://localhost:5173
```

Usuario de prueba local (seeder `fontibon_reservado_seeder`): `residente@fontibonreservado.test` /
`password123`.

## Pantallas

| Ruta | Qué muestra | API |
| --- | --- | --- |
| `/login`, `/auth/callback` | Inicio de sesión (página alojada por la API) | `/oauth/*` |
| `/conjuntos` | Selector, si el usuario es residente en más de un conjunto | `GET /api/v1/account/tenants` |
| `/` | Conjunto (torres, unidades), mis unidades con saldo y estado (al día / pendiente / en mora) | `GET /api/v1/resident/home` |
| `/unidades/:id` | Datos de la unidad, estado de cuenta, hogar, vehículos y mascotas | `GET /api/v1/resident/units/:id` |
| `/perfil` | Datos de la cuenta y cerrar sesión | `GET /api/v1/account/profile` |

El hogar se muestra sin documentos ni datos de contacto de los demás ocupantes.

## Estructura

- `src/stores/auth.ts`: sesión OAuth (tokens en `localStorage`, refresh con rotación).
- `src/stores/tenant.ts`: conjuntos donde el usuario tiene rol `resident`; el activo va en `X-Tenant-Id`.
- `src/lib/format.ts`: dinero (COP), fechas, periodos, coeficientes y áreas en `es-CO`.
- `src/components/BrandLogo.vue`: logo de `docs/brand/logo` (versión blanca en modo oscuro).
- Estilos: Tailwind 4 + `docs/brand/tokens.css` (escala `navy`/`teal`, Outfit/Inter) y
  `docs/brand/droni-kit-theme.css` para los componentes de droni-kit.

## Variables (`.env.development`)

| Variable | Valor local |
| --- | --- |
| `VITE_API_URL` | `http://localhost:3333` |
| `VITE_OAUTH_CLIENT_ID` | `web` |
| `VITE_OAUTH_REDIRECT_URI` | `http://localhost:5173/auth/callback` |
| `VITE_OAUTH_POST_LOGOUT_REDIRECT_URI` | `http://localhost:5173/` |

## Scripts

`pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`.
