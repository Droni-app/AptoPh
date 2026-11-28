# Auditoría

Bitácora de los cambios en dinero, censo, permisos, configuración y comunicaciones del conjunto.
Responde quién hizo el cambio, cuándo, desde qué IP y qué valores cambiaron. La consultan en el
backoffice la administración, el revisor fiscal y el consejo. El contador ve solo los
movimientos de finanzas.

Código:
- Tipos y etiquetas: `packages/shared/src/audit.ts` (`AUDITABLE_TYPES`, `AUDIT_FIELD_LABELS`).
- Registro: `apps/api/app/services/audit/audit_log.ts` (`auditable`, `recordAudit`) y
  `services/audit/context.ts` (quién hace la petición).
- Qué se registra: `apps/api/start/audit.ts` (precargado en `adonisrc.ts`).
- Middleware: `audit_context_middleware` (en `start/kernel.ts`, en todas las rutas).
- Consulta: `audit_logs_controller`. Pruebas: `apps/api/tests/functional/audit/audit.spec.ts`.
- Backoffice: `views/reports/AuditLogView.vue` (ruta `/auditoria`).

## Cómo se registra

- **Hooks de Lucid:** `auditable(Model, opciones)` registra `after:create`, `before/after:update` y
  `after:delete`. El cambio se escribe en la misma transacción que el registro: si la operación
  falla, la entrada tampoco queda.
- **Quién:** el middleware guarda el `HttpContext` en un `AsyncLocalStorage`. La entrada toma el
  usuario autenticado y la IP. Lo que corre fuera de una petición (comandos, seeders, tareas
  programadas) queda sin usuario y se muestra como "Sistema".
- **Qué cambió:** `changes = { label, before, after, details }`. Una actualización guarda solo los
  campos que cambiaron. De un jsonb (p. ej. la configuración del conjunto) guarda solo las claves
  que cambiaron. Las contraseñas, los tokens y los hashes nunca se guardan. Los textos largos se
  recortan a 500 caracteres.
- **Eliminar y restaurar:** cuando un update cambia `deletedAt`, la acción es `deleted` o
  `restored`.
- **Crear y completar:** si un registro se crea y se completa en la misma petición (número,
  estado), queda una sola entrada `created` con los valores finales.
- **`label`:** cómo se lee el registro en la lista ("Recibo 12 · Torre 1 · 302").

## Qué no se registra

Las operaciones en bloque llenarían la bitácora sin aportar nada. Las reglas por modelo están en
`start/audit.ts`:

- Los cobros que genera la facturación del mes (sí los cobros manuales) y los cambios de saldo o
  estado que producen los pagos.
- Los asientos automáticos de la contabilidad: sí los manuales, de apertura, traslados y
  reversiones.
- El plan de cuentas que se crea la primera vez que se entra a finanzas (`withoutAudit`).
- Campos de servicio: contadores de notificaciones, fechas de recordatorio y saldos calculados.
- El estado de las estadías del parqueadero de visitantes (entrada y salida). Sí las
  exoneraciones.

Para un proceso masivo nuevo, envuélvelo en `withoutAudit(() => …)`. Si un cambio no pasa por un
modelo (query builder, `createMany`), regístralo con `recordAudit`. Así lo hace el presupuesto al
reemplazar sus partidas.

## Módulos

| Módulo | Registros |
| --- | --- |
| Finanzas | Pagos, cobros, ajustes, periodos, cuotas, conceptos, cuentas contables, asientos, bancos, proveedores, facturas, egresos, presupuestos, parqueadero de visitantes |
| Censo | Torres, unidades, ocupantes, vehículos, mascotas, parqueaderos, asignaciones y sorteos |
| Accesos | Matrículas: invitaciones, roles y bajas |
| Configuración | Datos y ajustes del conjunto |
| Comunicaciones | Comunicados, documentos y encuestas |
| Operación | Zonas comunes, reservas y PQRS (estado, responsable y prioridad) |
| Reportes | Descargas de reportes y de la bitácora |

## API

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/audit-logs` | Lista paginada (50 por página) |
| GET | `/audit-logs/:id` | Una entrada con los valores antes y después |
| GET | `/audit-logs/export?format=xlsx\|csv` | La lista filtrada como archivo (hasta 5.000 filas; la descarga también se registra) |

Filtros: `from`, `to` (fechas en la zona del conjunto), `module`, `type`, `action`, `userId`,
`recordId` (la historia de un registro) y `search` (en el detalle del registro o el nombre de la
persona). Las entradas de otro conjunto no se ven ni por id.

## Datos

La tabla `audit_logs` está descrita en [database-model.md](database-model.md#11-auditoría). Es solo
de escritura: nadie edita ni borra entradas desde la aplicación.
