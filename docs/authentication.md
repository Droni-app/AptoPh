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
| `POST /api/v1/auth/password/forgot` | — | `{ email, app }`: envía el enlace (siempre `204`) |
| `POST /api/v1/auth/password/reset` | — | `{ token, password, device? }`: cambia la contraseña, cierra todas las sesiones y abre una nueva |
| `POST /api/v1/auth/email/verify` | — | `{ token }`: confirma el correo (`204`, o `400` si el enlace no sirve) |
| `GET /api/v1/invitations/:token` | — | Vista previa de una invitación (conjunto, rol, quién invitó, si debe crear contraseña) |
| `POST /api/v1/invitations/accept` | — | `{ token, device?, fullName?, password? }` → sesión + `tenantId` + `role` |
| `PATCH /api/v1/account/profile` | Bearer | Nombre, celular y documento (el correo no se cambia) |
| `PUT /api/v1/account/password` | Bearer | `{ currentPassword, password }`; cierra las demás sesiones |
| `GET /api/v1/account/sessions` | Bearer | Sesiones abiertas, la actual primero |
| `DELETE /api/v1/account/sessions/:id` · `DELETE /api/v1/account/sessions` | Bearer | Cierra una sesión o todas las demás |
| `POST /api/v1/account/email/verification` | Bearer | `{ app }`: reenvía el enlace de confirmación |

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
`Portal de residentes`…) y es lo que ve la persona en «Mi perfil › Sesiones abiertas».

## Límites de intentos (`@adonisjs/limiter`, `start/limiter.ts`)

| Qué | Límite | Clave |
| --- | --- | --- |
| Login | 5 fallos en 15 min → bloqueo de 15 min (aunque luego acierte) | correo + IP; un login correcto limpia los fallos |
| Correo de recuperación | 3 en 15 min | correo |
| Correo de confirmación | 3 por hora | usuario |
| Registro de conjuntos | 5 por hora | IP |
| Endpoints públicos con token (reset, verify, invitaciones) | 20 en 15 min | IP |

Responde `429` con `{ errors: [{ message: "Demasiados intentos. Vuelve a intentarlo en N minutos.", retryAfter }] }`.
`LIMITER_STORE=database` (tabla `rate_limits`) en dev/prod y `memory` en tests. `trustProxy` está
activo para leer la IP real detrás del balanceador de DigitalOcean.

## Tokens de un solo uso

`user_tokens` guarda recuperación de contraseña (1 hora) y confirmación de correo (3 días). Las
invitaciones usan `enrollments.invitation_token_hash` (7 días). En la base solo queda el SHA-256
del token; el valor en claro solo viaja en el enlace del correo. Al emitir uno nuevo se borran los
anteriores sin usar, y al consumirlo se bloquea la fila (`FOR UPDATE`) para que no se use dos veces.

Los enlaces apuntan a la app correcta según `app` (`backoffice` → `BACKOFFICE_URL`, `web` →
`RESIDENTS_URL`): `/restablecer-contrasena`, `/verificar-correo` e `/invitacion`, con `?token=`.

## Invitaciones

- Una invitación es un `enrollment` con `status = invited`. Si el correo no tiene cuenta se crea el
  usuario **sin contraseña** (`users.password` es nullable); `verifyPassword` devuelve `false` para
  esas cuentas, así que no pueden entrar hasta aceptar.
- Al invitar un ocupante desde la unidad (`occupantId`) se vincula `unit_occupants.user_id`, y el
  residente ve su unidad en cuanto acepta.
- Aceptar crea la contraseña (si hace falta), marca el correo como confirmado y activa el rol.
- Estados que maneja la administración: `active` ⇄ `suspended`, y `revoked` (retirar acceso o
  cancelar invitación). Nadie puede cambiar su propio acceso ni dejar el conjunto sin administración.
  Si la persona se queda sin ningún rol activo se cierran todas sus sesiones.

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
| `app/controllers/auth/auth_controller.ts` | Login, registro y logout |
| `app/validators/auth/auth.ts`, `app/validators/auth/signup.ts` | Validación de los formularios |
| `app/services/auth/signup_service.ts` | Alta del conjunto en una transacción |
| `app/models/auth/user.ts` | `User.accessTokens` (`DbAccessTokensProvider`, prefijo `oat_`) |
| `config/auth.ts` | Guard `api` (tokens) y duración del token |
| `app/middleware/tenant_middleware.ts` | Resolución del tenant activo |
| `tests/functional/auth/auth.spec.ts`, `tests/functional/auth/signup.spec.ts` | Tests |

Seguridad:

- Los tokens se guardan sólo como hash en `auth_access_tokens`; el valor completo se entrega una vez.
- Contraseñas con el hash por defecto de AdonisJS (scrypt).
- Sin cookies: no hace falta protección CSRF, y CORS no envía credenciales.
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options` y, en producción, HSTS
  (`app/middleware/security_headers_middleware.ts`).

## Pendiente

- Cambio de correo con confirmación del correo nuevo (hoy se pide a soporte).
- Avisar por correo de un inicio de sesión desde un dispositivo nuevo.
