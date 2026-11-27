<script setup lang="ts">
import { COMPANY as c } from '@aptoph/shared'
import LegalLayout, { type LegalSectionLink } from './LegalLayout.vue'

const sections: LegalSectionLink[] = [
  { id: 'que-son', title: 'Qué son' },
  { id: 'sitio-web', title: 'En este sitio web' },
  { id: 'aplicaciones', title: 'En el panel y la app de residentes' },
  { id: 'terceros', title: 'Servicios de terceros' },
  { id: 'como-borrarlos', title: 'Cómo borrarlos' },
]

const items = [
  {
    name: 'Sesión',
    where: 'Panel de administración y app de residentes',
    purpose:
      'Mantener tu sesión iniciada. Guarda el token de acceso y su vencimiento; se borra al cerrar sesión.',
    duration: 'Hasta cerrar sesión o hasta que la sesión venza (30 días)',
  },
  {
    name: 'Conjunto activo',
    where: 'Panel de administración y app de residentes',
    purpose: 'Recordar en qué conjunto estabas trabajando si tienes acceso a varios.',
    duration: 'Hasta que cambies de conjunto o lo borres',
  },
  {
    name: 'Tema',
    where: 'Panel de administración y app de residentes',
    purpose: 'Recordar si prefieres el tema claro u oscuro.',
    duration: 'Hasta que lo borres',
  },
]
</script>

<template>
  <LegalLayout document="cookies" :sections="sections">
    <div class="legal-summary">
      <p><strong>En resumen</strong></p>
      <ul>
        <li>No usamos cookies de publicidad ni herramientas de seguimiento de terceros.</li>
        <li>
          En el panel y en la app de residentes guardamos en tu navegador solo lo necesario para
          mantener tu sesión y tus preferencias.
        </li>
      </ul>
    </div>

    <h2 id="que-son">1. Qué son</h2>
    <p>
      Las cookies y el almacenamiento local son pequeños datos que un sitio web guarda en tu
      navegador para recordar información entre visitas. Esta política explica cuáles usa
      {{ c.product }}, un servicio de {{ c.legalName }}
    </p>

    <h2 id="sitio-web">2. En este sitio web</h2>
    <p>
      El sitio {{ c.website }} no instala cookies propias ni usa herramientas de analítica o
      publicidad de terceros. Las fuentes tipográficas y las imágenes se sirven desde nuestro propio
      dominio.
    </p>

    <h2 id="aplicaciones">3. En el panel y la app de residentes</h2>
    <p>
      El panel de administración y la app de residentes usan el almacenamiento local del navegador
      (<em>localStorage</em>) para lo siguiente. Son estrictamente necesarios para que el servicio
      funcione o para recordar una preferencia que tú eliges, por lo que no requieren un
      consentimiento adicional.
    </p>
    <table>
      <thead>
        <tr>
          <th scope="col">Dato</th>
          <th scope="col">Para qué</th>
          <th scope="col">Duración</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.name">
          <td>
            {{ item.name }}<br /><span class="text-sm text-slate">{{ item.where }}</span>
          </td>
          <td>{{ item.purpose }}</td>
          <td>{{ item.duration }}</td>
        </tr>
      </tbody>
    </table>

    <h2 id="terceros">4. Servicios de terceros</h2>
    <p>
      Cuando el administrador de un conjunto paga la suscripción o guarda una tarjeta, el pago se hace
      en el formulario seguro de Wompi (Bancolombia S.A.), que puede usar sus propias cookies para
      procesar el pago y prevenir fraudes, según sus políticas. La red de entrega de contenido que
      protege nuestros sitios puede usar cookies técnicas de seguridad.
    </p>

    <h2 id="como-borrarlos">5. Cómo borrarlos</h2>
    <p>
      Al cerrar sesión borramos el token de tu sesión. También puedes borrar las cookies y el
      almacenamiento local desde la configuración de tu navegador; si lo haces, tendrás que iniciar
      sesión de nuevo. Para cualquier pregunta escríbenos a
      <a :href="`mailto:${c.email}`">{{ c.email }}</a>.
    </p>
  </LegalLayout>
</template>
