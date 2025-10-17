<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
    <aside class="flex w-full flex-col border-b border-r bg-muted/40 backdrop-blur-lg lg:max-w-md lg:border-b-0">
      <div class="flex h-full flex-col gap-6 p-6">
        <header class="space-y-2">
          <p class="text-sm font-medium text-primary">Air Monitoring Availability</p>
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">
            Explore active air quality coverage
          </h1>
          <p class="text-sm text-muted-foreground">
            Search by address or coordinates to see monitoring networks, satellite products, and hex-grid coverage within your
            radius.
          </p>
        </header>

        <Card class="space-y-6">
          <CardHeader class="pb-2">
            <CardTitle>Location search</CardTitle>
            <CardDescription>Quickly find a place by typing an address or location keyword.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <form class="space-y-3" @submit.prevent="searchAddress">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-2">
            <CardTitle>Search radius</CardTitle>
            <CardDescription>Adjust the radius (in kilometers) to control which datasets appear.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-2">
            <CardTitle>Data categories</CardTitle>
            <CardDescription>Select which sources to include in the map and results list.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Checkbox v-model="categories.points">Point networks</Checkbox>
            <Checkbox v-model="categories.satellite">Satellite coverage</Checkbox>
            <Checkbox v-model="categories.grids">Hex grid products</Checkbox>
          </CardContent>
        </Card>

        <Card class="flex flex-1 flex-col overflow-hidden">
          <CardHeader class="pb-4">
            <CardTitle>Results</CardTitle>
            <CardDescription>
              <template v-if="summary.regionLabel">
                Region: {{ summary.regionLabel }}
              </template>
              <template v-else>
                Datasets within {{ radiusKm.toFixed(0) }} km of the selected center.
              </template>
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent class="flex-1 overflow-hidden p-0">
            <div class="flex h-full flex-col">
              <div v-if="error" class="px-6 py-5 text-sm text-destructive">
                <p class="font-medium">Unable to load datasets.</p>
                <p class="text-muted-foreground">{{ error.message }}</p>
              </div>
              <div v-else-if="loading" class="flex flex-1 items-center justify-center px-6 py-10 text-sm text-muted-foreground">
                Loading datasets…
              </div>
              <ScrollArea v-else class="h-[360px] lg:h-[calc(100vh-440px)]">
                <div class="space-y-6 px-6 py-5">
                  <section v-if="categories.points" class="space-y-3">
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-semibold text-foreground">Point Networks</h3>
                      <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ pointMonitors.length }} datasets</p>
                    </div>
                    <p v-if="!pointMonitors.length" class="text-sm text-muted-foreground">
                      No point networks in range.
                    </p>
                    <ul v-else class="space-y-3">
                      <li
                        v-for="monitor in pointMonitors"
                        :key="monitor.id"
                        class="list-none"
                      >
                        <button
                          type="button"
                          class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                          @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                        >
                          <div class="flex items-center justify-between gap-3">
                            <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                            <span class="text-xs font-medium text-muted-foreground">{{ monitor.network }}</span>
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <Badge v-for="param in monitor.parameters" :key="param" variant="outline">
                              {{ param }}
                            </Badge>
                          </div>
                          <p class="text-xs text-muted-foreground">Status: {{ monitor.status ?? 'unknown' }}</p>
                        </button>
                      </li>
                    </ul>
                  </section>

                  <section v-if="categories.satellite" class="space-y-3">
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-semibold text-foreground">Satellite Products</h3>
                      <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ satelliteMatches.length }} datasets</p>
                    </div>
                    <p v-if="!satelliteMatches.length" class="text-sm text-muted-foreground">
                      No satellite coverage intersects the radius.
                    </p>
                    <ul v-else class="space-y-3">
                      <li v-for="product in satelliteMatches" :key="product.id" class="list-none">
                        <div class="flex flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-4">
                          <div class="flex items-center justify-between gap-3">
                            <div class="text-sm font-semibold text-foreground">{{ product.name }}</div>
                            <span class="text-xs font-medium text-muted-foreground">{{ product.network }}</span>
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <Badge v-for="param in product.parameters" :key="param" variant="outline">
                              {{ param }}
                            </Badge>
                          </div>
                          <p class="text-xs text-muted-foreground">
                            {{ product.temporal }}
                            <template v-if="product.frequency"> • {{ product.frequency }}</template>
                          </p>
                        </div>
                      </li>
                    </ul>
                  </section>

                  <section v-if="categories.grids" class="space-y-3">
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-semibold text-foreground">Hex Grid Products</h3>
                      <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ hexMatches.length }} datasets</p>
                    </div>
                    <p v-if="!hexMatches.length" class="text-sm text-muted-foreground">
                      No grid cells intersect the search area.
                    </p>
                    <ul v-else class="space-y-3">
                      <li v-for="product in hexMatches" :key="product.id" class="list-none">
                        <div class="flex flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-4">
                          <div class="flex items-center justify-between gap-3">
                            <div class="text-sm font-semibold text-foreground">{{ product.name }}</div>
                            <span class="text-xs font-medium text-muted-foreground">{{ product.network }}</span>
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <Badge v-for="param in product.parameters" :key="param" variant="outline">
                              {{ param }}
                            </Badge>
                          </div>
                          <p class="text-xs text-muted-foreground">
                            <template v-if="product.globalCoverage">
                              Global coverage
                            </template>
                            <template v-else-if="product.cellsWithin.length">
                              Cells in range: {{ product.cellsWithin.length }}
                            </template>
                            <template v-else-if="product.geometryIntersects">
                              Coverage intersects search radius
                            </template>
                            <template v-else>
                              Local coverage
                            </template>
                            <template v-if="product.temporal"> • {{ product.temporal }}</template>
                            <template v-if="product.frequency"> • {{ product.frequency }}</template>
                          </p>
                        </div>
                      </li>
                    </ul>
                  </section>
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>

    <main class="flex-1">
      <div class="relative h-[60vh] w-full lg:h-screen">
        <MonitorMap
          ref="mapComponent"
          :center="center"
          :radius-km="radiusKm"
          :points="pointMonitors"
          :satellite-products="satelliteMatches"
          :hex-products="hexMatches"
          :summary="summary"
          @update:center="updateCenter"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import MonitorMap from './components/MonitorMap.vue'
import Button from './components/ui/button/Button.vue'
import Input from './components/ui/input/Input.vue'
import Label from './components/ui/label/Label.vue'
import Checkbox from './components/ui/checkbox/Checkbox.vue'
import Card from './components/ui/card/Card.vue'
import CardHeader from './components/ui/card/CardHeader.vue'
import CardContent from './components/ui/card/CardContent.vue'
import CardTitle from './components/ui/card/CardTitle.vue'
import CardDescription from './components/ui/card/CardDescription.vue'
import ScrollArea from './components/ui/scroll-area/ScrollArea.vue'
import Badge from './components/ui/badge/Badge.vue'
import Separator from './components/ui/separator/Separator.vue'
import { useMonitorData } from './composables/useMonitorData'

const center = ref({ lat: 38.5449, lon: -121.7405 })
const radiusKm = ref(50)
const categories = reactive({
  points: true,
  satellite: true,
  grids: true
})

const searchQuery = ref('')
const searching = ref(false)
const searchError = ref(null)
const mapComponent = ref(null)

const coordLat = ref(null)
const coordLon = ref(null)

const categoriesRef = computed(() => categories)

const { loading, error, pointMonitors, satelliteMatches, hexMatches, summary } = useMonitorData(
  center,
  radiusKm,
  categoriesRef
)

function updateCenter(newCenter) {
  center.value = { ...newCenter }
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
    }
  }
}

async function searchAddress() {
  if (!searchQuery.value.trim()) return

  searching.value = true
  searchError.value = null

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}&limit=1`
    )

    if (!response.ok) {
      throw new Error('Geocoding service unavailable')
    }

    const results = await response.json()

    if (results.length === 0) {
      searchError.value = 'No results found. Try a different search term.'
      return
    }

    const result = results[0]
    center.value = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon)
    }
  } catch (err) {
    console.error('Geocoding error:', err)
    searchError.value = 'Failed to search address. Please try again.'
  } finally {
    searching.value = false
  }
}
</script>
