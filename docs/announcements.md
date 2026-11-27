# Comunicados

Circulares y avisos del conjunto: se crean en el backoffice y los residentes los leen en el portal.

## 1. Quién hace qué

| Rol | Backoffice | Portal |
| --- | --- | --- |
| Administración, consejo | Crear, editar, publicar, programar, despublicar, eliminar, adjuntar | — |
| Otros roles del backoffice | Ver la lista, el detalle y el reporte de lectura | — |
| Residentes | — | Ver los comunicados publicados que les llegan, con sus adjuntos |

Los permisos de escritura están en `ANNOUNCEMENT_WRITE_ROLES` (`@aptoph/shared`).

## 2. Estado

| Estado | `published_at` |
| --- | --- |
| Borrador | `NULL` |
| Programado | En el futuro: aparece solo cuando llega la hora |
| Publicado | Ya pasó |

"Despublicar" lo devuelve a borrador. Eliminar es un borrado lógico (`deleted_at`): sale del portal
y del backoffice, y sus adjuntos dejan de abrirse.

## 3. Audiencia

Cada comunicado tiene una audiencia y, opcionalmente, torres (`announcement_buildings`; ninguna =
todas). Solo cuentan las personas con una vinculación activa al conjunto.

| Audiencia | Quiénes |
| --- | --- |
| Todo el conjunto | Todas las personas vinculadas al conjunto. Con torres: los residentes que viven en ellas. |
| Residentes | Residentes con una ocupación activa (de esas torres) |
| Propietarios | Residentes que son propietarios de una unidad (de esas torres) |
| Consejo | Rol consejo de administración (sin torres) |
| Personal | Roles personal y vigilancia (sin torres) |

La regla está dos veces y debe coincidir: `inAudience` (para filtrar lo que ve una persona) y
`recipientsQuery` (SQL, para el reporte de lectura y el correo), en `app/services/announcements/announcements.ts`.
La audiencia se calcula con los datos de hoy: si alguien se muda, el reporte se ajusta.

## 4. Lectura

- Abrir el comunicado en el portal lo marca como leído (`announcement_reads`, una vez por persona).
- El consejo y el personal leen los que les llegan en el backoffice; abrir el detalle también lo marca.
- El reporte del backoffice muestra quién lo leyó y quién no, con su unidad o su rol.

## 5. Correo

- "Enviar por correo" manda el comunicado a cada persona de la audiencia con correo, cuando se
  publica: de inmediato al publicar, o a la hora programada.
- Se envía **una sola vez** (`emailed_at`, `email_count`); editarlo o despublicarlo y volver a
  publicarlo no lo reenvía.
- Gasta del cupo mensual de correos masivos del conjunto (3.000 al mes; ver
  [email-quota.md](email-quota.md)). Si no alcanza, no deja guardarlo con correo; si un programado
  llega a su hora sin cupo, se publica sin correo (`email_skipped`) y se puede enviar después.
- El enlace del correo lleva al portal (residentes) o al backoffice (consejo y personal). El correo
  dice cuántos adjuntos tiene, pero no los incluye: se abren en la app con enlace firmado.
- El correo muestra la imagen arriba del texto con un enlace que no vence:
  `GET /api/v1/public/announcement-images/:id?s=…`, firmado con HMAC de `APP_KEY`. La API revisa la
  firma, que la imagen y su comunicado sigan activos, y redirige (302) a un enlace firmado del drive
  de 10 minutos. Si se quita la imagen o se elimina el comunicado, deja de mostrarse. El formulario
  sube la imagen y los adjuntos antes de publicar (un comunicado nuevo se guarda primero como
  borrador), así el correo sale con ellos.
- Programados: `start/scheduler.ts` (solo en el servidor web) revisa cada minuto. Cada comunicado se
  toma con un `UPDATE … RETURNING` atómico, así que no se envía dos veces aunque haya varias
  instancias.

## 6. Contenido y adjuntos

- **Texto con formato.** El backoffice usa un editor sencillo (`UiRichTextEditor`, Tiptap):
  negrita, cursiva, subrayado, subtítulo, listas, destacado, enlaces, deshacer. El cuerpo se guarda
  como HTML y la API lo sanea con una lista blanca (`app/services/announcements/rich_text.ts`): `p`,
  `br`, `strong`, `em`, `u`, `s`, `h3`, `ul`, `ol`, `li`, `blockquote` y `a[href]` (http, https,
  mailto, tel; siempre con `target="_blank" rel="noopener noreferrer"`). Todo lo demás (scripts,
  imágenes, estilos, eventos) se descarta. Las apps lo muestran con `UiRichText` (`v-html` del HTML
  ya saneado) y el correo con estilos en línea; la parte de texto del correo y el extracto de la
  lista (`excerpt`) salen de `htmlToText`.
- Los comunicados antiguos en texto plano se convierten a párrafos al leerlos (una línea en blanco
  separa párrafos).
- **Imagen.** Cada comunicado puede tener una imagen o afiche (JPG, PNG, WEBP o GIF, hasta 10 MB),
  aparte de los adjuntos: adjunto con `owner_type = 'announcement_image'` en
  `{slug}/comunicados/imagenes/{yyyy}/{mm}/…`. Subir otra reemplaza la anterior. Se muestra arriba
  del texto en el portal, en el backoffice y en el correo; las respuestas traen
  `image: { id, fileName, url }` con un enlace firmado.
- El cuerpo es opcional: para publicar hace falta texto o imagen (un afiche solo es válido).
- Adjuntos: hasta 20 por comunicado, en `{slug}/comunicados/{yyyy}/{mm}/…` (ver
  [files.md](files.md)). Los residentes solo abren los de comunicados que les llegan.

## 7. API

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/announcements?status=&search=&page=` | Backoffice |
| GET | `/announcements/:id` · `/announcements/:id/readers` | Backoffice |
| GET | `/announcements/attachments/:id/url` | Backoffice |
| POST | `/announcements` · PUT `/announcements/:id` | Administración, consejo |
| POST | `/announcements/email-preview` | Administración, consejo |
| POST | `/announcements/:id/publish` · `/announcements/:id/unpublish` | Administración, consejo |
| DELETE | `/announcements/:id` | Administración, consejo |
| POST | `/announcements/:id/attachments` · DELETE `/announcements/attachments/:id` | Administración, consejo |
| PUT | `/announcements/:id/image` (multipart `file`) · DELETE `/announcements/:id/image` | Administración, consejo |
| GET | `/public/announcement-images/:id?s=` | Público, con firma (correo) |
| GET | `/resident/announcements` · `/resident/announcements/:id` | Residentes |
| GET | `/resident/announcements/attachments/:id/url` | Residentes de la audiencia |

`POST`/`PUT` reciben `publish`: `draft`, `now` o `schedule` (con `publishAt` ISO).
