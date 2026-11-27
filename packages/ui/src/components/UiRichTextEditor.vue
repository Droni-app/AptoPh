<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { cx } from '../styles'
import { FIELD_KEY } from '../field'

/**
 * A simple rich text editor: bold, italic, underline, subtitle, lists, quote,
 * link, undo. v-model is HTML ('' when empty); the API sanitizes it again.
 */
export interface UiRichTextEditorProps {
  modelValue?: string | null
  placeholder?: string
  disabled?: boolean
  /** Minimum height of the writing area, in rem */
  minHeight?: number
}

const props = withDefaults(defineProps<UiRichTextEditorProps>(), {
  placeholder: 'Escribe aquí…',
  minHeight: 10,
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const field = inject(FIELD_KEY, null)
const fieldId = field?.takeId()

const editor = useEditor({
  content: props.modelValue ?? '',
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [3] },
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['mailto', 'tel'],
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    Placeholder.configure({ placeholder: () => props.placeholder }),
  ],
  editorProps: {
    attributes: {
      class: 'ui-prose min-h-full px-3 py-2.5 focus:outline-none',
      role: 'textbox',
      'aria-multiline': 'true',
    },
  },
  onUpdate: ({ editor }) => emit('update:modelValue', editor.isEmpty ? '' : editor.getHTML()),
})

// Outside changes (opening another comunicado, resetting the form)
watch(
  () => props.modelValue,
  (value) => {
    const current = editor.value
    if (!current) return
    const html = current.isEmpty ? '' : current.getHTML()
    if ((value ?? '') !== html) current.commands.setContent(value ?? '', { emitUpdate: false })
  },
)
watch(
  () => props.disabled,
  (disabled) => editor.value?.setEditable(!disabled),
)
// aria wiring of the field (label, error) goes to the editable element
watch(
  [editor, () => field?.invalid.value, () => field?.describedBy.value],
  () => {
    const dom = editor.value?.view.dom
    if (!dom) return
    if (fieldId) dom.id = fieldId
    dom.toggleAttribute('aria-invalid', !!field?.invalid.value)
    const describedBy = field?.describedBy.value
    if (describedBy) dom.setAttribute('aria-describedby', describedBy)
    else dom.removeAttribute('aria-describedby')
  },
  { immediate: true },
)
onBeforeUnmount(() => editor.value?.destroy())

type Action = {
  key: string
  icon: string
  label: string
  run: () => void
  active?: () => boolean
  disabled?: () => boolean
}
const chain = () => editor.value!.chain().focus()
const groups = computed<Action[][]>(() => [
  [
    {
      key: 'bold',
      icon: 'mdi-format-bold',
      label: 'Negrita (Ctrl+B)',
      run: () => chain().toggleBold().run(),
      active: () => !!editor.value?.isActive('bold'),
    },
    {
      key: 'italic',
      icon: 'mdi-format-italic',
      label: 'Cursiva (Ctrl+I)',
      run: () => chain().toggleItalic().run(),
      active: () => !!editor.value?.isActive('italic'),
    },
    {
      key: 'underline',
      icon: 'mdi-format-underline',
      label: 'Subrayado (Ctrl+U)',
      run: () => chain().toggleUnderline().run(),
      active: () => !!editor.value?.isActive('underline'),
    },
  ],
  [
    {
      key: 'heading',
      icon: 'mdi-format-header-pound',
      label: 'Subtítulo',
      run: () => chain().toggleHeading({ level: 3 }).run(),
      active: () => !!editor.value?.isActive('heading', { level: 3 }),
    },
    {
      key: 'bullets',
      icon: 'mdi-format-list-bulleted',
      label: 'Lista con viñetas',
      run: () => chain().toggleBulletList().run(),
      active: () => !!editor.value?.isActive('bulletList'),
    },
    {
      key: 'numbers',
      icon: 'mdi-format-list-numbered',
      label: 'Lista numerada',
      run: () => chain().toggleOrderedList().run(),
      active: () => !!editor.value?.isActive('orderedList'),
    },
    {
      key: 'quote',
      icon: 'mdi-format-quote-close',
      label: 'Destacado',
      run: () => chain().toggleBlockquote().run(),
      active: () => !!editor.value?.isActive('blockquote'),
    },
    {
      key: 'link',
      icon: 'mdi-link-variant',
      label: 'Enlace',
      run: () => openLink(),
      active: () => !!editor.value?.isActive('link') || linkOpen.value,
    },
  ],
  [
    {
      key: 'undo',
      icon: 'mdi-undo',
      label: 'Deshacer (Ctrl+Z)',
      run: () => chain().undo().run(),
      disabled: () => !editor.value?.can().undo(),
    },
    {
      key: 'redo',
      icon: 'mdi-redo',
      label: 'Rehacer (Ctrl+Shift+Z)',
      run: () => chain().redo().run(),
      disabled: () => !editor.value?.can().redo(),
    },
  ],
])

// The link is written in a row under the toolbar (no browser prompt)
const linkOpen = ref(false)
const linkUrl = ref('')
const linkInput = ref<HTMLInputElement | null>(null)
function openLink() {
  linkUrl.value = (editor.value?.getAttributes('link').href as string | undefined) ?? ''
  linkOpen.value = true
  nextTick(() => linkInput.value?.focus())
}
function applyLink() {
  const raw = linkUrl.value.trim()
  const target = chain().extendMarkRange('link')
  if (!raw) target.unsetLink().run()
  else {
    const href = /^(https?:|mailto:|tel:)/i.test(raw) ? raw : `https://${raw}`
    // Without a selection, the address itself becomes the text
    if (editor.value?.state.selection.empty && !editor.value.isActive('link'))
      target
        .insertContent({ type: 'text', text: raw, marks: [{ type: 'link', attrs: { href } }] })
        .run()
    else target.setLink({ href }).run()
  }
  linkOpen.value = false
}
function removeLink() {
  chain().extendMarkRange('link').unsetLink().run()
  linkOpen.value = false
}

const wrapper = computed(() =>
  cx(
    'overflow-hidden rounded-lg border bg-white shadow-xs transition-colors dark:bg-neutral-900',
    field?.invalid.value
      ? 'border-red-400 focus-within:ring-3 focus-within:ring-red-500/15'
      : 'border-neutral-300 focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/15 dark:border-white/12 dark:focus-within:border-brand-300 dark:focus-within:ring-brand-300/20',
    props.disabled && 'opacity-60',
  ),
)
const button = (active: boolean) =>
  cx(
    'grid size-8 place-items-center rounded-md text-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35',
    active
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-400/15 dark:text-brand-200'
      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/8 dark:hover:text-white',
  )
</script>

<template>
  <div :class="wrapper">
    <div
      role="toolbar"
      aria-label="Formato del texto"
      class="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50 px-1.5 py-1 dark:border-white/10 dark:bg-white/3"
    >
      <template v-for="(group, i) in groups" :key="i">
        <span
          v-if="i > 0"
          class="mx-1 h-5 w-px bg-neutral-200 dark:bg-white/10"
          aria-hidden="true"
        />
        <button
          v-for="action in group"
          :key="action.key"
          type="button"
          :class="button(action.active?.() ?? false)"
          :title="action.label"
          :aria-label="action.label"
          :aria-pressed="action.active ? action.active() : undefined"
          :disabled="disabled || !editor || (action.disabled?.() ?? false)"
          @mousedown.prevent
          @click="action.run()"
        >
          <span :class="['mdi', action.icon]" aria-hidden="true" />
        </button>
      </template>
    </div>

    <!-- Not a <form>: the editor usually lives inside one -->
    <div
      v-if="linkOpen"
      class="flex items-center gap-2 border-b border-neutral-200 px-2.5 py-2 dark:border-white/10"
      @keydown.enter.prevent="applyLink"
      @keydown.esc.prevent.stop="linkOpen = false"
    >
      <span class="mdi mdi-link-variant text-lg text-neutral-400" aria-hidden="true" />
      <input
        ref="linkInput"
        v-model="linkUrl"
        type="text"
        inputmode="url"
        aria-label="Dirección del enlace"
        placeholder="https://… o correo@ejemplo.com"
        class="h-8 min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-white/12 dark:bg-neutral-900 dark:text-neutral-100"
      />
      <button
        type="button"
        class="h-8 rounded-md bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700"
        @click="applyLink"
      >
        Aplicar
      </button>
      <button
        v-if="editor?.isActive('link')"
        type="button"
        class="h-8 rounded-md px-2.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/8"
        @click="removeLink"
      >
        Quitar
      </button>
      <button
        type="button"
        class="grid size-8 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/8"
        aria-label="Cerrar"
        @click="linkOpen = false"
      >
        <span class="mdi mdi-close" aria-hidden="true" />
      </button>
    </div>

    <EditorContent
      :editor="editor"
      class="max-h-[28rem] cursor-text overflow-y-auto"
      :style="{ minHeight: `${minHeight}rem` }"
      @click="editor?.commands.focus()"
    />
  </div>
</template>
