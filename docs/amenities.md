# Zonas comunes y reservas

La administración crea las zonas comunes y define cómo se reservan, cuánto cuestan y sus reglas.
Los residentes reservan desde el portal. La administración aprueba o rechaza las solicitudes desde
un calendario y registra el pago y el depósito. Dos reservas nunca se cruzan: lo garantiza la base
de datos.

Código:
- `apps/api/app/services/amenities/bookings.ts`: `BookingService`.
- `apps/api/app/services/amenities/rules.ts`: normaliza las reglas.
- Controladores: `amenities_controller`, `bookings_controller` y `resident_bookings_controller`.
- Tipos compartidos: `packages/shared/src/amenities.ts`.

## Configuración de una zona

| Campo | Qué hace |
| --- | --- |
| `booking_mode` | `hours` (franjas de 30 o 60 min), `days` (días completos, de la hora de entrega a la de devolución) o `shifts` (turnos fijos definidos por la administración; uno que pasa la medianoche cuenta para el día en que empieza). |
| `booking_fee` | Tarifa para residentes por hora, día o turno. Vacía o en cero: sin costo. |
| `payment_mode` | `prepaid`: el residente paga antes y adjunta el soporte. `statement`: la tarifa se carga al estado de cuenta al aprobar y se paga con la próxima cuota. |
| `deposit_amount` | Depósito de garantía. Siempre se paga antes con soporte y se devuelve después del evento, completo o con un descuento por daños. |
| `allow_delinquent` | Si es `false`, una unidad con saldo vencido no puede reservar desde el portal. |
| `allow_guests` | El residente puede reservar a nombre de un invitado. La unidad responde por la reserva. |
| `allow_external` / `external_fee` | Terceros que no viven en el conjunto (personas o empresas). Solo la administración los registra; pagan antes y con su propia tarifa (vacía: la de residentes). |
| `requires_approval` | La administración aprueba cada reserva. Es obligatorio cuando hay dinero que se paga antes (tarifa anticipada o depósito). |
| `terms` | Reglamento de uso. Si existe, el residente debe aceptarlo al reservar. |
| `color` | Color de la zona en el calendario. |
| `rules` | `opensAt`/`closesAt`, `closedOn`, `slotMinutes`, `minHours`/`maxHours`, `maxDays`, `shifts`, `bufferMinutes` (tiempo de aseo), `minNoticeHours`, `maxDaysAhead`, `maxActivePerUnit`, `maxPerMonthPerUnit` y `cancelHours`. |

Una zona con reservas no se borra: queda inactiva y su historial se conserva.

## Tipos de reserva

| `booking_type` | Quién la crea | Unidad | Titular (`holder_*`) |
| --- | --- | --- | --- |
| `resident` | Residente o administración | sí | — |
| `guest` | Residente o administración | sí (responde) | nombre y celular del invitado |
| `external` | Solo la administración | — | nombre o razón social, documento, celular y correo |
| `block` | Solo la administración | — | — (motivo en `notes`) |

Un bloqueo (mantenimiento o evento del conjunto) queda aprobado al crearlo y ocupa el calendario
igual que una reserva.

## Disponibilidad y solapamiento

- `blocked_until` = fin de la reserva + `bufferMinutes`. La restricción de exclusión
  `amenity_bookings_no_overlap` impide que se crucen `tstzrange(starts_at, blocked_until)` de
  reservas `pending` o `approved` de la misma zona. Si dos personas piden el mismo horario a la
  vez, la segunda recibe un 409 (código Postgres `23P01`).
- La creación bloquea la fila de la zona (`FOR UPDATE`) y numera las reservas por conjunto con un
  advisory lock.
- `GET /resident/amenities/:id/availability` devuelve las franjas ocupadas sin datos de quién
  reservó. El backoffice usa `GET /bookings/calendar` (máximo 62 días por consulta).
- Las reglas del residente (anticipación, días hacia adelante, mora, límites por unidad,
  reglamento) no aplican a la administración. El horario de la zona, el aforo y el calendario
  aplican siempre.

## Precio

`POST /resident/bookings/quote` y `POST /bookings/quote` devuelven:
- `fee` = tarifa × cantidad (horas, días o turnos);
- `deposit`;
- `payNow`: lo que se paga antes y debe cubrir el soporte;
- `toStatement`: lo que llega al estado de cuenta al aprobar.

El valor se congela en la reserva (`fee_amount`, `deposit_amount`, `payment_mode`): cambiar la
tarifa de la zona no afecta las reservas ya hechas.

## Flujo y contabilidad

1. **Solicitud.** Queda `pending`. Si la zona no requiere aprobación y no hay nada que pagar
   antes, queda `approved` de una vez.
2. **Soporte.** Si hay pago anticipado, el residente adjunta el soporte, al reservar o después
   desde el detalle; mientras esté pendiente puede subir hasta 3 archivos. Sin soporte no se puede
   aprobar, salvo que la administración registre la reserva y el pago en el mismo paso (pago
   recibido en la oficina).
3. **Aprobación** (`POST /bookings/:id/approve`, con la cuenta de caja y el medio de pago si se
   recibió dinero):
   - Unidad, tarifa al estado de cuenta: se crea un cargo `amenity_booking` con vencimiento en la
     próxima fecha de pago de cuotas.
   - Unidad, tarifa anticipada: el cargo vence hoy y se registra el pago (`PaymentService`), así
     que nace pagado.
   - Tercero externo: asiento débito caja, crédito `income.amenity_booking`.
   - Depósito: débito caja, crédito `deposits.received` (281505 «Depósitos recibidos»). La reserva
     queda con `deposit_status = held`.
4. **Rechazo** con motivo: el horario queda libre y la unidad recibe el aviso.
5. **Cancelación.**
   - El residente puede cancelar mientras falten más de `cancelHours` para el inicio y no haya
     pagado nada por adelantado.
   - La administración puede cancelar siempre que la reserva no haya terminado.
   - Si el cargo no se ha pagado, se anula. Si ya se pagó, o si el depósito sigue recibido, la
     respuesta trae `warnings` para gestionar la devolución.
6. **Depósito** (`POST /bookings/:id/deposit`):
   - `returned`: débito `deposits.received`, crédito caja.
   - `retained` con `retainedAmount` y nota: el valor descontado va a `income.other`, y lo
     restante se devuelve.

Los asientos usan los tipos de comprobante `amenity_booking` y `amenity_deposit`.

## Notificaciones (categoría `bookings`)

| Evento | Para |
| --- | --- |
| `booking.requested` | Administración, cuando una solicitud del portal queda por aprobar (`booking.created` si quedó confirmada sola); el residente recibe `booking.requested` o `booking.confirmed` |
| `booking.created` | La unidad, cuando la administración reserva a su nombre |
| `booking.approved` / `booking.rejected` | Residentes de la unidad, o el correo del tercero |
| `booking.cancelled` | La otra parte: la administración si cancela el residente, la unidad si cancela la administración |
| `booking.deposit` | La unidad, al devolver o descontar el depósito |
| `booking.reminder` | La unidad, 24 horas antes (tarea programada cada hora; `reminded_at` evita repetirlo) |

En el portal el enlace abre `/reservas?reserva=<id>`; en el backoffice, `/zonas-comunes?reserva=<id>`.

## Permisos

- Ver el calendario y las reservas: `AMENITY_READ_ROLES` (administración, personal, vigilancia y
  consejo).
- Crear zonas y aprobar, rechazar, cancelar o liquidar: `AMENITY_MANAGE_ROLES` (administración),
  con suscripción activa.
- El residente solo ve y gestiona las reservas de sus unidades; las de otras unidades responden
  404.

## Pantallas

- **Backoffice → Zonas comunes**:
  - Calendario por semana (franjas horarias, carriles cuando hay cruces visibles, tiempo de aseo
    rayado) y por mes, con filtro por zona.
  - Pestañas *Por aprobar*, *Depósitos* e *Historial*.
  - Detalle con soporte, aprobar, rechazar, cancelar y liquidar depósito.
  - *Nueva reserva* para una unidad, un invitado, un tercero o un bloqueo, con la disponibilidad y
    el precio en vivo.
  - *Configurar zonas*: formulario por pestañas (general, agenda, tarifas y pago, reglas,
    reglamento).
- **Portal → Reservas**:
  - Zonas con su tarifa y reglas.
  - Formulario según la modalidad (franjas, días o turnos) con lo ocupado deshabilitado, reserva
    para un invitado, precio, soporte y aceptación del reglamento.
  - Detalle de cada reserva para adjuntar el soporte o cancelarla.
