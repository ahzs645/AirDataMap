<template>
  <div v-if="monitors.length" class="space-y-2">
    <div class="flex items-center gap-2">
      <div class="h-3 w-3 rounded-full" :style="{ backgroundColor: network.colorHex }"></div>
      <h4 class="text-sm font-medium text-foreground">{{ network.name }}</h4>
      <span class="text-xs text-muted-foreground">({{ monitors.length }})</span>
    </div>
    <ul class="space-y-2">
      <li v-for="monitor in monitors.slice(0, 5)" :key="monitor.id" class="list-none">
        <button
          type="button"
          class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-primary/40 hover:bg-accent/50"
          @click="$emit('focus-point', monitor.latitude, monitor.longitude)"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
            <Badge
              v-if="monitor.status === 'inactive'"
              class="border-destructive bg-destructive/15 text-[10px] uppercase tracking-wide text-destructive-foreground"
              variant="outline"
            >
              INACTIVE
            </Badge>
            <Badge
              v-else-if="monitor.siteType"
              variant="secondary"
              class="text-[10px] uppercase tracking-wide"
            >
              {{ monitor.siteType.toUpperCase() }}
            </Badge>
          </div>
          <div v-if="monitor.city || monitor.category || monitor.county || monitor.state" class="text-xs text-muted-foreground">
            {{ getLocationText(monitor) }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
              {{ param }}
            </Badge>
          </div>
          <p v-if="monitor.comments" class="text-xs text-muted-foreground">
            {{ monitor.comments }}
          </p>
        </button>
      </li>
    </ul>
    <p v-if="monitors.length > 5" class="text-xs text-muted-foreground">
      + {{ monitors.length - 5 }} more {{ getNetworkLabel() }}
    </p>
  </div>
</template>

<script setup>
import Badge from './ui/badge/Badge.vue'

const props = defineProps({
  network: {
    type: Object,
    required: true
  },
  monitors: {
    type: Array,
    default: () => []
  }
})

defineEmits(['focus-point'])

function getLocationText(monitor) {
  const parts = []
  if (monitor.city) parts.push(monitor.city)
  if (monitor.category) parts.push(monitor.category)
  if (monitor.province) parts.push(monitor.province)
  if (monitor.county) parts.push(monitor.county)
  if (monitor.state) parts.push(monitor.state)
  return parts.filter(Boolean).join(' · ')
}

function getNetworkLabel() {
  const labels = {
    'PA': 'Purple Air monitors',
    'FEM': 'FEM monitors',
    'EGG': 'AQ Egg monitors',
    'SPARTAN': 'SPARTAN monitors',
    'BC ENV': 'BC monitors',
    'ASCENT': 'ASCENT sites',
    'EPA IMPROVE': 'IMPROVE sites',
    'EPA NATTS': 'NATTS sites',
    'EPA NEAR ROAD': 'near-road sites',
    'EPA CSN STN': 'CSN sites',
    'EPA NCORE': 'NCore sites'
  }
  return labels[props.network.id] || 'monitors'
}
</script>
