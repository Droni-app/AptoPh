# Encuestas

Encuestas a los propietarios para conocer su opinión antes de las asambleas. La administración las
crea en el backoffice (nombre, contexto, preguntas de opción única y fecha límite) y las publica.
Los propietarios responden desde el portal mientras estén abiertas. Los resultados se cuentan por
unidades y por coeficiente de copropiedad (Ley 675). Las encuestas cerradas quedan en el histórico
con sus resultados.

Código:
- `apps/api/app/services/surveys/surveys.ts`: `SurveysService`.
- Controladores: `surveys_controller` (backoffice) y `resident_surveys_controller` (portal).
- Tipos compartidos: `packages/shared/src/surveys.ts`.
- Pruebas: `apps/api/tests/functional/surveys/surveys.spec.ts`.

## Quién vota

- **Una respuesta por unidad**, como en la asamblea. La da cualquiera de sus propietarios con una
  ocupación `owner` vigente y matrícula de residente activa. Cuando un propietario de la unidad
  vota, los demás ven que la unidad ya respondió, quién lo hizo y cuándo.
- **Votan las unidades con coeficiente**: no eliminadas y con `ownership_coefficient > 0`. Un
  parqueadero o depósito anexo, con coeficiente 0, no vota.
- **Varias unidades:** quien es propietario de varias responde por las que elija en un mismo
  envío. Cada unidad cuenta como un voto con su coeficiente.
- **Voto definitivo:** no se puede cambiar.
- **Arrendatarios y familiares** no ven las encuestas. El portal les explica que son para
  propietarios.

## Configuración por encuesta

| Campo | Qué hace |
| --- | --- |
| `closes_at` | Fecha y hora límite, en hora de Colombia. Al publicar debe faltar al menos una hora. La encuesta abre al publicarla (`opens_at = published_at`). |
| `anonymous` | **Anónima** (por defecto): se ve qué unidades participaron, pero no qué eligió cada una. **Nominal**: la administración, el consejo y el revisor ven el voto de cada unidad. |
| `results_visibility` | `after_vote`: el propietario ve los resultados apenas su unidad vota. `after_close`: nadie los ve hasta el cierre. La administración siempre los ve. |
| `min_participation` | Participación mínima esperada, en % del coeficiente total. Es una referencia: la encuesta no se anula si no se alcanza, pero los resultados se marcan como orientativos. |

Un borrador se edita y se elimina libremente. Una vez publicada, la encuesta ya no se modifica
ni se elimina: queda en el histórico.

## Resultados

- **Por unidades:** cuántas unidades eligieron cada opción.
- **Por coeficiente:** la suma de los coeficientes de esas unidades. El porcentaje de cada opción
  se calcula sobre lo que respondió esa pregunta.
- **Participación:** unidades que votaron sobre las que pueden votar, y coeficiente que respondió
  sobre el coeficiente total (normalmente 1).
- **Coeficiente congelado:** cada voto guarda el coeficiente que tenía la unidad al votar
  (`survey_responses.coefficient`), para que un cambio posterior no altere el resultado.

### Anonimato real

- `survey_tallies` suma votos y coeficiente por opción. Es la única fuente de los resultados.
- `survey_answers` guarda qué eligió cada unidad, **solo en encuestas nominales**.
- En una anónima no existe ninguna fila que una una unidad con su opción, ni siquiera en la base de
  datos. Si existiera, el coeficiente, que casi siempre es distinto entre unidades, delataría al
  votante.
- `survey_responses` registra que la unidad votó (para impedir el doble voto y mostrar la
  participación), no qué votó.

### Concurrencia

- El voto bloquea la fila de la encuesta (`FOR UPDATE`) y vuelve a verificar la fecha límite
  dentro de la transacción.
- El índice único `(survey_id, unit_id)` impide que dos propietarios voten por la misma unidad a la
  vez: el segundo recibe un 409.

## Notificaciones (categoría `surveys`)

| Evento | Para |
| --- | --- |
| `survey.published` | Propietarios de las unidades que votan, al publicar, si se marca "Avisar" |
| `survey.reminder` | Propietarios de las unidades que no han votado, una vez, 24 horas antes del cierre (tarea programada cada hora, `remindClosingSurveys`; `reminded_at` evita repetirlo) |

El enlace abre `/encuestas/<id>` en el portal.

## API

| Método y ruta | Quién |
| --- | --- |
| `GET /surveys` (`status`: `active`, `draft`, `open`, `closed`), `/surveys-stats`, `/surveys/:id`, `/surveys/:id/voters` | Administración, consejo y revisor fiscal (`SURVEY_READ_ROLES`) |
| `POST /surveys`, `PUT /surveys/:id`, `POST /surveys/:id/publish` (`notify`), `DELETE /surveys/:id` | Administración, con suscripción |
| `GET /resident/surveys`, `GET /resident/surveys/:id`, `POST /resident/surveys/:id/vote` (`unitIds`, `answers`: preguntaId → opciónId) | Residentes. Responden 404 a quien no es propietario |

## Pantallas

- **Backoffice → Encuestas**:
  - Pestañas *En curso*, *Abiertas*, *Borradores*, *Histórico* y *Todas*, con la barra de
    participación frente al mínimo.
  - Formulario con constructor de preguntas: agregar, ordenar y quitar preguntas y opciones.
  - Detalle con participación y resultados por coeficiente o por unidades, y la lista de unidades
    que respondieron. En las nominales, la lista incluye el voto de cada una.
- **Portal → Encuestas** (en el celular, desde el menú de la cuenta):
  - Abiertas, con las que faltan por responder resaltadas, e histórico.
  - Formulario de respuesta con confirmación (el voto es definitivo) y elección de unidades si la
    persona tiene varias.
  - Resultados según la configuración de la encuesta.
