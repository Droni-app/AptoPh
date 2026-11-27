/** Shared class maps of the AptoPH components (Tailwind 4) */

export type UiColor = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
export type UiVariant = 'solid' | 'soft' | 'outline' | 'ghost'
export type UiSize = 'sm' | 'md' | 'lg'

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export const variantClasses: Record<UiVariant, Record<UiColor, string>> = {
  solid: {
    neutral:
      'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white',
    primary:
      'bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-300 dark:text-neutral-950 dark:hover:bg-brand-200',
    secondary: 'bg-coral-500 text-white hover:bg-coral-700',
    success:
      'bg-mint-600 text-white hover:bg-mint-700 dark:bg-mint-400 dark:text-neutral-950 dark:hover:bg-mint-300',
    warning: 'bg-amber-400 text-amber-950 hover:bg-amber-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400',
  },
  soft: {
    neutral:
      'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/8 dark:text-neutral-200 dark:hover:bg-white/12',
    primary:
      'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-400/15 dark:text-brand-200 dark:hover:bg-brand-400/25',
    secondary:
      'bg-coral-50 text-coral-700 hover:bg-coral-100 dark:bg-coral-400/15 dark:text-coral-300 dark:hover:bg-coral-400/25',
    success:
      'bg-mint-50 text-mint-800 hover:bg-mint-100 dark:bg-mint-400/15 dark:text-mint-200 dark:hover:bg-mint-400/25',
    warning:
      'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25',
    danger:
      'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25',
  },
  outline: {
    neutral:
      'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-white/15 dark:bg-transparent dark:text-neutral-100 dark:hover:bg-white/5',
    primary:
      'border border-brand-300 bg-white text-brand-700 hover:bg-brand-50 dark:border-brand-400/50 dark:bg-transparent dark:text-brand-200 dark:hover:bg-brand-400/10',
    secondary:
      'border border-coral-300 bg-white text-coral-700 hover:bg-coral-50 dark:border-coral-400/50 dark:bg-transparent dark:text-coral-300 dark:hover:bg-coral-400/10',
    success:
      'border border-mint-300 bg-white text-mint-800 hover:bg-mint-50 dark:border-mint-400/50 dark:bg-transparent dark:text-mint-200 dark:hover:bg-mint-400/10',
    warning:
      'border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-400/50 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-400/10',
    danger:
      'border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/50 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10',
  },
  ghost: {
    neutral:
      'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/8',
    primary: 'text-brand-700 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-brand-400/15',
    secondary: 'text-coral-700 hover:bg-coral-50 dark:text-coral-300 dark:hover:bg-coral-400/15',
    success: 'text-mint-700 hover:bg-mint-50 dark:text-mint-300 dark:hover:bg-mint-400/15',
    warning: 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-400/15',
    danger: 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/15',
  },
}

/** Static surfaces (alerts, badges): the soft/solid/outline look without hover */
export const toneClasses: Record<'solid' | 'soft' | 'outline', Record<UiColor, string>> = {
  solid: {
    neutral: 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900',
    primary: 'bg-brand-700 text-white dark:bg-brand-300 dark:text-neutral-950',
    secondary: 'bg-coral-500 text-white',
    success: 'bg-mint-600 text-white dark:bg-mint-400 dark:text-neutral-950',
    warning: 'bg-amber-400 text-amber-950',
    danger: 'bg-red-600 text-white',
  },
  soft: {
    neutral:
      'bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200 dark:bg-white/6 dark:text-neutral-200 dark:ring-white/10',
    primary:
      'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-100 dark:bg-brand-400/12 dark:text-brand-100 dark:ring-brand-400/20',
    secondary:
      'bg-coral-50 text-coral-700 ring-1 ring-inset ring-coral-100 dark:bg-coral-400/12 dark:text-coral-300 dark:ring-coral-400/20',
    success:
      'bg-mint-50 text-mint-800 ring-1 ring-inset ring-mint-100 dark:bg-mint-400/12 dark:text-mint-200 dark:ring-mint-400/20',
    warning:
      'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-400/12 dark:text-amber-100 dark:ring-amber-400/20',
    danger:
      'bg-red-50 text-red-800 ring-1 ring-inset ring-red-100 dark:bg-red-500/12 dark:text-red-100 dark:ring-red-500/20',
  },
  outline: {
    neutral: 'ring-1 ring-inset ring-neutral-300 text-neutral-700 dark:ring-white/20 dark:text-neutral-200',
    primary: 'ring-1 ring-inset ring-brand-300 text-brand-700 dark:ring-brand-400/50 dark:text-brand-200',
    secondary: 'ring-1 ring-inset ring-coral-300 text-coral-700 dark:ring-coral-400/50 dark:text-coral-300',
    success: 'ring-1 ring-inset ring-mint-300 text-mint-800 dark:ring-mint-400/50 dark:text-mint-200',
    warning: 'ring-1 ring-inset ring-amber-300 text-amber-800 dark:ring-amber-400/50 dark:text-amber-200',
    danger: 'ring-1 ring-inset ring-red-300 text-red-700 dark:ring-red-500/50 dark:text-red-300',
  },
}

export const dotClasses: Record<UiColor, string> = {
  neutral: 'bg-neutral-400',
  primary: 'bg-brand-500 dark:bg-brand-300',
  secondary: 'bg-coral-500',
  success: 'bg-mint-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

export const statusIcons: Record<UiColor, string> = {
  neutral: 'mdi-information-outline',
  primary: 'mdi-information-outline',
  secondary: 'mdi-star-four-points-outline',
  success: 'mdi-check-circle-outline',
  warning: 'mdi-alert-outline',
  danger: 'mdi-alert-circle-outline',
}

/** Text fields: input, select, textarea */
export const fieldClasses =
  'rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 shadow-xs transition-colors placeholder:text-neutral-400 hover:border-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/15 dark:border-white/12 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:hover:border-white/25 dark:focus:border-brand-300 dark:focus:ring-brand-300/20 dark:disabled:bg-white/5'

export const fieldSizeClasses: Record<UiSize, string> = {
  sm: 'h-8 px-2.5',
  md: 'h-9 px-3',
  lg: 'h-11 px-3.5 text-base',
}

export function normalizeSize(size: string | undefined): UiSize {
  if (size === 's' || size === 'sm' || size === 'xs') return 'sm'
  if (size === 'l' || size === 'lg' || size === 'xl') return 'lg'
  return 'md'
}
