# Parqueaderos del conjunto

Parqueaderos de los residentes (no de visitantes: ver `docs/visitor-parking.md`). Hay
parqueaderos **propios**, que pertenecen a una unidad, y **comunales**, que son del conjunto y se
asignan a las unidades por un periodo. Un conjunto puede tener solo propios, solo comunales o
ambos (mixto).

- API: `app/services/property/parking.ts`, `app/controllers/property/parking_controller.ts`
- Cobro mensual: `BillingService.planParking` (`app/services/finance/billing.ts`)
- Contratos: `packages/shared/src/parking.ts`
- Backoffice: `/parqueaderos` y `/parqueaderos/configuracion`. Portal: la unidad muestra sus
  parqueaderos y el formulario de vehículos pide el propietario y las fechas de SOAT y
  tecnomecánica.

## Configuración

Se guarda en `tenants.settings.parking` (`ParkingSettings`):

| Campo | Qué es |
| --- | --- |
| `mode` | `private`, `communal` o `mixed` |
| `maxSpotsPerUnit` | Parqueaderos que puede tener una unidad, sumando propios y comunales. Bloquea la asignación |
| `rates.<tipo>.communal` | Pesos al mes por un cupo comunal de carro, moto, bicicleta u otro |
| `rates.<tipo>.private` | Pesos al mes por un parqueadero propio (p. ej. mantenimiento). 0 = no se cobra |
| `lotteryMonths` | Duración del periodo: una asignación vence al terminarlo |
| `offerDays` | Días para aceptar un cupo ofrecido desde la lista de espera |
| `requirements` | Paz y salvo (con tolerancia en días), vehículo registrado del tipo, SOAT y tecnomecánica vigentes, prioridad sin parqueadero propio en el sorteo |
| `allowThirdPartyVehicles` | Permite registrar vehículos a nombre de terceros |

## Parqueaderos

Cada parqueadero (`parking_spots`) tiene un código único en el conjunto, el tipo de vehículo, si
es cubierto, su ubicación y si está disponible (uno fuera de servicio no se asigna ni cuenta como
libre). Los propios tienen la unidad dueña.

- **Uno por uno** o **en lote** (solo comunales): prefijo y rango, p. ej. `P-001` a `P-080`.
- **Traer de unidades**: crea un parqueadero propio por cada unidad tipo `parking` anexa a un
  apartamento (`parent_unit_id`), enlazado a ella (`property_unit_id`). Las ya traídas se omiten.
- Un parqueadero asignado no se puede eliminar, inactivar ni cambiar de tipo.

## Asignaciones

Solo los comunales se asignan (`parking_assignments`). Al asignar:

1. Se valida el máximo por unidad: es un error que bloquea.
2. Se avisa de los requisitos que no cumple (mora, sin vehículo del tipo, documentos vencidos);
   la administración puede asignar igual.
3. El vehículo es opcional y debe ser de la unidad y del tipo del cupo.
4. El fin por defecto es el inicio más `lotteryMonths`, menos un día. Pasada esa fecha la
   asignación queda **terminada** (`ended`) y el cupo vuelve a estar libre.
5. Se copia la tarifa vigente (`monthly_rate`): un cambio de tarifas aplica a las asignaciones
   nuevas.

Un parqueadero tiene un solo titular a la vez (índice único parcial sobre `offered`/`active`) y
un solo ganador para el siguiente periodo (`scheduled`). Un cupo ya sorteado se puede asignar a
mano solo hasta el día antes del inicio de ese periodo.

La asignación manual sigue disponible (por ejemplo, para un cupo libre que nadie pidió), pero el
camino normal es el sorteo.

### Cancelar o rechazar

| Acción | Cuándo | Cobro |
| --- | --- | --- |
| Cancelar | Se quita durante el periodo: se elige el último día de uso | Hasta ese día |
| Rechazar | Nunca se usó (la unidad no lo aceptó o no cumplía) | Nada |

Ambas piden un motivo de la lista (mora, no usa el cupo, sin vehículo, documentos vencidos,
renuncia de la unidad, incumple el reglamento, venta o cambio de residente, otro) y un detalle.
Si el mes ya se facturó, el cobro se baja a los días que sí lo tuvo: se anula si no queda nada o
se le hace una nota crédito. Lo que la unidad ya pagó se informa para ajustar el saldo a favor
en Cartera.

## Cobro mensual

Al generar el mes (Finanzas → Facturación) se agregan, con el concepto `parking`:

- Cada asignación comunal vigente en el mes (también las terminadas o canceladas que lo tocan),
  **prorrateada por días** cuando empieza o termina dentro del mes:
  `tarifa × días / días del mes`, redondeado a pesos. Clave `park:<asignación>:<periodo>`.
- Cada parqueadero propio activo cuyo tipo tiene tarifa de propios, el mes completo. Clave
  `pspot:<parqueadero>:<periodo>`.

Generar de nuevo no duplica (claves de idempotencia).

## Vehículos

`vehicles` guarda el propietario cuando es de un tercero (`owner_type = 'third_party'`): nombre
(obligatorio), tipo y número de documento, relación con la unidad (familiar, empresa, leasing,
amigo, otro) y teléfono. Solo se pueden registrar si el conjunto lo permite; los que ya existen
se siguen pudiendo editar. Carros y motos guardan el vencimiento del SOAT y de la tecnomecánica
(`soat_expires_on`, `inspection_expires_on`). Al eliminar un vehículo, el cupo sigue con la
unidad sin vehículo.

## Sorteo

Los cupos comunales se reparten por sorteo cada `lotteryMonths` meses
(`parking_lotteries`, `parking_applications`). Hay un solo sorteo abierto a la vez.

### 1. Postulaciones

La administración abre el sorteo (`POST /parking/lotteries`) con el cierre de postulaciones y el
periodo (el fin por defecto es el inicio más `lotteryMonths`, menos un día). Si marca **avisar**, se
envía un correo a cada residente con cuenta; usa el cupo mensual de correos masivos
(`docs/email-quota.md`) y, si no alcanza, no se envía ninguno y se avisa.

Los residentes se postulan en el portal (`/parqueaderos`), una vez por unidad y tipo de vehículo.
La administración puede postular a una unidad sin cuenta. Al postular, los requisitos son errores
(no avisos, como en la asignación manual):

- paz y salvo, con la tolerancia en días;
- vehículo registrado del tipo, y SOAT y tecnomecánica vigentes;
- el máximo por unidad, contando los parqueaderos propios y las otras postulaciones.

Después del cierre nadie se postula hasta que se sortee.

### 2. Sorteo auditable

`POST /parking/lotteries/:id/draw`, en una transacción:

1. Los cupos comunales vigentes terminan el día antes del inicio del periodo ("terminan y hay
   nuevo sorteo"). La lista de espera del periodo anterior vence y ese sorteo queda `finished`.
2. Se vuelven a revisar los requisitos: quien ya no cumple queda `ineligible` con el motivo.
3. Se genera una semilla aleatoria de 32 bytes y cada postulación recibe
   `draw_hash = SHA-256(semilla + ':' + id)`. Por tipo de vehículo se ordenan por grupo de
   prioridad (0: sin parqueadero propio, si `priorityWithoutPrivate`; 1: con propio) y luego por
   el hash. Ese orden es `draw_position`.
4. En ese orden se reparten los cupos libres del tipo (por código). Ganan (`won`) y su asignación
   queda **programada** (`scheduled`) hasta el inicio del periodo, cuando pasa sola a vigente. Si
   el periodo ya empezó, queda vigente de una vez.
5. Los demás quedan en **lista de espera** (`waiting`) en ese orden.

La semilla se publica después del sorteo, en el backoffice y en el portal: cualquiera puede
recalcular los hashes y comprobar el orden. Cada unidad recibe un correo con su resultado.

### 3. Lista de espera y ofertas

Cuando se libera un cupo comunal durante el periodo (se cancela o rechaza una asignación), se
ofrece al primero de la lista de espera del mismo tipo que siga cumpliendo los requisitos (los que
ya no cumplen pasan a `ineligible`). Se crea una asignación `offered` y la unidad tiene
`offerDays` días para aceptarla en el portal; se le avisa por correo.

- **Acepta**: la asignación queda vigente desde ese día hasta el fin del periodo.
- **No acepta** o **no responde a tiempo**: la asignación queda rechazada (`offer_declined` u
  `offer_expired`, sin cobro) y el cupo se ofrece al siguiente.

Las ofertas vencidas se procesan al consultar (no hay un proceso programado). La administración
también puede:

- ofrecer todos los cupos libres a la lista (útil al crear parqueaderos nuevos);
- asignar un cupo libre directo a una postulación en espera, sin oferta;
- retirar una postulación, o rechazar la oferta por la unidad.

Quien se postula después del sorteo va al final de la lista y, si hay un cupo libre de su tipo,
se le ofrece de inmediato.

### Correos

Avisos a la unidad (transaccionales, `ParkingMail`): resultado del sorteo, cupo ofrecido, oferta
vencida, cupo asignado directamente y cancelación o rechazo por la administración. Solo la
apertura usa el cupo de correos masivos.

## Permisos

| Acción | Administración | Consejo | Vigilancia |
| --- | --- | --- | --- |
| Ver parqueaderos, asignaciones y buscar por placa o código | ✅ | ✅ | ✅ (sin tarifas) |
| Configurar, crear parqueaderos, asignar, cancelar y rechazar | ✅ | ⬜ | ⬜ |
| Ver sorteos y postulaciones | ✅ | ✅ | ⬜ |
| Abrir, editar, anular y sortear; manejar la lista de espera | ✅ | ⬜ | ⬜ |

Los residentes se postulan, retiran su postulación y responden ofertas solo de sus unidades.

Las escrituras exigen suscripción activa. Registros de otro conjunto responden 404.

## Pendiente

- Un proceso programado que venza las ofertas y avise aunque nadie consulte.
- Recordatorio antes de que venza una oferta.
