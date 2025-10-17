<template>
  <span
    :class="cn(
      'inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors',
      props.variant === 'outline' && 'border-border bg-transparent text-foreground',
      props.class
    )"
    v-bind="$attrs"
  >
    <slot />
  </span>
</template>

<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: {
    type: String,
    default: 'default'
  },
  class: {
    type: [String, Array, Object],
    default: ''
  }
})
</script>
