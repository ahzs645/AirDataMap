<template>
  <Dialog v-model="isOpen">
    <div class="space-y-4">
      <header>
        <h2 class="text-xl font-semibold tracking-tight text-foreground">
          Select Networks
        </h2>
        <p class="text-sm text-muted-foreground">
          Choose which monitoring networks to display on the map.
        </p>
      </header>

      <Separator />

      <ScrollArea class="max-h-[60vh]">
        <NetworkSelector
          :selected-networks="selectedNetworks"
          :network-counts="networkCounts"
          :show-actions="true"
          :compact="true"
          @update:selected-networks="(newSet) => $emit('update:selectedNetworks', newSet)"
        />
      </ScrollArea>

      <div class="flex justify-end gap-2 pt-4">
        <Button @click="isOpen = false">
          Done
        </Button>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import Dialog from './ui/dialog/Dialog.vue'
import Button from './ui/button/Button.vue'
import Separator from './ui/separator/Separator.vue'
import ScrollArea from './ui/scroll-area/ScrollArea.vue'
import NetworkSelector from './NetworkSelector.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  selectedNetworks: {
    type: Set,
    required: true
  },
  networkCounts: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'update:selectedNetworks'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>
