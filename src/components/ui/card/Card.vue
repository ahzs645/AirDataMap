<template>
  <div :class="cn('rounded-xl border bg-card text-card-foreground shadow-sm', props.class)" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
  class: {
    type: [String, Array, Object],
    default: ''
  }
})
</script>
