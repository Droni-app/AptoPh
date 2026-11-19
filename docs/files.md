# Archivos y adjuntos

Almacenamiento de los archivos de cada conjunto: soportes contables, y más adelante documentos,
fotos de PQRS y paquetes. Se resolvió una sola vez para todos los módulos.

## 1. Dónde se guardan

| Entorno | Disco (`DRIVE_DISK`) | Dónde |
| --- | --- | --- |
| Producción | `spaces` | Bucket privado `aptoph` de DigitalOcean Spaces (`nyc3`) |
| Desarrollo | `fs` (por defecto) o `spaces` | `apps/api/storage/` (ignorado por git) o el bucket |
| Tests | `fs` + `drive.fake()` | Carpeta temporal; nunca el bucket |

Se usa `@adonisjs/drive` (`config/drive.ts`). Variables: `DRIVE_DISK`, `SPACES_KEY`,
`SPACES_SECRET`, `SPACES_REGION`, `SPACES_BUCKET`, `SPACES_ENDPOINT`. Con `DRIVE_DISK=spaces` y sin
llaves la API no arranca. En App Platform las llaves son secretos cifrados de la app.

Las llaves de Spaces deben tener acceso solo a ese bucket.

## 2. Carpetas

Cada conjunto tiene su carpeta, con el `slug` del conjunto:

```
{slug}/
  finanzas/
    gastos/{yyyy}/{mm}/{uuid}-{nombre}.{ext}           ← bill
    pagos-proveedor/{yyyy}/{mm}/…                      ← vendor_payment
    recaudos/{yyyy}/{mm}/…                             ← payment
    comprobantes/{yyyy}/{mm}/…                         ← journal_entry (notas, traslados)
  documentos/…  pqrs/…  paquetes/…                     (siguientes módulos)
```

- Año y mes de la subida, en la zona horaria del conjunto.
- El nombre se normaliza (`Factura EPM (nov).PDF` → `factura-epm-nov.pdf`) y lleva un UUID delante
  para que nunca se pise un archivo. El nombre original se guarda en la base y se usa al descargar.
- `attachments.file_key` guarda la ruta completa: si el `slug` del conjunto cambiara, los archivos
  viejos siguen funcionando en la carpeta anterior.

## 3. Acceso

- **Nada es público.** El bucket es privado y cada archivo se abre con un enlace firmado que vence a
  los 10 minutos (`GET …/attachments/:id/url`, con `?download=true` para descargar).
- El enlace solo se entrega si el adjunto pertenece al conjunto activo (`X-Tenant-Id`).
- En desarrollo con `fs`, la API sirve los archivos en `/uploads/*` y exige la firma.

## 4. Adjuntos (`attachments`)

Tabla genérica: un registro puede tener varios archivos (máximo 20 activos).

| Columna | Notas |
| --- | --- |
| `owner_type`, `owner_id` | Registro dueño: `bill`, `vendor_payment`, `payment`, `journal_entry`. Sin FK: la API valida que el registro exista en el conjunto. |
| `file_key` | Ruta completa en el disco |
| `file_name`, `mime_type`, `size_bytes` | Nombre original, tipo y tamaño |
| `uploaded_by_id`, `created_at` | Quién lo subió y cuándo |
| `deleted_at`, `deleted_by_id` | Quitado por quién y cuándo |

**Quitar no borra.** Los adjuntos son soporte contable: al quitar uno se marca `deleted_at` y el
archivo sigue en el bucket. Las operaciones anuladas o reversadas conservan sus adjuntos.

**Archivos permitidos** (`ATTACHMENT_EXTENSIONS` en `@aptoph/shared`): PDF, JPG, PNG, WebP,
HEIC/HEIF, Excel (xls, xlsx, csv) y Word (doc, docx), hasta 10 MB cada uno. La API valida extensión
y tamaño; el backoffice valida lo mismo antes de subir.

### API (finanzas)

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/finance/attachments/:ownerType/:ownerId` | Lectura de finanzas |
| GET | `/finance/attachments/:id/url` | Lectura de finanzas |
| POST | `/finance/attachments/:ownerType/:ownerId` (multipart, campo `file`, un archivo) | Escritura de finanzas |
| DELETE | `/finance/attachments/:id` | Escritura de finanzas |

### Backoffice

- `AttachmentPicker`: en los formularios de **registrar gasto**, **pagar a proveedor**, **registrar
  pago**, **nota de contabilidad** y **traslado**. Los archivos se suben uno por uno después de
  guardar la operación. Si alguno falla, la operación queda guardada y un aviso indica qué archivo
  falta adjuntar desde el detalle.
- `AttachmentList`: en el detalle de la factura, el egreso, el recibo de caja y el comprobante
  contable (notas, traslados y saldos iniciales). Abre, descarga, adjunta y quita archivos; el
  consejo y la revisoría fiscal solo abren y descargan.

### Portal de residentes

- Al **reportar un pago** el residente adjunta el comprobante (foto o PDF, hasta 5 archivos). Se
  sube después de guardar el reporte, a la misma carpeta `finanzas/recaudos` (`owner_type = payment`).
- En **Tus pagos** ve los comprobantes de los pagos de sus unidades y los abre con enlace firmado.
  Mientras el pago que reportó siga por revisar puede agregar o quitar sus propios comprobantes;
  confirmado o rechazado, ya no.
- La administración los ve en el detalle del recibo al confirmarlo o rechazarlo.

| Método | Ruta | Regla |
| --- | --- | --- |
| POST | `/resident/payments/:id/attachments` | Pago de su unidad, reportado por él y por revisar |
| GET | `/resident/attachments/:id/url` | Comprobante de un pago de sus unidades |
| DELETE | `/resident/attachments/:id` | Subido por él, pago por revisar |

`GET /resident/payments` incluye `attachments` y `canAttach` en cada pago.

## 5. Pendiente

- Documentos del conjunto (tabla `documents`), fotos de PQRS y paquetes, avatar y logo: usan el
  mismo disco y la misma convención de carpetas.
