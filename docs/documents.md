# Documentos del conjunto

Gestión documental del conjunto: actas, reglamentos, estados financieros, presupuestos, informes,
contratos, cotizaciones, pólizas, títulos, certificados, planos, correspondencia y soportes. Cada
documento define **quién lo puede ver**. La administración sube, publica, versiona y archiva los
documentos. El resto de la comunidad los consulta en el portal o en el backoffice, según su rol, y
cada consulta queda registrada.

Código:
- `apps/api/app/services/documents/documents.ts`: `DocumentsService`, la regla de acceso.
- Controladores: `documents_controller` (backoffice) y `resident_documents_controller` (portal).
- Tipos y etiquetas compartidos: `packages/shared/src/documents.ts`.
- Pruebas: `apps/api/tests/functional/documents/documents.spec.ts`.

## Quién ve qué

La administración siempre ve todos los documentos, también los borradores, los archivados y los
privados. Para las demás personas, un documento es visible solo si está **publicado**, **no
archivado** y su visibilidad lo permite:

| Visibilidad | Residentes (arrendatarios y familia) | Propietarios | Consejo y revisor fiscal | Contador | Personal y vigilancia |
| --- | --- | --- | --- | --- | --- |
| `community` Toda la comunidad | ✓ | ✓ | ✓ | ✓ | ✓ |
| `owners` Propietarios | | ✓ | ✓ | ✓ | |
| `council` Consejo de administración | | | ✓ | | |
| `staff` Personal del conjunto | | | | | ✓ |
| `units` Unidades específicas | | solo los propietarios de las unidades elegidas | | | |
| `private` Solo la administración | | | | | |

- "Propietario" es quien tiene hoy una ocupación `owner` vigente (`starts_on`/`ends_on`) en una
  unidad no eliminada.
- El portal siempre mira como residente: un administrador que además vive en el conjunto ve en el
  portal solo lo que le toca como residente o propietario.
- Un documento que la persona no puede ver responde 404, igual que su archivo. Un documento de otro
  conjunto también responde 404.
- La categoría sugiere una visibilidad (`DOCUMENT_DEFAULT_VISIBILITY`): actas y estados
  financieros para propietarios (Ley 675), reglamentos para toda la comunidad, contratos y pólizas
  para el consejo, títulos para unidades específicas. La administración puede cambiarla.
- `readableVisibilities()` y `audienceOf()` aplican la misma regla, una para listar y otra para
  notificar. Si cambia una, debe cambiar la otra.

## Estados

| Estado | Cómo se llega | Quién lo ve |
| --- | --- | --- |
| Borrador (`published_at` nulo) | Al crear sin "Publicar ahora", o al retirar la publicación | Solo la administración |
| Publicado | `POST /documents/:id/publish` (o `publish` al crear) | Según la visibilidad |
| Archivado (`archived_at`) | `POST /documents/:id/archive`; se deshace con `restore` | Solo la administración |
| Eliminado (`deleted_at`) | `DELETE /documents/:id` | Nadie. Las filas, los archivos y el registro de consultas se conservan |

## Versiones

Cada archivo es un adjunto (`attachments`, `owner_type = 'document'`), guardado en la carpeta
`documentos/` del conjunto (ver [files.md](files.md)). El más reciente es la **versión vigente**;
los anteriores son el historial.

- Las demás personas solo abren la versión vigente; las anteriores responden 404 para ellas.
- La administración abre cualquier versión y puede retirar una, salvo la única que queda.
- Hasta 30 versiones por documento, de hasta 25 MB cada una. Formatos aceptados: los de los
  adjuntos más `ppt`, `pptx`, `odt`, `ods`, `txt` y `dwg`. Además del contenido, se valida la
  extensión del nombre original. El límite del bodyparser es de 30 MB.

## Registro de consultas

`GET …/documents/files/:id/url` devuelve un enlace firmado de 10 minutos y guarda una fila en
`document_access_logs` (persona, versión, `view` o `download`). La administración ve en el detalle
el total de consultas y las últimas 50.

## Carpetas

`document_folders` forma un árbol de hasta 5 niveles, con nombres únicos (sin distinguir
mayúsculas) dentro de cada carpeta. Las carpetas solo ordenan: no dan permisos. Una persona solo
ve las carpetas que contienen, directamente o más abajo, algo que puede abrir. Solo se borra una
carpeta vacía, y una carpeta no puede moverse dentro de sí misma.

## Vencimientos

Los contratos, pólizas, certificados y cotizaciones piden una fecha de vencimiento (`expires_on`).
La tarea programada de cada hora (`remindExpiringDocuments`) avisa a los administradores 30 días
antes, 7 días antes y el mismo día. Cada aviso sale una sola vez: lo controla
`dedupeKey = document:expiry:<id>:<fecha>:<aviso>`, así que si cambia la fecha, los avisos se
vuelven a enviar. Los documentos archivados no generan avisos. La pestaña *Por vencer* muestra
los que vencen en 30 días o ya vencieron.

## Notificaciones (categoría `documents`)

| Evento | Para |
| --- | --- |
| `document.published` | Quienes pueden ver el documento, solo si la administración marca "Avisar". En el portal: residentes (`community`), propietarios (`owners`) o propietarios de las unidades elegidas (`units`). En el backoffice: consejo, revisor, contador, personal o vigilancia, según la visibilidad |
| `document.expiring` | Administradores, 30 y 7 días antes del vencimiento y el mismo día |

El enlace abre `/documentos?documento=<id>`, tanto en el portal como en el backoffice.

## API

| Método y ruta | Quién |
| --- | --- |
| `GET /documents`, `/documents/folders`, `/documents/:id`, `/documents/files/:id/url` | Roles del backoffice, filtrado por visibilidad |
| `GET /documents-stats` | Administración |
| `POST /documents` (multipart: `file`, campos, `unitIds[]`, `publish`, `notify`) | Administración, con suscripción |
| `PUT /documents/:id`, `DELETE /documents/:id` | Administración, con suscripción |
| `POST /documents/:id/versions`, `DELETE /documents/versions/:id` | Administración, con suscripción |
| `POST /documents/:id/publish` (`notify`), `unpublish`, `archive`, `restore` | Administración, con suscripción |
| `POST /documents/folders`, `PUT` y `DELETE /documents/folders/:id` | Administración, con suscripción |
| `GET /resident/documents` (y `folders`, `:id`, `files/:id/url`) | Residentes |

Los filtros del listado son `search` (busca en título, descripción y referencia), `category`,
`folder` (un id, o `root` para los que no tienen carpeta), `year` y `page`. Solo para la
administración: `status`, `visibility` y `expiring`. La respuesta trae además `categories`: las
categorías con algo visible para la persona, que el portal usa para mostrar sus filtros.

## Pantallas

- **Backoffice → Documentos**:
  - Indicadores: vigentes, borradores, por vencer y actas.
  - Árbol de carpetas con acciones (subcarpeta, renombrar o mover, eliminar).
  - Pestañas *Publicados*, *Borradores*, *Por vencer*, *Archivados* y *Todos*.
  - Filtros por categoría, visibilidad y año.
  - Formulario: archivo, categoría con su visibilidad sugerida, selector de unidades, referencia,
    fechas, proveedor, publicar y avisar.
  - Detalle con versiones, consultas, publicar, retirar, archivar y eliminar.
  - Los demás roles del backoffice ven la misma pantalla en modo consulta.
- **Portal → Documentos**: búsqueda, categorías (solo las que tienen algo), carpetas con ruta de
  navegación y botones *Ver* y *Descargar*. En el celular se llega desde el menú de la cuenta.
