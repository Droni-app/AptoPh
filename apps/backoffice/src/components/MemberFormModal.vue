<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  UiAlert,
  UiButton,
  UiForm,
  UiInput,
  UiLabel,
  UiModal,
  UiSelect,
  useToast,
} from '@aptoph/ui'
import {
  ENROLLMENT_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type EnrollmentRole,
  type Member,
} from '@aptoph/shared'
import { membersApi } from '@/api/backoffice'
import { errorMessage, fieldErrors } from '@/lib/errors'

/**
 * Invites a person (email + role) or edits the title and dates of a member.
 * `preset` fills the invitation, e.g. an occupant invited to the residents portal.
 */
const props = defineProps<{
  member?: Member | null
  preset?: { email?: string; fullName?: string; role?: EnrollmentRole; occupantId?: string }
}>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [member: Member] }>()

const toast = useToast()
const editing = computed(() => Boolean(props.member))

const emptyForm = () => ({
  email: '',
  fullName: '',
  role: 'council_member' as EnrollmentRole,
  title: '',
  startsOn: '',
  endsOn: '',
})
const form = ref(emptyForm())
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const saving = ref(false)

const roleOptions = ENROLLMENT_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))

watch(open, (isOpen) => {
  if (!isOpen) return
  const member = props.member
  form.value = member
    ? {
        email: member.user?.email ?? '',
        fullName: member.user?.fullName ?? '',
        role: member.role,
        title: member.title ?? '',
        startsOn: member.startsOn ?? '',
        endsOn: member.endsOn ?? '',
      }
    : { ...emptyForm(), ...props.preset }
  errors.value = {}
  error.value = null
})

async function submit() {
  saving.value = true
  errors.value = {}
  error.value = null
  const dates = {
    title: form.value.title || null,
    startsOn: form.value.startsOn || null,
    endsOn: form.value.endsOn || null,
  }
  try {
    const { data } = props.member
      ? await membersApi.update(props.member.id, dates)
      : await membersApi.invite({
          email: form.value.email,
          fullName: form.value.fullName,
          role: form.value.role,
          occupantId: props.preset?.occupantId ?? null,
          ...dates,
        })
    toast.success(
      props.member ? 'Cambios guardados' : `Enviamos la invitación a ${data.user?.email}`,
    )
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
  <UiModal
    v-model="open"
    :title="
      editing
        ? 'Editar acceso'
        : preset?.occupantId
          ? 'Invitar al portal de residentes'
          : 'Invitar a una persona'
    "
    size="md"
    :persistent="saving"
  >
    <UiForm :loading="saving" @submit="submit">
      <UiAlert v-if="error" color="danger" variant="soft">{{ error }}</UiAlert>
      <p v-if="!editing" class="text-sm text-neutral-600 dark:text-neutral-300">
        Le enviaremos un correo con un enlace para aceptar. Si aún no tiene cuenta en AptoPH, creará
        su contraseña al aceptar. El enlace vence en 7 días.
      </p>

      <UiLabel title="Correo electrónico" required :error="errors.email">
        <UiInput
          v-model="form.email"
          type="email"
          :disabled="editing || Boolean(preset?.occupantId && preset.email)"
          required
          block
        />
      </UiLabel>
      <UiLabel title="Nombre completo" required :error="errors.fullName">
        <UiInput v-model="form.fullName" :disabled="editing" required block />
      </UiLabel>
      <UiLabel title="Rol" required :error="errors.role">
        <UiSelect
          v-model="form.role"
          :options="roleOptions"
          :disabled="editing || Boolean(preset?.occupantId)"
          block
        />
      </UiLabel>
      <p
        class="-mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
      >
        {{ ROLE_DESCRIPTIONS[form.role] }}
      </p>
      <UiLabel title="Cargo (opcional)" :error="errors.title">
        <UiInput
          v-model="form.title"
          maxlength="100"
          placeholder="Presidente del consejo, portero turno noche…"
          block
        />
      </UiLabel>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiLabel title="Acceso desde" :error="errors.startsOn">
          <UiInput v-model="form.startsOn" type="date" block />
        </UiLabel>
        <UiLabel title="Acceso hasta (vacío: sin fin)" :error="errors.endsOn">
          <UiInput v-model="form.endsOn" type="date" :min="form.startsOn || undefined" block />
        </UiLabel>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
          <UiButton type="submit" color="primary" :loading="saving">
            {{ editing ? 'Guardar' : 'Enviar invitación' }}
          </UiButton>
        </div>
      </template>
    </UiForm>
  </UiModal>
</template>
