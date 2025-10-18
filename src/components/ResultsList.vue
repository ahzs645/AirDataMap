<template>
  <div class="space-y-4 px-6 py-4">
    <!-- Point Networks Section -->
    <section v-if="categories.points" class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">Point Networks</h3>
        <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ totalPoints }} monitors</p>
      </div>
      <p v-if="!totalPoints" class="text-sm text-muted-foreground">
        No point networks in range.
      </p>
      <div v-else class="space-y-3">
        <MonitorNetworkGroup
          v-for="network in monitorNetworks"
          :key="network.id"
          :network="network"
          :monitors="getMonitorsForNetwork(network.id)"
          @focus-point="(lat, lon) => $emit('focus-point', lat, lon)"
        />
      </div>
    </section>

    <!-- Satellite Products Section -->
    <section v-if="categories.satellite" class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">Satellite Products</h3>
        <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ satelliteMatches.length }} datasets</p>
      </div>
      <p v-if="!satelliteMatches.length" class="text-sm text-muted-foreground">
        No satellite coverage intersects the radius.
      </p>
      <ul v-else class="space-y-2">
        <ProductCard
          v-for="product in satelliteMatches"
          :key="product.id"
          :product="product"
          :is-visible="visibleItems.satellites.has(product.id)"
          @toggle="$emit('toggle-satellite', product.id)"
        />
      </ul>
    </section>

    <!-- Hex Grid Products Section -->
    <section v-if="categories.grids" class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-foreground">Hex Grid Products</h3>
        <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ hexMatches.length }} datasets</p>
      </div>
      <p v-if="!hexMatches.length" class="text-sm text-muted-foreground">
        No grid cells intersect the search area.
      </p>
      <ul v-else class="space-y-2">
        <ProductCard
          v-for="product in hexMatches"
          :key="product.id"
          :product="product"
          :is-visible="visibleItems.hexProducts.has(product.id)"
          :is-hex="true"
          @toggle="$emit('toggle-hex', product.id)"
        />
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MonitorNetworkGroup from './MonitorNetworkGroup.vue'
import ProductCard from './ProductCard.vue'

const props = defineProps({
  categories: {
    type: Object,
    required: true
  },
  monitorsByNetwork: {
    type: Object,
    required: true
  },
  satelliteMatches: {
    type: Array,
    default: () => []
  },
  hexMatches: {
    type: Array,
    default: () => []
  },
  visibleItems: {
    type: Object,
    required: true
  }
})

defineEmits(['focus-point', 'toggle-satellite', 'toggle-hex'])

const monitorNetworks = [
  { id: 'PA', name: 'Purple Air', color: 'purple', hoverColor: 'purple' },
  { id: 'FEM', name: 'FEM (Federal Equivalent Method)', color: 'green', hoverColor: 'green' },
  { id: 'EGG', name: 'AQ Egg', color: 'blue', hoverColor: 'blue' },
  { id: 'SPARTAN', name: 'SPARTAN Network', color: 'amber', hoverColor: 'amber' },
  { id: 'BC ENV', name: 'BC Ministry of Environment', color: 'teal', hoverColor: 'teal' },
  { id: 'ASCENT', name: 'ASCENT Network', color: 'cyan', hoverColor: 'cyan' },
  { id: 'EPA IMPROVE', name: 'EPA IMPROVE Network', color: 'teal', hoverColor: 'teal' },
  { id: 'EPA NATTS', name: 'EPA NATTS', color: 'orange', hoverColor: 'orange' },
  { id: 'EPA NEAR ROAD', name: 'EPA Near-Road Network', color: 'yellow', hoverColor: 'yellow' },
  { id: 'EPA CSN STN', name: 'EPA PM2.5 Chemical Speciation', color: 'purple', hoverColor: 'purple' },
  { id: 'EPA NCORE', name: 'EPA NCore Multipollutant', color: 'indigo', hoverColor: 'indigo' }
]

const totalPoints = computed(() => {
  return Object.values(props.monitorsByNetwork).reduce((sum, monitors) => sum + monitors.length, 0)
})

function getMonitorsForNetwork(networkId) {
  return props.monitorsByNetwork[networkId] || []
}
</script>
