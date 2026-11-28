# Reportes

Catálogo de reportes del backoffice para la administración, el consejo, el contador y el revisor
fiscal. Cada reporte tiene filtros, un resumen con los indicadores clave, una tabla con totales y
notas. Se puede imprimir o guardar como PDF desde el navegador y descargar en Excel (.xlsx) o CSV.
El portal de residentes no tiene reportes.

Código:
- Catálogo y contrato: `packages/shared/src/reports.ts` (`REPORTS`, `REPORT_LINKS`, `ReportResult`).
- Motor: `apps/api/app/services/reports/engine.ts` (filtros, valores por defecto, límite de filas).
- Reportes: `services/reports/finance.ts`, `operations.ts` y `census.ts`. `registry.ts` une cada
  clave del catálogo con su función, y falla al arrancar si alguna clave no tiene función.
- Archivos: `services/reports/export.ts` (Excel con exceljs y CSV).
- Controlador: `reports_controller`. Pruebas: `apps/api/tests/functional/reports/reports.spec.ts`.
- Backoffice: `views/reports/ReportsView.vue` (catálogo) y `ReportView.vue` (un reporte genérico).

## API

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/reports/options` | Listas de los filtros: torres, cuentas de caja, proveedores, conceptos, zonas, personas, cuentas de gasto |
| GET | `/reports/:key` | El reporte en JSON (`ReportResult`) con los filtros en la query |
| GET | `/reports/:key/export?format=xlsx\|csv` | El mismo reporte como archivo |

Una clave desconocida responde 404. Un rol que no tiene el reporte responde 403. Un filtro inválido
responde 422: fecha mal escrita, rango invertido o de más de 5 años, opción que no existe o
identificador que no es un UUID.

## Catálogo

| Categoría | Reporte | Filtros | Roles |
| --- | --- | --- | --- |
| Recaudo y cartera | Recaudo | Desde, hasta, cuenta, medio de pago, torre; ver por recibo, día, mes, cuenta, medio o torre | Todos |
| | Facturado contra recaudado | Meses, concepto, torre | Todos |
| | Cartera por edades | Torre, tipo de unidad, edad, saldo mínimo | Todos |
| | Unidades en mora ⚠ | Torre, meses en mora, saldo mínimo | Todos |
| | Facturación por concepto | Meses, torre | Todos |
| | Saldos a favor | Torre | Todos |
| Bancos y caja | Movimiento de bancos y caja | Fechas, cuenta; ver por cuenta, mes o detalle con saldo | Todos |
| Gastos y proveedores | Gastos | Fechas, proveedor, cuenta de gasto; ver por proveedor, cuenta, mes o detalle | Todos |
| | Comprobantes de egreso | Fechas, proveedor, cuenta | Todos |
| | Retenciones practicadas | Fechas, proveedor; ver por proveedor o mes | Todos |
| Control interno | Anulaciones, notas crédito y reversiones | Fechas, tipo, quién lo hizo | Todos |
| | Accesos al backoffice ⚠ | Rol, estado | Sin contador |
| Operación | PQRS | Fechas, tipo, estado, prioridad, torre; ver por estado, tipo, prioridad, responsable, mes, torre o detalle | Sin contador |
| | Uso de zonas comunes | Fechas, zona; ver por zona, mes, unidad o detalle | Sin contador |
| | Portería: visitas y paquetes | Fechas; ver por día, mes o torre | Sin contador |
| | Parqueadero de visitantes | Fechas; ver por día, mes, forma de pago o unidad visitada | Todos |
| Comunidad | Lectura de comunicados | Fechas | Sin contador |
| | Participación en encuestas | Fechas | Sin contador |
| | Consulta de documentos ⚠ | Fechas; ver por documento, persona o detalle | Sin contador |
| Censo y parqueaderos | Censo de unidades ⚠ | Torre, tipo, estado, datos faltantes | Sin contador |
| | Vehículos y documentos ⚠ | Torre, tipo, SOAT y tecnomecánica | Sin contador |
| | Ocupación de parqueaderos | Tipo de vehículo, propios o comunales, estado | Sin contador |

"Todos" son administración, contabilidad, consejo y revisoría fiscal. ⚠ marca los reportes con
datos personales (Ley 1581 de 2012).

El catálogo también enlaza informes de otras pantallas (`REPORT_LINKS`): estados financieros,
ejecución presupuestal y la [bitácora de auditoría](audit.md).

## Reglas

- **Valores por defecto:** cada filtro de fecha trae uno (`today`, `monthStart`, `yearStart`,
  `monthsAgo:N`…). El backoffice y la API los resuelven igual, en la zona horaria del conjunto.
- **Límite:** 5.000 filas en pantalla y en el archivo (`REPORT_MAX_ROWS`). Si hay más, el reporte
  lo dice y pide acotar los filtros.
- **Columnas ocultas:** las claves que empiezan por `_` (`_unitId`, `_reversed`) no se muestran ni
  se exportan. Sirven para enlazar la fila (`rowLink`, p. ej. al estado de cuenta de la unidad) o
  para tacharla.
- **Excel:** encabezado con el conjunto, el título, el periodo y los filtros; números y fechas
  reales (el contador puede sumar y filtrar); fila de encabezado fija, autofiltro y totales.
- **CSV:** para Excel en Colombia: punto y coma, coma decimal, UTF-8 con BOM.
- **PDF:** desde el botón Imprimir. El menú, la barra superior y los filtros no se imprimen.
- **Registro:** cada descarga queda en la auditoría (`exported`) con el reporte, el formato, el
  número de filas, los filtros y si tiene datos personales.

## Agregar un reporte

1. Defínelo en `REPORTS` (clave, título, categoría, roles, filtros, audiencia).
2. Escribe su función en el archivo de su área y regístrala en `registry.ts`.
3. La prueba de catálogo de `reports.spec.ts` lo corre con cada vista de agrupación. El backoffice
   lo muestra sin más cambios.
