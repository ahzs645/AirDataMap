<template>
  <label class="flex items-center gap-2 text-sm font-medium leading-none">
    <input
      type="checkbox"
      class="peer h-4 w-4 shrink-0 rounded border border-input bg-background text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      :checked="props.modelValue"
      @change="onChange"
      v-bind="$attrs"
    />
    <span class="text-sm text-foreground"><slot /></span>
  </label>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

function onChange(event) {
  emit('update:modelValue', event.target.checked)
}
</script>
