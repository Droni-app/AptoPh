# Plan de trabajo — AptoPH

Hoja de ruta del producto por módulos: qué hay hoy, qué falta, qué tener en cuenta y en qué orden
trabajarlo. Actualízalo al cerrar cada entrega (marca ✅ y mueve lo que cambie de prioridad).

Última revisión: 27 de noviembre de 2026 (tras la primera prueba punta a punta en producción).

## Índice

1. [Estado actual](#1-estado-actual)
2. [Orden de prioridades](#2-orden-de-prioridades)
3. [Reglas para todo módulo](#3-reglas-para-todo-módulo)
4. [Módulos](#4-módulos)
5. [Pendientes operativos inmediatos](#5-pendientes-operativos-inmediatos)
6. [Pendientes para producción con calidad](#6-pendientes-para-producción-con-calidad)

---

## 1. Estado actual

Producción (`aptoph.com`) está desplegada y vacía, lista para el primer conjunto: cada conjunto
se crea desde el registro y cada push a `main` despliega solo. El núcleo administrativo
(estructura, censo, importación, cartera, recaudo, presupuesto, contabilidad y comunicados) está
completo. Lo que falta es, sobre todo, la **gestión en el backoffice de los módulos que el portal
de residentes ya usa** (PQRS, reservas, portería) y el endurecimiento para operar con clientes
reales (sección 6).

| Módulo | API | Backoffice | Portal residentes | Móvil |
| --- | --- | --- | --- | --- |
| Cuenta, acceso y suscripción | ✅ (Wompi en sandbox) | ✅ | ✅ | ⬜ |
| Estructura y censo | ✅ torres, unidades, ocupantes, importación CSV | ✅ | ✅ hogar, vehículos, mascotas | ⬜ |
| Cartera (cuotas) | ✅ | ✅ | ✅ estado de cuenta | ⬜ |
| Pagos y recaudo | 🟡 manual, sin pasarela | ✅ | ✅ reportar pago | ⬜ |
| Zonas comunes y reservas | ✅ calendario, aprobación, pago, depósito, terceros | ✅ | ✅ | ⬜ |
| Comunicados | ✅ texto con formato, imagen, correo | ✅ | ✅ | ⬜ |
| PQRS y mantenimiento | ✅ bandeja, asignación, notas internas, plazos, correo | ✅ | ✅ | ⬜ |
| Parqueaderos del conjunto | ✅ propios y comunales, asignación, cobro mensual, sorteo y lista de espera | ✅ | ✅ | ⬜ |
| Portería, visitas y paquetes | 🟡 parqueadero de visitantes; visitas y paquetes solo residente | ✅ | ✅ | ⬜ |
| Documentos | ✅ carpetas, versiones, visibilidad por rol y unidad, registro de consultas, vencimientos | ✅ | ✅ | ⬜ |
| Auditoría y reportes | ⬜ (solo tablas) | ⬜ | — | — |
| Notificaciones | ✅ campana, correo y push (FCM) por categoría y canal, recordatorio de vencimiento | ✅ | ✅ | ⬜ |
| Encuestas previas a la asamblea | ✅ una por unidad, coeficiente, anónimas o nominales, recordatorio | ✅ | ✅ | ⬜ |
| Asambleas | ⬜ | ⬜ | ⬜ | ⬜ |
| Presupuesto, gastos y contabilidad | ✅ | ✅ | — | — |

✅ hecho · 🟡 parcial · ⬜ sin empezar · — no aplica

Los datos del conjunto demo (`demo_seeder`, solo en desarrollo) cubren todos los módulos, así que
cada pantalla nueva se puede probar con datos reales desde el primer día. Producción no tiene
datos demo.

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
4. ✅ **Gestión de PQRS en el backoffice**: bandeja, asignación, respuestas y notas internas. *(4.7)*
5. ✅ **Gestión de reservas en el backoffice**: zonas comunes y aprobación de reservas. *(4.5)*

### Fase 2 — Operación diaria completa (P1)

6. ✅ **Importación del censo desde CSV** con vista previa e importación por fila. *(4.2)*
7. **Portería para vigilantes**: registrar ingresos de visitas y recepción de paquetes. *(4.8)*
8. ✅ **Comunicados** con confirmación de lectura, texto con formato e imagen. *(4.6)*
9. ✅ **Notificaciones** de los eventos clave en la campana, por correo y push, con preferencias por
   categoría y canal. *(4.11)*
10. **Documentos del conjunto**. *(4.9)*
11. **Auditoría y reportes** (cartera por edades, recaudo del mes, exportar a Excel). *(4.10)*
12. 🟡 **Facturación del SaaS**: pago con Wompi hecho; falta pasar a llaves de producción y la
    factura electrónica (6.1). *(4.1)*

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
- Diseño con la marca (`branding/`): `@aptoph/ui`, `PageHeader`, `EmptyState` e ilustraciones.
- Toda acción sobre dinero o datos personales deja registro en `audit_logs`.
- Datos personales según la Ley 1581 de 2012: pedir solo lo necesario y permitir corregirlos.
- Actualizar `docs/` y el README de la app cuando cambie un flujo o una variable de entorno.

---

## 4. Módulos

### 4.1 Cuenta, acceso y suscripción

**Hay hoy:** login, registro de conjuntos con prueba de 30 días y aceptación de términos con
evidencia (`legal_acceptances`), logout, perfil, selección de conjunto, pantalla de plan con pago en
línea (Wompi, hoy en sandbox) y plan único de max(50.000, unidades × 500) COP al mes.

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
- [x] **Pago del plan con Wompi**: tarjeta, Nequi, Bancolombia y DaviPlata tokenizados; renovación
      automática con aviso, reintentos y 7 días de gracia; compra de correos masivos; comprobante
      por correo ([billing.md](docs/billing.md)).

**Falta**
- [x] Día de corte, tasa de mora y demás reglas financieras: Finanzas → Configuración (4.3).
- [ ] Logo del conjunto.
- [ ] Cambio de correo con confirmación.
- [ ] Wompi con llaves de producción y factura electrónica del plan (ver 6.1).
- [ ] Recordatorios por correo antes de vencer la prueba (7, 3 y 1 día).
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
- [x] **Importación desde CSV** (docs/import.md): torres, unidades, coeficientes y personas, con
      archivo de ejemplo, vista previa de nuevos y actualizados, errores por columna e importación
      o descarte por fila.
- [ ] Importación: columna «invitar» para enviar la invitación al portal al importar.
- [ ] Importación: marcar Ocupada una unidad existente al importarle una persona si la fila no trae
      estado.
- [ ] Importación de vehículos y mascotas, y de saldos iniciales de cartera.
- [ ] Validar que los coeficientes sumen 1 (o 100 %) y mostrar la diferencia en el backoffice.
- [ ] Vehículos y mascotas visibles y editables desde el backoffice (portería los necesita).
- [x] **Parqueaderos del conjunto** (`docs/parking.md`): propios y comunales, máximo por unidad,
      tarifas mensuales por tipo de vehículo que se cobran con la cuota (prorrateadas), asignación
      con requisitos, cancelación y rechazo con motivo, consulta en portería, vehículos de terceros
      y fechas de SOAT y tecnomecánica.
- [x] Parqueaderos, fase 2: sorteo auditable con postulaciones desde el portal, lista de espera,
      ofertas con plazo, correos y cierre del periodo.
- [ ] Parqueaderos: proceso programado que venza ofertas y recuerde antes del vencimiento.
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
- [x] Soportes adjuntos del recibo de caja: la administración en el backoffice y el residente al
      reportar su pago en el portal (docs/files.md).

**Falta**
- [ ] Recibo y paz y salvo en PDF.
- [ ] Importar extracto bancario y conciliar por referencia (P1).
- [ ] **Pagos en línea** (P2): PSE y tarjeta; webhook que registra y aplica el pago.

**Tener en cuenta**
- Con pasarela: validar firma del webhook, idempotencia por referencia y montos en centavos.

---

### 4.5 Zonas comunes y reservas

**Hecho** (ver [docs/amenities.md](docs/amenities.md)):
- [x] CRUD de zonas comunes: modalidad por horas, días o turnos; horario, días de cierre, aforo,
      tiempo de aseo, tarifa, tarifa para terceros, depósito, reglamento y color.
- [x] Pago anticipado con soporte o cargo al estado de cuenta, configurable por zona.
- [x] Aprobar o rechazar con motivo; registro contable del pago, del depósito y de su devolución.
- [x] Calendario semanal y mensual; bloqueos de mantenimiento; reservas de invitados y terceros.
- [x] Bloqueo de unidades en mora, anticipación mínima y máxima, límites por unidad y plazo de
      cancelación.
- [x] Restricción de exclusión en la base de datos (incluye el tiempo de aseo).
- [x] Notificaciones y recordatorio 24 horas antes.

**Siguiente**
- [ ] Check-in en portería (QR) e inspección de entrega con fotos y checklist.
- [ ] Pago en línea (Wompi/PSE) del pago anticipado y del depósito.
- [ ] Tarifas por día de la semana o festivos (calendario de festivos de Colombia).
- [ ] Lista de espera, inasistencias y sanciones.
- [ ] Bloqueos recurrentes, reportes de ocupación e ingresos, exportar a iCal.

---

### 4.6 Comunicados y circulares

**Hecho** (docs/announcements.md)
- [x] Crear, programar, publicar y despublicar comunicados en el backoffice, con adjuntos; la
      administración y el consejo los escriben.
- [x] Audiencia: todo el conjunto, residentes, propietarios, consejo o personal, y por torre.
- [x] Bandeja de comunicados en el portal con adjuntos; abrirlo lo marca como leído.
- [x] Reporte de quién leyó y quién no.
- [x] Envío por correo al publicar (también los programados), una sola vez.
- [x] Cupo de 3.000 correos masivos al mes por conjunto, con paquetes adicionales de 3.000 por
      $10.000 que pide la administración y activa AptoPH (docs/email-quota.md).
- [x] Editor de texto con formato (saneado en la API) e imagen o afiche por comunicado, también en
      el correo con un enlace firmado que no vence.

**Falta**
- [ ] Avisos push en la app móvil.
- [ ] Vista previa del correo antes de publicar y envío de prueba al administrador.
- [ ] Comprimir y redimensionar la imagen al subirla (hoy se guarda tal cual, hasta 10 MB).

**Tener en cuenta**
- Las convocatorias a asamblea tienen requisitos de anticipación y medio (Ley 675); cuando llegue
  el módulo de asambleas, enlazarlas desde aquí.

---

### 4.7 PQRS y mantenimiento

**Hay hoy:** el residente radica, consulta y comenta sus solicitudes; el backoffice las gestiona
(docs/tickets.md).

**Falta**
- [x] **Bandeja en el backoffice** (P0): filtros por estado, tipo, prioridad, torre, responsable,
      fecha y vencidas; búsqueda por número, asunto o unidad.
- [x] Asignar a una persona del personal, cambiar estado y prioridad, y responder.
- [x] Comentarios internos que el residente no ve.
- [x] Adjuntar fotos desde el backoffice.
- [ ] Adjuntar fotos desde el portal de residentes.
- [x] Tiempos de respuesta por prioridad y marca de vencidas.
- [ ] Alertas por correo de solicitudes vencidas.
- [ ] Encuesta de satisfacción al cerrar.

**Tener en cuenta**
- ✅ El residente recibe correo de cada respuesta y cambio de estado (falta push).
- ✅ `staff` ve solo lo que tiene asignado; el consejo solo consulta.

---

### 4.8 Portería: visitas y paquetes

**Hay hoy:** el residente autoriza visitas con código de acceso y consulta sus paquetes.

**Hecho**
- ✅ **Parqueadero de visitantes** (`docs/visitor-parking.md`): cupos y tarifas por tipo de vehículo,
  gracia diaria por placa, fracción y tope diario, IVA incluido, cobro en portería o a la unidad,
  exención manual, estadía máxima, quién dio entrada y salida, comprobante por correo.

**Falta**
- [ ] Parqueadero, fase 2: aprobación desde el portal, aviso de excedidos por correo, cierre de caja
      por turno y anonimización de visitantes.
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

**Hecho** (docs/documents.md)
- [x] Carpetas, 14 categorías, referencia, fechas, proveedor y vencimiento.
- [x] Visibilidad: toda la comunidad, propietarios, consejo, personal, unidades específicas o solo
      la administración. La categoría sugiere la visibilidad.
- [x] Borrador, publicado, archivado; aviso a quienes pueden verlo al publicar.
- [x] Versiones (la última es la vigente) y registro de quién abrió o descargó cada archivo.
- [x] Avisos de vencimiento de contratos y pólizas a 30 y 7 días y el mismo día.
- [x] Consulta en el backoffice (todos los roles, según visibilidad) y en el portal.

**Siguiente**
- [ ] Firma electrónica de actas (presidente y secretario) y acuse de lectura de reglamentos.
- [ ] Búsqueda dentro del contenido (OCR de actas escaneadas).
- [ ] Marca de agua con el nombre de quien descarga.
- [ ] Cuota de almacenamiento por plan y retención (archivo automático).

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

**Hay hoy:** bienvenida, verificación de correo, invitación, recuperación y cambio de contraseña,
correos del plan y comunicados (`@adonisjs/mail`, Mailjet). Se envían con `sendLater`, en memoria.

**Hay también** (docs/notifications.md): campana en el portal y el backoffice (consulta cada minuto,
leído o no), preferencias por categoría y canal en *Mi perfil*, push por Firebase Cloud Messaging
(apagado hasta configurar `FCM_*` y tener la app) y registro de teléfonos. Eventos: llegada de
visitas, cuenta del mes, pago confirmado, rechazado o registrado, recordatorio 3 días antes del
vencimiento, PQRS (nueva, respuesta, estado, asignación), pago reportado, comunicados y sorteo de
parqueaderos.

**Falta**
- [x] Reservas: solicitud, aprobación, rechazo, cancelación, depósito y recordatorio.
- [ ] Paquete recibido: llega cuando exista la portería en el backoffice.
- [ ] Cola durable con reintentos (ver 6.2): hoy un reinicio del servidor pierde los correos en
      cola.
- [ ] Horario de silencio para push, resumen diario por correo y registro de entregas.
- [ ] Avisos masivos urgentes de la administración (cortes de agua, emergencias).

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

**Hay hoy:** encuestas a los propietarios (docs/surveys.md), con una respuesta por unidad,
resultados por coeficiente y participación mínima. La misma base sirve para votar en asamblea.

**Siguiente en encuestas**
- [ ] Más tipos de pregunta: opción múltiple, escala de 1 a 5 y respuesta abierta.
- [ ] Cambiar el voto hasta la fecha límite, cerrar antes de tiempo o ampliar el plazo, y
      programar la apertura.
- [ ] Exportar resultados (CSV y PDF para el acta) y adjuntar documentos de soporte.
- [ ] Aviso de resultados al cierre y alcance por torre.

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
- [x] Soportes adjuntos en gastos, egresos, recibos de caja, notas de contabilidad y traslados
      (varios archivos por operación, bucket privado por conjunto).
- [ ] Contratos de proveedores.
- [ ] Nómina, activos fijos con depreciación automática e información exógena.
- [ ] Exportación en el formato de importación de los programas contables más usados.

---

## 5. Pendientes operativos inmediatos

- [ ] Quitar de la spec viva de DigitalOcean las variables que ya no se usan (`SESSION_DRIVER`,
      `WEB_URL`), partiendo de `doctl apps spec get`.
- [ ] Borrar del bucket de Spaces los archivos huérfanos de antes del reinicio de producción
      (carpetas `demo/` y `reservas-del-bosque/`).
- [ ] Desarrollo local con su propio bucket (o `DRIVE_DISK=fs`): el `.env` local hoy escribe en el
      bucket de producción.
- [ ] Borrar `docs/brand/` (marca anterior) moviendo antes `og-image.png` a `branding/`, y
      actualizar `apps/landing/README.md`.
- [x] Producción reiniciada sin datos demo; respaldo previo en `~/aptoph-backups/`.
- [x] Job `migrate` solo con migraciones; despliegue automático al hacer push a `main`.

---

## 6. Pendientes para producción con calidad

Lo que recomiendo resolver para operar con conjuntos reales y cobrarles. Ordenado por prioridad:
6.1 antes del primer conjunto que pague; 6.2 durante el primer mes; el resto según la demanda.

### 6.1 Antes del primer conjunto que pague (bloqueantes)

**Cobro y obligaciones legales**
- [ ] **Wompi en producción**: hoy la API usa `WOMPI_ENV=sandbox` con llaves `pub_test_`, así que
      los pagos del plan son simulados. Poner las llaves `prod_` como secretos y registrar la URL
      del webhook (`https://api.aptoph.com/api/v1/webhooks/wompi`) en el panel de Wompi.
- [ ] **Factura electrónica (DIAN)** de cada cobro del plan: integrar un proveedor tecnológico
      (Siigo, Alegra, Facture…) o emitirla desde el software contable de Droni.co.
- [ ] **Revisión por un abogado** de términos, tratamiento de datos, encargo y cookies, y por un
      contador del IVA del plan y de la retención. Confirmar los proveedores listados (Cloudflare
      se agregó por suposición).
- [ ] Registrar las bases de datos de Droni.co en el RNBD de la SIC si le aplica.
- [ ] **Borrado a los 30 días de terminado el servicio**: los términos lo prometen y no está
      automatizado. Job que exporte y borre los datos y archivos del conjunto, con aviso previo.
- [ ] Exportación completa de los datos del conjunto (censo, cartera, contabilidad, archivos) para
      cumplir lo prometido en los 30 días de consulta.

**Despliegue y datos**
- [ ] **Migraciones aditivas desde ya**: con datos reales ya no se editan las migraciones
      `createTable` ni se recrea la base. Cada cambio es una migración nueva (`alterTable`) en la
      carpeta de su módulo; actualizar la regla del README y de la sección 3.
- [ ] **CI en GitHub Actions**: lint, typecheck, tests y build en cada push y pull request, y
      protección de `main` para que solo se despliegue lo que pasó las pruebas. Hoy un push con un
      error llega a producción (así fallaron 4 despliegues seguidos el 27 de noviembre).
- [ ] **Ambiente de staging** (`staging.aptoph.com`, base aparte): probar ahí antes de pasar a
      `main`, o desplegar producción solo desde etiquetas.
- [ ] Respaldos: los diarios de DigitalOcean (7 días) más un `pg_dump` semanal fuera de
      DigitalOcean; versionado del bucket de Spaces; **probar una restauración**.

**Seguridad y monitoreo**
- [ ] Monitoreo de errores (Sentry o similar) en la API y en las dos apps, con alertas.
- [ ] Alertas de disponibilidad (uptime de DigitalOcean o externo) para `api`, `admin` y `web`, y
      de uso de CPU, memoria y conexiones de la base.
- [ ] SPF, DKIM y DMARC de `aptoph.com` verificados en Mailjet, para que las invitaciones y
      comunicados no lleguen a spam.
- [ ] Encabezados de seguridad: HSTS, CSP, `X-Frame-Options` y `Referrer-Policy` en la API
      (`@adonisjs/shield`) y en los sitios estáticos.

### 6.2 Durante el primer mes

**Confiabilidad**
- [ ] **Cola de correos durable** (tabla en Postgres o Redis) con reintentos y registro de
      entregas: `sendLater` en memoria pierde los correos si el servidor se reinicia, y un
      comunicado a 800 unidades se manda de una vez. Enviar en lotes según el límite de Mailjet.
- [ ] Sacar el scheduler (comunicados programados, cobros del plan) del servidor web a un worker
      o job de App Platform, con bloqueo, para poder tener más de una instancia de la API.
- [ ] Prueba de carga: facturar, importar y enviar un comunicado en un conjunto de 800 unidades
      (`conjunto_grande_seeder`) y medir tiempos; revisar índices con `EXPLAIN`.
- [ ] Límite de tamaño y compresión de imágenes y adjuntos antes de guardarlos.

**Pruebas**
- [ ] Pruebas punta a punta (Playwright) de los flujos críticos: registro, importar el censo,
      configurar tarifas, facturar el mes, registrar un pago, publicar un comunicado e invitar y
      entrar como residente. Correrlas en CI contra staging.
- [ ] Pruebas de componentes en el backoffice y el portal: hoy solo hay pruebas de los stores de
      sesión.

**Operación de AptoPH**
- [ ] **Panel de superadmin** (`is_platform_admin`): conjuntos, suscripciones, pagos, activar
      paquetes de correos (hoy es manual), entrar como soporte con registro en auditoría.
- [ ] Auditoría escrita de verdad: hoy existe la tabla `audit_logs` pero nada escribe en ella.
      Registrar cambios de dinero, censo, permisos y configuración (regla de la sección 3).
- [ ] Canal de soporte visible en las apps (correo o WhatsApp) y centro de ayuda con guías
      cortas: primeros pasos, importar el censo, facturar el mes, registrar pagos.
- [ ] **Primeros pasos del administrador**: lista guiada en el inicio (crear torres o importar,
      revisar coeficientes, configurar tarifas, invitar residentes, primera facturación).
- [ ] Recordatorios del fin de la prueba gratis y del pago del plan.

### 6.3 Funcionalidad que los conjuntos van a pedir primero

- [x] **PQRS en el backoffice** (4.7): bandeja, asignación, respuestas, notas internas y correo.
- [x] **Reservas en el backoffice** (4.5): crear zonas comunes y aprobar o rechazar reservas.
- [ ] **Portería** para vigilantes (4.8): visitas y paquetes; hoy solo el residente los usa.
- [ ] **PDF** del estado de cuenta, la cuenta de cobro, el recibo de caja y el paz y salvo, con
      envío por correo (4.3, 4.4).
- [ ] Correo al residente al emitir la cuota mensual, con su saldo y el enlace al portal.
- [x] **Documentos del conjunto** (4.9): reglamento, actas y estados financieros en el portal.
- [ ] Validar que los coeficientes sumen 100 % y mostrar la diferencia (4.2).
- [ ] Vehículos y mascotas en el backoffice (portería los necesita).
- [ ] Conciliación bancaria importando el extracto (4.4).
- [ ] Pagos en línea de los residentes hacia la cuenta del conjunto (4.4): cada conjunto con su
      propio comercio en Wompi.
- [ ] Indicadores reales en el inicio del backoffice: recaudo del mes, cartera, PQRS abiertas.

### 6.4 Experiencia y calidad de la interfaz

- [ ] Revisión del backoffice en celular y tablet: tablas anchas (finanzas, cartera) y modales
      largos.
- [ ] Auditoría de accesibilidad (contraste en modo oscuro, foco, lectores de pantalla) con axe.
- [ ] Mensajes de error de la API siempre en español y accionables; páginas de error y de
      mantenimiento con la marca.
- [ ] Estados vacíos con siguiente paso en todos los módulos (algunos solo dicen «No hay
      registros»).
- [ ] Logo del conjunto en las apps, los correos y los PDF (4.1).
- [ ] Cambio de correo con confirmación (4.1).
- [ ] Analítica de uso respetuosa de la privacidad (Plausible o similar), actualizando la
      política de cookies.

### 6.5 Crecimiento (P2)

- [ ] App móvil Flutter para residentes con notificaciones push (4.12); después, una para
      portería.
- [ ] Asambleas virtuales con quórum y votación por coeficiente (4.13).
- [ ] Plan Empresarial: administradoras con varios conjuntos y vista consolidada (4.1).
- [ ] Integración con programas contables (exportación en su formato de importación) e
      información exógena (4.14).
- [ ] Autenticación en dos pasos para administración y contabilidad.
