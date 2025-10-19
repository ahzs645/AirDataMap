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

          <!-- Boundary Mode Results -->
          <template v-else>
            <!-- Boundary Type Selector (Radius vs Regions) -->
            <div class="border-b bg-muted/30 px-6 py-3">
              <div class="flex items-center gap-2 rounded-md border bg-background p-1">
                <button
                  @click="$emit('update:boundaryType', 'radius')"
                  class="flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="boundaryType === 'radius' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                >
                  Radius
                </button>
                <button
                  @click="$emit('update:boundaryType', 'region')"
                  class="flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="boundaryType === 'region' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                >
                  Regions
                </button>
              </div>
            </div>

            <!-- Region Selector Button (when in region mode) -->
            <div v-if="boundaryType === 'region'" class="border-b px-6 py-4">
              <div v-if="!selectedRegionCode" class="mb-3 space-y-1">
                <p class="text-sm font-medium">Select a Region</p>
                <p class="text-xs text-muted-foreground">
                  Choose an administrative boundary to analyze
                </p>
              </div>
              <Button
                @click="showRegionDialog = true"
                :variant="selectedRegionCode ? 'outline' : 'default'"
                :disabled="boundaryLoading"
                class="w-full"
              >
                <svg
                  v-if="!boundaryLoading"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="mr-2"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span v-if="boundaryLoading" class="mr-2">⏳</span>
                {{ boundaryLoading ? 'Loading boundary...' : selectedRegionCode ? 'Change Region' : 'Browse Regions' }}
              </Button>

              <!-- Show selected region info -->
              <div v-if="selectedRegionCode && selectedRegionInfo" class="mt-3 rounded-md bg-muted/50 p-3">
                <div class="text-xs font-medium text-muted-foreground">Selected Region</div>
                <div class="mt-1 text-sm font-semibold">{{ selectedRegionInfo.name }}</div>
                <div class="text-xs text-muted-foreground">{{ selectedRegionInfo.levelLabel }}</div>
              </div>
            </div>

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

    <!-- Region Selection Dialog -->
    <Dialog v-model="showRegionDialog">
      <div class="space-y-4">
        <header class="space-y-2">
          <h2 class="text-2xl font-semibold tracking-tight">Select Region</h2>
          <p class="text-sm text-muted-foreground">
            Browse or search for an administrative boundary to analyze.
          </p>
        </header>

        <Separator />

        <RegionSelector
          v-if="boundaryIndex"
          :region-source="regionSource"
          :index="boundaryIndex"
          :selected-level="selectedRegionLevel"
          :selected-code="selectedRegionCode"
          :search-boundaries="searchBoundaries"
          :get-child-boundaries="getChildBoundaries"
          @update:selection="handleRegionSelection"
        />
        <div v-else class="py-8 text-center text-sm text-muted-foreground">
          Loading regions...
        </div>
      </div>
    </Dialog>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import Card from './ui/card/Card.vue'
import CardHeader from './ui/card/CardHeader.vue'
import CardContent from './ui/card/CardContent.vue'
import CardTitle from './ui/card/CardTitle.vue'
import CardDescription from './ui/card/CardDescription.vue'
import ScrollArea from './ui/scroll-area/ScrollArea.vue'
import Separator from './ui/separator/Separator.vue'
import Button from './ui/button/Button.vue'
import Dialog from './ui/dialog/Dialog.vue'
import NetworkSelector from './NetworkSelector.vue'
import RegionSelector from './RegionSelector.vue'

const props = defineProps({
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
  },
  // Boundary/Region props
  boundaryType: {
    type: String,
    default: 'radius'
  },
  regionSource: {
    type: String,
    default: 'bcHealth'
  },
  selectedRegionLevel: {
    type: String,
    default: null
  },
  selectedRegionCode: {
    type: String,
    default: null
  },
  boundaryIndex: {
    type: Object,
    default: null
  },
  boundaryLoading: {
    type: Boolean,
    default: false
  },
  searchBoundaries: {
    type: Function,
    default: () => []
  },
  getChildBoundaries: {
    type: Function,
    default: () => []
  }
})

const emit = defineEmits(['update:selectedNetworks', 'update:boundaryType', 'update:regionSelection'])

const showRegionDialog = ref(false)

// Compute selected region info for display
const selectedRegionInfo = computed(() => {
  if (!props.selectedRegionCode || !props.boundaryIndex) return null

  const levelLabels = {
    'healthAuthority': 'Health Authority',
    'hsda': 'Health Service Delivery Area',
    'lha': 'Local Health Area',
    'chsa': 'Community Health Service Area'
  }

  // Find the region in the index
  const indexKeys = {
    'healthAuthority': 'healthAuthorities',
    'hsda': 'healthServiceDeliveryAreas',
    'lha': 'localHealthAreas',
    'chsa': 'communityHealthServiceAreas'
  }

  const indexKey = indexKeys[props.selectedRegionLevel]
  if (!indexKey) return null

  const regions = props.boundaryIndex[indexKey] || []
  const region = regions.find(r => r.code === props.selectedRegionCode)

  if (!region) return null

  return {
    name: region.name,
    code: region.code,
    levelLabel: levelLabels[props.selectedRegionLevel] || props.selectedRegionLevel
  }
})

function handleRegionSelection(selection) {
  emit('update:regionSelection', selection)
  if (selection && selection.code) {
    showRegionDialog.value = false
  }
}
</script>
