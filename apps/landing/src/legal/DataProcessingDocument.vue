<script setup lang="ts">
import { COMPANY as c, DATA_RETENTION_DAYS } from '@aptoph/shared'
import LegalLayout, { type LegalSectionLink } from './LegalLayout.vue'

const sections: LegalSectionLink[] = [
  { id: 'partes', title: 'Partes' },
  { id: 'objeto', title: 'Objeto' },
  { id: 'datos', title: 'Datos y titulares' },
  { id: 'responsable', title: 'Obligaciones del conjunto' },
  { id: 'encargado', title: 'Obligaciones de Droni.co' },
  { id: 'subencargados', title: 'Subencargados y transmisión internacional' },
  { id: 'incidentes', title: 'Incidentes de seguridad' },
  { id: 'solicitudes', title: 'Solicitudes de los titulares' },
  { id: 'terminacion', title: 'Duración, devolución y eliminación' },
  { id: 'responsabilidad', title: 'Responsabilidad' },
  { id: 'aceptacion', title: 'Aceptación' },
]
</script>

<template>
  <LegalLayout document="data_processing" :sections="sections">
    <div class="legal-summary">
      <p><strong>En resumen</strong></p>
      <ul>
        <li>
          Los datos de residentes, propietarios, personal y visitantes que el conjunto registra en
          {{ c.product }} son del conjunto: el conjunto es el Responsable del tratamiento.
        </li>
        <li>
          {{ c.legalName }} los trata como Encargado, solo para prestar el servicio y según las
          instrucciones del conjunto.
        </li>
        <li>
          El conjunto debe tener la autorización de los titulares y su propia política de
          tratamiento; nosotros lo apoyamos a responder sus solicitudes.
        </li>
      </ul>
    </div>

    <p>
      Este acuerdo es el contrato de transmisión de datos personales al que se refieren el artículo
      25 de la Ley 1581 de 2012 y el artículo 2.2.2.25.5.2 del Decreto 1074 de 2015. Forma parte de
      los <a href="/legal/terminos-y-condiciones/">Términos y condiciones</a> de {{ c.product }}.
    </p>

    <h2 id="partes">1. Partes</h2>
    <ul>
      <li>
        <strong>El Responsable:</strong> el conjunto o copropiedad sometido al régimen de propiedad
        horizontal que contrata {{ c.product }} (el «Conjunto»), representado por quien lo registra en
        la Plataforma.
      </li>
      <li>
        <strong>El Encargado:</strong> {{ c.legalName }}, NIT {{ c.nit }}, con domicilio en
        {{ c.address }} («Droni.co»).
      </li>
    </ul>

    <h2 id="objeto">2. Objeto</h2>
    <p>
      Droni.co tratará los datos personales que el Conjunto registre o cargue en la Plataforma, o que
      sus usuarios registren en su nombre, por cuenta del Conjunto y con el único fin de prestarle el
      servicio contratado: alojar, organizar, mostrar, calcular, enviar y conservar la información
      según las funciones de la Plataforma que el Conjunto use, darle soporte y cumplir la ley.
    </p>

    <h2 id="datos">3. Datos y titulares</h2>
    <p>Según las funciones que use el Conjunto, los titulares pueden ser:</p>
    <ul>
      <li>
        Propietarios, arrendatarios y demás ocupantes de las unidades, y los integrantes de su hogar,
        incluidos niños, niñas y adolescentes.
      </li>
      <li>Miembros del consejo, administrador, contador, revisor fiscal, personal y vigilancia.</li>
      <li>Visitantes, proveedores y contratistas del Conjunto.</li>
    </ul>
    <p>Y los datos pueden ser:</p>
    <ul>
      <li>Identificación y contacto: nombre, documento, correo y teléfono.</li>
      <li>
        Relación con el Conjunto: unidad, calidad (propietario, arrendatario u otro), parentesco,
        fechas de ingreso y salida.
      </li>
      <li>Vehículos (placa, tipo, marca, color) y mascotas.</li>
      <li>
        Información financiera de la unidad: cuotas, cobros, pagos, soportes de pago, saldos y
        cartera.
      </li>
      <li>
        Reservas de zonas comunes, PQRS, comunicados y su lectura, visitas, paquetes, documentos y
        archivos adjuntos.
      </li>
    </ul>
    <p>
      El Conjunto decide qué datos registra y para qué. La Plataforma no está diseñada para tratar
      datos sensibles, y el Conjunto se abstendrá de registrarlos salvo que cuente con una base legal
      y la autorización expresa que exige la ley.
    </p>

    <h2 id="responsable">4. Obligaciones del Conjunto</h2>
    <p>Como Responsable, el Conjunto se obliga a:</p>
    <ol>
      <li>
        Obtener y conservar la autorización previa, expresa e informada de los titulares, salvo en
        los casos en que la ley no la exige, e informarles las finalidades del tratamiento.
      </li>
      <li>
        Adoptar y publicar su propia política de tratamiento de datos personales, e informar en ella
        que la información se aloja con un proveedor tecnológico, que puede estar fuera de Colombia.
      </li>
      <li>
        Registrar solo los datos necesarios, veraces y actualizados, y corregirlos cuando
        corresponda.
      </li>
      <li>
        Tratar los datos de niños, niñas y adolescentes solo con la autorización de su representante
        legal y respetando su interés superior.
      </li>
      <li>
        Atender las consultas y reclamos de los titulares en los términos de la ley, con el apoyo de
        Droni.co.
      </li>
      <li>
        Dar acceso a la Plataforma solo a personas autorizadas y retirarlo cuando dejen de
        necesitarlo.
      </li>
      <li>
        Cumplir las demás obligaciones del Responsable previstas en el artículo 17 de la Ley 1581 de
        2012, incluido el registro de sus bases de datos cuando le sea exigible.
      </li>
    </ol>

    <h2 id="encargado">5. Obligaciones de Droni.co</h2>
    <p>Como Encargado, Droni.co se obliga a:</p>
    <ol>
      <li>
        Tratar los datos solo por cuenta del Conjunto, según sus instrucciones, que se expresan en
        el uso que hace de la Plataforma, y para la finalidad de este acuerdo.
      </li>
      <li>
        No usar los datos para fines propios ni comunicarlos a terceros, salvo a los subencargados
        del numeral 6, por mandato legal o por orden de autoridad competente. Droni.co puede elaborar
        estadísticas agregadas y anonimizadas que no permitan identificar al Conjunto ni a ninguna
        persona.
      </li>
      <li>
        Mantener la confidencialidad de los datos y exigirla a su personal, que solo accederá a ellos
        cuando sea necesario para prestar el servicio o dar soporte.
      </li>
      <li>
        Aplicar medidas de seguridad técnicas, humanas y administrativas para evitar su adulteración,
        pérdida, consulta, uso o acceso no autorizado, como las descritas en la
        <a href="/legal/tratamiento-de-datos/#seguridad">Política de tratamiento de datos</a>.
      </li>
      <li>
        Separar la información del Conjunto de la de otros conjuntos y permitir el acceso según los
        roles que el Conjunto asigne.
      </li>
      <li>
        Cumplir las demás obligaciones del Encargado previstas en el artículo 18 de la Ley 1581 de
        2012.
      </li>
    </ol>

    <h2 id="subencargados">6. Subencargados y transmisión internacional</h2>
    <p>
      El Conjunto autoriza a Droni.co a apoyarse en los proveedores de infraestructura y servicios
      indicados en la
      <a href="/legal/tratamiento-de-datos/#terceros">Política de tratamiento de datos</a>, entre
      ellos DigitalOcean, LLC, que aloja la información en servidores ubicados en Estados Unidos, y
      Mailjet, que envía los correos desde la Unión Europea. En consecuencia, el Conjunto autoriza la
      transmisión internacional de los datos a esos proveedores.
    </p>
    <p>
      Droni.co exigirá a sus subencargados obligaciones de confidencialidad y seguridad equivalentes
      a las de este acuerdo, y publicará en esa política cualquier cambio de subencargados antes de
      que empiece a regir.
    </p>

    <h2 id="incidentes">7. Incidentes de seguridad</h2>
    <p>
      Si Droni.co conoce un incidente de seguridad que afecte datos del Conjunto, se lo informará al
      Usuario administrador sin demora injustificada y a más tardar dentro de las setenta y dos (72)
      horas siguientes a confirmarlo, con la información disponible sobre lo ocurrido, los datos
      afectados y las medidas adoptadas, para que el Conjunto pueda cumplir sus deberes de reporte
      ante la Superintendencia de Industria y Comercio y frente a los titulares.
    </p>

    <h2 id="solicitudes">8. Solicitudes de los titulares</h2>
    <p>
      Si un titular le presenta a Droni.co una consulta o reclamo sobre datos del Conjunto, Droni.co
      la trasladará al Conjunto dentro de los cinco (5) días hábiles siguientes e informará al
      titular que su solicitud fue trasladada. Droni.co apoyará al Conjunto para consultar,
      actualizar, rectificar o suprimir los datos en la Plataforma, y marcará la información con la
      leyenda «reclamo en trámite» o «información en discusión judicial» cuando el Conjunto se lo
      indique.
    </p>

    <h2 id="terminacion">9. Duración, devolución y eliminación</h2>
    <p>
      Este acuerdo rige mientras el Conjunto tenga el servicio y hasta que se eliminen sus datos. Al
      terminar el servicio, la información queda en modo consulta durante
      {{ DATA_RETENTION_DAYS }} días calendario para que el Conjunto la exporte; vencido ese plazo,
      Droni.co podrá eliminarla, y las copias de respaldo se eliminan en su ciclo normal de rotación.
      Droni.co solo conservará lo que la ley le obligue a conservar.
    </p>

    <h2 id="responsabilidad">10. Responsabilidad</h2>
    <p>
      Cada parte responde por el cumplimiento de sus propias obligaciones legales frente a los
      titulares y las autoridades. Droni.co no responde por la legalidad de los datos que el Conjunto
      registra ni por la falta de autorización de los titulares. En lo demás aplica la limitación de
      responsabilidad de los Términos y condiciones.
    </p>

    <h2 id="aceptacion">11. Aceptación</h2>
    <p>
      Quien registra el Conjunto en la Plataforma acepta este acuerdo en su nombre, de forma
      electrónica y con plena validez conforme a la Ley 527 de 1999. Droni.co guarda como evidencia
      la fecha y hora, la versión aceptada, la dirección IP y el navegador desde el que se aceptó. Si
      el Conjunto necesita una copia firmada, puede solicitarla a
      <a :href="`mailto:${c.email}`">{{ c.email }}</a>.
    </p>
  </LegalLayout>
</template>
