<script setup lang="ts">
import { COMPANY as c, DATA_RETENTION_DAYS } from '@aptoph/shared'
import LegalLayout, { type LegalSectionLink } from './LegalLayout.vue'

const sections: LegalSectionLink[] = [
  { id: 'responsable', title: 'Responsable del tratamiento' },
  { id: 'marco-legal', title: 'Marco legal y alcance' },
  { id: 'definiciones', title: 'Definiciones' },
  { id: 'roles', title: 'Cuándo somos Responsables y cuándo Encargados' },
  { id: 'datos', title: 'Datos que tratamos' },
  { id: 'finalidades', title: 'Finalidades' },
  { id: 'autorizacion', title: 'Autorización' },
  { id: 'sensibles-y-menores', title: 'Datos sensibles y de niños, niñas y adolescentes' },
  { id: 'derechos', title: 'Derechos de los titulares' },
  { id: 'procedimiento', title: 'Consultas y reclamos' },
  { id: 'terceros', title: 'Con quién compartimos los datos' },
  { id: 'seguridad', title: 'Seguridad de la información' },
  { id: 'conservacion', title: 'Conservación de los datos' },
  { id: 'cookies', title: 'Cookies y almacenamiento local' },
  { id: 'vigencia', title: 'Vigencia y cambios' },
]

const providers = [
  {
    name: 'DigitalOcean, LLC',
    country: 'Estados Unidos',
    purpose: 'Servidores, base de datos, archivos adjuntos y copias de respaldo de la Plataforma.',
  },
  {
    name: 'Mailjet SAS (grupo Sinch)',
    country: 'Unión Europea (Francia)',
    purpose:
      'Envío de correos: verificación de cuenta, recuperación de contraseña, invitaciones, avisos de facturación y comunicados del conjunto.',
  },
  {
    name: 'Wompi (Bancolombia S.A.)',
    country: 'Colombia',
    purpose: 'Procesamiento de los pagos de la suscripción y protección de los datos de tarjetas.',
  },
  {
    name: 'Cloudflare, Inc.',
    country: 'Estados Unidos y red global',
    purpose: 'Red de entrega de contenido y protección contra ataques para los sitios web.',
  },
]
</script>

<template>
  <LegalLayout document="privacy" :sections="sections">
    <div class="legal-summary">
      <p><strong>En resumen</strong></p>
      <ul>
        <li>
          Tratamos los datos de tu cuenta (nombre, correo, teléfono, contraseña cifrada y datos de
          uso) para darte acceso a {{ c.product }} y prestar el servicio. No vendemos datos
          personales.
        </li>
        <li>
          Los datos que tu conjunto registra sobre residentes, propietarios y personal son del
          conjunto: él es su Responsable y nosotros los tratamos por su cuenta.
        </li>
        <li>
          Los datos se alojan en servidores de DigitalOcean en Estados Unidos y los correos salen por
          Mailjet, en la Unión Europea.
        </li>
        <li>
          Puedes conocer, actualizar, rectificar y suprimir tus datos y revocar tu autorización
          escribiendo a <a :href="`mailto:${c.email}`">{{ c.email }}</a>.
        </li>
      </ul>
    </div>

    <h2 id="responsable">1. Responsable del tratamiento</h2>
    <table>
      <tbody>
        <tr>
          <th scope="row">Razón social</th>
          <td>{{ c.legalName }}</td>
        </tr>
        <tr>
          <th scope="row">NIT</th>
          <td>{{ c.nit }}</td>
        </tr>
        <tr>
          <th scope="row">Domicilio y dirección</th>
          <td>{{ c.address }}</td>
        </tr>
        <tr>
          <th scope="row">Representante legal</th>
          <td>{{ c.representative }}</td>
        </tr>
        <tr>
          <th scope="row">Correo para datos personales</th>
          <td>
            <a :href="`mailto:${c.email}`">{{ c.email }}</a>
          </td>
        </tr>
        <tr>
          <th scope="row">Teléfono</th>
          <td>{{ c.phone }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      {{ c.legalName }} («Droni.co», «nosotros») presta el servicio {{ c.product }} (la
      «Plataforma»): un software para la administración de conjuntos de propiedad horizontal, con un
      panel de administración y aplicaciones web y móviles para residentes.
    </p>

    <h2 id="marco-legal">2. Marco legal y alcance</h2>
    <p>
      Esta política se expide en cumplimiento del artículo 15 de la Constitución Política, la Ley
      Estatutaria 1581 de 2012 y el Decreto Único Reglamentario 1074 de 2015 (Libro 2, Parte 2,
      Título 2, Capítulos 25 y 26), y de las demás normas que los modifiquen o complementen. Aplica a
      los datos personales que tratamos a través de la Plataforma, de su sitio web y de los canales de
      atención.
    </p>
    <p>
      En el tratamiento aplicamos los principios de legalidad, finalidad, libertad, veracidad o
      calidad, transparencia, acceso y circulación restringida, seguridad y confidencialidad.
    </p>

    <h2 id="definiciones">3. Definiciones</h2>
    <ul>
      <li>
        <strong>Autorización:</strong> consentimiento previo, expreso e informado del titular para el
        tratamiento de sus datos.
      </li>
      <li>
        <strong>Dato personal:</strong> información vinculada o que pueda asociarse a una persona
        natural determinada o determinable.
      </li>
      <li>
        <strong>Dato público, semiprivado y privado:</strong> según la clasificación de la ley; por
        ejemplo, el nombre es en general un dato público, el estado de cuenta de una unidad es
        semiprivado y la contraseña es privada.
      </li>
      <li>
        <strong>Dato sensible:</strong> el que afecta la intimidad del titular o cuyo uso indebido
        puede generar discriminación, como los datos de salud o biométricos.
      </li>
      <li>
        <strong>Responsable del tratamiento:</strong> quien decide sobre la base de datos y el
        tratamiento.
      </li>
      <li>
        <strong>Encargado del tratamiento:</strong> quien trata datos personales por cuenta del
        Responsable.
      </li>
      <li><strong>Titular:</strong> la persona natural cuyos datos se tratan.</li>
      <li>
        <strong>Tratamiento:</strong> cualquier operación sobre datos personales, como la
        recolección, el almacenamiento, el uso, la circulación o la supresión.
      </li>
      <li>
        <strong>Transmisión:</strong> comunicación de datos a un Encargado, dentro o fuera de
        Colombia, para que los trate por cuenta del Responsable.
      </li>
      <li>
        <strong>Transferencia:</strong> envío de datos a otro Responsable, dentro o fuera de Colombia.
      </li>
    </ul>

    <h2 id="roles">4. Cuándo somos Responsables y cuándo Encargados</h2>
    <h3>Como Responsables</h3>
    <p>
      Somos Responsables de los datos de las personas que tienen una cuenta en la Plataforma
      (administradores, miembros del consejo, contadores, revisores fiscales, personal, vigilantes y
      residentes) en lo que se refiere a su cuenta y a su uso de la Plataforma; de los datos de
      contacto y facturación de los conjuntos que contratan el servicio; y de los datos de quienes nos
      escriben o visitan el sitio web.
    </p>
    <h3>Como Encargados</h3>
    <p>
      Cada conjunto registra en la Plataforma información sobre sus propietarios, residentes,
      ocupantes, personal, visitantes y proveedores. De esos datos <strong>el Responsable es el
      conjunto</strong>, que decide para qué y cómo se tratan, y nosotros los tratamos por su cuenta,
      según sus instrucciones y el
      <a href="/legal/encargo-de-datos/">Acuerdo de encargo del tratamiento de datos</a>. Las
      solicitudes sobre esos datos deben dirigirse en primer lugar a la administración del conjunto;
      si nos llegan a nosotros, las trasladaremos al conjunto y lo apoyaremos para responderlas.
    </p>

    <h2 id="datos">5. Datos que tratamos</h2>
    <p>Como Responsables tratamos:</p>
    <ul>
      <li>
        <strong>Identificación y contacto:</strong> nombre, correo electrónico, teléfono y, si lo
        registras en tu perfil, tipo y número de documento.
      </li>
      <li>
        <strong>Cuenta y seguridad:</strong> contraseña, que guardamos cifrada de forma irreversible;
        sesiones abiertas, con su dispositivo y fecha; fechas de acceso; roles en cada conjunto;
        registros de auditoría de las acciones realizadas, y la evidencia de la aceptación de los
        documentos legales (fecha, versión, dirección IP y navegador).
      </li>
      <li>
        <strong>Datos técnicos:</strong> dirección IP, tipo de navegador y dispositivo, y registros
        del servidor necesarios para operar y proteger la Plataforma.
      </li>
      <li>
        <strong>Facturación del servicio:</strong> conjunto, número de unidades, pagos y, cuando se
        guarda una tarjeta, solo su marca, últimos cuatro dígitos y vencimiento. El número completo
        de la tarjeta lo recibe y protege Wompi; nosotros no lo conocemos.
      </li>
      <li>
        <strong>Comunicaciones:</strong> los mensajes que nos envías a soporte o por correo.
      </li>
    </ul>
    <p>
      Como Encargados tratamos los datos que cada conjunto registra, que se describen en el Acuerdo de
      encargo: por ejemplo, unidad y relación con ella, integrantes del hogar, vehículos, mascotas,
      cuotas, pagos y cartera, reservas, PQRS, visitas, paquetes y documentos.
    </p>

    <h2 id="finalidades">6. Finalidades</h2>
    <p>Tratamos los datos de los que somos Responsables para:</p>
    <ol>
      <li>Crear y administrar tu cuenta, verificar tu correo y permitirte iniciar sesión.</li>
      <li>
        Prestar el servicio: darte acceso a los conjuntos y funciones que te corresponden según tu
        rol.
      </li>
      <li>
        Enviarte mensajes necesarios del servicio: verificación de correo, recuperación de
        contraseña, invitaciones, avisos de seguridad, de facturación y de cambios en los documentos
        legales, y los comunicados que publique tu conjunto.
      </li>
      <li>Facturar y cobrar la suscripción de los conjuntos y gestionar los pagos.</li>
      <li>Atender solicitudes de soporte, consultas y reclamos.</li>
      <li>
        Proteger la Plataforma: prevenir fraudes y accesos no autorizados, limitar intentos de
        inicio de sesión y mantener registros de auditoría.
      </li>
      <li>
        Mejorar la Plataforma con estadísticas agregadas y anonimizadas de uso, que no identifican a
        ninguna persona.
      </li>
      <li>
        Enviar información comercial sobre {{ c.product }}, solo si lo autorizas de forma separada.
        Puedes retirar esa autorización en cualquier momento.
      </li>
      <li>
        Cumplir obligaciones legales y atender requerimientos de autoridades competentes.
      </li>
    </ol>
    <p>No vendemos ni alquilamos datos personales.</p>

    <h2 id="autorizacion">7. Autorización</h2>
    <p>
      Obtenemos tu autorización cuando creas una cuenta, al registrar un conjunto o al aceptar una
      invitación, marcando la casilla en la que aceptas los Términos y condiciones y esta política.
      Guardamos como evidencia la fecha y hora, la versión de los documentos aceptados, la dirección
      IP y el navegador desde el que aceptaste.
    </p>
    <p>
      De los datos que el conjunto registra sobre terceros, la autorización la obtiene el conjunto
      como Responsable, conforme a su propia política de tratamiento.
    </p>

    <h2 id="sensibles-y-menores">8. Datos sensibles y de niños, niñas y adolescentes</h2>
    <p>
      La Plataforma no está diseñada para tratar datos sensibles y no los solicitamos. Si en algún
      caso se pidieran, su entrega sería facultativa: no estás obligado a autorizar su tratamiento.
    </p>
    <p>
      Las cuentas de la Plataforma son para mayores de edad. Un conjunto puede registrar como
      integrantes de un hogar a niños, niñas o adolescentes, con los datos mínimos necesarios
      (nombre y parentesco), a solicitud de su representante legal. Ese tratamiento respeta el
      interés superior de los menores y sus derechos fundamentales, como lo exige la ley.
    </p>

    <h2 id="derechos">9. Derechos de los titulares</h2>
    <p>Como titular de datos personales tienes derecho a:</p>
    <ol>
      <li>Conocer, actualizar y rectificar tus datos.</li>
      <li>Solicitar prueba de la autorización que otorgaste.</li>
      <li>Ser informado, previa solicitud, del uso que se ha dado a tus datos.</li>
      <li>
        Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley,
        después de haber agotado el trámite de consulta o reclamo ante nosotros.
      </li>
      <li>
        Revocar la autorización y pedir la supresión de tus datos, cuando no exista un deber legal o
        contractual de conservarlos.
      </li>
      <li>Acceder en forma gratuita a tus datos.</li>
    </ol>
    <p>
      Puedes actualizar tu nombre, teléfono y documento directamente desde «Mi perfil», y cerrar tus
      sesiones abiertas desde allí mismo.
    </p>

    <h2 id="procedimiento">10. Consultas y reclamos</h2>
    <p>
      Pueden ejercer estos derechos el titular, sus causahabientes, su representante o apoderado, y
      quien actúe por estipulación a favor de otro. Escribe a
      <a :href="`mailto:${c.email}`">{{ c.email }}</a> o envía una comunicación escrita a
      {{ c.address }}, indicando tu nombre, tu documento de identidad, el correo de tu cuenta, lo que
      solicitas y cómo te respondemos. Podemos pedirte información adicional para verificar tu
      identidad.
    </p>
    <h3>Consultas</h3>
    <p>
      Responderemos en un máximo de diez (10) días hábiles desde que la recibamos. Si no es posible,
      te informaremos los motivos y la fecha de respuesta, que no superará cinco (5) días hábiles
      adicionales.
    </p>
    <h3>Reclamos</h3>
    <p>
      Si consideras que tus datos deben corregirse, actualizarse o suprimirse, o que se incumplió la
      ley, puedes presentar un reclamo con tu identificación, la descripción de los hechos, tu
      dirección y los documentos que quieras hacer valer.
    </p>
    <ul>
      <li>
        Si el reclamo está incompleto, te pediremos completarlo dentro de los cinco (5) días
        siguientes a su recibo. Si pasan dos (2) meses sin que lo completes, entenderemos que
        desististe.
      </li>
      <li>
        En un máximo de dos (2) días hábiles marcaremos tus datos con la leyenda «reclamo en
        trámite».
      </li>
      <li>
        Responderemos en un máximo de quince (15) días hábiles desde el día siguiente a su recibo. Si
        no es posible, te informaremos los motivos y la fecha de respuesta, que no superará ocho (8)
        días hábiles adicionales.
      </li>
    </ul>
    <p>
      La supresión de datos o la revocatoria de la autorización no procede cuando tengas un deber
      legal o contractual de permanecer en la base de datos. Si suprimimos tu cuenta, dejarás de
      tener acceso a la Plataforma; la información que el conjunto haya registrado sobre ti seguirá
      bajo la responsabilidad del conjunto.
    </p>

    <h2 id="terceros">11. Con quién compartimos los datos</h2>
    <p>
      Para prestar el servicio transmitimos datos a proveedores que actúan como nuestros
      Encargados. Algunos están fuera de Colombia, por lo que hay transmisión internacional de datos.
      Con ellos tenemos condiciones contractuales que les obligan a tratar los datos solo para
      prestarnos su servicio y con medidas de seguridad adecuadas. Al aceptar esta política autorizas
      esa transmisión.
    </p>
    <table>
      <thead>
        <tr>
          <th scope="col">Proveedor</th>
          <th scope="col">Ubicación</th>
          <th scope="col">Para qué</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="provider in providers" :key="provider.name">
          <td>{{ provider.name }}</td>
          <td>{{ provider.country }}</td>
          <td>{{ provider.purpose }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      Dentro de cada conjunto, los datos son visibles para las personas autorizadas según su rol:
      por ejemplo, la administración ve el censo y la cartera, y cada residente ve solo la
      información de sus unidades. También podemos entregar datos a autoridades que los soliciten en
      ejercicio de sus funciones legales.
    </p>

    <h2 id="seguridad">12. Seguridad de la información</h2>
    <p>Aplicamos medidas técnicas, humanas y administrativas, entre ellas:</p>
    <ul>
      <li>Cifrado de las comunicaciones con HTTPS (TLS).</li>
      <li>
        Contraseñas cifradas de forma irreversible y tokens de sesión guardados solo como
        resumen criptográfico.
      </li>
      <li>
        Separación de la información de cada conjunto y control de acceso según el rol de cada
        persona.
      </li>
      <li>Límite de intentos de inicio de sesión y registros de auditoría.</li>
      <li>Copias de respaldo automáticas de la base de datos.</li>
    </ul>
    <p>
      Ningún sistema es completamente infalible. Si ocurre un incidente de seguridad que afecte datos
      personales, lo informaremos a la Superintendencia de Industria y Comercio y a los afectados en
      los términos de la ley, y a los conjuntos afectados según el Acuerdo de encargo.
    </p>

    <h2 id="conservacion">13. Conservación de los datos</h2>
    <p>
      Conservamos los datos mientras tengas una cuenta activa y durante el tiempo necesario para las
      finalidades descritas. Cuando el servicio de un conjunto termina, su información se conserva
      en modo consulta durante {{ DATA_RETENTION_DAYS }} días calendario para que pueda exportarla, y
      después puede eliminarse; las copias de respaldo se eliminan en su ciclo normal de rotación.
      Conservamos por el tiempo que exige la ley los registros de facturación y la evidencia de las
      autorizaciones.
    </p>

    <h2 id="cookies">14. Cookies y almacenamiento local</h2>
    <p>
      La Plataforma usa almacenamiento local del navegador solo para mantener tu sesión y tus
      preferencias. No usamos cookies de publicidad. Los detalles están en la
      <a href="/legal/cookies/">Política de cookies y almacenamiento local</a>.
    </p>

    <h2 id="vigencia">15. Vigencia y cambios</h2>
    <p>
      Esta política rige desde la fecha indicada al inicio de esta página. Las bases de datos se
      mantendrán mientras sean necesarias para las finalidades descritas. Si hacemos cambios
      sustanciales, en especial sobre las finalidades o el Responsable, te lo informaremos por correo
      o en la Plataforma antes de que rijan y, cuando la ley lo exija, te pediremos una nueva
      autorización.
    </p>
  </LegalLayout>
</template>
