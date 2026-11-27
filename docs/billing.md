# Pagos del plan con Wompi

Los conjuntos pagan a AptoPH (DRONICO SAS) su plan y los paquetes de correos masivos con
[Wompi](https://docs.wompi.co), de dos formas:

- **Pago automático:** el medio de pago queda **tokenizado** en Wompi (tarjeta de crédito o débito,
  Nequi, Bancolombia o DaviPlata) y el plan se renueva solo.
- **Pago manual:** sin guardar nada, cada periodo se paga en el checkout de Wompi con **PSE desde
  cualquier banco** (también cuentas empresariales), tarjeta o billeteras. Es para los conjuntos que
  no tienen tarjeta ni cuenta Bancolombia. PSE no se puede tokenizar en Wompi.
 AptoPH nunca recibe ni guarda números de tarjeta, solo el id de la fuente de pago de Wompi y
datos para mostrarla ("VISA ·· 4242").

No se cobra IVA. El comprobante se envía por correo y **no es una factura electrónica**.

Esto no aplica a las cuotas de administración que pagan los residentes (ver [finance.md](finance.md)).

## 1. Reglas de negocio

| Tema | Regla |
| --- | --- |
| Quién paga | Solo la administración (`administrator`), también con el plan bloqueado |
| Medios automáticos | Tarjeta (crédito o débito, también débito empresarial), Nequi, Bancolombia (botón) y DaviPlata |
| Pago manual | Checkout de Wompi: PSE (cualquier banco), tarjeta, Nequi, Bancolombia. Sin medio guardado |
| Prueba | Sin medio de pago. Al activar se cobra el primer periodo desde hoy |
| Valor | Un solo plan, mensual: máx(50.000, unidades del día del cobro × 500) COP (`quote()` en `@aptoph/shared`) |
| Renovación | Automática con el medio guardado, 24 h antes del fin del periodo. Aviso por correo 3 días antes |
| Pago adelantado | Desde 7 días antes del fin (`PAY_AHEAD_DAYS`). El nuevo periodo empieza al final del anterior |
| Recordatorios (manual) | Correo 7 y 3 días antes del fin con el enlace de pago y el valor (`MANUAL_REMINDER_DAYS`) |
| Vencido (manual) | Al terminar sin pago: `past_due`, correo "Tu plan venció" y 7 días de gracia |
| Cobro rechazado | Reintentos 1, 3 y 5 días después del fin, con correo. Plan `past_due` |
| Gracia | 7 días después del fin se puede seguir editando; luego solo lectura (`402`) |
| Cancelar | Apagar la renovación: el plan sigue hasta el fin del periodo pagado, sin reembolsos |
| Correos masivos | Cobro inmediato al medio guardado; sin medio, se paga en el checkout de Wompi |
| Demo | El conjunto `demo` nunca llega a Wompi (`403`) |

Tarifa en `packages/shared/src/billing.ts`: `PRICE_PER_UNIT`, `MINIMUM_MONTHLY`.
Constantes en `packages/shared/src/payments.ts`: `RENEWAL_CHARGE_HOURS_BEFORE`,
`RENEWAL_NOTICE_DAYS`, `RENEWAL_RETRY_DAYS`, `PAST_DUE_GRACE_DAYS`.

## 2. Configuración

```env
WOMPI_ENV=sandbox            # sandbox | production
WOMPI_PUBLIC_KEY=pub_test_…
WOMPI_PRIVATE_KEY=prv_test_…
WOMPI_EVENTS_SECRET=test_events_…
WOMPI_INTEGRITY_SECRET=test_integrity_…
```

Las cuatro llaves están en el panel de Wompi → *Desarrolladores*. `config/wompi.ts` exige que las
cuatro estén y que su prefijo coincida con `WOMPI_ENV` (`pub_prod_`, `prv_prod_`, `prod_events_`,
`prod_integrity_` en producción). Si no, la API no arranca. Sin llaves, los pagos están apagados
(`503`) y el resto de la aplicación funciona.

**URL de eventos** (panel de Wompi → *Desarrolladores* → *Seguimiento de transacciones*), una por
ambiente:

- Producción: `https://api.aptoph.com/api/v1/webhooks/wompi`
- Sandbox en local: un túnel (`cloudflared tunnel --url http://localhost:3333`) y
  `https://<túnel>/api/v1/webhooks/wompi`

En DigitalOcean las llaves van como variables cifradas (`type: SECRET`). Las líneas están comentadas
en `.do/app.yaml` hasta tener las llaves de producción.

## 3. Arquitectura

```
navegador ──(tarjeta, llave pública)──▶ Wompi /tokens/cards ──▶ tok_…
navegador ──▶ API PUT /billing/payment-method {token, aceptaciones}
API ──(llave privada)──▶ Wompi /payment_sources ──▶ id de la fuente (lo único que se guarda)
API ──▶ Wompi /transactions {payment_source_id, reference, signature} ──▶ PENDING
Wompi ──▶ POST /webhooks/wompi (evento) ──▶ API consulta la transacción en Wompi ──▶ aplica
```

- `app/services/billing/wompi.ts`: único módulo que habla con Wompi. En pruebas se cambia por
  `tests/fake_wompi.ts` (`wompi.swap(fake)`).
- `app/services/billing/billing.ts`: medios de pago, cobros, aplicación y reintentos.
- `app/services/billing/billing_scheduler.ts`: cada 5 minutos (`start/scheduler.ts`) revisa cobros
  pendientes, envía avisos y cobra renovaciones.
- `app/services/billing/billing_notifications.ts`: comprobantes y avisos a la administración.
- `app/controllers/billing/wompi_controller.ts`: eventos.

### Garantías

- **El valor lo calcula la API.** El navegador solo dice el ciclo o la cantidad de paquetes.
- **Wompi decide.** Un evento solo dispara una consulta a la API de Wompi. El cobro se aprueba si la
  transacción coincide en referencia, valor y moneda; si no, queda en `error` y no se aplica.
- **Una sola vez.** El efecto (extender el plan, sumar paquetes) se reclama con `applied_at` en una
  transacción; el correo, con `notified_at`. Eventos repetidos y consultas simultáneas no duplican
  nada.
- **Un cobro del plan a la vez.** `409` mientras hay uno pendiente.
- **Eventos verificados.** El checksum (SHA-256 de las propiedades firmadas + timestamp + secreto de
  eventos) se compara en tiempo constante; si falla, `401`. Cada evento se guarda en `wompi_events`
  (único por checksum) y uno repetido responde `200` sin reprocesar. Los de otro ambiente se ignoran.
- **Firma de integridad** en cada transacción y en el checkout (referencia + valor + moneda + secreto).
- **Errores de red.** Si Wompi no responde, el cobro queda pendiente y el programador lo vuelve a
  consultar por referencia. Pasadas 24 h sin transacción, `expired`.
- **Límite de intentos.** 15 operaciones de pago por hora y conjunto.

## 4. Medios de pago

| Medio | Cómo se obtiene el token |
| --- | --- |
| Tarjeta | El navegador llama a `POST {apiUrl}/tokens/cards` con la llave pública (`src/lib/wompi.ts`) |
| Nequi | `POST /billing/tokens/nequi` → la persona acepta en la app → el navegador consulta el estado |
| DaviPlata | `POST /billing/tokens/daviplata` envía un código por SMS → `POST /billing/tokens/daviplata/otp`. Los enlaces del código viajan cifrados (`handle`, 30 min) |
| Bancolombia | `POST /billing/tokens/bancolombia` → página del banco → vuelve a `/plan?medio=bancolombia` |

Antes de guardar, la persona acepta los términos de Wompi y la autorización de datos personales
(enlaces de `GET /billing/config`). Esos tokens de aceptación son de un solo uso.

Guardar un medio reemplaza al anterior; el anterior se anula en Wompi cuando se puede (Wompi no
permite anular fuentes de tarjeta). Quitar el medio apaga la renovación automática.

## 5. Pago manual con PSE

1. Sin medio guardado, `POST /billing/subscription/pay` responde `{ charge, checkoutUrl }`. El valor
   y la referencia los fija la API, con la firma de integridad.
2. La persona paga en Wompi y vuelve a `/plan?pago=<id>`. El evento de Wompi (o la consulta
   periódica) confirma el pago. PSE empresarial puede tardar horas si el banco pide un segundo
   aprobador: el cobro sigue pendiente y no se puede abrir otro pago (`409`).
3. Un checkout abierto y abandonado (sin transacción en Wompi) no bloquea: al pedir otro pago queda
   `expired`. Si después se paga de todas formas, el evento lo reabre y se aplica.
4. El plan queda con `auto_renew = false`. El programador envía los recordatorios (claims
   `payment_reminder_for` y `renewal_notice_for`) y, al vencer, lo pasa a `past_due`.
5. El historial muestra el medio usado en Wompi ("PSE · Wompi").

Guardar un medio de pago después pasa el plan a pago automático.

## 6. Estados de un cobro (`billing_charges.status`)

`pending` → `approved` | `declined` | `error` | `voided` | `expired`

Referencias: `APH-PLAN-yyMMdd-XXXXXXXXXX` (plan) y `APH-MAIL-…` (correos).

En el checkout la persona puede intentar varias veces con la misma referencia: un intento rechazado
no cierra el cobro para siempre; si después llega uno aprobado, se reabre y se aplica.

## 7. Tablas

- `billing_payment_methods`: `environment, wompi_payment_source_id, type, label, brand, last_four,
  exp_month, exp_year, customer_email, status (active|removed), policy_url, personal_data_url,
  created_by_id, removed_at, removed_by_id`. Un solo medio activo por conjunto y ambiente.
- `billing_charges`: `environment, reference (única), kind (subscription|email_packs), description,
  amount_cents, currency, status, status_message, payment_method_id, payment_method_label,
  wompi_transaction_id (único), checkout, automatic`; del plan: `plan, billing_cycle, units,
  period_starts_at, period_ends_at`; de correos: `packs, quota_period`; `created_by_id,
  finalized_at, applied_at, notified_at`.
- `wompi_events`: `event, environment, checksum (único), reference, transaction_id, payload,
  received_at, processed_at`.
- `subscriptions`: `auto_renew, next_renewal_at, renewal_attempts, renewal_notice_for,
  payment_reminder_for`.

## 8. API

| Método | Ruta | |
| --- | --- | --- |
| GET | `/billing` | Medio, renovación, próximo cobro e historial |
| GET | `/billing/config` | Llave pública y contratos de Wompi |
| PUT | `/billing/payment-method` | Guardar medio `{ type, token, acceptanceToken, personalAuthToken }` |
| DELETE | `/billing/payment-method` | Quitar medio |
| POST | `/billing/tokens/nequi` · `/daviplata` · `/daviplata/otp` · `/bancolombia` | Tokens que no se crean en el navegador |
| GET | `/billing/tokens/:type/:tokenId` | Estado del token |
| POST | `/billing/subscription/pay` | Pagar un mes del plan: `{ charge, checkoutUrl }` (checkout si no hay medio) |
| PUT | `/billing/subscription/auto-renew` `{ enabled }` | Renovación automática |
| GET | `/billing/charges/:id` | Estado de un cobro (consulta a Wompi si está pendiente) |
| POST | `/email-quota/packs` `{ packs }` | Comprar correos: `{ charge, checkoutUrl }` |
| POST | `/webhooks/wompi` | Eventos de Wompi (público, verificado por checksum) |

Todas salvo el webhook: solo administración, sin el bloqueo por plan vencido.

## 9. Pruebas en sandbox

| Medio | Aprobada | Rechazada |
| --- | --- | --- |
| Tarjeta | `4242 4242 4242 4242` | `4111 1111 1111 1111` |
| Nequi | `3991111111` | `3992222222` |
| DaviPlata | `3991111111`, código `574829` | `3992222222` |

PSE en el checkout de sandbox: el banco de pruebas permite elegir el resultado.

Cualquier CVC de 3 dígitos y fecha futura. En sandbox no se mueve dinero real y la pantalla lo indica.

Pruebas automáticas: `tests/functional/billing/billing.spec.ts` (Wompi falso en memoria).

## 10. Paso a producción

1. En Wompi, URL de eventos de producción (sección 2).
2. Cargar las cuatro llaves `prod` como secretos en DigitalOcean y descomentar las líneas de
   `.do/app.yaml` con `WOMPI_ENV=production`.
3. Desplegar y hacer un pago real pequeño (un paquete de correos) para confirmar el ciclo completo.
