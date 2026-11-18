# Autenticación: access tokens de AdonisJS

Las apps (backoffice, portal de residentes y, más adelante, la app móvil) se autentican con correo y
contraseña contra la API. La API responde con un **access token opaco** de `@adonisjs/auth`
(`oat_…`), que la app envía en cada petición:

```
Authorization: Bearer oat_…
```

No hay OAuth, ni sesiones con cookies, ni refresh tokens. El token dura **30 días**
(`ACCESS_TOKEN_TTL` en `apps/api/config/auth.ts`). Cuando vence, la API responde `401` y la app
vuelve a la pantalla de inicio de sesión.

## Endpoints

| Endpoint | Requiere | Descripción |
| --- | --- | --- |
| `POST /api/v1/auth/login` | — | `{ email, password, device? }` → sesión |
| `POST /api/v1/auth/signup` | — | Registro de un conjunto nuevo (ver abajo) → sesión + `tenantId` |
| `POST /api/v1/auth/logout` | Bearer | Revoca el token usado en la petición (`204`) |
| `GET /api/v1/account/profile` | Bearer | Usuario autenticado |
| `GET /api/v1/account/tenants` | Bearer | Conjuntos con enrollment activo y roles en cada uno |
| `GET /api/v1/tenant` | Bearer + `X-Tenant-Id` | Contexto del tenant activo y roles |

Respuesta de `login` y `signup` (`AuthSession` en `@aptoph/shared`):

```json
{
  "data": {
    "token": "oat_MTIz.…",
    "type": "bearer",
    "expiresAt": "2026-12-18T15:00:00.000Z",
    "user": { "id": "…", "fullName": "Ana Administradora", "email": "admin@aptoph.test", "…": "…" }
  }
}
```

Errores:

- `400`: correo o contraseña incorrectos. El mensaje es el mismo si el correo no existe, y la
  verificación tarda lo mismo (`User.verifyCredentials`), para no revelar qué correos tienen cuenta.
- `403`: cuenta bloqueada.
- `422`: validación, con el formato habitual `{ errors: [{ field, message, rule }] }`.

`device` es una etiqueta libre que queda en `auth_access_tokens.name` (`Backoffice`,
`Portal de residentes`…), útil para listar o cerrar sesiones por dispositivo en el futuro.

## Registro (`POST /api/v1/auth/signup`)

Lo usa la pantalla `/registro` del backoffice (el landing enlaza ahí con `?plan=…&unidades=…`).
Campos: `tenantName`, `city`, `units`, `plan` (solo planes de autoservicio), `fullName`, `email`,
`phone`, `password` (mínimo 8), `acceptTerms` (`true`).

En una sola transacción crea el usuario, el conjunto (`trial`), el rol de administración y la
suscripción de prueba por 30 días. Después encola el correo de bienvenida, que enlaza a
`BACKOFFICE_URL`, y devuelve la sesión ya iniciada con el `tenantId` del conjunto nuevo. Si el
correo ya tiene cuenta, responde `422` en el campo `email`.

## Tenant activo

Las rutas de un tenant usan `middleware.tenant()`. Ese middleware:

1. Lee `X-Tenant-Id` (UUID). Si falta o no es válido, responde `400`.
2. Exige un enrollment `active` del usuario en ese tenant, vigente por `starts_on` / `ends_on`,
   y que el tenant esté en `trial` o `active`. Si no se cumple, responde `403`.
3. Deja `ctx.tenant` y `ctx.tenantRoles` disponibles para controladores y policies.

Para restringir por rol: `middleware.tenant({ roles: ['administrator', 'council_member'] })`.

## En las apps web

`src/stores/auth.ts` (backoffice y web) guarda `{ token, expiresAt }` en `localStorage`
(`aptoph.backoffice.session`, `aptoph.web.session`). `src/lib/http.ts` agrega el header
`Authorization` y, ante un `401`, borra la sesión y lleva a `/login?redirect=…`. Cerrar sesión llama
a `POST /api/v1/auth/logout` y borra el token local.

## Implementación

| Archivo | Rol |
| --- | --- |
| `app/controllers/auth_controller.ts` | Login, registro y logout |
| `app/validators/auth.ts`, `app/validators/signup.ts` | Validación de los formularios |
| `app/services/signup_service.ts` | Alta del conjunto en una transacción |
| `app/models/user.ts` | `User.accessTokens` (`DbAccessTokensProvider`, prefijo `oat_`) |
| `config/auth.ts` | Guard `api` (tokens) y duración del token |
| `app/middleware/tenant_middleware.ts` | Resolución del tenant activo |
| `tests/functional/auth.spec.ts`, `tests/functional/signup.spec.ts` | Tests |

Seguridad:

- Los tokens se guardan sólo como hash en `auth_access_tokens`; el valor completo se entrega una vez.
- Contraseñas con el hash por defecto de AdonisJS (scrypt).
- Sin cookies: no hace falta protección CSRF, y CORS no envía credenciales.
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options` y, en producción, HSTS
  (`app/middleware/security_headers_middleware.ts`).

## Pendiente

- Limitar intentos de login (`@adonisjs/limiter`).
- Recuperación de contraseña y aceptación de invitaciones (`enrollments.invitation_token_hash`).
- Listar y cerrar las sesiones abiertas de cada usuario.
