# Modelo de datos — AptoPH

> Estado: **propuesta** · Motor: PostgreSQL 18 · ORM: AdonisJS Lucid
>
> Este documento describe el modelo sugerido. Cada tabla se implementará como una
> migración (`apps/api/database/migrations/<módulo>`) y un modelo Lucid (`apps/api/app/models/<módulo>`).
> Los nombres de tablas y columnas van en **inglés** y en `snake_case`; Lucid los expone
> en `camelCase` en los modelos.

## 1. Principios

### 1.1 Multi-tenancy

- Un **tenant** es una copropiedad (conjunto residencial, edificio, centro comercial…).
- **Todas** las tablas de negocio llevan `tenant_id NOT NULL` con FK a `tenants.id`.
- Las únicas tablas **globales** (sin `tenant_id`) son: `tenants`, `users`,
  `auth_access_tokens` y las tablas de plataforma del SaaS
  (planes, suscripciones — fase posterior).
- **Aislamiento a nivel de base de datos (no sólo de aplicación):**
  - Cada tabla de tenant tiene, además de su PK, un índice único `(tenant_id, id)`.
  - Las FKs entre tablas de tenant son **compuestas**: `(tenant_id, unit_id) → units(tenant_id, id)`.
    Así PostgreSQL rechaza cualquier registro que apunte a una fila de **otro** tenant,
    aunque la aplicación tenga un bug.
  - Todos los índices de consulta empiezan por `tenant_id`.
- **Aislamiento a nivel de aplicación (AdonisJS):**
  - Middleware `tenant` (implementado) que resuelve el tenant activo con el header `X-Tenant-Id`,
    verifica que el usuario autenticado tenga un `enrollment` activo en él y lo deja en
    `ctx.tenant` / `ctx.enrollment`.
  - Un `BaseTenantModel` (mixin) que agrega el scope `forTenant(tenantId)` y asigna
    `tenant_id` automáticamente en `beforeCreate`. Las consultas **nunca** se hacen sin ese scope.
  - Las policies (Bouncer) deciden por `enrollment.role`, nunca por el usuario global.
- **Defensa adicional (opcional, fase posterior):** Row Level Security de PostgreSQL con
  `SET app.tenant_id = …` por transacción.

### 1.2 Identificadores

- PK `id uuid` con default `uuidv7()` (función nativa de PostgreSQL 18): son ordenables
  por tiempo y no exponen cuántos registros tiene cada tenant (los IDs secuenciales sí lo harían).
- `tenants.slug` es un identificador legible para URLs y subdominios.

> `auth_access_tokens.id` sigue siendo `increments`: lo gestiona `@adonisjs/auth` y no se expone
> (el token público es opaco). Su `tokenable_id` sí es `uuid`.

### 1.3 Convenciones

| Convención | Regla |
| --- | --- |
| Timestamps | `created_at`, `updated_at` (`timestamptz`) en todas las tablas |
| Borrado lógico | `deleted_at timestamptz NULL` en entidades que se archivan (units, users, documents…) |
| Dinero | `numeric(14,2)` + `currency` en el tenant (COP por defecto). Nunca `float` |
| Enums | Columnas `varchar` con `CHECK` (más fácil de migrar que tipos `ENUM` de Postgres). Los valores viven en `packages/shared` |
| Fechas sin hora | `date` (p. ej. `due_on`, `starts_on`) |
| Autoría | `created_by_id → users.id` cuando importa saber quién creó el registro |
| Archivos | Se guarda la ruta/clave del storage (`file_key`), no el binario |

## 2. Diagrama (núcleo)

```mermaid
erDiagram
    tenants ||--o{ enrollments : "tiene"
    users ||--o{ enrollments : "participa en"
    users ||--o{ auth_access_tokens : "tiene"

    tenants ||--o{ buildings : ""
    tenants ||--o{ units : ""
    buildings ||--o{ units : "agrupa"
    units ||--o{ unit_occupants : ""
    users |o--o{ unit_occupants : "puede ser"
    units ||--o{ vehicles : ""
    units ||--o{ pets : ""

    tenants ||--o{ charge_concepts : ""
    units ||--o{ charges : "debe"
    charge_concepts ||--o{ charges : ""
    units ||--o{ payments : "paga"
    payments ||--o{ payment_allocations : ""
    charges ||--o{ payment_allocations : ""

    tenants ||--o{ amenities : ""
    amenities ||--o{ amenity_bookings : ""
    units ||--o{ amenity_bookings : ""

    units ||--o{ tickets : ""
    tickets ||--o{ ticket_comments : ""
    units ||--o{ visits : ""
    units ||--o{ parking_stays : ""
    units ||--o{ parking_spots : "propios"
    parking_spots ||--o{ parking_assignments : ""
    units ||--o{ parking_assignments : ""
    parking_lotteries ||--o{ parking_applications : ""
    units ||--o{ parking_applications : ""
    parking_applications ||--o| parking_assignments : ""
    visits ||--o| parking_stays : ""
    units ||--o{ parcels : ""
    tenants ||--o{ announcements : ""
    tenants ||--o{ documents : ""
```

## 3. Tablas globales

### `tenants` — copropiedades

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| name | varchar(150) | Nombre comercial: "Conjunto Reservas del Bosque" |
| slug | varchar(80) UNIQUE | Para subdominio/URL |
| legal_name | varchar(200) NULL | Razón social de la persona jurídica |
| tax_id | varchar(30) NULL | NIT |
| property_type | varchar(30) | `residential`, `commercial`, `mixed` |
| address | varchar(255) NULL | |
| city | varchar(100) NULL | |
| country_code | char(2) | `CO` por defecto |
| timezone | varchar(50) | `America/Bogota` |
| currency | char(3) | `COP` |
| logo_file_key | varchar NULL | |
| status | varchar(20) | `trial`, `active`, `suspended`, `cancelled` |
| settings | jsonb | Configuración flexible (intereses de mora, día de corte, etc.) |
| created_at / updated_at / deleted_at | timestamptz | |

### `subscriptions` — plan del conjunto (uno por tenant)

Se crea con el registro autoservicio (`/registro`). Los tenants **sin** suscripción son cuentas
administradas (demo, pilotos) y no tienen restricciones. Planes y precios en
`packages/shared/src/billing.ts`.

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| tenant_id | uuid UNIQUE FK → tenants | `ON DELETE CASCADE` |
| plan | varchar(20) | `completo` (único plan) |
| billing_cycle | varchar(10) | `monthly` (único ciclo) |
| status | varchar(20) | `trialing`, `active`, `past_due`, `cancelled` |
| declared_units | int | Unidades declaradas en el registro (cotización antes de cargar el censo) |
| trial_ends_at | timestamptz NULL | Fin de la prueba (30 días) |
| current_period_ends_at | timestamptz NULL | Fin del periodo pagado |
| auto_renew | boolean | Renovación automática con el medio guardado |
| next_renewal_at | timestamptz NULL | Próximo intento de cobro automático |
| renewal_attempts | int | Cobros automáticos rechazados en el periodo |
| renewal_notice_for | timestamptz NULL | Fin de periodo ya avisado por correo |
| payment_reminder_for | timestamptz NULL | Pago manual: fin de periodo con el recordatorio de 7 días enviado |
| cancelled_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | |

Con la prueba vencida o el periodo pagado expirado, el backoffice queda en **solo lectura**: las
rutas de escritura responden `402` con `rule: subscription_inactive`. Con la renovación rechazada
(`past_due`) hay 7 días de gracia. La app de residentes sigue funcionando.

Los pagos del plan (`billing_payment_methods`, `billing_charges`, `wompi_events`) están en
[billing.md](billing.md).

### `users` — personas con cuenta en la plataforma

Un usuario es **global**: la misma persona puede vivir en un conjunto y trabajar o ser
consejera en otro, con una sola cuenta.

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| full_name | varchar(150) | |
| email | varchar(254) UNIQUE | Login |
| password | varchar | Hash (argon2/scrypt) |
| phone | varchar(30) NULL | |
| document_type | varchar(10) NULL | `CC`, `CE`, `NIT`, `PP`, `TI` |
| document_number | varchar(30) NULL | Único junto con `document_type` |
| avatar_file_key | varchar NULL | |
| is_platform_admin | boolean | Superadmin del SaaS (no de un conjunto) |
| email_verified_at | timestamptz NULL | |
| last_login_at | timestamptz NULL | |
| status | varchar(20) | `active`, `blocked` |
| created_at / updated_at / deleted_at | timestamptz | |

### `auth_access_tokens`

La gestiona `@adonisjs/auth`: un access token por sesión iniciada (ver
[authentication.md](authentication.md)). `tokenable_id` es `uuid` y `name` guarda la app que lo pidió
(`Backoffice`, `Portal de residentes`…).

### `user_identities` — cuentas externas para iniciar sesión (Google)

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK → users | `ON DELETE CASCADE` |
| provider | varchar(20) | `google` |
| provider_user_id | varchar(255) | Id de la cuenta en el proveedor (`sub` de Google) |
| email | varchar(254) | Correo de la cuenta externa al vincularla o usarla |
| last_used_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | |

`UNIQUE (provider, provider_user_id)`, `UNIQUE (user_id, provider)`. Ver
[authentication.md](authentication.md#google).

### `legal_acceptances` — evidencia de aceptación de los documentos legales

Módulo `legal`. Solo inserciones: quién aceptó qué versión de cada documento, cuándo, desde qué IP y
navegador, y en qué flujo (la Ley 1581 de 2012 exige poder probar la autorización). Las versiones
vigentes están en `packages/shared/src/legal.ts`.

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| user_id | uuid FK → users | `CASCADE` |
| tenant_id | uuid FK NULL → tenants | conjunto para el que se aceptó; `SET NULL` |
| document | varchar(30) | `terms`, `privacy`, `data_processing`, `cookies` |
| version | varchar(10) | fecha de la versión (`2026-11-27`) |
| context | varchar(20) | `signup` (términos, política y acuerdo de encargo), `invitation` (términos y política) |
| ip_address | inet NULL | |
| user_agent | varchar(500) NULL | |
| accepted_at | timestamptz | |

## 4. Pertenencia y roles

### `enrollments` — usuario ↔ tenant ↔ rol (tabla pivote)

Define **qué puede hacer un usuario dentro de un tenant**. Una persona puede tener
varios roles en el mismo conjunto (p. ej. `owner` y `council_member`): se crea un
enrollment por rol.

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| tenant_id | uuid FK → tenants | |
| user_id | uuid FK → users | |
| role | varchar(30) | Ver tabla de roles |
| status | varchar(20) | `invited`, `active`, `suspended`, `revoked` |
| title | varchar(100) NULL | Cargo visible: "Presidente del consejo", "Portero turno noche" |
| starts_on | date NULL | Inicio del periodo (útil para consejo y administración) |
| ends_on | date NULL | |
| invited_by_id | uuid NULL FK → users | |
| invitation_token_hash | varchar NULL | Para aceptar la invitación por correo |
| accepted_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | |

Índices / restricciones:
- `UNIQUE (tenant_id, user_id, role)`
- `INDEX (user_id, status)`: para listar "mis conjuntos" al iniciar sesión.

**Roles** (`role`):

| Valor | Español | App |
| --- | --- | --- |
| `administrator` | Administrador(a) | backoffice |
| `council_member` | Miembro del consejo de administración | backoffice |
| `accountant` | Contador(a) | backoffice |
| `fiscal_reviewer` | Revisor(a) fiscal | backoffice |
| `staff` | Trabajador (mantenimiento, aseo, jardinería) | backoffice / móvil |
| `security_guard` | Vigilante / portería | backoffice / móvil |
| `resident` | Residente (propietario, arrendatario o familiar) | web / móvil |

> El enrollment dice **qué rol** tiene alguien en el conjunto. Su relación con una
> unidad concreta (propietario o arrendatario del apto 302) va en `unit_occupants`.
> Se usa `renter` (no `tenant`) para "arrendatario", para no confundirlo con el tenant
> del multi-tenancy.

## 5. Estructura física

### `buildings` — torres / bloques / etapas

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| tenant_id | uuid FK | |
| name | varchar(80) | "Torre 1", "Bloque B" |
| floors | smallint NULL | |
| sort_order | smallint | |
| created_at / updated_at | timestamptz | |

`UNIQUE (tenant_id, name)`

### `units` — unidades privadas (apartamento, casa, local, parqueadero, depósito)

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| tenant_id | uuid FK | |
| building_id | uuid NULL FK compuesta → buildings | |
| code | varchar(30) | "302", "T1-302", "P-15" |
| type | varchar(20) | `apartment`, `house`, `commercial`, `parking`, `storage` |
| floor | smallint NULL | |
| private_area | numeric(10,2) NULL | Área privada en m² |
| ownership_coefficient | numeric(9,6) | Coeficiente de copropiedad (base para cuotas y votaciones) |
| parent_unit_id | uuid NULL FK compuesta → units | Parqueadero/depósito anexo a un apartamento |
| status | varchar(20) | `occupied`, `vacant`, `under_construction` |
| notes | text NULL | |
| created_at / updated_at / deleted_at | timestamptz | |

`UNIQUE (tenant_id, building_id, code)`

### `unit_occupants` — personas vinculadas a una unidad

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| tenant_id | uuid FK | |
| unit_id | uuid FK compuesta → units | |
| user_id | uuid NULL FK → users | NULL si la persona no tiene cuenta (p. ej. un menor) |
| full_name | varchar(150) | Se guarda siempre, tenga o no cuenta |
| document_type / document_number | varchar NULL | |
| phone / email | varchar NULL | |
| relationship | varchar(20) | `owner`, `renter`, `family_member`, `domestic_worker`, `other` |
| is_primary_contact | boolean | Responsable de la unidad para notificaciones/cobros |
| is_billing_responsible | boolean | A quién se emite la cuenta de cobro |
| starts_on / ends_on | date NULL | Vigencia (p. ej. contrato de arriendo) |
| created_at / updated_at | timestamptz | |

`INDEX (tenant_id, unit_id)`, `INDEX (tenant_id, user_id)`

### `vehicles`

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| unit_id | uuid FK compuesta → units | |
| plate | varchar(10) | `UNIQUE (tenant_id, plate)` |
| type | varchar(20) | `car`, `motorcycle`, `bicycle`, `other` |
| brand / model / color | varchar NULL | |
| parking_unit_id | uuid NULL FK compuesta → units | Parqueadero asignado (anterior a `parking_spots`) |
| owner_type | varchar(20) | `resident` o `third_party` |
| owner_name / owner_document_type / owner_document_number / owner_relationship / owner_phone | NULL | Propietario cuando es de un tercero; el nombre es obligatorio (`CHECK`) |
| soat_expires_on / inspection_expires_on | date NULL | Vencimiento del SOAT y de la tecnomecánica |
| created_at / updated_at / deleted_at | | |

### `parking_spots` — parqueaderos del conjunto

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| code | varchar(20) | Único por conjunto sin distinguir mayúsculas, entre los no eliminados |
| vehicle_type | varchar(20) | `car`, `motorcycle`, `bicycle`, `other` |
| ownership | varchar(10) | `private` o `communal`. `CHECK`: los propios tienen `owner_unit_id` |
| is_covered, location, notes | | |
| is_active | boolean | Fuera de servicio: no se asigna |
| owner_unit_id | uuid NULL FK compuesta → units | Dueño de un parqueadero propio |
| property_unit_id | uuid NULL FK compuesta → units | Unidad tipo `parking` de la que se trajo |
| created_at / updated_at / deleted_at | | |

### `parking_assignments` — cupos comunales asignados

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| spot_id / unit_id / vehicle_id | uuid FK compuestas | Vehículo opcional |
| status | varchar(10) | `scheduled`, `offered`, `active`, `ended`, `cancelled`, `rejected`. Un titular por parqueadero: `UNIQUE (tenant_id, spot_id) WHERE status IN ('offered', 'active')`; un ganador del siguiente periodo: `UNIQUE (tenant_id, spot_id) WHERE status = 'scheduled'` |
| lottery_id / application_id | uuid NULL FK compuestas | Sorteo y postulación de donde viene |
| starts_on / ends_on | date | Periodo; `ends_on` NULL = sin fin |
| ended_on | date NULL | Último día real (el día anterior al inicio si se rechazó) |
| monthly_rate | numeric(14,2) | Tarifa con la que se asignó |
| end_reason / end_note | | Motivo de la lista y detalle (`offer_declined` / `offer_expired` los pone el sistema) |
| notes, created_by_id, ended_by_id, ended_at | | |

Reglas y cobro: `docs/parking.md`.

### `parking_lotteries` — sorteos de cupos comunales

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| number | integer | Consecutivo por conjunto (`document_sequences`, clave `parking_lottery`) |
| title | varchar(120) | |
| status | varchar(10) | `open`, `drawn`, `finished`, `cancelled`. Uno abierto a la vez: `UNIQUE (tenant_id) WHERE status = 'open'` |
| closes_at | timestamptz | Cierre de postulaciones |
| period_starts_on / period_ends_on | date | Periodo que se sortea |
| notes | text NULL | Para los residentes |
| seed | varchar(64) NULL | Semilla del sorteo (hex), pública después de sortear |
| drawn_at / drawn_by_id | | |
| notified_count | integer | Correos de apertura enviados |
| created_by_id, created_at / updated_at | | |

### `parking_applications` — postulaciones y lista de espera

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| lottery_id | uuid FK compuesta → parking_lotteries (CASCADE) | |
| unit_id / vehicle_id | uuid FK compuestas | Vehículo opcional |
| vehicle_type | varchar(20) | Tipo de cupo. Una por unidad y tipo: `UNIQUE (lottery_id, unit_id, vehicle_type) WHERE status <> 'withdrawn'` |
| status | varchar(12) | `pending`, `ineligible`, `won`, `waiting`, `offered`, `accepted`, `declined`, `expired`, `withdrawn` |
| priority_group | smallint | 0 sin parqueadero propio, 1 con propio |
| draw_hash | varchar(64) NULL | SHA-256(semilla:id) |
| draw_position | integer NULL | Orden en el sorteo dentro del tipo; las tardías van al final |
| ineligible_reason | text NULL | |
| spot_id | uuid NULL FK compuesta | Cupo ganado u ofrecido |
| offer_expires_at / responded_at | timestamptz NULL | |
| late | boolean | Se postuló después del sorteo |
| applied_by_id, created_at / updated_at | | |

### `pets`

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| unit_id | uuid FK compuesta → units | |
| name | varchar(60) | |
| species | varchar(20) | `dog`, `cat`, `other` |
| breed | varchar(60) NULL | |
| is_potentially_dangerous | boolean | Requisito legal para algunas razas |
| vaccination_file_key | varchar NULL | |
| created_at / updated_at / deleted_at | | |

## 6. Finanzas y contabilidad

El módulo completo (reglas de cálculo, asientos y permisos) está en [`docs/finance.md`](finance.md).
Aquí solo el mapa de tablas; todas llevan `tenant_id` y FK compuestas como el resto del modelo.
Los valores son `numeric` y se exponen como `string`; en el código se calcula en centavos enteros.

### Cartera

| Tabla | Para qué |
| --- | --- |
| `charge_concepts` | Conceptos de cobro (`ordinary_fee`, `extraordinary_fee`, `interest`, `fine`, `parking`, `visitor_parking`, `amenity_booking`, `service`, `opening_balance`, `other`), con su cuenta por cobrar, su cuenta de ingreso, si genera mora y si tiene pronto pago. `code` identifica los conceptos del sistema. |
| `contribution_modules` / `contribution_module_units` | Módulos de contribución (torre, locales, parqueaderos) con la participación (`share`) de cada unidad. |
| `fee_schedules` | Historial de cálculos de cuotas: método (`coefficient`, `module`, `area`, `equal`, `fixed_by_type`), total mensual, presupuesto base y parámetros. |
| `recurring_charges` | Tarifa vigente de cada unidad por concepto, con `starts_on` / `ends_on` (meses). Lo que se factura cada mes. |
| `billing_periods` | Un registro por mes facturado: vencimiento, pronto pago, tasa de mora aplicada, estado `open` / `closed`, totales. |
| `charges` | Cargos por unidad. Además de lo básico: `billing_period_id`, `recurring_charge_id`, `source_type` / `source_id` (de dónde viene: facturación, mora, manual, parqueadero, reserva…), `idempotency_key` único (`rec:…`, `int:…`, `booking:…`), descuento por pronto pago y anulación (`cancelled_at`, `cancellation_reason`). |
| `charge_adjustments` | Notas crédito, descuentos por pronto pago y anulaciones de un cargo. |
| `payments` | Recibos de caja: `number` consecutivo, `cash_account_id`, `unapplied_amount` (saldo a favor), estado `pending_review` / `confirmed` / `rejected` / `reversed` con sus motivos. |
| `payment_allocations` | Aplicación de un pago a cargos (un pago cubre varios cargos y un cargo admite varios abonos). |

### Gastos, bancos y presupuesto

| Tabla | Para qué |
| --- | --- |
| `vendors` | Proveedores: documento, contacto, cuenta bancaria y cuenta de gasto habitual. |
| `bills` / `bill_lines` | Facturas de proveedores: líneas por cuenta de gasto, IVA, retenciones (fuente, IVA, ICA), neto y saldo. |
| `vendor_payments` / `vendor_payment_allocations` | Comprobantes de egreso numerados y las facturas que pagan. |
| `attachments` | Adjuntos de facturas, egresos, recibos de caja, comprobantes contables, comunicados y la imagen de cada comunicado (`owner_type` + `owner_id`). Quitar uno solo marca `deleted_at`. Ver [files.md](files.md). |
| `cash_accounts` | Cuentas bancarias y cajas, cada una con su auxiliar contable (`ledger_account_id`). |
| `budgets` / `budget_items` | Presupuesto anual por cuenta, porcentaje del fondo de imprevistos y aprobación en asamblea. |

### Contabilidad

| Tabla | Para qué |
| --- | --- |
| `ledger_accounts` | Plan de cuentas (PUC simplificado) por conjunto: código, clase, naturaleza, `is_postable`, `system_key` para las cuentas que usa el sistema. |
| `journal_entries` / `journal_lines` | Comprobantes por partida doble, numerados. Cada línea lleva débito o crédito y el tercero (`unit_id` o `vendor_id`). Nunca se editan: se reversan (`reverses_entry_id`). |
| `document_sequences` | Consecutivos por tipo de documento (recibos, egresos, comprobantes). |

## 7. Zonas comunes

Detalle del flujo y de la contabilidad en [amenities.md](amenities.md).

### `amenities` — zonas comunes reservables

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| name | varchar(100) | Único por conjunto: "Salón social", "BBQ", "Cancha" |
| description | text NULL | |
| capacity | smallint NULL | Aforo por reserva |
| booking_mode | varchar(10) | `hours`, `days`, `shifts` |
| booking_fee | numeric(14,2) NULL | Tarifa de residentes por hora, día o turno |
| external_fee | numeric(14,2) NULL | Tarifa de terceros (NULL: la de residentes) |
| deposit_amount | numeric(14,2) NULL | Depósito de garantía |
| payment_mode | varchar(10) | `prepaid` (soporte antes) o `statement` (al estado de cuenta) |
| requires_approval | boolean | Forzado a `true` si hay pago anticipado o depósito |
| allow_delinquent / allow_guests / allow_external | boolean | Unidades en mora, invitados de residentes, terceros externos |
| terms | text NULL | Reglamento que se acepta al reservar |
| color | varchar(7) NULL | Color en el calendario |
| rules | jsonb | Horario, días de cierre, franjas, mín./máx., turnos, aseo, anticipación, límites por unidad, plazo de cancelación |
| is_active | boolean | Una zona con reservas se desactiva en vez de borrarse |
| created_at / updated_at | | |

### `amenity_bookings`

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| number | integer | Consecutivo por conjunto (`UNIQUE (tenant_id, number)`) |
| amenity_id | uuid FK compuesta → amenities | |
| booking_type | varchar(10) | `resident`, `guest`, `external`, `block` |
| unit_id | uuid NULL FK compuesta → units | Obligatoria para `resident` y `guest`; NULL para `external` y `block` |
| holder_name / holder_document / holder_phone / holder_email | NULL | Invitado o tercero (obligatorio el nombre en `guest` y `external`) |
| requested_by_id | uuid FK → users | |
| starts_at / ends_at | timestamptz | |
| blocked_until | timestamptz | `ends_at` + tiempo de aseo (`>= ends_at`) |
| guests_count | smallint NULL | |
| notes | text NULL | Motivo del bloqueo o notas del residente |
| status | varchar(20) | `pending`, `approved`, `rejected`, `cancelled` |
| fee_amount / deposit_amount | numeric(14,2) | Congelados al reservar |
| payment_mode | varchar(10) NULL | Copia del modo de la zona |
| payment_reference | varchar NULL | Referencia de la transferencia |
| charge_id / payment_id | uuid NULL | Cargo a la unidad y su pago, si lo hay |
| journal_entry_id | uuid NULL | Asiento del pago de terceros y del depósito |
| deposit_status | varchar(10) NULL | `held`, `returned`, `retained` |
| deposit_retained / deposit_note / deposit_journal_entry_id | NULL | Liquidación del depósito |
| reviewed_by_id / reviewed_at / review_note | NULL | Aprobación o rechazo |
| cancelled_at / cancelled_by_id / cancellation_reason | NULL | |
| reminded_at | timestamptz NULL | Recordatorio de 24 horas enviado |
| created_at / updated_at | | |

`EXCLUDE USING gist (amenity_id WITH =, tstzrange(starts_at, blocked_until) WITH &&) WHERE status IN ('pending','approved')`
impide reservas solapadas, incluido el tiempo de aseo (extensión `btree_gist`). Los soportes de
pago son `attachments` con `owner_type = 'amenity_booking'`.

## 8. Comunicación y solicitudes

### `announcements` — comunicados / circulares

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| title | varchar(200) | |
| body | text | Markdown |
| audience | varchar(20) | `all`, `residents`, `owners`, `council`, `staff` |
| published_at | timestamptz NULL | NULL = borrador; en el futuro = programado |
| is_pinned | boolean | |
| send_email | boolean | Enviar por correo al publicarse |
| emailed_at | timestamptz NULL | Cuándo se envió (una sola vez) |
| email_count | int NULL | A cuántas personas |
| email_skipped | boolean | Le tocaba enviarse pero el cupo del mes no alcanzaba |
| created_by_id | uuid FK → users | |
| created_at / updated_at / deleted_at | | |

El cuerpo es HTML saneado por la API (texto con formato); la imagen (afiche) es un adjunto con `owner_type = 'announcement_image'`. Ver [announcements.md](announcements.md).

### `announcement_buildings` — torres de un comunicado

`id, tenant_id, announcement_id (FK compuesta, CASCADE), building_id (FK compuesta, CASCADE)` ·
`UNIQUE (announcement_id, building_id)`. Sin filas = todas las torres.

### `email_quotas` — cupo mensual de correos masivos

`id, tenant_id, period (date, primer día del mes), used, extra_packs, created_at, updated_at` · `UNIQUE (tenant_id, period)`. Límite =
3.000 + `extra_packs` × 3.000. Ver [email-quota.md](email-quota.md).

### `announcement_reads` — confirmación de lectura

`id, tenant_id, announcement_id (FK compuesta), user_id, read_at` · `UNIQUE (announcement_id, user_id)`

### `tickets` — PQRS y solicitudes de mantenimiento

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| number | integer | Consecutivo por tenant: `UNIQUE (tenant_id, number)` |
| unit_id | uuid NULL FK compuesta → units | |
| created_by_id | uuid FK → users | |
| assigned_to_id | uuid NULL FK → users | |
| type | varchar(20) | `petition`, `complaint`, `claim`, `suggestion`, `maintenance` |
| subject | varchar(200) | |
| description | text | |
| priority | varchar(10) | `low`, `medium`, `high`, `urgent` |
| status | varchar(20) | `open`, `in_progress`, `resolved`, `closed` |
| resolved_at | timestamptz NULL | |
| created_at / updated_at | | |

### `ticket_comments`

`id, tenant_id, ticket_id (FK compuesta), author_id, body, is_internal (visible sólo para backoffice), created_at, updated_at`

Permisos, estados, plazos y correos: `docs/tickets.md`. Adjuntos: `attachments.owner_type = 'ticket'`.

## 9. Portería y seguridad

### `visits` — visitantes

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| unit_id | uuid FK compuesta → units | |
| visitor_name | varchar(150) | |
| visitor_document | varchar(30) NULL | |
| vehicle_plate | varchar(10) NULL | |
| type | varchar(20) | `guest`, `delivery`, `service_provider`, `other` |
| authorized_by_id | uuid NULL FK → users | Residente que pre-autoriza |
| access_code | varchar(12) NULL | Código/QR de acceso |
| expected_at | timestamptz NULL | |
| checked_in_at / checked_out_at | timestamptz NULL | |
| registered_by_id | uuid NULL FK → users | Vigilante |
| created_at / updated_at | | |

### `parking_stays` — parqueadero de visitantes

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| number | integer NULL | Consecutivo del comprobante, al dar la salida: `UNIQUE (tenant_id, number)` |
| status | varchar(10) | `inside`, `exited` |
| unit_id | uuid FK compuesta → units | Unidad visitada |
| visit_id | uuid NULL FK compuesta → visits | Visita autorizada desde el portal |
| vehicle_type | varchar(20) | `car`, `motorcycle`, `bicycle`, `other` |
| plate | varchar(10) NULL | Normalizada. `UNIQUE (tenant_id, plate) WHERE status = 'inside'` |
| vehicle_description, visitor_name, visitor_document | | |
| authorization_method | varchar(20) | `pre_authorized`, `call`, `intercom`, `in_person`, `other` |
| authorized_by_name, authorization_notes | | |
| over_capacity | boolean | Ingresó sin cupo libre |
| tariff | jsonb | Tarifa copiada al ingresar |
| entered_at, entered_by_id / exited_at, exited_by_id | | Quién dio la entrada y la salida |
| days | jsonb NULL | Detalle por día: minutos, gracia, cobrables, valor |
| minutes, grace_minutes, billed_minutes | integer | |
| amount, vat_amount | numeric(14,2) | IVA incluido en `amount` |
| settlement | varchar(10) NULL | `free`, `gate`, `unit`, `exempt` |
| payment_method, exempt_reason | | |
| cash_account_id, charge_id, journal_entry_id | uuid NULL FK compuestas | Caja, cobro a la unidad y comprobante contable |
| receipt_email, receipt_sent_at | | Comprobante por correo |

Reglas y cálculo: `docs/visitor-parking.md`.

### `parcels` — correspondencia y paquetes

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| unit_id | uuid FK compuesta → units | |
| carrier | varchar(60) NULL | |
| description | varchar(255) NULL | |
| photo_file_key | varchar NULL | |
| received_at | timestamptz | |
| received_by_id | uuid FK → users | Vigilante |
| delivered_at | timestamptz NULL | |
| delivered_to_name | varchar(150) NULL | |
| status | varchar(20) | `pending`, `delivered`, `returned` |
| created_at / updated_at | | |

## 10. Documentos

Ver [documents.md](documents.md).

### `documents` — actas, reglamentos, contratos, pólizas…

| Columna | Tipo | Notas |
| --- | --- | --- |
| id, tenant_id | | |
| folder_id | uuid FK → document_folders (SET NULL) | |
| title | varchar(200) | |
| description | text | |
| category | varchar(20) | `minutes`, `bylaws`, `financial_statement`, `budget`, `report`, `contract`, `quote`, `policy`, `deed`, `certificate`, `plan`, `correspondence`, `support`, `other` |
| visibility | varchar(20) | `community`, `owners`, `council`, `staff`, `units`, `private` (por defecto) |
| reference | varchar(60) | Número de acta, contrato o póliza |
| document_date / expires_on | date | Fecha del documento y vencimiento |
| vendor_id | uuid FK → vendors (SET NULL) | |
| published_at / archived_at | timestamptz | Nulo: borrador / no archivado |
| uploaded_by_id / updated_by_id | uuid FK → users | |
| created_at / updated_at / deleted_at | | |

Los archivos son `attachments` con `owner_type = 'document'`; el más reciente es la versión vigente.

### `document_folders`

`id`, `tenant_id`, `parent_id` (FK a sí misma, RESTRICT), `name`, timestamps. Índice único
`(tenant_id, parent_id, lower(name)) NULLS NOT DISTINCT`.

### `document_units` — unidades de un documento `units`

PK `(document_id, unit_id)`, `tenant_id`; ambas FK con CASCADE.

### `document_access_logs` — quién abrió qué

`id`, `tenant_id`, `document_id`, `attachment_id`, `user_id`, `action` (`view` | `download`),
`created_at`.

## 10c. Encuestas

Ver [surveys.md](surveys.md).

| Tabla | Columnas |
| --- | --- |
| `surveys` | `title`, `description`, `opens_at`, `closes_at`, `anonymous`, `results_visibility` (`after_vote`, `after_close`), `min_participation` (0-100, % del coeficiente), `published_at`, `reminded_at`, `created_by_id`, `updated_by_id`, timestamps |
| `survey_questions` | `survey_id` (CASCADE), `position`, `text`, `description` |
| `survey_options` | `question_id` (CASCADE), `position`, `label` |
| `survey_responses` | `survey_id`, `unit_id`, `user_id`, `coefficient` (el de la unidad al votar), `created_at`. Único `(survey_id, unit_id)` |
| `survey_tallies` | PK `(survey_id, option_id)`, `question_id`, `votes`, `coefficient`: los resultados |
| `survey_answers` | PK `(response_id, question_id)`, `option_id`. Solo en encuestas nominales |

## 10b. Notificaciones

Ver [notifications.md](notifications.md).

### `notifications` — la campana

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| tenant_id | uuid FK | |
| user_id | uuid FK → users | CASCADE |
| app | varchar(12) | `web` (portal) o `backoffice` |
| category | varchar(20) | `gatehouse`, `finance`, `announcements`, `tickets`, `bookings`, `parking` |
| type | varchar(60) | Evento: `ticket.reply`, `payment.confirmed`, … |
| title / body | varchar(200) / text NULL | |
| path | varchar(300) NULL | Ruta dentro de la app |
| dedupe_key | varchar(160) NULL | `UNIQUE (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL` |
| read_at | timestamptz NULL | |
| created_at, updated_at | timestamptz | |

Índice parcial `notifications_unread (user_id, tenant_id, app) WHERE read_at IS NULL`. Se borran las leídas de más de
90 días y todas las de más de un año.

### `push_devices` — teléfonos de la app móvil

`id`, `user_id` (CASCADE), `token` (UNIQUE: un teléfono pertenece a una cuenta), `platform`
(`android`, `ios`, `web`), `device_name`, `app_version`, `last_seen_at` y los timestamps.

Además: `users.notification_preferences` (jsonb NULL, `{ categoría: { email, push } }`) y
`announcements.notified_at` (cuándo salieron la campana y el push del comunicado).

## 11. Auditoría

### `audit_logs`

| Columna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| tenant_id | uuid NULL FK | NULL para acciones de plataforma |
| user_id | uuid NULL FK → users | |
| action | varchar(50) | `created`, `updated`, `deleted`, `restored`, `exported` |
| auditable_type | varchar(50) | Nombre de la tabla/modelo |
| auditable_id | uuid | |
| changes | jsonb NULL | `{ label, before, after, details }`: solo los campos que cambiaron |
| ip_address | inet NULL | |
| created_at | timestamptz | |

`INDEX (tenant_id, auditable_type, auditable_id)`

Qué se registra y cómo: [audit.md](audit.md).

## 12. Fases posteriores (no incluidas aún)

- **Asambleas**: `assemblies`, `assembly_attendees` (con poderes/representación), `assembly_votes`, votación ponderada por `ownership_coefficient` y cálculo de quórum.
- **Contabilidad**: presupuesto anual, gastos y proveedores (`budgets`, `expenses`, `vendors`).
- **SaaS**: `plans`, `subscriptions`, `invoices` de la plataforma hacia cada tenant.

## 13. Implementación

Todas las tablas de este documento ya tienen migración (`apps/api/database/migrations/<módulo>`,
una tabla por archivo, solo `createTable`) y modelo Lucid (`apps/api/app/models/<módulo>`). El orden
de los módulos está en `config/database.ts` (ver README, *API por módulos*). Notas:

- `database/tenant_schema.ts` define los helpers comunes: `tenantTable` (id uuidv7, `tenant_id`,
  `UNIQUE (tenant_id, id)`) y `tenantForeign` (FK compuesta).
- Los valores permitidos de las columnas tipo enum viven en `packages/shared/src/domain.ts` y se
  usan tanto en los `CHECK` de las migraciones como en validadores y frontends.
- Las consultas de datos de un tenant se hacen **siempre** a través de las relaciones del modelo
  `Tenant`: `ctx.tenant.related('units').query()` / `.create()`.
- Las columnas `numeric` se exponen como `string` en la API para no perder precisión.

### Orden de migraciones

1. ✅ `users` y `auth_access_tokens` (uuid)
2. ✅ `tenants`
3. ✅ `enrollments`
3b. ✅ `oauth_*` (creadas y luego eliminadas al pasar a access tokens)
4. ✅ `buildings` → `units` → `unit_occupants` → `vehicles` → `pets`
5. ✅ `charge_concepts` → `charges` → `payments` → `payment_allocations`
6. ✅ `amenities` → `amenity_bookings`
7. ✅ `announcements` → `announcement_reads` → `tickets` → `ticket_comments`
8. ✅ `visits` → `parcels` → `documents` → `audit_logs` → `parking_stays`
9. ✅ Finanzas: plan de cuentas y comprobantes → cartera extendida (periodos, tarifas, módulos,
   presupuesto, ajustes) → proveedores, facturas, egresos y bancos

Ejemplo de FK compuesta en una migración de Lucid:

```ts
this.schema.createTable('unit_occupants', (table) => {
  table.uuid('id').primary().defaultTo(this.raw('uuidv7()'))
  table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT')
  table.uuid('unit_id').notNullable()
  // …
  table
    .foreign(['tenant_id', 'unit_id'])
    .references(['tenant_id', 'id'])
    .inTable('units')
    .onDelete('CASCADE')
  table.index(['tenant_id', 'unit_id'])
})

// y en `units`:
table.unique(['tenant_id', 'id'])
```
