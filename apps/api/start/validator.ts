/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/**
 * Spanish validation messages (the API is consumed by Spanish-speaking UIs)
 */
vine.messagesProvider = new SimpleMessagesProvider({
  'required': 'El campo es obligatorio',
  'string': 'Debe ser un texto',
  'number': 'Debe ser un número',
  'boolean': 'Debe ser verdadero o falso',
  'email': 'Debe ser un correo electrónico válido',
  'uuid': 'Identificador no válido',
  'enum': 'El valor seleccionado no es válido',
  'minLength': 'Debe tener al menos {{ min }} caracteres',
  'maxLength': 'Debe tener como máximo {{ max }} caracteres',
  'min': 'Debe ser mayor o igual a {{ min }}',
  'max': 'Debe ser menor o igual a {{ max }}',
  'decimal': 'Debe tener como máximo {{ digits }} decimales',
  'withoutDecimals': 'Debe ser un número entero',
  'date': 'Debe ser una fecha válida',
  'date.afterField': 'Debe ser posterior a {{ otherField }}',
  'database.unique': 'Ya existe un registro con este valor',
  'database.exists': 'El registro seleccionado no existe',
})
