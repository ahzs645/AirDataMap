<template>
  <aside class="flex w-full flex-col border-b border-r bg-muted/40 backdrop-blur-lg lg:max-w-md lg:border-b-0">
    <div class="flex h-full flex-col overflow-hidden p-6">
      <Card class="flex flex-1 flex-col overflow-hidden">
        <CardHeader class="pb-4">
          <CardTitle>{{ viewMode === 'network' ? 'Network Selection' : 'Results' }}</CardTitle>
          <CardDescription>
            <template v-if="viewMode === 'network'">
              Select which monitoring networks to display on the map.
            </template>
            <template v-else-if="summary.regionLabel">
              Region: {{ summary.regionLabel }}
            </template>
            <template v-else>
              Datasets within {{ radiusKm.toFixed(0) }} km of the selected center.
            </template>
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent class="flex-1 overflow-hidden p-0">
          <!-- Network Selection Mode -->
          <template v-if="viewMode === 'network'">
            <ScrollArea class="flex-1">
              <div class="px-6 py-4">
                <NetworkSelector
                  :selected-networks="selectedNetworks"
                  :network-counts="networkCounts"
                  :show-actions="true"
                  @update:selected-networks="(newSet) => $emit('update:selectedNetworks', newSet)"
                />
              </div>
            </ScrollArea>
          </template>

          <!-- Radius Mode Results -->
          <template v-else>
            <div class="flex h-full flex-col">
              <div v-if="error" class="px-6 py-5 text-sm text-destructive">
                <p class="font-medium">Unable to load datasets.</p>
                <p class="text-muted-foreground">{{ error.message }}</p>
              </div>
              <div v-else-if="loading" class="flex flex-1 items-center justify-center px-6 py-10 text-sm text-muted-foreground">
                Loading datasets…
              </div>
              <template v-else>
                <!-- Sensor Density Stats -->
                <div v-if="summary.density" class="border-b bg-muted/30 px-6 py-4">
                  <h3 class="mb-3 text-sm font-semibold">Sensor Density</h3>
                  <div class="space-y-2 text-sm">
                    <div class="flex items-center justify-between">
                      <span class="text-muted-foreground">Low-cost:</span>
                      <span class="font-medium">
                        <template v-if="summary.density.lowCostCount > 0">
                          1 per {{ (1 / summary.density.lowCost).toFixed(1) }} km²
                        </template>
                        <template v-else>None</template>
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-muted-foreground">Other:</span>
                      <span class="font-medium">
                        <template v-if="summary.density.otherCount > 0">
                          1 per {{ (1 / summary.density.other).toFixed(1) }} km²
                        </template>
                        <template v-else>None</template>
                      </span>
                    </div>
                    <div class="flex items-center justify-between border-t pt-2">
                      <span class="font-medium">Overall:</span>
                      <span class="font-semibold">
                        <template v-if="summary.density.totalCount > 0">
                          1 per {{ (1 / summary.density.overall).toFixed(1) }} km²
                        </template>
                        <template v-else>None</template>
                      </span>
                    </div>
                    <div class="mt-3 space-y-1 text-xs text-muted-foreground">
                      <div class="flex items-center justify-between">
                        <span>Search area:</span>
                        <span>{{ summary.density.areaKm2.toFixed(1) }} km²</span>
                      </div>
                      <div v-if="summary.density.actualCoverageKm2 > 0" class="flex items-center justify-between">
                        <span>Actual coverage:</span>
                        <span>{{ summary.density.actualCoverageKm2.toFixed(1) }} km² ({{ summary.density.coveragePercent.toFixed(1) }}%)</span>
                      </div>
                      <div class="flex items-center justify-between font-medium text-foreground">
                        <span>Total sensors:</span>
                        <span>{{ summary.density.totalCount }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ScrollArea class="flex-1">
                  <slot name="results"></slot>
                </ScrollArea>
              </template>
            </div>
          </template>
        </CardContent>
      </Card>
    </div>
  </aside>
</template>

<script setup>
import Card from './ui/card/Card.vue'
import CardHeader from './ui/card/CardHeader.vue'
import CardContent from './ui/card/CardContent.vue'
import CardTitle from './ui/card/CardTitle.vue'
import CardDescription from './ui/card/CardDescription.vue'
import ScrollArea from './ui/scroll-area/ScrollArea.vue'
import Separator from './ui/separator/Separator.vue'
import NetworkSelector from './NetworkSelector.vue'

defineProps({
  viewMode: {
    type: String,
    required: true
  },
  radiusKm: {
    type: Number,
    required: true
  },
  summary: {
    type: Object,
    required: true
  },
  selectedNetworks: {
    type: Set,
    required: true
  },
  networkCounts: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Object,
    default: null
  }
})

defineEmits(['update:selectedNetworks'])
</script>
