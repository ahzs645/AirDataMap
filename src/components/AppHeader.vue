<template>
  <header class="flex items-center justify-between border-b bg-background px-3 py-2 lg:px-4 lg:py-3">
    <div class="flex items-center gap-6">
      <div>
        <h1 class="text-base font-semibold tracking-tight text-foreground lg:text-lg">
          Air Quality Coverage
        </h1>
        <p class="hidden text-xs text-muted-foreground lg:block">
          Monitoring results for your area
        </p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-4">
      <!-- Mobile Summary -->
      <div class="flex items-center gap-2 text-xs text-muted-foreground lg:hidden">
        <span v-if="summary.totals.points" class="font-medium text-foreground">
          {{ summary.totals.points }} monitors
        </span>
      </div>

      <!-- Desktop Summary -->
      <div class="hidden items-center gap-3 text-xs text-muted-foreground lg:flex 2xl:flex">
        <span v-if="summary.regionLabel" class="font-medium text-foreground">{{ summary.regionLabel }}</span>
        <span v-if="viewMode === 'radius'">Radius: {{ radiusKm.toFixed(0) }} km</span>
        <span v-if="viewMode === 'network'">Networks: {{ selectedNetworkCount }}</span>
        <span v-if="summary.totals.points">Points: {{ summary.totals.points }}</span>
        <span v-if="summary.totals.satellite">Satellite: {{ summary.totals.satellite }}</span>
        <span v-if="summary.totals.grids">Grids: {{ summary.totals.grids }}</span>
      </div>

      <!-- Mode Switcher (Desktop only) -->
      <div v-if="!isMobile" class="flex items-center gap-2 rounded-md border bg-muted p-1">
        <Button
          :variant="viewMode === 'radius' ? 'default' : 'ghost'"
          size="sm"
          class="h-7"
          @click="$emit('update:viewMode', 'radius')"
        >
          Radius
        </Button>
        <Button
          :variant="viewMode === 'network' ? 'default' : 'ghost'"
          size="sm"
          class="h-7"
          @click="$emit('update:viewMode', 'network')"
        >
          Networks
        </Button>
      </div>

      <!-- Radius Input (Desktop, Radius Mode only) -->
      <div v-if="!isMobile && viewMode === 'radius'" class="flex items-center gap-2">
        <label for="radius-input" class="text-[11px] uppercase tracking-wide text-muted-foreground">
          Radius (km)
        </label>
        <Input
          id="radius-input"
          :model-value="radiusKm"
          @update:model-value="$emit('update:radiusKm', $event)"
          type="number"
          min="1"
          max="500"
          step="1"
          class="h-8 w-24 text-right [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      <div class="flex items-center gap-2">
        <!-- Heatmap Toggle -->
        <Button
          :variant="showHeatmap ? 'default' : 'ghost'"
          size="sm"
          @click="$emit('toggle-heatmap')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
            :class="{ 'mr-1.5': !isMobile }"
          >
            <path d="M2 12h20"></path>
            <path d="M2 17h20"></path>
            <path d="M2 7h20"></path>
          </svg>
          <span v-if="!isMobile">Heatmap</span>
        </Button>

        <!-- Dark Mode Toggle -->
        <Button @click="$emit('toggle-dark-mode')" size="sm" variant="ghost">
          <svg
            v-if="!isDark"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="m4.93 4.93 1.41 1.41"></path>
            <path d="m17.66 17.66 1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="m6.34 17.66-1.41 1.41"></path>
            <path d="m19.07 4.93-1.41 1.41"></path>
          </svg>
        </Button>

        <!-- Move Radius Button (Desktop, Radius Mode only) -->
        <Button
          v-if="!isMobile && viewMode === 'radius'"
          :aria-pressed="centerSelectionActive"
          :variant="centerSelectionActive ? 'default' : 'outline'"
          size="sm"
          @click="$emit('toggle-center-selection')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M12 5v2"></path>
            <path d="M12 17v2"></path>
            <path d="M5 12h2"></path>
            <path d="M17 12h2"></path>
          </svg>
          {{ centerSelectionActive ? 'Click map' : 'Move radius' }}
        </Button>

        <!-- Search & Filter Button (Desktop only) -->
        <Button v-if="!isMobile" @click="$emit('open-search')" size="sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          Search & Filter
        </Button>
      </div>
    </div>
  </header>
</template>

<script setup>
import Button from './ui/button/Button.vue'
import Input from './ui/input/Input.vue'

defineProps({
  isDark: {
    type: Boolean,
    required: true
  },
  viewMode: {
    type: String,
    required: true
  },
  radiusKm: {
    type: Number,
    required: true
  },
  selectedNetworkCount: {
    type: Number,
    required: true
  },
  summary: {
    type: Object,
    required: true
  },
  centerSelectionActive: {
    type: Boolean,
    required: true
  },
  isMobile: {
    type: Boolean,
    required: true
  },
  showHeatmap: {
    type: Boolean,
    required: true
  }
})

defineEmits([
  'toggle-dark-mode',
  'update:viewMode',
  'update:radiusKm',
  'toggle-center-selection',
  'open-search',
  'toggle-heatmap'
])
</script>
