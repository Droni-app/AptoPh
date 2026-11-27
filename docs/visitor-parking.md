# Parqueadero de visitantes

Módulo de portería para registrar el ingreso y la salida de vehículos de visitantes y cobrar su
estadía. Lo usan la administración (`administrator`) y la vigilancia (`security_guard`); solo la
administración lo configura.

- API: `app/services/gatehouse/visitor_parking.ts`, `app/controllers/gatehouse/visitor_parking_controller.ts`
- Contratos y cálculo del cobro: `packages/shared/src/visitor_parking.ts` (`quoteParking`)
- Backoffice: `/parqueadero` (operación) y `/parqueadero/configuracion` (administración)

## Configuración

Se guarda en `tenants.settings.visitorParking` (`VisitorParkingSettings`):

| Campo | Qué es |
| --- | --- |
| `enabled` | Apagado, portería no puede registrar ingresos (409) |
| `vehicles.{car,motorcycle,bicycle,other}` | `capacity` (cupos), `hourlyRate` (pesos por hora), `dailyCap` (tope por día calendario o `null`) |
| `graceHours` | Horas gratis **por placa y por día calendario** |
| `fractionMinutes` | 1, 15, 30 o 60: el tiempo cobrable se redondea hacia arriba a esta fracción |
| `vat` | `{ enabled, rate }`. La tarifa **incluye** el IVA: se discrimina base e IVA |
| `paymentMode` | `gate` (paga en portería), `unit` (se carga a la unidad) o `ask` (el vigilante decide en cada salida) |
| `cashAccountId` | Caja de Finanzas donde entra lo cobrado en portería. Obligatoria si se cobra en portería y alguna tarifa es mayor que 0 |
| `maxStayHours` | Pasado este tiempo el vehículo se marca como **excedido** (`null` = sin máximo) |

## Ingreso

1. El vigilante busca por placa, código de acceso o nombre (`GET /visitor-parking/lookup?q=`). La
   búsqueda devuelve las visitas autorizadas desde el portal que no han ingresado, si la placa ya
   está adentro y si la placa es de un residente.
2. Si hay una visita autorizada, el ingreso queda como `pre_authorized` y la visita se marca como
   ingresada. Si no, el vigilante anuncia al residente (el formulario muestra los ocupantes de la
   unidad con su teléfono) y registra cómo se autorizó (`call`, `intercom`, `in_person`, `other`)
   y quién autorizó, que es obligatorio. En ese caso también se crea la visita, ya ingresada y
   enlazada al registro (`visit_id`), para que la unidad la vea en **Portería → Visitas** del
   portal marcada como «Anunciada en portería»; las correcciones del registro se copian a la visita.
3. Carro y moto exigen placa; bicicleta y otros pueden ir sin placa con una descripción. Las placas
   se normalizan (mayúsculas, sin espacios ni guiones) y una misma placa no puede estar adentro dos
   veces (índice único parcial).
4. Sin cupo libre se avisa y se permite: el registro queda con `over_capacity = true`.
5. La tarifa vigente se copia al registro (`tariff`): un cambio de tarifas no afecta a los vehículos
   que ya están adentro.

Mientras el vehículo está adentro se pueden corregir sus datos (`PATCH /stays/:id`).

## Cobro

`quoteParking` parte la estadía por día calendario (zona horaria del conjunto) y, para cada día:

1. Descuenta la gracia que le queda a la placa ese día. La gracia ya usada en salidas anteriores del
   mismo día se resta (`days[].graceMinutes` de las estadías con la misma placa): varias entradas en
   un día comparten una sola gracia y quien pasa la noche recibe gracia de nuevo al día siguiente.
2. Redondea el resto hacia arriba a la fracción.
3. Cobra `minutos / 60 × tarifa`, con el tope diario si lo hay.

Ejemplo (tarifa $3.000/h, 2 h de gracia, fracción de 30 min): 3 h 10 min → 1 h 30 min cobrables →
$4.500. Si el mismo carro vuelve ese día ya no tiene gracia.

## Salida

`POST /stays/:id/exit` registra quién y cuándo dio la salida, asigna el consecutivo del comprobante
(`document_sequences.key = 'visitor_parking'`) y liquida:

| `settlement` | Cuándo | Contabilidad |
| --- | --- | --- |
| `free` | Total 0 (dentro de la gracia o tarifa 0) | Nada |
| `exempt` | Exención manual con motivo obligatorio; no consume la gracia de la placa | Nada |
| `gate` | Paga en portería (`paymentMethod`: efectivo, transferencia, tarjeta, otro) | Débito a la caja; crédito al ingreso del concepto `visitor_parking` y, si hay IVA, a `240805 IVA generado por pagar` |
| `unit` | Se carga a la unidad visitada | Cobro en cartera (`source_type = visitor_parking`) con vencimiento en el próximo día de pago; se le aplican saldos a favor |

La visita enlazada (del portal o creada en portería) también queda con su salida.

## Comprobante por correo

Al dar la salida el vigilante puede escribir un correo y se envía el comprobante (también se puede
reenviar después con `POST /stays/:id/receipt`). Es un correo transaccional: no consume la cuota de
correos masivos. **No es una factura electrónica**: si el conjunto cobra IVA debe facturar
electrónicamente por su cuenta (el texto del correo y la configuración lo advierten).

## Permisos

| Acción | Administración | Vigilancia |
| --- | --- | --- |
| Ver panel, buscar, registrar ingreso y salida, corregir, enviar comprobante | ✅ | ✅ |
| Configurar cupos, tarifas, gracia, IVA y forma de pago | ✅ | ⬜ |

Las escrituras exigen suscripción activa. Registros de otro conjunto responden 404.

## Pendiente (fase 2)

- Aprobación desde el portal del residente con consulta periódica.
- Aviso por correo de estadías excedidas.
- Cierre de caja por turno.
- Anonimizar datos de visitantes vencido el plazo de conservación (Ley 1581).
