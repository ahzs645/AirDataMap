<template>
  <div :class="cn('shrink-0 bg-border', orientationClass, props.class)" v-bind="$attrs"></div>
</template>

<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  orientation: {
    type: String,
    default: 'horizontal'
  },
  class: {
    type: [String, Array, Object],
    default: ''
  }
})

const orientationClass = computed(() =>
  props.orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full'
)
</script>
