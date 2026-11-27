# Notificaciones

Los avisos de lo que pasa en el conjunto llegan a la **campana** de la barra superior (portal y
backoffice) y, según las preferencias de cada persona, también por **correo** y por **push** en la
app móvil.

## Cómo funciona

Todo pasa por `NotificationService(tenant).notify(userIds, input)`
(`apps/api/app/services/notifications/notifications.ts`):

1. Crea una fila en `notifications` para cada persona. Siempre se crea, sin importar las
   preferencias.
2. Si el evento trae `email` y la persona tiene el correo activo para esa categoría, encola un
   `NotificationMail` (plantilla `emails/notification`). El pie del correo enlaza a
   `/perfil#notificaciones`.
3. Si la persona tiene el push activo, lo envía por FCM a todos sus teléfonos. Se manda en segundo
   plano y no bloquea la petición.
4. Nunca hace fallar la acción que disparó el aviso: los errores van al log.

`dedupeKey` evita avisar dos veces el mismo evento a la misma persona. Lo garantiza el índice único
parcial `(user_id, dedupe_key)` con `ON CONFLICT DO NOTHING`. Ejemplos: `due:<fecha>:<unidad>`,
`announcement:<id>`, `payment:confirmed:<id>`.

Cada notificación pertenece a una app (`web` = portal, `backoffice`). `path` es la ruta dentro de
esa app: la abren la campana, el botón del correo y el push.

## Categorías y valores por defecto

| Categoría | Qué avisa | Correo | Push |
| --- | --- | --- | --- |
| `gatehouse` Portería | Llegada de visitas (y paquetes cuando exista su registro) | no | sí |
| `finance` Pagos y cartera | Cuenta del mes, pago confirmado, rechazado o registrado, vence en 3 días; al backoffice, pago reportado | sí | sí |
| `announcements` Comunicados | Comunicado publicado | sí | no |
| `tickets` PQRS | Respuesta o cambio de estado; al backoffice, PQRS nueva, respuesta del residente, asignación | sí | sí |
| `bookings` Reservas | Solicitud, aprobación, rechazo, cancelación, depósito y recordatorio 24 h antes ([detalle](amenities.md#notificaciones-categoría-bookings)) | sí | sí |
| `parking` Parqueaderos | Sorteo abierto, resultado, cupo ofrecido o vencido, asignación, cancelación | sí | sí |

Las preferencias viven en `users.notification_preferences` (jsonb) y aplican a todos los conjuntos
de la cuenta. Si una categoría no está guardada, usa el valor por defecto
(`notificationPreferences()` en `@aptoph/shared`).

**Excepciones:**

- Los correos de seguridad y de cuenta (verificación, contraseña, invitaciones, plan) no pasan por
  este servicio y siempre se envían.
- Los comunicados con correo siguen usando su propio envío masivo (`AnnouncementMail` y el cupo
  mensual, ver [email-quota.md](email-quota.md)). Ese envío excluye a quien apagó
  `announcements.email`. La campana y el push del comunicado salen una sola vez cuando se publica
  (o cuando llega su hora, si estaba programado), marcados con `announcements.notified_at`.
- La apertura del sorteo de parqueaderos es masiva: reserva del cupo mensual solo los correos de
  quienes los tienen activos.

## Programador

`start/scheduler.ts` corre en el proceso web:

- **Cada minuto:** comunicados que llegaron a su hora (campana, push y correo).
- **Cada hora:**
  - `remindDueCharges()`: recordatorio a las unidades con saldo que vence en 3 días, una vez por
    unidad y fecha.
  - `pruneNotifications()`: borra las leídas de más de 90 días y todas las de más de un año.

## API

Campana, por conjunto (`X-Tenant-Id`), para cualquier rol:

| Método | Ruta | |
| --- | --- | --- |
| GET | `/api/v1/notifications?app=web\|backoffice&limit=20` | `{ data: AppNotification[], unread }` |
| GET | `/api/v1/notifications/unread?app=…` | `{ unread }`: lo que la campana consulta cada minuto |
| POST | `/api/v1/notifications/:id/read` | 404 si no es tuya o es de otro conjunto |
| POST | `/api/v1/notifications/read-all` | body `{ app }` |

Cuenta, sin conjunto:

| Método | Ruta | |
| --- | --- | --- |
| GET | `/api/v1/account/notification-preferences` | `{ data, devices, pushAvailable }` |
| PUT | `/api/v1/account/notification-preferences` | body `{ preferences }`, con la matriz completa |
| POST | `/api/v1/account/push-devices` | body `{ token, platform: android\|ios\|web, deviceName?, appVersion? }` → 204 |
| DELETE | `/api/v1/account/push-devices/:token` | Al cerrar sesión en la app → 204 |

## Frontend

En `@aptoph/ui`:

- `UiNotificationBell`: recibe un `client` con `list`, `unread`, `read` y `readAll` y emite
  `navigate(path)`. Consulta el contador cada 60 s y al volver a la pestaña. Cada app lo monta en
  `AppLayout` con `:key="tenant.currentId"`.
- `UiNotificationPreferences`: la matriz categoría × canal. La envuelve
  `components/account/NotificationSettings.vue` de cada app, que guarda en cada cambio. Está en
  *Mi perfil* con el ancla `#notificaciones`. El backoffice muestra solo PQRS, pagos, comunicados y
  reservas.

## Push (Firebase Cloud Messaging)

Está apagado mientras no estén estas variables (`start/env.ts`):

```
FCM_PROJECT_ID=aptoph-xxxx
FCM_CLIENT_EMAIL=firebase-adminsdk-…@aptoph-xxxx.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
```

Salen de *Firebase → Configuración del proyecto → Cuentas de servicio → Generar clave privada*. En
DigitalOcean van como secretos (`type: SECRET`) del componente `api`. La clave puede ir con `\n`
literales.

`push.ts` firma un JWT RS256 con la cuenta de servicio y lo cambia por un token OAuth, que guarda en
caché unos 55 minutos. Luego llama a la API HTTP v1 (`messages:send`) por cada teléfono. Los tokens
que FCM responde con 404 o 410 (app desinstalada) se borran de `push_devices`.

### Contrato para la app móvil (Flutter)

1. Después de iniciar sesión, pide permiso de notificaciones y obtiene el token de FCM. Luego llama a
   `POST /account/push-devices`, y vuelve a llamarlo en `onTokenRefresh`.
2. Al cerrar sesión, llama a `DELETE /account/push-devices/:token`.
3. El mensaje trae `notification.title` y `notification.body`, y en `data` los campos `tenantId`,
   `app`, `category`, `type` y `path`. Al tocarlo, la app cambia al conjunto `tenantId` y abre la
   pantalla que corresponde a `path`. Las rutas son las del portal: `/pqrs/:id`, `/unidades/:id`,
   `/porteria`, `/comunicados/:id`, `/parqueaderos`.
4. La campana de la app usa los mismos endpoints con `app=web`.
