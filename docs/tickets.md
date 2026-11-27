# PQRS y mantenimiento

Peticiones, quejas, reclamos, sugerencias y solicitudes de mantenimiento (tablas `tickets` y
`ticket_comments`). El residente las radica y conversa desde el portal; la administración las
gestiona desde el backoffice (**PQRS**, `/pqrs`).

## 1. Quién hace qué

| Rol | Backoffice | Portal |
| --- | --- | --- |
| Administración | Ve todas; asigna, cambia prioridad y estado, responde, escribe notas internas, adjunta | — |
| Consejo | Ve todas (incluidas las notas internas); no responde ni cambia nada | — |
| Personal (`staff`) | Solo las que tiene asignadas: responde, notas internas, cambia el estado, adjunta | — |
| Contador, revisor fiscal, vigilancia | Sin acceso (403) | — |
| Residentes | — | Radica, consulta y comenta las suyas y las de sus unidades; no ve las notas internas |

Roles en `@aptoph/shared`: `TICKET_READ_ROLES`, `TICKET_WORK_ROLES`, `TICKET_MANAGE_ROLES` y
`TICKET_ASSIGNEE_ROLES`. Una solicitud que el personal no tiene asignada responde `404`, igual que
la de otro conjunto. Las escrituras llevan `middleware.subscription()`.

Solo se puede asignar a personas con una vinculación activa de administración o personal del mismo
conjunto (`GET /tickets/assignees`).

## 2. Estados

| Estado | Cuándo |
| --- | --- |
| Abierta | Recién radicada |
| En trámite | La primera respuesta pública la pasa aquí sola (si no se elige otro estado) |
| Resuelta | Se marca al responder («Responder y resolver») o desde el selector. Si el residente responde, se reabre |
| Cerrada | Final para el residente: no puede comentar. La administración solo puede dejar notas internas o reabrirla («Reabrir y responder») |

`resolved_at` se llena al pasar a resuelta o cerrada y se borra al reabrir.

## 3. Tiempos de respuesta

La fecha límite es la de radicación más los días de su prioridad (`TICKET_DUE_DAYS`, días
calendario): urgente 1, alta 3, media 7, baja 15. Una solicitud abierta o en trámite pasada su
fecha límite está **vencida**: se marca en la bandeja y se filtra con «Solo vencidas». No se guarda
en la base: se calcula (`dueAtOf` en `app/services/tickets/tickets.ts` y la misma expresión en SQL).

## 4. Bandeja

`GET /api/v1/tickets` filtra por estado (`active` = abiertas y en trámite), tipo, prioridad, torre,
responsable (`me`, `none` o un id), vencidas, rango de fechas de radicación (zona del conjunto) y
búsqueda por número (`#12`), asunto o código de unidad. `GET /tickets/stats` da los conteos de las
pestañas y tarjetas con los mismos permisos de quien consulta.

## 5. Correos

Transaccionales (no usan el cupo de correos masivos), con `TicketMail` y la vista `emails/ticket`:

- Al residente que la radicó: por cada respuesta pública y cada cambio de estado (un solo correo
  si la respuesta también cambia el estado). Enlaza a `/pqrs/:id` del portal.
- A la persona asignada (si no se asignó a sí misma). Enlaza a `/pqrs?id=…` del backoffice.

Las notas internas no envían correo.

## 6. Adjuntos

Fotos y soportes de la administración (`attachments.owner_type = 'ticket'`, carpeta `pqrs/`). Los
ve y abre quien puede ver la solicitud; los suben y quitan administración y personal asignado.

## 7. Pendiente

- Fotos adjuntas por el residente desde el portal.
- Alertas de solicitudes vencidas (correo diario a la administración).
- Encuesta de satisfacción al cerrar.
- Historial de cambios de estado y asignación (auditoría).
