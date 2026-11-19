<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  DuiAlert,
  DuiButton,
  DuiCheckbox,
  DuiForm,
  DuiInput,
  DuiLabel,
  DuiModal,
  DuiRadio,
  DuiSelect,
  DuiSwitch,
  DuiTextarea,
  useToast,
} from '@dronico/droni-kit'
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  BUILDING_AUDIENCES,
  type AnnouncementAudience,
  type AnnouncementDetail,
  type AnnouncementInput,
  type Building,
  type EmailPreview,
} from '@aptoph/shared'
import { announcementsApi } from '@/api/announcements'
import { buildingsApi } from '@/api/backoffice'
import AttachmentList from '@/components/attachments/AttachmentList.vue'
import AttachmentPicker from '@/components/attachments/AttachmentPicker.vue'
import { uploadAttachments, warnFailedUploads } from '@/lib/attachments'
import { errorMessage, fieldErrors } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

/** Creates (announcement = null) or edits a comunicado */
const props = defineProps<{ announcement: AnnouncementDetail | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [AnnouncementDetail] }>()
const toast = useToast()

type Publish = AnnouncementInput['publish']
const form = ref({
  title: '',
  body: '',
  audience: 'all' as AnnouncementAudience,
  buildingIds: [] as string[],
  isPinned: false,
  sendEmail: true,
  publish: 'now' as Publish,
  publishAt: '',
})
const files = ref<File[]>([])
const buildings = ref<Building[]>([])
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

/** "2026-11-20T08:00" in the browser's zone, for <input type="datetime-local"> */
function localInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const tomorrowAtEight = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(8, 0, 0, 0)
  return localInput(date)
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  const a = props.announcement
  form.value = a
    ? {
        title: a.title,
        body: a.body,
        audience: a.audience,
        buildingIds: a.buildings.map((b) => b.id),
        isPinned: a.isPinned,
        sendEmail: a.sendEmail,
        publish: a.status === 'draft' ? 'draft' : a.status === 'scheduled' ? 'schedule' : 'now',
        publishAt:
          a.status === 'scheduled' && a.publishedAt
            ? localInput(new Date(a.publishedAt))
            : tomorrowAtEight(),
      }
    : {
        title: '',
        body: '',
        audience: 'all',
        buildingIds: [],
        isPinned: false,
        sendEmail: true,
        publish: 'now',
        publishAt: tomorrowAtEight(),
      }
  files.value = []
  errors.value = {}
  error.value = null
  try {
    buildings.value = (await buildingsApi.list()).data
  } catch {
    buildings.value = []
  }
})

const audienceOptions = ANNOUNCEMENT_AUDIENCES.map((value) => ({
  value,
  label: ANNOUNCEMENT_AUDIENCE_LABELS[value],
}))
const byTower = computed(
  () => BUILDING_AUDIENCES.includes(form.value.audience) && buildings.value.length > 1,
)
const published = computed(() => props.announcement?.status === 'published')
const publishOptions = computed(() => [
  { value: 'now', label: published.value ? 'Publicado' : 'Publicar ahora' },
  {
    value: 'schedule',
    label: 'Programar',
    description: 'Se publica solo en la fecha y hora que elijas',
  },
  { value: 'draft', label: published.value ? 'Volver a borrador' : 'Guardar como borrador' },
])
const submitLabel = computed(() => {
  if (form.value.publish === 'draft') return 'Guardar borrador'
  if (form.value.publish === 'schedule') return 'Programar'
  return published.value ? 'Guardar cambios' : 'Publicar'
})
/** Emailed already (skipped for lack of quota does not count: it can be sent again) */
const alreadyEmailed = computed(() =>
  props.announcement?.emailSkipped ? null : (props.announcement?.emailedAt ?? null),
)
const emailDescription = computed(() => {
  if (alreadyEmailed.value)
    return `Ya se envió el ${formatDateTime(alreadyEmailed.value)}; no se envía de nuevo.`
  if (props.announcement?.emailSkipped)
    return 'No se envió porque no quedaba cupo de correos. Déjalo activo para enviarlo al guardar.'
  return 'Le llega a cada persona de la audiencia cuando se publique.'
})

/** Recipients and quota, while the email is going to be sent */
const preview = ref<EmailPreview | null>(null)
const wantsEmail = computed(
  () =>
    open.value && form.value.sendEmail && form.value.publish !== 'draft' && !alreadyEmailed.value,
)
const overQuota = computed(
  () => !!preview.value && preview.value.recipients > preview.value.quota.available,
)
const quotaMonth = computed(() => {
  if (!preview.value) return ''
  const [year, month] = preview.value.quota.period.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(year!, month! - 1, 1))
})
const number = (n: number) => n.toLocaleString('es-CO')
const remaining = (n: number) => (n === 1 ? 'queda 1 correo' : `quedan ${number(n)} correos`)

let previewTimer: ReturnType<typeof setTimeout> | undefined
let previewSeq = 0
watch(
  () => [
    wantsEmail.value,
    form.value.audience,
    form.value.buildingIds.join(),
    form.value.publish,
    form.value.publishAt,
    byTower.value,
  ],
  () => {
    clearTimeout(previewTimer)
    if (!wantsEmail.value) {
      preview.value = null
      return
    }
    previewTimer = setTimeout(async () => {
      const seq = ++previewSeq
      const at =
        form.value.publish === 'schedule' && form.value.publishAt
          ? new Date(form.value.publishAt)
          : null
      try {
        const { data } = await announcementsApi.emailPreview({
          audience: form.value.audience,
          buildingIds: byTower.value ? form.value.buildingIds : [],
          publishAt: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
        })
        if (seq === previewSeq) preview.value = data
      } catch {
        if (seq === previewSeq) preview.value = null
      }
    }, 300)
  },
)

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  try {
    const input: AnnouncementInput = {
      title: form.value.title,
      body: form.value.body,
      audience: form.value.audience,
      buildingIds: byTower.value ? form.value.buildingIds : [],
      isPinned: form.value.isPinned,
      sendEmail: form.value.sendEmail,
      publish: form.value.publish,
      publishAt:
        form.value.publish === 'schedule' && form.value.publishAt
          ? new Date(form.value.publishAt).toISOString()
          : null,
    }
    const { data } = props.announcement
      ? await announcementsApi.update(props.announcement.id, input)
      : await announcementsApi.create(input)
    const failed = await uploadAttachments('announcement', data.id, files.value)
    toast.success(
      data.status === 'draft'
        ? 'Borrador guardado'
        : data.status === 'scheduled'
          ? `Programado para el ${formatDateTime(data.publishedAt)}`
          : props.announcement
            ? 'Comunicado actualizado'
            : 'Comunicado publicado',
    )
    warnFailedUploads(toast, failed)
    emit('saved', data)
    open.value = false
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? null : errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DuiModal
    v-model="open"
    :title="announcement ? 'Editar comunicado' : 'Nuevo comunicado'"
    size="lg"
    :persistent="saving"
    scrollable
  >
    <DuiForm :loading="saving" @submit="submit">
      <DuiAlert v-if="error" color="danger" variant="soft">{{ error }}</DuiAlert>
      <DuiLabel title="Título" required :error="errors.title">
        <DuiInput
          v-model="form.title"
          :maxlength="ANNOUNCEMENT_TITLE_MAX"
          required
          placeholder="Mantenimiento del tanque de agua"
        />
      </DuiLabel>
      <DuiLabel title="Mensaje" required :error="errors.body">
        <DuiTextarea
          v-model="form.body"
          :maxlength="ANNOUNCEMENT_BODY_MAX"
          rows="8"
          autoheight
          block
          required
          placeholder="Escribe el comunicado. Deja una línea en blanco entre párrafos."
        />
      </DuiLabel>

      <div class="grid gap-4 sm:grid-cols-2">
        <DuiLabel title="Para" required :error="errors.audience">
          <DuiSelect v-model="form.audience" :options="audienceOptions" block />
        </DuiLabel>
        <div class="flex items-end pb-1">
          <DuiSwitch
            v-model="form.isPinned"
            label="Fijar arriba"
            description="Aparece primero en el portal"
          />
        </div>
      </div>

      <fieldset v-if="byTower" class="flex flex-col gap-2">
        <legend class="mb-1 text-sm font-semibold">Torres</legend>
        <p class="text-xs text-neutral-500">Sin marcar ninguna, va a todas las torres.</p>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          <DuiCheckbox
            v-for="building in buildings"
            :key="building.id"
            v-model="form.buildingIds"
            :value="building.id"
            :label="building.name"
          />
        </div>
        <p v-if="errors.buildingIds" class="text-sm text-coral-700">{{ errors.buildingIds }}</p>
      </fieldset>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1 text-sm font-semibold">Publicación</legend>
        <DuiRadio
          v-model="form.publish"
          :options="publishOptions"
          name="publish"
          orientation="horizontal"
        />
        <DuiLabel
          v-if="form.publish === 'schedule'"
          title="Fecha y hora"
          required
          :error="errors.publishAt"
          class="max-w-xs"
        >
          <DuiInput v-model="form.publishAt" type="datetime-local" required />
        </DuiLabel>
      </fieldset>

      <div>
        <DuiSwitch
          v-model="form.sendEmail"
          label="Enviar por correo"
          :description="emailDescription"
          :disabled="!!alreadyEmailed"
        />
        <template v-if="wantsEmail && preview">
          <DuiAlert v-if="overQuota" color="warning" variant="soft" class="mt-3">
            Le llegaría a {{ number(preview.recipients) }}
            {{ preview.recipients === 1 ? 'persona' : 'personas' }} y
            {{ remaining(preview.quota.available) }} de {{ quotaMonth }}. Publícalo sin correo o
            <RouterLink :to="{ name: 'plan' }" class="font-medium underline"
              >compra correos adicionales</RouterLink
            >.
          </DuiAlert>
          <p v-else class="mt-2 text-xs text-neutral-500">
            <i class="mdi mdi-email-outline" aria-hidden="true" />
            Le llegará a {{ number(preview.recipients) }}
            {{ preview.recipients === 1 ? 'persona' : 'personas' }} ·
            {{ remaining(preview.quota.available) }} de {{ number(preview.quota.limit) }} en
            {{ quotaMonth }}.
          </p>
        </template>
        <p v-if="errors.sendEmail" class="mt-2 text-sm text-coral-700">{{ errors.sendEmail }}</p>
      </div>

      <AttachmentList
        v-if="announcement"
        owner-type="announcement"
        :owner-id="announcement.id"
        :initial="announcement.attachments"
        title="Adjuntos"
        editable
      />
      <AttachmentPicker v-else v-model="files" label="Adjuntos" :disabled="saving" />

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <DuiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</DuiButton>
          <DuiButton type="submit" color="primary" :loading="saving">{{ submitLabel }}</DuiButton>
        </div>
      </template>
    </DuiForm>
  </DuiModal>
</template>
