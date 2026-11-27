<script setup lang="ts">
import {
  COMPANY as c,
  DATA_RETENTION_DAYS,
  MINIMUM_COVERS_UNITS,
  MINIMUM_MONTHLY,
  PRICE_PER_UNIT,
  TRIAL_DAYS,
  formatCop,
} from '@aptoph/shared'
import LegalLayout, { type LegalSectionLink } from './LegalLayout.vue'

const sections: LegalSectionLink[] = [
  { id: 'quienes-somos', title: 'Quiénes somos y aceptación' },
  { id: 'definiciones', title: 'Definiciones' },
  { id: 'servicio', title: 'El servicio' },
  { id: 'cuentas', title: 'Cuentas y accesos' },
  { id: 'prueba-gratis', title: 'Prueba gratis' },
  { id: 'precio-y-pagos', title: 'Precio y pagos' },
  { id: 'cancelacion', title: 'Cancelación y reembolsos' },
  { id: 'fin-del-servicio', title: 'Información al terminar el servicio' },
  { id: 'uso-aceptable', title: 'Uso aceptable' },
  { id: 'informacion-del-conjunto', title: 'Información del conjunto' },
  { id: 'datos-personales', title: 'Datos personales' },
  { id: 'propiedad-intelectual', title: 'Propiedad intelectual' },
  { id: 'disponibilidad', title: 'Disponibilidad y soporte' },
  { id: 'demo', title: 'Cuenta de demostración' },
  { id: 'responsabilidad', title: 'Limitación de responsabilidad' },
  { id: 'suspension', title: 'Suspensión y terminación' },
  { id: 'cambios', title: 'Cambios en el servicio y en estos términos' },
  { id: 'comunicaciones', title: 'Comunicaciones electrónicas' },
  { id: 'ley-aplicable', title: 'Ley aplicable y controversias' },
  { id: 'contacto', title: 'Contacto' },
]
</script>

<template>
  <LegalLayout document="terms" :sections="sections">
    <div class="legal-summary">
      <p><strong>En resumen</strong></p>
      <ul>
        <li>
          {{ c.product }} es un software para administrar conjuntos de propiedad horizontal, prestado
          por {{ c.legalName }}
        </li>
        <li>
          Pruebas {{ TRIAL_DAYS }} días gratis sin tarjeta. Después pagas
          {{ formatCop(PRICE_PER_UNIT) }} por unidad al mes, con un mínimo de
          {{ formatCop(MINIMUM_MONTHLY) }} al mes.
        </li>
        <li>
          Cancelas cuando quieras: el servicio sigue hasta el final del mes pagado y no se renueva.
          No hay reembolsos del mes en curso.
        </li>
        <li>
          La información es del conjunto. Al terminar el servicio tienes
          {{ DATA_RETENTION_DAYS }} días para exportarla antes de que se elimine.
        </li>
        <li>
          {{ c.product }} es una herramienta de apoyo: las decisiones, la contabilidad y las
          obligaciones legales del conjunto siguen siendo de sus órganos de administración.
        </li>
      </ul>
      <p class="text-sm text-slate">
        Este resumen no reemplaza el texto completo, que es el que rige.
      </p>
    </div>

    <h2 id="quienes-somos">1. Quiénes somos y aceptación</h2>
    <p>
      {{ c.product }} (en adelante, la «Plataforma») es un servicio de
      <strong>{{ c.legalName }}</strong>, sociedad colombiana identificada con NIT {{ c.nit }}, con
      domicilio en {{ c.address }}, representada legalmente por {{ c.representative }} (en
      adelante, «Droni.co», «nosotros»). Correo: <a :href="`mailto:${c.email}`">{{ c.email }}</a>.
      Teléfono: {{ c.phone }}.
    </p>
    <p>
      Estos términos y condiciones (los «Términos») regulan el acceso y el uso de la Plataforma, de
      su sitio web {{ c.website }}, del panel de administración y de las aplicaciones web y móviles
      para residentes. Al registrarte, al aceptar una invitación o al usar la Plataforma aceptas
      estos Términos y la
      <a href="/legal/tratamiento-de-datos/">Política de tratamiento de datos personales</a>. Si no
      estás de acuerdo, no uses la Plataforma.
    </p>
    <p>
      Quien registra un conjunto o acepta estos Términos en su nombre declara que tiene facultades
      para obligarlo, por ejemplo como su administrador y representante legal en los términos de la
      Ley 675 de 2001, o con la autorización de sus órganos de administración.
    </p>

    <h2 id="definiciones">2. Definiciones</h2>
    <ul>
      <li>
        <strong>Conjunto o Cliente:</strong> la copropiedad sometida al régimen de propiedad
        horizontal (conjunto residencial, edificio o similar) que contrata la Plataforma.
      </li>
      <li>
        <strong>Usuario administrador:</strong> la persona que registra el Conjunto o que tiene el
        rol de administración dentro de él.
      </li>
      <li>
        <strong>Usuarios autorizados:</strong> las personas a las que el Conjunto da acceso al panel
        de administración, como miembros del consejo, contador, revisor fiscal, personal y
        vigilancia.
      </li>
      <li>
        <strong>Residentes:</strong> propietarios, arrendatarios y demás ocupantes de las unidades
        privadas a quienes el Conjunto invita a la aplicación de residentes.
      </li>
      <li>
        <strong>Usuario:</strong> cualquier persona que use la Plataforma, en cualquiera de los
        roles anteriores.
      </li>
      <li>
        <strong>Información del Conjunto:</strong> los datos, documentos y archivos que el Conjunto y
        sus Usuarios registran o cargan en la Plataforma.
      </li>
      <li>
        <strong>Unidad:</strong> cada unidad privada del Conjunto (apartamento, casa, local,
        parqueadero, depósito u otra) registrada en la Plataforma.
      </li>
    </ul>

    <h2 id="servicio">3. El servicio</h2>
    <p>
      La Plataforma es un software en la nube que ofrece, entre otras, herramientas para el censo de
      torres, unidades, residentes, vehículos y mascotas; cuotas de administración, recaudo, cartera,
      gastos, presupuesto y contabilidad; zonas comunes y reservas; portería, visitantes y paquetes;
      comunicados, PQRS y documentos. Las funciones disponibles pueden cambiar con el tiempo
      conforme al numeral 17.
    </p>
    <p>
      La Plataforma es una <strong>herramienta de apoyo</strong>. No presta servicios de
      administración de propiedad horizontal, contabilidad, revisoría fiscal ni asesoría jurídica o
      tributaria. Los cálculos, liquidaciones, informes y estados que genera dependen de la
      información y la configuración que registra el Conjunto, y deben ser revisados por las personas
      responsables. Las decisiones del Conjunto, su contabilidad, la conservación de sus libros y
      soportes y el cumplimiento de sus obligaciones legales siguen a cargo de sus órganos de
      administración, su contador y su revisor fiscal.
    </p>
    <p>
      El uso de la aplicación de residentes no tiene costo para los Residentes: lo contrata el
      Conjunto.
    </p>

    <h2 id="cuentas">4. Cuentas y accesos</h2>
    <ul>
      <li>
        Debes registrar información veraz y mantenerla actualizada. Cada cuenta es personal: no
        compartas tu contraseña.
      </li>
      <li>
        Eres responsable de la actividad realizada con tu cuenta. Si sospechas un uso no autorizado,
        cambia tu contraseña, cierra las sesiones abiertas desde tu perfil y escríbenos.
      </li>
      <li>
        El Usuario administrador decide quién tiene acceso al Conjunto y con qué rol, invita a los
        Usuarios autorizados y a los Residentes, y retira los accesos cuando corresponda. El Conjunto
        responde por las acciones de las personas a las que da acceso.
      </li>
      <li>
        La Plataforma está dirigida a personas mayores de edad. Las cuentas de usuario no pueden ser
        creadas por menores de edad.
      </li>
    </ul>

    <h2 id="prueba-gratis">5. Prueba gratis</h2>
    <p>
      Cada Conjunto nuevo tiene una prueba gratis de {{ TRIAL_DAYS }} días calendario con todas las
      funciones, sin registrar medio de pago. Al terminar la prueba sin activar el plan, la cuenta
      queda en modo consulta: la información se puede ver y exportar, pero no modificar. No hacemos
      ningún cobro automático al terminar la prueba.
    </p>

    <h2 id="precio-y-pagos">6. Precio y pagos</h2>
    <p>
      La Plataforma tiene un solo plan, con todas las funciones, que se paga por mes anticipado. El
      precio es de <strong>{{ formatCop(PRICE_PER_UNIT) }} por Unidad al mes</strong>, con un valor
      mínimo de <strong>{{ formatCop(MINIMUM_MONTHLY) }} al mes</strong>, que es lo que pagan los
      Conjuntos de hasta {{ MINIMUM_COVERS_UNITS }} Unidades. Los precios están expresados en pesos
      colombianos y el precio publicado es el valor total del mes, salvo que se indique otra cosa
      antes del pago.
    </p>
    <ul>
      <li>
        El valor se calcula con el número de Unidades que el Conjunto declara, que debe corresponder a
        sus Unidades reales. Si el número de Unidades registradas en la Plataforma es mayor que el
        declarado, podremos ajustar el valor a partir del siguiente periodo, avisándote antes.
      </li>
      <li>
        Los pagos se hacen a través de Wompi (Bancolombia S.A.), con tarjeta de crédito o débito, PSE
        u otros medios que la pasarela ofrezca. Los datos de la tarjeta los recibe y protege Wompi;
        nosotros solo conservamos la marca, los últimos cuatro dígitos y la fecha de vencimiento
        para mostrarte el medio guardado. El uso de Wompi se rige también por sus propios términos.
      </li>
      <li>
        Si guardas una tarjeta para la renovación automática, autorizas que cada mes se cobre en ella
        el valor del siguiente periodo. Puedes quitar la tarjeta o desactivar la renovación
        automática en cualquier momento desde la sección Plan. Si pagas manualmente, te recordaremos
        por correo antes del vencimiento.
      </li>
      <li>
        Si un pago no se puede completar, lo reintentaremos y te avisaremos por correo. Mientras el
        periodo siga sin pagar, la cuenta puede pasar a modo consulta hasta que se pague.
      </li>
      <li>
        Droni.co expedirá los documentos de facturación que exija la normativa tributaria
        colombiana.
      </li>
      <li>
        Podemos cambiar el precio avisándote con al menos 30 días calendario de anticipación. El
        nuevo precio se aplica desde el periodo siguiente al aviso; si no estás de acuerdo, puedes
        cancelar antes de que empiece a regir.
      </li>
    </ul>

    <h2 id="cancelacion">7. Cancelación y reembolsos</h2>
    <p>
      Puedes cancelar la suscripción en cualquier momento desde la sección Plan o escribiendo a
      <a :href="`mailto:${c.email}`">{{ c.email }}</a> desde el correo del Usuario administrador.
      La cancelación surte efecto al terminar el periodo ya pagado: hasta ese día el servicio sigue
      funcionando con normalidad y después no se renueva ni se hacen nuevos cobros.
    </p>
    <p>
      <strong>No hacemos reembolsos</strong> del periodo en curso ni de periodos parciales, sin
      perjuicio de los derechos que la ley colombiana reconozca de forma irrenunciable. Si se hizo un
      cobro por un error nuestro, por ejemplo un cobro duplicado, lo devolveremos.
    </p>

    <h2 id="fin-del-servicio">8. Información al terminar el servicio</h2>
    <p>
      Cuando el servicio de un Conjunto termina, ya sea por cancelación, porque vence la prueba gratis
      sin activar el plan o porque un periodo queda sin pagar, la cuenta queda en modo consulta
      durante <strong>{{ DATA_RETENTION_DAYS }} días calendario</strong>. En ese plazo el Conjunto
      puede consultar y exportar su información con las herramientas de exportación de la
      Plataforma. Si el Conjunto activa o paga el plan dentro del plazo, el servicio se reanuda sin
      pérdida de información.
    </p>
    <p>
      Vencido ese plazo, podremos eliminar definitivamente la Información del Conjunto. Las copias de
      respaldo que la contengan se eliminan en su ciclo normal de rotación. Solo conservaremos lo que
      la ley nos obligue a conservar, como los registros de facturación del servicio.
    </p>
    <p>
      Es responsabilidad del Conjunto exportar y conservar, por el tiempo que exige la ley, la
      información que necesite, en especial sus libros y soportes contables.
    </p>

    <h2 id="uso-aceptable">9. Uso aceptable</h2>
    <p>Al usar la Plataforma te comprometes a no:</p>
    <ul>
      <li>
        Usarla para fines ilícitos o contrarios a la Ley 675 de 2001, al reglamento de propiedad
        horizontal del Conjunto o a los derechos de terceros.
      </li>
      <li>
        Registrar información de personas sin tener una base legal para hacerlo, o información
        falsa, ofensiva o que vulnere la intimidad, el buen nombre o los derechos de terceros.
      </li>
      <li>
        Enviar, mediante los comunicados y correos masivos, publicidad no solicitada o mensajes ajenos
        a la vida del Conjunto. El plan incluye un número de correos masivos al mes que se informa en
        la Plataforma.
      </li>
      <li>
        Intentar acceder a información de otros Conjuntos o Usuarios, vulnerar o probar la seguridad
        de la Plataforma sin autorización escrita, hacer ingeniería inversa, extraer información de
        forma automatizada o sobrecargar la infraestructura.
      </li>
      <li>Revender, sublicenciar o ceder el acceso a la Plataforma a terceros.</li>
      <li>Cargar archivos con código malicioso.</li>
    </ul>

    <h2 id="informacion-del-conjunto">10. Información del Conjunto</h2>
    <p>
      La Información del Conjunto pertenece al Conjunto o a sus titulares. El Conjunto nos otorga una
      autorización limitada para alojarla, procesarla, mostrarla y enviarla solo en la medida
      necesaria para prestar el servicio, darle soporte y cumplir la ley. Podemos elaborar
      estadísticas agregadas y anonimizadas sobre el uso de la Plataforma para mejorarla, sin
      identificar a ningún Conjunto ni a ninguna persona.
    </p>
    <p>
      El Conjunto es responsable de la veracidad, exactitud y legalidad de la información que
      registra, y de los efectos de las cuotas, cobros, sanciones, comunicados y demás actuaciones que
      realice con ayuda de la Plataforma.
    </p>

    <h2 id="datos-personales">11. Datos personales</h2>
    <p>
      Tratamos los datos personales de acuerdo con la Ley 1581 de 2012 y sus normas
      reglamentarias. Los datos de los Usuarios como titulares de una cuenta los tratamos como
      Responsables, según la
      <a href="/legal/tratamiento-de-datos/">Política de tratamiento de datos personales</a>. Los
      datos que el Conjunto registra sobre sus residentes, propietarios, personal y visitantes los
      tratamos como Encargados, por cuenta del Conjunto, que es su Responsable, según el
      <a href="/legal/encargo-de-datos/">Acuerdo de encargo del tratamiento de datos</a>, que forma
      parte de estos Términos y que el Conjunto acepta al registrarse.
    </p>

    <h2 id="propiedad-intelectual">12. Propiedad intelectual</h2>
    <p>
      El software, el diseño, los textos, las marcas, los logos y los demás elementos de la
      Plataforma son de Droni.co o de sus licenciantes y están protegidos por las normas de propiedad
      intelectual. Mientras el servicio esté vigente te otorgamos una licencia de uso personal, no
      exclusiva, intransferible y revocable para usar la Plataforma conforme a estos Términos. Nada en
      estos Términos te transfiere derechos sobre la Plataforma.
    </p>
    <p>
      Si nos envías sugerencias o comentarios sobre la Plataforma, podemos usarlos para mejorarla
      sin obligación de compensación.
    </p>

    <h2 id="disponibilidad">13. Disponibilidad y soporte</h2>
    <p>
      Hacemos esfuerzos razonables para que la Plataforma esté disponible de forma continua y
      segura, con copias de respaldo periódicas. Aun así, no garantizamos que funcione sin
      interrupciones ni errores: puede haber mantenimientos, que procuraremos programar en horarios de
      bajo uso, y fallas de proveedores de infraestructura, de comunicaciones o de terceros que no
      controlamos.
    </p>
    <p>
      Damos soporte por chat y por correo en días hábiles, en horario de oficina de Bogotá. La
      migración inicial de la información del Conjunto no tiene costo, con el alcance que acordemos
      con el Conjunto.
    </p>

    <h2 id="demo">14. Cuenta de demostración</h2>
    <p>
      En el sitio publicamos el acceso a un conjunto de demostración con información ficticia, que
      cualquiera puede usar y que se restablece periódicamente. No registres en él información real ni
      datos personales: es visible para otras personas y se borra sin aviso.
    </p>

    <h2 id="responsabilidad">15. Limitación de responsabilidad</h2>
    <p>En la medida en que la ley lo permita:</p>
    <ul>
      <li>
        No respondemos por daños indirectos, lucro cesante, pérdida de oportunidades ni daños
        derivados de decisiones tomadas con base en la información registrada en la Plataforma.
      </li>
      <li>
        No respondemos por la información que registran el Conjunto y sus Usuarios, ni por los
        servicios de terceros, como entidades financieras, pasarelas de pago, operadores de correo o
        de telecomunicaciones.
      </li>
      <li>
        Nuestra responsabilidad total frente al Conjunto por cualquier reclamación relacionada con la
        Plataforma no superará los valores que el Conjunto nos haya pagado en los seis (6) meses
        anteriores al hecho que la origina.
      </li>
    </ul>
    <p>
      Estas limitaciones no aplican en casos de dolo o culpa grave, ni limitan los derechos que la
      ley reconozca de forma irrenunciable.
    </p>
    <p>
      El Conjunto mantendrá indemne a Droni.co frente a reclamaciones de terceros que se deriven de la
      información que registre o del uso que haga de la Plataforma en contra de estos Términos o de la
      ley.
    </p>

    <h2 id="suspension">16. Suspensión y terminación</h2>
    <p>
      Podemos suspender o restringir el acceso de un Usuario o de un Conjunto, previo aviso cuando sea
      posible, si incumple estos Términos, si su uso pone en riesgo la seguridad de la Plataforma o de
      otros Usuarios, por falta de pago, o por orden de autoridad competente. Si el incumplimiento es
      grave o no se corrige después del aviso, podemos terminar el servicio; en ese caso aplica lo
      previsto en el numeral 8.
    </p>
    <p>
      El Usuario administrador puede retirar en cualquier momento el acceso de cualquier persona al
      Conjunto. Un Usuario puede dejar de usar la Plataforma cuando quiera y pedir la eliminación de
      su cuenta conforme a la Política de tratamiento de datos personales.
    </p>

    <h2 id="cambios">17. Cambios en el servicio y en estos Términos</h2>
    <p>
      Podemos mejorar, cambiar o retirar funciones de la Plataforma. Si un cambio reduce de forma
      importante el servicio contratado, te avisaremos con anticipación razonable.
    </p>
    <p>
      Podemos modificar estos Términos. Publicaremos la nueva versión en esta página con su fecha y,
      si el cambio es importante, te avisaremos por correo o en la Plataforma al menos 15 días
      calendario antes de que rija. Si sigues usando la Plataforma después de esa fecha, aceptas la
      nueva versión; si no estás de acuerdo, puedes cancelar conforme al numeral 7.
    </p>

    <h2 id="comunicaciones">18. Comunicaciones electrónicas</h2>
    <p>
      Aceptas recibir por correo electrónico y dentro de la Plataforma las comunicaciones
      relacionadas con el servicio, como avisos de seguridad, facturación y cambios en estos
      Términos. De acuerdo con la Ley 527 de 1999, la aceptación electrónica de estos Términos y las
      comunicaciones enviadas por medios electrónicos tienen plena validez. Enviaremos las
      comunicaciones al correo registrado en la cuenta.
    </p>

    <h2 id="ley-aplicable">19. Ley aplicable y controversias</h2>
    <p>
      Estos Términos se rigen por las leyes de la República de Colombia. Las diferencias se intentarán
      resolver primero de forma directa: escríbenos a
      <a :href="`mailto:${c.email}`">{{ c.email }}</a> y tendremos 30 días calendario para buscar un
      acuerdo. Si no se logra, la controversia se resolverá ante los jueces competentes de
      {{ c.city }}.
    </p>
    <p>
      Si tienes la calidad de consumidor, conservas los derechos que te reconoce la Ley 1480 de 2011
      y puedes acudir a la Superintendencia de Industria y Comercio.
    </p>
    <p>
      Si alguna disposición de estos Términos se declara inválida, las demás seguirán vigentes.
    </p>

    <h2 id="contacto">20. Contacto</h2>
    <p>
      {{ c.legalName }}, NIT {{ c.nit }}<br />
      {{ c.address }}<br />
      Correo: <a :href="`mailto:${c.email}`">{{ c.email }}</a><br />
      Teléfono: {{ c.phone }}
    </p>
  </LegalLayout>
</template>
