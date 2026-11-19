# Cupo de correos masivos

Cada conjunto puede enviar **3.000 correos masivos por mes calendario** (en la zona horaria del
conjunto). Si necesita más, compra paquetes adicionales de **3.000 correos por $10.000** (sin IVA), que
valen solo para el mes en que se compran: el 1.º del mes siguiente el cupo vuelve a 3.000.

Constantes en `@aptoph/shared` (`email_quota.ts`): `EMAIL_MONTHLY_INCLUDED`, `EMAIL_PACK_SIZE`,
`EMAIL_PACK_PRICE`, `EMAIL_PACKS_MAX_PER_REQUEST`.

## 1. Qué cuenta

| Cuenta | No cuenta (nunca se bloquea) |
| --- | --- |
| Comunicados enviados por correo (un correo por destinatario) | Invitaciones, recuperar contraseña, verificar correo |
| Más adelante: otros envíos masivos (p. ej. cuentas de cobro) | Avisos de pagos, soportes y PQRS a una persona |

## 2. Cuándo se descuenta

- **Al guardar o publicar** un comunicado con correo, la API calcula a cuántas personas llegaría y lo
  compara con lo que queda del mes en que saldría (el actual, o el de la fecha programada). Si no
  alcanza, responde 422 en `sendEmail`: se puede publicar sin correo o comprar paquetes.
- **Al enviar** se reserva el cupo de forma atómica (`UPDATE … WHERE used + n <= límite`), todo o
  nada: dos envíos simultáneos nunca pasan el límite.
- Si un **programado** llega a su hora y el cupo ya no alcanza, se publica sin correo y queda marcado
  (`announcements.email_skipped`, "No enviado: sin cupo"). Cuando haya cupo, guardarlo con
  "Enviar por correo" activo lo envía.
- El formulario del backoffice muestra antes de guardar a cuántas personas llegaría y cuánto queda
  (`POST /announcements/email-preview`).

## 3. Paquetes adicionales

La administración los compra en **Plan y facturación → Correos masivos** (`POST /email-quota/packs`,
1 a 20 paquetes) y se pagan con Wompi ([billing.md](billing.md)):

- Con medio de pago guardado: se cobra de inmediato y, al aprobarse, se suman al mes.
- Sin medio: la API responde `checkoutUrl` y la persona paga en el checkout de Wompi con cualquier
  medio; vuelve a `/plan?pago=<id>`.

Para cortesías o ajustes, AptoPH los suma a mano:

```sh
node ace email:add-packs <slug> <paquetes> [--month=yyyy-mm]
```

## 4. Tabla `email_quotas`

Una fila por conjunto y mes (`UNIQUE (tenant_id, period)`), creada cuando se usa:

| Columna | |
| --- | --- |
| `period` | Primer día del mes |
| `used` | Correos enviados en el mes |
| `extra_packs` | Paquetes comprados para el mes |

Límite del mes = `3000 + extra_packs × 3000`.

## 5. API

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/email-quota` | Backoffice |
| POST | `/email-quota/packs` `{ packs }` → `{ charge, checkoutUrl }` | Administración |
| POST | `/announcements/email-preview` `{ audience, buildingIds, publishAt? }` | Administración, consejo |
