# Plan de trabajo — AptoPH

Hoja de ruta del producto por módulos: qué hay hoy, qué falta, qué tener en cuenta y en qué orden
trabajarlo. Actualízalo al cerrar cada entrega (marca ✅ y mueve lo que cambie de prioridad).

Última revisión: 18 de noviembre de 2026.

## Índice

1. [Estado actual](#1-estado-actual)
2. [Orden de prioridades](#2-orden-de-prioridades)
3. [Reglas para todo módulo](#3-reglas-para-todo-módulo)
4. [Módulos](#4-módulos)
5. [Pendientes operativos inmediatos](#5-pendientes-operativos-inmediatos)

---

## 1. Estado actual

El modelo de datos está completo para el núcleo (todas las tablas de `docs/database-model.md`
tienen migración y modelo). Lo que falta es, sobre todo, **API y pantallas de gestión en el
backoffice**: hoy el administrador solo maneja la estructura del conjunto, mientras que el portal de
residentes ya consume varios módulos que nadie puede administrar desde la web.

| Módulo | API | Backoffice | Portal residentes | Móvil |
| --- | --- | --- | --- | --- |
| Cuenta, acceso y suscripción | 🟡 login, registro, logout, plan | 🟡 login, registro, plan | 🟡 login, perfil | ⬜ |
| Estructura y censo | ✅ torres, unidades, ocupantes | ✅ | ✅ hogar, vehículos, mascotas | ⬜ |
| Cartera (cuotas) | ✅ | ✅ | ✅ estado de cuenta | ⬜ |
| Pagos y recaudo | 🟡 manual, sin pasarela | ✅ | ✅ reportar pago | ⬜ |
| Zonas comunes y reservas | 🟡 solo residente | ⬜ | ✅ | ⬜ |
| Comunicados | ⬜ (solo tablas) | ⬜ | ⬜ | ⬜ |
| PQRS y mantenimiento | 🟡 solo residente | ⬜ | ✅ | ⬜ |
| Portería, visitas y paquetes | 🟡 solo residente | ⬜ | ✅ | ⬜ |
| Documentos | ⬜ (solo tablas) | ⬜ | ⬜ | ⬜ |
| Auditoría y reportes | ⬜ (solo tablas) | ⬜ | — | — |
| Notificaciones | 🟡 correo de bienvenida | — | ⬜ | ⬜ |
| Asambleas | ⬜ | ⬜ | ⬜ | ⬜ |
| Presupuesto, gastos y contabilidad | ✅ | ✅ | — | — |

✅ hecho · 🟡 parcial · ⬜ sin empezar · — no aplica

Los datos del conjunto demo (`demo_seeder`) ya cubren todos los módulos, así que cada pantalla nueva
se puede probar con datos reales desde el primer día.

---

## 2. Orden de prioridades

El criterio es: primero lo que impide vender o usar el producto en un conjunto real, después lo que
la landing ya promete, y al final lo que diferencia.

### Fase 1 — Listo para el primer conjunto real (P0)

Sin esto un administrador no puede operar ni invitar a su gente.

1. ✅ **Cuenta y acceso**: invitaciones de personal y residentes, recuperación de contraseña, límite de
   intentos de login. *(módulo 4.1)*
2. ✅ **Cartera desde el backoffice**: conceptos de cobro, generación mensual de cuotas por
   coeficiente, cobros puntuales e intereses de mora. Es el corazón del producto. *(4.3)*
3. ✅ **Registro manual de pagos** con aplicación a cargos y paz y salvo. *(4.4)*
4. **Gestión de PQRS en el backoffice**: los residentes ya radican y nadie las responde. *(4.7)*
5. **Gestión de reservas en el backoffice**: zonas comunes y aprobación de reservas. *(4.5)*

### Fase 2 — Operación diaria completa (P1)

6. **Importación del censo desde Excel**: la landing promete migración sin costo; mientras llega,
   la migración la hace el equipo de AptoPH. *(4.2)*
7. **Portería para vigilantes**: registrar ingresos de visitas y recepción de paquetes. *(4.8)*
8. **Comunicados** con confirmación de lectura. *(4.6)*
9. **Notificaciones por correo** de los eventos clave (cobro emitido, pago aplicado, reserva,
   paquete, respuesta a PQRS). *(4.11)*
10. **Documentos del conjunto**. *(4.9)*
11. **Auditoría y reportes** (cartera por edades, recaudo del mes, exportar a Excel). *(4.10)*
12. **Facturación del SaaS** y activación sin comandos manuales. *(4.1)*

### Fase 3 — Crecimiento y diferenciación (P2)

13. **Pagos en línea** (PSE/tarjeta) con conciliación automática. *(4.4)*
14. **App móvil** (Flutter) y notificaciones push. *(4.12)*
15. **Asambleas virtuales** con quórum y votación por coeficiente. *(4.13)*
16. ✅ **Presupuesto, gastos y proveedores** (con contabilidad por partida doble). *(4.14)*
17. **Plan Empresarial**: administradoras con varias copropiedades. *(4.1)*

> La landing anuncia como "próximamente" asambleas, push y presupuesto. Si cambia el orden de las
> fases, revisa `apps/landing/src/content.ts` para no prometer algo que no está en el plan.

---

## 3. Reglas para todo módulo

Aplican a cualquier funcionalidad nueva; un módulo no se da por terminado si no las cumple.

**Datos y multi-tenancy**
- Toda consulta de un conjunto pasa por `ctx.tenant.related(...)`; nunca filtrar `tenant_id` a mano.
- FK compuestas con `tenantForeign` (`database/tenant_schema.ts`) para que un registro no pueda
  apuntar a otro conjunto.
- Dinero en `numeric(14,2)` y expuesto como `string`; nunca `float` ni sumas en el frontend.
- Valores de enums en `packages/shared/src/domain.ts`, usados en el `CHECK`, el validador y la UI.
- Borrado lógico (`deleted_at`) en lo que tenga historia (unidades, cobros, documentos).

**Permisos**
- Rutas del backoffice con `middleware.tenant({ roles })`: lectura para el personal del
  backoffice, escritura solo para `administrator` salvo que el módulo diga otra cosa.
- Las escrituras del backoffice llevan `middleware.subscription()` (bloqueo cuando vence el plan).
- El residente solo ve lo de sus unidades: responder `404` (no `403`) a lo ajeno.
- Definir por módulo qué ven `council_member`, `accountant`, `fiscal_reviewer`, `staff` y
  `security_guard` antes de escribir las rutas.

**Calidad**
- Tests funcionales en `apps/api/tests/functional` para cada endpoint: permisos por rol, aislamiento
  entre conjuntos y validaciones.
- Tipos de respuesta en `@aptoph/shared`; nada de `any` en los frontends.
- `pnpm lint`, `typecheck`, `test` y `build` en verde antes de hacer push.
- Agregar datos del módulo al `demo_seeder` y probar en el navegador con el usuario demo.

**Producto**
- Textos en español de Colombia, montos en COP con `formatCop`, fechas en `America/Bogota`.
- Diseño con la marca (`branding/`): droni-kit, `PageHeader`, `EmptyState` e ilustraciones.
- Toda acción sobre dinero o datos personales deja registro en `audit_logs`.
- Datos personales según la Ley 1581 de 2012: pedir solo lo necesario y permitir corregirlos.
- Actualizar `docs/` y el README de la app cuando cambie un flujo o una variable de entorno.

---

## 4. Módulos

### 4.1 Cuenta, acceso y suscripción

**Hay hoy:** login, registro de conjuntos con prueba de 30 días, logout, perfil, selección de
conjunto, pantalla de plan con solicitud de activación, comando `subscription:activate`.

**Hecho** (noviembre 2026)
- [x] **Invitaciones** (P0): por correo a personal y residentes, también desde la ficha de la
      unidad (vincula al ocupante). Pantalla para aceptar y crear contraseña; reenviar, cancelar y
      ver si el enlace venció.
- [x] **Recuperación de contraseña** (P0): token de un solo uso de 1 hora; cierra todas las sesiones.
- [x] **Límite de intentos** (P0): login, correos de recuperación y confirmación, registro y
      endpoints públicos (`@adonisjs/limiter`).
- [x] Gestión de personas: buscar, filtrar por estado, editar cargo y vigencia, suspender,
      reactivar y retirar, sin dejar el conjunto sin administración.
- [x] Editar perfil y cambiar contraseña (portal y backoffice).
- [x] Verificación de correo, con aviso y reenvío en las dos apps.
- [x] Ver y cerrar sesiones abiertas.
- [x] Configuración del conjunto: nombre, razón social, NIT, tipo, dirección y ciudad.

**Falta**
- [x] Día de corte, tasa de mora y demás reglas financieras: Finanzas → Configuración (4.3).
- [ ] Logo del conjunto.
- [ ] Cambio de correo con confirmación.
- [ ] Facturación del SaaS (P1): facturas del plan, pago y activación automática; recordatorios al
      vencer la prueba; estados `past_due` y `suspended`.
- [ ] Panel de superadmin (`is_platform_admin`): conjuntos, suscripciones, soporte.
- [ ] Plan Empresarial (P2): una administradora con varios conjuntos y vista consolidada.

**Tener en cuenta**
- Las respuestas de "olvidé mi contraseña" no deben revelar si el correo existe.
- Al revocar un rol, revocar también los tokens si el usuario ya no pertenece a ningún conjunto.
- Un usuario puede tener varios roles en varios conjuntos; la UI ya maneja el cambio de conjunto.

---

### 4.2 Estructura y censo

**Hay hoy:** CRUD de torres, unidades (con coeficiente, área, anexos) y ocupantes en el backoffice;
el residente gestiona su hogar, vehículos y mascotas.

**Falta**
- [ ] **Importación desde Excel/CSV** (P1): torres, unidades, coeficientes y ocupantes, con
      plantilla descargable, vista previa, validación por fila y reporte de errores.
- [ ] Validar que los coeficientes sumen 1 (o 100 %) y mostrar la diferencia en el backoffice.
- [ ] Vehículos y mascotas visibles y editables desde el backoffice (portería los necesita).
- [ ] Historial de ocupantes (quién vivió y cuándo) en vez de borrar.
- [ ] Exportar el censo a Excel.

**Tener en cuenta**
- Los coeficientes son la base de cuotas y votaciones: cambiarlos afecta cobros futuros, no los ya
  emitidos. Dejar registro en auditoría.
- Un propietario puede no vivir en la unidad; el responsable de pagos (`is_billing_responsible`) es
  quien recibe los cobros.

---

### 4.3 Cartera: cuotas y cobros

**Hecho** (ver `docs/finance.md`)
- [x] Conceptos de cobro con sus cuentas contables, mora y pronto pago.
- [x] Calculadora de cuotas: coeficiente, módulos de contribución (conjuntos mixtos), área, partes
      iguales o valor fijo por tipo; desde un valor o desde el presupuesto aprobado; anexos sumados
      a su unidad principal; redondeo configurable; vista previa con la cuota actual.
- [x] Tarifas por unidad con vigencia (parqueaderos asignados, cuotas pactadas).
- [x] **Facturación mensual** idempotente con vista previa, completar, cerrar y reabrir.
- [x] Cobros puntuales a varias unidades o a todo un tipo; anulación y notas crédito con motivo.
- [x] Intereses de mora sobre capital vencido (nunca sobre intereses) y descuento por pronto pago.
- [x] Estado de cuenta por unidad (backoffice y portal) y cartera por edades, con CSV.
- [x] `ChargeService.create` con `idempotencyKey` para que parqueaderos, visitantes y reservas
      generen sus cobros (ya lo usa la reserva del demo).

**Falta**
- [ ] Estado de cuenta, cuenta de cobro y paz y salvo en PDF; envío por correo.
- [ ] Cobros automáticos de parqueadero de visitantes y reservas cuando existan esos flujos.
- [ ] Importar saldos iniciales de cartera desde Excel (fase 2).

**Tener en cuenta**
- La tasa de mora tiene un tope del sistema (5 %), pero el máximo legal cambia cada mes: el
  conjunto debe mantenerla actualizada.

---

### 4.4 Pagos y recaudo

**Hecho**
- [x] Registro manual con recibo de caja numerado y cuenta donde entró el dinero.
- [x] Aplicación automática (intereses primero o lo más antiguo primero) y saldo a favor que se
      aplica solo al facturar.
- [x] El residente reporta su pago; la administración lo confirma (eligiendo la cuenta) o lo
      rechaza con motivo.
- [x] Reversión de pagos (cheque devuelto) que devuelve el saldo a los cargos.

**Falta**
- [ ] Soporte adjunto del pago (cuando haya almacenamiento de archivos).
- [ ] Recibo y paz y salvo en PDF.
- [ ] Importar extracto bancario y conciliar por referencia (P1).
- [ ] **Pagos en línea** (P2): PSE y tarjeta; webhook que registra y aplica el pago.

**Tener en cuenta**
- Con pasarela: validar firma del webhook, idempotencia por referencia y montos en centavos.

---

### 4.5 Zonas comunes y reservas

**Hay hoy:** el residente ve zonas comunes, reserva con validación de horario, aforo y duración, y
cancela.

**Falta**
- [ ] CRUD de zonas comunes en el backoffice: horario, aforo, duración máxima, tarifa, depósito,
      días de cierre, si requiere aprobación.
- [ ] Aprobar o rechazar reservas con motivo (P0).
- [ ] Calendario de ocupación por zona.
- [ ] Cobro automático de la tarifa a la cartera de la unidad al aprobar.
- [ ] Bloquear reservas a unidades en mora (opcional por conjunto).
- [ ] Reglas de cancelación (horas mínimas de anticipación).

**Tener en cuenta**
- Evitar reservas solapadas con una restricción en base de datos, no solo en código.
- Horas en la zona horaria del conjunto.

---

### 4.6 Comunicados y circulares

**Hay hoy:** tablas `announcements` y `announcement_reads`.

**Falta**
- [ ] Crear, programar y publicar comunicados en el backoffice, con adjuntos.
- [ ] Segmentar por torre, por rol (propietarios, residentes, consejo) o todo el conjunto.
- [ ] Bandeja de comunicados en el portal y confirmación de lectura.
- [ ] Reporte de quién leyó y quién no.
- [ ] Envío por correo al publicar (P1, ver 4.11).

**Tener en cuenta**
- Las convocatorias a asamblea tienen requisitos de anticipación y medio (Ley 675); cuando llegue
  el módulo de asambleas, enlazarlas desde aquí.

---

### 4.7 PQRS y mantenimiento

**Hay hoy:** el residente radica, consulta y comenta sus solicitudes.

**Falta**
- [ ] **Bandeja en el backoffice** (P0): filtros por estado, tipo, torre y fecha.
- [ ] Asignar a una persona del personal, cambiar estado y responder.
- [ ] Comentarios internos que el residente no ve.
- [ ] Adjuntar fotos.
- [ ] Tiempos de respuesta y alertas de solicitudes vencidas.
- [ ] Encuesta de satisfacción al cerrar.

**Tener en cuenta**
- El residente debe recibir aviso de cada respuesta (correo, luego push).
- `staff` ve solo lo que tiene asignado.

---

### 4.8 Portería: visitas y paquetes

**Hay hoy:** el residente autoriza visitas con código de acceso y consulta sus paquetes.

**Falta**
- [ ] **Vista de portería** para `security_guard` (P1): buscar por código, nombre o unidad;
      registrar ingreso y salida.
- [ ] Registrar visitas no autorizadas previamente, llamando o avisando al residente.
- [ ] Recepción de paquetes con foto y entrega con firma o código.
- [ ] Consulta de vehículos y mascotas por placa o unidad.
- [ ] Minuta de portería (novedades por turno).
- [ ] Interfaz pensada para tablet o celular y con conexión inestable.

**Tener en cuenta**
- Datos de visitantes = datos personales: definir cuánto tiempo se guardan y borrarlos después.
- El vigilante no debe ver la cartera de las unidades.

---

### 4.9 Documentos del conjunto

**Hay hoy:** tabla `documents`.

**Falta**
- [ ] Subir documentos por categoría (reglamento, actas, estados financieros, contratos).
- [ ] Visibilidad por rol (todos, propietarios, consejo).
- [ ] Consulta y descarga en el portal.

**Tener en cuenta**
- Elegir almacenamiento (p. ej. DigitalOcean Spaces) y enlaces firmados con vencimiento; nunca
  archivos públicos.
- Este almacenamiento también lo usan soportes de pago, fotos de PQRS y paquetes: resolverlo una
  vez para todos los módulos.

---

### 4.10 Auditoría y reportes

**Hay hoy:** tabla `audit_logs`.

**Falta**
- [ ] Registrar automáticamente cambios en dinero, censo, permisos y configuración.
- [ ] Consulta de auditoría en el backoffice (administración, revisor fiscal).
- [ ] Reportes: recaudo del mes, cartera por edades, ocupación de zonas, PQRS por estado.
- [ ] Exportar a Excel y PDF.
- [ ] Indicadores reales en el inicio del backoffice.

---

### 4.11 Notificaciones

**Hay hoy:** correo de bienvenida y aviso a ventas al pedir activación (`@adonisjs/mail`, Mailjet).

**Falta**
- [ ] Correos transaccionales (P1): invitación, recuperación de contraseña, cobro emitido, pago
      aplicado, reserva aprobada o rechazada, paquete recibido, respuesta a PQRS, comunicado.
- [ ] Envío en cola (no bloquear la petición) y reintentos.
- [ ] Preferencias del usuario: qué avisos recibe y por qué canal.
- [ ] Centro de notificaciones en el portal (tabla `notifications`).
- [ ] Push en la app móvil (`device_tokens`, P2).

**Tener en cuenta**
- Masivos (comunicados a 800 unidades) en lotes, respetando los límites de Mailjet.
- Enlace para dejar de recibir correos no transaccionales.

---

### 4.12 App móvil (Flutter)

**Hay hoy:** solo el README en `apps/mobile` (el proyecto aún no se ha generado).

**Alcance inicial (P2):** lo mismo que el portal de residentes (inicio, estado de cuenta, reservas,
visitas, paquetes, PQRS, comunicados) más notificaciones push. Después, una versión para portería.

**Tener en cuenta**
- Reutiliza la misma API y los mismos access tokens (`device` = "App móvil").
- Guardar el token en almacenamiento seguro del sistema (Keychain / Keystore).
- Empezar cuando el portal web tenga estables los módulos de Fase 1 y 2 para no duplicar cambios.

---

### 4.13 Asambleas virtuales

**Hay hoy:** nada (está en "fases posteriores" del modelo de datos).

**Falta (P2)**
- [ ] Convocatoria con orden del día.
- [ ] Registro de asistencia y poderes (representación).
- [ ] Quórum en tiempo real según coeficientes presentes.
- [ ] Votaciones ponderadas por coeficiente y resultados.
- [ ] Generación del acta.

**Tener en cuenta**
- Las reglas de quórum, mayorías y convocatoria salen de la Ley 675 de 2001 y del reglamento de
  cada conjunto: validarlas con un abogado antes de liberar.
- Las asambleas no presenciales tienen requisitos propios de prueba y registro.

---

### 4.14 Presupuesto, gastos, proveedores y contabilidad

**Hecho**
- [x] Presupuesto anual por cuentas, fondo de imprevistos (mínimo 1 %), aprobación con acta y
      ejecución frente a lo real; base de la cuota mensual.
- [x] Proveedores, facturas con IVA y retenciones, egresos numerados, pago inmediato de caja menor,
      reversión y cuentas por pagar por edades.
- [x] Bancos y cajas con auxiliar contable y traslados.
- [x] Contabilidad por partida doble: PUC simplificado, comprobantes automáticos, notas de
      contabilidad, reversión y cierre contable por fecha.
- [x] Estado de resultados, balance general, balance de prueba y libro auxiliar con CSV; acceso de
      solo lectura para el consejo y la revisoría fiscal.

**Falta**
- [ ] Contratos de proveedores y soportes adjuntos.
- [ ] Nómina, activos fijos con depreciación automática e información exógena.
- [ ] Exportación en el formato de importación de los programas contables más usados.

---

## 5. Pendientes operativos inmediatos

Antes del próximo despliegue a producción:

- [ ] Actualizar la spec de DigitalOcean (`doctl apps spec get` → editar → `update`): quitar
      `SESSION_DRIVER`, `WEB_URL` y `production_seeder` del job `migrate`.
- [ ] Agregar `BACKOFFICE_URL=https://admin.aptoph.com` al componente del API.
- [ ] Avisar que, tras el cambio a access tokens, todos los usuarios deben iniciar sesión otra vez.
- [ ] Borrar `docs/brand/` (marca anterior) y la referencia en `apps/landing/README.md`, si se
      confirma que ya no se usa.
