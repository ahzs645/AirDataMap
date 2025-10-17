<template>
  <div class="app-shell">
    <aside class="sidebar">
      <h1>Air Monitoring Availability</h1>
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
          <div class="result-card">
            <h3>Point Networks</h3>
            <small v-if="summary.regionLabel">Region: {{ summary.regionLabel }}</small>
            <p v-if="!pointMonitors.length">No point networks in range.</p>
            <ul v-else>
              <li v-for="monitor in pointMonitors" :key="monitor.id">
                <strong>{{ monitor.name }}</strong>
                <div class="tag-group">
                  <span class="tag" v-for="param in monitor.parameters" :key="param">{{ param }}</span>
                </div>
                <small>{{ monitor.network }} • Status: {{ monitor.status ?? 'unknown' }}</small>
              </li>
            </ul>
          </div>

          <div class="result-card">
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

          <div class="result-card">
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

const center = ref({ lat: 39.8283, lon: -98.5795 })
const radiusKm = ref(50)
const categories = reactive({
  points: true,
  satellite: true,
  grids: true
})

const categoriesRef = computed(() => categories)

const { loading, error, pointMonitors, satelliteMatches, hexMatches, summary } = useMonitorData(
  center,
  radiusKm,
  categoriesRef
)

function updateCenter(newCenter) {
  center.value = { ...newCenter }
}
</script>
