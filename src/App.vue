<template>
  <div class="flex h-screen flex-col bg-background text-foreground">
    <AppHeader
      :is-dark="isDark"
      :view-mode="viewMode"
      :radius-km="radiusKm"
      :selected-network-count="selectedNetworks.size"
      :summary="summary"
      :center-selection-active="centerSelectionActive"
      :is-mobile="isMobile"
      :show-heatmap="showHeatmap"
      @toggle-dark-mode="toggleDarkMode"
      @update:view-mode="viewMode = $event"
      @update:radius-km="radiusKm = Number($event)"
      @toggle-center-selection="toggleCenterSelection"
      @open-search="showDialog = true"
      @toggle-heatmap="showHeatmap = !showHeatmap"
    />

    <!-- Main Content Area -->
    <div class="flex flex-1 overflow-hidden lg:flex-row">
      <ResultsSidebar
        v-if="!isMobile"
        :view-mode="viewMode"
        :radius-km="radiusKm"
        :summary="summary"
        :selected-networks="selectedNetworks"
        :network-counts="networkCounts"
        :loading="loading"
        :error="error"
        :boundary-type="boundaryType"
        :region-source="selectedRegionSource"
        :selected-region-level="selectedRegionLevel"
        :selected-region-code="selectedRegionCode"
        :boundary-index="index"
        :boundary-loading="boundaryLoading"
        :search-boundaries="searchBoundaries"
        :get-child-boundaries="getChildBoundaries"
        @update:selected-networks="handleNetworkUpdate"
        @update:boundary-type="boundaryType = $event"
        @update:region-selection="handleRegionSelection"
      >
        <template #results>
          <ResultsList
            :categories="categories"
            :monitors-by-network="monitorsByNetwork"
            :satellite-matches="satelliteMatches"
            :hex-matches="hexMatches"
            :visible-items="visibleItems"
            @focus-point="focusOnPoint"
            @toggle-satellite="toggleSatelliteVisibility"
            @toggle-hex="toggleHexVisibility"
          />
      </template>
    </ResultsSidebar>

      <main class="flex-1 overflow-hidden">
        <MonitorMap
          ref="mapComponent"
          :center="center"
          :radius-km="radiusKm"
          :points="pointMonitors"
          :satellite-products="visibleSatelliteProducts"
          :hex-products="visibleHexProducts"
          :summary="summary"
          :center-selection-enabled="centerSelectionActive"
          :is-dark-mode="isDark"
          :view-mode="viewMode"
          :boundary-type="boundaryType"
          :boundary-source="selectedRegionSource"
          :selected-boundary-id="selectedRegionCode"
          :selected-boundary-level="selectedRegionLevel"
          :boundary-polygon="boundaryPolygon"
          :show-heatmap="showHeatmap"
          @update:center="handleMapCenterUpdate"
        />
      </main>
    </div>

    <!-- Mobile Network Drawer -->
    <MobileNetworkDrawer
      v-if="isMobile"
      v-model="showMobileNetworkDrawer"
      :selected-networks="selectedNetworks"
      :network-counts="networkCounts"
      @update:selected-networks="handleNetworkUpdate"
    />

    <!-- Floating Action Button for Mobile -->
    <FloatingActionButton
      v-if="isMobile"
      @click="showMobileNetworkDrawer = true"
    />

    <Dialog v-model="showDialog">
      <div class="space-y-6">
        <header class="space-y-2">
          <p class="text-sm font-medium text-primary">Air Monitoring Availability</p>
          <h2 class="text-2xl font-semibold tracking-tight text-foreground">
            Explore active air quality coverage
          </h2>
          <p class="text-sm text-muted-foreground">
            Search by address or coordinates to see monitoring networks, satellite products, and hex-grid coverage within your
            radius.
          </p>
        </header>

        <Separator />

        <div class="space-y-6">
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Location search</h3>
            <p class="text-sm text-muted-foreground">Quickly find a place by typing an address or location keyword.</p>

            <form class="space-y-3" @submit.prevent="handleSearchAddress">
              <Label for="address-search">Search by address</Label>
              <div class="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="address-search"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Enter address or location..."
                  :disabled="searching"
                />
                <Button type="submit" class="sm:w-auto" :disabled="searching">
                  {{ searching ? 'Searching…' : 'Search' }}
                </Button>
              </div>
              <p v-if="searchError" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ searchError }}
              </p>
            </form>

            <Separator />

            <form class="space-y-3" @submit.prevent="setCoordinates">
              <Label>Or enter coordinates</Label>
              <div class="grid gap-2 sm:grid-cols-3">
                <Input
                  v-model.number="coordLat"
                  type="number"
                  placeholder="Latitude"
                  step="0.0001"
                  min="-90"
                  max="90"
                />
                <Input
                  v-model.number="coordLon"
                  type="number"
                  placeholder="Longitude"
                  step="0.0001"
                  min="-180"
                  max="180"
                />
                <Button type="submit" variant="secondary" class="sm:w-full">Go</Button>
              </div>
            </form>
          </div>

          <Separator />

          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Search radius</h3>
            <p class="text-sm text-muted-foreground">Adjust the radius (in kilometers) to control which datasets appear.</p>
            <div class="space-y-2">
              <Label for="radius">Radius in kilometers</Label>
              <Input
                id="radius"
                v-model.number="radiusKm"
                type="number"
                min="1"
                max="500"
              />
            </div>
          </div>

          <Separator />

          <div class="space-y-4">
            <h3 class="text-lg font-semibold">Data categories</h3>
            <p class="text-sm text-muted-foreground">Select which sources to include in the map and results list.</p>
            <div class="space-y-3">
              <Checkbox v-model="categories.points">Point networks</Checkbox>
              <Checkbox v-model="categories.satellite">Satellite coverage</Checkbox>
              <Checkbox v-model="categories.grids">Hex grid products</Checkbox>
            </div>
          </div>

          <Separator v-if="viewMode === 'network'" />

          <div v-if="viewMode === 'network'" class="space-y-4">
            <h3 class="text-lg font-semibold">Select networks</h3>
            <p class="text-sm text-muted-foreground">Choose which monitoring networks to display on the map.</p>
            <div class="space-y-3">
              <Checkbox :model-value="selectedNetworks.has('PA')" @update:model-value="(val) => val ? selectedNetworks.add('PA') : selectedNetworks.delete('PA')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #a855f7"></span>
                  Purple Air (PA)
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('FEM')" @update:model-value="(val) => val ? selectedNetworks.add('FEM') : selectedNetworks.delete('FEM')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #22c55e"></span>
                  Federal Equivalent Method (FEM)
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('EGG')" @update:model-value="(val) => val ? selectedNetworks.add('EGG') : selectedNetworks.delete('EGG')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #3b82f6"></span>
                  AQ Egg (EGG)
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('SPARTAN')" @update:model-value="(val) => val ? selectedNetworks.add('SPARTAN') : selectedNetworks.delete('SPARTAN')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #eab308"></span>
                  SPARTAN
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('ASCENT')" @update:model-value="(val) => val ? selectedNetworks.add('ASCENT') : selectedNetworks.delete('ASCENT')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #ec4899"></span>
                  ASCENT Network
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('EPA IMPROVE')" @update:model-value="(val) => val ? selectedNetworks.add('EPA IMPROVE') : selectedNetworks.delete('EPA IMPROVE')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #06b6d4"></span>
                  EPA IMPROVE
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('EPA NATTS')" @update:model-value="(val) => val ? selectedNetworks.add('EPA NATTS') : selectedNetworks.delete('EPA NATTS')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #14b8a6"></span>
                  EPA NATTS
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('EPA NCORE')" @update:model-value="(val) => val ? selectedNetworks.add('EPA NCORE') : selectedNetworks.delete('EPA NCORE')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #f59e0b"></span>
                  EPA NCORE
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('EPA CSN STN')" @update:model-value="(val) => val ? selectedNetworks.add('EPA CSN STN') : selectedNetworks.delete('EPA CSN STN')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #ef4444"></span>
                  EPA CSN STN
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('EPA NEAR ROAD')" @update:model-value="(val) => val ? selectedNetworks.add('EPA NEAR ROAD') : selectedNetworks.delete('EPA NEAR ROAD')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #8b5cf6"></span>
                  EPA NEAR ROAD
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('BC ENV')" @update:model-value="(val) => val ? selectedNetworks.add('BC ENV') : selectedNetworks.delete('BC ENV')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #10b981"></span>
                  BC Environment (BC ENV)
                </span>
              </Checkbox>
              <Checkbox :model-value="selectedNetworks.has('EPA PAMS')" @update:model-value="(val) => val ? selectedNetworks.add('EPA PAMS') : selectedNetworks.delete('EPA PAMS')">
                <span class="flex items-center gap-2">
                  <span class="inline-block h-3 w-3 rounded-full" style="background-color: #6366f1"></span>
                  EPA PAMS
                </span>
              </Checkbox>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import MonitorMap from './components/MonitorMap.vue'
import AppHeader from './components/AppHeader.vue'
import ResultsSidebar from './components/ResultsSidebar.vue'
import MobileNetworkDrawer from './components/MobileNetworkDrawer.vue'
import FloatingActionButton from './components/FloatingActionButton.vue'
import ResultsList from './components/ResultsList.vue'
import Label from './components/ui/label/Label.vue'
import Input from './components/ui/input/Input.vue'
import Button from './components/ui/button/Button.vue'
import Separator from './components/ui/separator/Separator.vue'
import Dialog from './components/ui/dialog/Dialog.vue'
import Checkbox from './components/ui/checkbox/Checkbox.vue'
import { useMonitorData } from './composables/useMonitorData'
import { useDarkMode } from './composables/useDarkMode'
import { useVisibleItems } from './composables/useVisibleItems'
import { useGeocoding } from './composables/useGeocoding'
import { useBoundaryData } from './composables/useBoundaryData'

const { isDark, toggleDarkMode } = useDarkMode()

function parseEnvNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  const num = Number.parseFloat(value)
  return Number.isFinite(num) ? num : fallback
}

const DEFAULT_CENTER = {
  lat: parseEnvNumber(import.meta.env.VITE_DEFAULT_CENTER_LAT, 38.5449),
  lon: parseEnvNumber(import.meta.env.VITE_DEFAULT_CENTER_LON, -121.7405)
}

const DEFAULT_RADIUS_KM = parseEnvNumber(import.meta.env.VITE_DEFAULT_RADIUS_KM, 50)

const center = ref({ ...DEFAULT_CENTER })
const radiusKm = ref(DEFAULT_RADIUS_KM)
const categories = reactive({
  points: true,
  satellite: true,
  grids: true
})

// View mode: 'boundary' or 'network'
// Mobile devices default to network mode
const isMobile = ref(window.innerWidth < 1024)
const viewMode = ref(isMobile.value ? 'network' : 'boundary')
const selectedNetworks = reactive(new Set(['PA', 'FEM', 'EGG']))
const showMobileNetworkDrawer = ref(false)
const showHeatmap = ref(false)

// Boundary sub-mode: 'radius' or 'region'
const boundaryType = ref('radius')
// For 'region' mode - currently supports BC Health boundaries, extendable for other region types
const selectedRegionSource = ref('bcHealth') // Future: 'usStates', 'counties', etc.
const selectedRegionLevel = ref('lha') // For bcHealth: 'healthAuthority', 'hsda', 'lha', 'chsa'
const selectedRegionCode = ref(null)

// Update mobile detection on window resize
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    const wasMobile = isMobile.value
    isMobile.value = window.innerWidth < 1024
    // Force network mode on mobile
    if (isMobile.value && !wasMobile) {
      viewMode.value = 'network'
    }
  })
}

const mapComponent = ref(null)
const showDialog = ref(false)
const centerSelectionActive = ref(false)

const coordLat = ref(null)
const coordLon = ref(null)

const categoriesRef = computed(() => categories)
const viewModeRef = computed(() => viewMode.value)
const selectedNetworksRef = computed(() => new Set(selectedNetworks))

const boundaryTypeRef = computed(() => boundaryType.value)

// Use composables for visible items, geocoding, and boundaries
// Initialize useBoundaryData first so boundaryPolygon is available for useMonitorData
const {
  loading: boundaryLoading,
  index,
  loadIndex,
  selectBoundary,
  searchBoundaries,
  getChildBoundaries,
  getBoundariesByLevel,
  boundaryPolygon
} = useBoundaryData()

const { loading, error, pointMonitors, satelliteMatches, hexMatches, summary } = useMonitorData(
  center,
  radiusKm,
  categoriesRef,
  viewModeRef,
  selectedNetworksRef,
  boundaryTypeRef,
  boundaryPolygon
)

const { visibleItems, toggleSatelliteVisibility, toggleHexVisibility, visibleSatelliteProducts, visibleHexProducts } = useVisibleItems(satelliteMatches, hexMatches)
const { searchQuery, searching, searchError, searchAddress } = useGeocoding(center)

// Load boundary index on mount
loadIndex()

// Group monitors by network type
const monitorsByNetwork = computed(() => {
  const groups = {
    'PA': [],
    'FEM': [],
    'EGG': [],
    'SPARTAN': [],
    'ASCENT': [],
    'EPA IMPROVE': [],
    'EPA NATTS': [],
    'EPA NCORE': [],
    'EPA CSN STN': [],
    'EPA NEAR ROAD': [],
    'BC ENV': [],
    'EPA PAMS': []
  }

  pointMonitors.value.forEach(monitor => {
    if (groups[monitor.network]) {
      groups[monitor.network].push(monitor)
    }
  })

  return groups
})

// Network counts for NetworkSelector component
const networkCounts = computed(() => {
  const counts = {}
  Object.keys(monitorsByNetwork.value).forEach(network => {
    counts[network] = monitorsByNetwork.value[network].length
  })
  return counts
})

function handleNetworkUpdate(newSet) {
  selectedNetworks.clear()
  newSet.forEach(network => selectedNetworks.add(network))
}

function handleRegionSelection(selection) {
  if (!selection || !selection.code) {
    selectedRegionLevel.value = null
    selectedRegionCode.value = null
    selectBoundary(null, null)
    return
  }

  selectedRegionLevel.value = selection.level
  selectedRegionCode.value = selection.code

  // Automatically switch to region boundary type when a region is selected
  boundaryType.value = 'region'

  // Load the boundary geometry
  selectBoundary(selection.level, selection.code)
}

function toggleCenterSelection() {
  centerSelectionActive.value = !centerSelectionActive.value
}

function handleMapCenterUpdate(newCenter) {
  if (!centerSelectionActive.value) return
  center.value = { ...newCenter }
  centerSelectionActive.value = false
}

function focusOnPoint(lat, lon) {
  mapComponent.value?.zoomToPoint(lat, lon)
}

function setCoordinates() {
  if (coordLat.value !== null && coordLon.value !== null) {
    if (
      coordLat.value >= -90 &&
      coordLat.value <= 90 &&
      coordLon.value >= -180 &&
      coordLon.value <= 180
    ) {
      center.value = {
        lat: coordLat.value,
        lon: coordLon.value
      }
      showDialog.value = false
    }
  }
}

async function handleSearchAddress() {
  const success = await searchAddress()
  if (success) {
    showDialog.value = false
  }
}
</script>
