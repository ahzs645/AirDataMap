<template>
  <div class="space-y-4">
    <div v-if="showActions" class="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        @click="selectAll"
      >
        Select All
      </Button>
      <Button
        size="sm"
        variant="outline"
        @click="clearAll"
      >
        Clear All
      </Button>
    </div>

    <Separator v-if="showActions" />

    <div class="space-y-3">
      <Checkbox
        v-for="network in networks"
        :key="network.id"
        :model-value="selectedNetworks.has(network.id)"
        @update:model-value="(val) => toggleNetwork(network.id, val)"
      >
        <span class="flex items-center gap-2">
          <span
            class="inline-block h-3 w-3 rounded-full"
            :style="{ backgroundColor: network.color }"
          ></span>
          <span class="font-medium">{{ network.name }}</span>
          <span class="text-xs text-muted-foreground">({{ network.count }} {{ compact ? '' : 'visible' }})</span>
        </span>
      </Checkbox>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Checkbox from './ui/checkbox/Checkbox.vue'
import Button from './ui/button/Button.vue'
import Separator from './ui/separator/Separator.vue'

const props = defineProps({
  selectedNetworks: {
    type: Set,
    required: true
  },
  networkCounts: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:selectedNetworks'])

const networks = computed(() => [
  { id: 'PA', name: 'Purple Air', color: '#a855f7', count: props.networkCounts.PA || 0 },
  { id: 'FEM', name: 'Federal Equivalent Method (FEM)', color: '#22c55e', count: props.networkCounts.FEM || 0 },
  { id: 'EGG', name: 'AQ Egg (EGG)', color: '#3b82f6', count: props.networkCounts.EGG || 0 },
  { id: 'SPARTAN', name: 'SPARTAN', color: '#eab308', count: props.networkCounts.SPARTAN || 0 },
  { id: 'ASCENT', name: 'ASCENT Network', color: '#ec4899', count: props.networkCounts.ASCENT || 0 },
  { id: 'EPA IMPROVE', name: 'EPA IMPROVE', color: '#06b6d4', count: props.networkCounts['EPA IMPROVE'] || 0 },
  { id: 'EPA NATTS', name: 'EPA NATTS', color: '#14b8a6', count: props.networkCounts['EPA NATTS'] || 0 },
  { id: 'EPA NCORE', name: 'EPA NCORE', color: '#f59e0b', count: props.networkCounts['EPA NCORE'] || 0 },
  { id: 'EPA CSN STN', name: 'EPA CSN STN', color: '#ef4444', count: props.networkCounts['EPA CSN STN'] || 0 },
  { id: 'EPA NEAR ROAD', name: 'EPA NEAR ROAD', color: '#8b5cf6', count: props.networkCounts['EPA NEAR ROAD'] || 0 },
  { id: 'BC ENV', name: 'BC Environment (BC ENV)', color: '#10b981', count: props.networkCounts['BC ENV'] || 0 },
  { id: 'EPA PAMS', name: 'EPA PAMS', color: '#6366f1', count: props.networkCounts['EPA PAMS'] || 0 }
])

function toggleNetwork(networkId, value) {
  const newSet = new Set(props.selectedNetworks)
  if (value) {
    newSet.add(networkId)
  } else {
    newSet.delete(networkId)
  }
  emit('update:selectedNetworks', newSet)
}

function selectAll() {
  const allNetworks = new Set(networks.value.map(n => n.id))
  emit('update:selectedNetworks', allNetworks)
}

function clearAll() {
  emit('update:selectedNetworks', new Set())
}
</script>
