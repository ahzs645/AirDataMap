<template>
  <div :class="cn('relative overflow-hidden', props.class)">
    <div class="h-full w-full overflow-y-auto">
      <slot />
    </div>
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
