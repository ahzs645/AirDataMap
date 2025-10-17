<template>
  <div class="app-shell">
    <aside class="sidebar">
      <h1>Air Monitoring Availability</h1>

      <section>
        <label for="address-search">Search by address</label>
        <div class="search-container">
          <input
            id="address-search"
            type="text"
            v-model="searchQuery"
            @keyup.enter="searchAddress"
            placeholder="Enter address or location..."
          />
          <button @click="searchAddress" :disabled="searching">
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
        <div v-if="searchError" class="search-error">{{ searchError }}</div>
      </section>

      <section>
        <label>Or enter coordinates</label>
        <div class="coord-inputs">
          <input
            type="number"
            v-model.number="coordLat"
            placeholder="Latitude"
            step="0.0001"
            min="-90"
            max="90"
          />
          <input
            type="number"
            v-model.number="coordLon"
            placeholder="Longitude"
            step="0.0001"
            min="-180"
            max="180"
          />
          <button @click="setCoordinates" class="coord-button">Go</button>
        </div>
      </section>

      <section>
        <label for="radius">Search radius (km)</label>
        <input
          id="radius"
          type="number"
          min="1"
          max="500"
          v-model.number="radiusKm"
        />
      </section>

      <section>
        <label>Data categories</label>
        <div>
          <label>
            <input type="checkbox" v-model="categories.points" /> Point networks
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" v-model="categories.satellite" /> Satellite coverage
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" v-model="categories.grids" /> Hex grid products
          </label>
        </div>
      </section>

      <section class="results">
        <h2>Results</h2>
        <div v-if="error" class="result-card">
          <strong>Unable to load datasets.</strong>
          <div>{{ error.message }}</div>
        </div>
        <div v-else-if="loading">Loading datasets…</div>
        <div v-else>
          <!-- Point Networks - only show if category is selected -->
          <div v-if="categories.points" class="result-card">
            <h3>Point Networks</h3>
            <small v-if="summary.regionLabel">Region: {{ summary.regionLabel }}</small>
            <p v-if="!pointMonitors.length">No point networks in range.</p>
            <ul v-else>
              <li
                v-for="monitor in pointMonitors"
                :key="monitor.id"
                @click="focusOnPoint(monitor.latitude, monitor.longitude)"
              >
                <strong>{{ monitor.name }}</strong>
                <div class="tag-group">
                  <span class="tag" v-for="param in monitor.parameters" :key="param">{{ param }}</span>
                </div>
                <small>{{ monitor.network }} • Status: {{ monitor.status ?? 'unknown' }}</small>
              </li>
            </ul>
          </div>

          <!-- Satellite Products - only show if category is selected -->
          <div v-if="categories.satellite" class="result-card">
            <h3>Satellite Products</h3>
            <p v-if="!satelliteMatches.length">No satellite coverage intersects the radius.</p>
            <ul v-else>
              <li v-for="product in satelliteMatches" :key="product.id">
                <strong>{{ product.name }}</strong>
                <div class="tag-group">
                  <span class="tag" v-for="param in product.parameters" :key="param">{{ param }}</span>
                </div>
                <small>{{ product.network }} • {{ product.temporal }} • {{ product.frequency }}</small>
              </li>
            </ul>
          </div>

          <!-- Hex Grid Products - only show if category is selected -->
          <div v-if="categories.grids" class="result-card">
            <h3>Hex Grid Products</h3>
            <p v-if="!hexMatches.length">No grid cells intersect the search area.</p>
            <ul v-else>
              <li v-for="product in hexMatches" :key="product.id">
                <strong>{{ product.name }}</strong>
                <div class="tag-group">
                  <span class="tag" v-for="param in product.parameters" :key="param">{{ param }}</span>
                </div>
                <small v-if="product.globalCoverage">
                  {{ product.network }} • Global coverage
                  <template v-if="product.temporal"> • {{ product.temporal }}</template>
                  <template v-if="product.frequency"> • {{ product.frequency }}</template>
                </small>
                <small v-else>
                  {{ product.network }}
                  <template v-if="product.temporal"> • {{ product.temporal }}</template>
                  <template v-if="product.frequency"> • {{ product.frequency }}</template>
                  <template v-if="product.cellsWithin.length">
                    • Cells in range: {{ product.cellsWithin.length }}
                  </template>
                  <template v-else-if="product.geometryIntersects">
                    • Coverage intersects search radius
                  </template>
                </small>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </aside>

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
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import MonitorMap from './components/MonitorMap.vue'
import { useMonitorData } from './composables/useMonitorData'

// Davis, CA coordinates
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
  if (mapComponent.value) {
    mapComponent.value.zoomToPoint(lat, lon)
  }
}

function setCoordinates() {
  if (coordLat.value !== null && coordLon.value !== null) {
    if (coordLat.value >= -90 && coordLat.value <= 90 &&
        coordLon.value >= -180 && coordLon.value <= 180) {
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
    // Using Nominatim (OpenStreetMap) for free geocoding
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
