# Importar torres, unidades y personas

La administración carga de una vez las torres, unidades y personas del conjunto desde un CSV:
backoffice › Administración › **Importar** (`/importar`, solo el rol administrador).

## 1. El archivo

- Una fila es una unidad y, opcionalmente, una persona de esa unidad. Si el 101 tiene
  propietario y arrendatario, van en dos filas con la misma torre y unidad; una unidad sin
  personas lleva el nombre vacío.
- El archivo de ejemplo se descarga desde la página. Las columnas, con sus alias y su ayuda, están
  en `IMPORT_COLUMNS` (`packages/shared/src/import.ts`); el ejemplo lo arma `importExampleCsv()`.

| Encabezado | Dato | Notas |
| --- | --- | --- |
| `torre` | Torre | Si no existe, se crea al final del orden. Vacía: unidad sin torre |
| `unidad` | Código | **Obligatoria**. Con la torre identifica la unidad |
| `tipo` | Tipo | Apartamento, Casa, Local comercial, Parqueadero, Depósito |
| `piso` | Piso | Entero |
| `area_m2` | Área privada | Coma o punto decimal |
| `coeficiente` | Coeficiente | En porcentaje: `1,25` = 1,25 % (se guarda 0,0125) |
| `estado` | Estado | Ocupada, Desocupada, En construcción |
| `nombre` | Persona | Vacío para cargar solo la unidad |
| `relacion` | Relación | Propietario, Arrendatario, Familiar, Empleado doméstico, Otro. Obligatoria si hay nombre |
| `tipo_documento`, `documento` | Documento | CC, CE, NIT, PP, TI; el número sin puntos |
| `telefono`, `correo` | Contacto | |
| `contacto_principal`, `responsable_pago` | Sí / No | |

- Los encabezados se comparan sin tildes, mayúsculas ni símbolos y aceptan alias (`Apartamento`,
  `Cédula`, `Celular`, `Coeficiente (%)`…). Las columnas que no se reconocen se ignoran y se avisa.
- Separador `;` (el que usa Excel en Colombia), `,` o tabulador, detectado en el encabezado.
  Codificación UTF-8 o Windows-1252 (lo que guarda Excel como "CSV").
- Los valores aceptan variantes: `Propietaria`, `Dueño`, `Inquilino`, `Apto`, `Local`, `Sí`, `x`…
- Máximo 3.000 filas y 2 MB.

## 2. Vista previa

`POST /imports/property/preview` lee el archivo y compara cada fila con el conjunto, **sin
escribir nada**. Cada fila trae:

- `status`: `create` (algo es nuevo), `update` (algo cambia), `unchanged` o `error`.
- Qué pasa con la torre, la unidad y la persona (`create`, `update`, `unchanged`, `none`) y la lista
  de campos que cambian con su valor actual y el nuevo.
- `errors` por columna (lo que hay que corregir) y `warnings` (filas repetidas, columnas ignoradas).

Cómo se reconoce lo que ya existe:

- **Torre**: por nombre, sin importar mayúsculas, tildes ni espacios.
- **Unidad**: por torre y código (igual), entre las unidades no eliminadas.
- **Persona**: dentro de la unidad, por número de documento; si no, por correo; si no, por nombre.
  Si el documento o el correo de la fila no coinciden con los de la persona, es otra persona.

## 3. Importar

- Cada fila tiene **Importar** y **Descartar**. Importar (`POST /imports/property/rows`) hace el
  upsert de la torre, la unidad y la persona en una transacción.
- **Las celdas vacías no borran**: solo se escriben los datos que trae la fila. En una unidad nueva
  los vacíos toman los valores por defecto (Apartamento, coeficiente 0; estado Ocupada si trae
  persona, Desocupada si no).
- Después de importar una fila, el backoffice vuelve a planear las pendientes
  (`POST /imports/property/plan`): si la fila creó la Torre 9, las demás filas de la Torre 9 ya no
  la crean.
- **Importar pendientes** importa una por una las filas nuevas o con cambios que no se hayan
  importado ni descartado; se puede detener. Las filas con errores se corrigen en el archivo y se
  vuelve a cargar.
- Las importaciones de un conjunto se hacen de a una (bloqueo `pg_advisory_xact_lock`), para que
  dos filas no creen la misma torre o unidad a la vez.
- Importar personas no las invita al portal: se invitan desde **Personas** con su correo.

Código: `app/services/property/property_import.ts`, `app/controllers/property/property_import_controller.ts`,
`apps/backoffice/src/views/ImportView.vue`. Pruebas: `tests/functional/property/import.spec.ts`.
