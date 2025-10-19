<template>
  <div class="space-y-4">
    <!-- Search Box -->
    <div class="relative">
      <Input
        v-model="searchQuery"
        type="text"
        placeholder="Search regions..."
        class="pr-8"
      />
      <svg
        v-if="searchQuery"
        @click="searchQuery = ''"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <path d="M18 6 6 18"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    </div>

    <!-- Search Results -->
    <div v-if="searchQuery && searchResults.length > 0" class="space-y-2">
      <p class="text-xs font-medium text-muted-foreground">Search Results</p>
      <ScrollArea class="max-h-60">
        <div class="space-y-1">
          <button
            v-for="result in searchResults"
            :key="`${result.level}-${result.code}`"
            @click="selectFromSearch(result)"
            class="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            :class="{
              'bg-accent text-accent-foreground': isSelected(result)
            }"
          >
            <div class="mb-1 flex items-center gap-2">
              <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                {{ getLevelLabel(result.level) }}
              </span>
              <span v-if="result.code" class="text-[10px] text-muted-foreground">
                Code: {{ result.code }}
              </span>
            </div>
            <div class="font-medium">{{ result.name }}</div>
            <div v-if="result.healthAuthorityName" class="text-xs text-muted-foreground">
              {{ result.healthAuthorityName }}
            </div>
          </button>
        </div>
      </ScrollArea>
    </div>

    <!-- Breadcrumb Navigation -->
    <div v-if="!searchQuery && currentPath.length > 0" class="flex items-center gap-1 text-sm">
      <button
        @click="navigateToRoot"
        class="rounded px-2 py-1 hover:bg-accent hover:text-accent-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </button>
      <template v-for="(item, index) in currentPath" :key="index">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-muted-foreground"
        >
          <path d="m9 18 6-6-6-6"></path>
        </svg>
        <button
          @click="navigateToLevel(index)"
          class="rounded px-2 py-1 hover:bg-accent hover:text-accent-foreground"
          :class="{ 'font-medium': index === currentPath.length - 1 }"
        >
          {{ item.name }}
        </button>
      </template>
    </div>

    <!-- Hierarchical List -->
    <div v-if="!searchQuery" class="space-y-2">
      <p class="text-xs font-medium text-muted-foreground">
        {{ currentLevelLabel }}
      </p>
      <ScrollArea class="h-96">
        <div class="space-y-1">
          <div
            v-for="region in currentLevelRegions"
            :key="region.code"
            class="group relative"
          >
            <button
              @click="selectRegion(region)"
              class="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              :class="{
                'bg-accent text-accent-foreground': isSelectedAtCurrentLevel(region)
              }"
            >
              <div class="mb-1 flex items-center gap-2">
                <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                  {{ getLevelLabel(region.level) }}
                </span>
                <span v-if="region.code" class="text-[10px] text-muted-foreground">
                  Code: {{ region.code }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="flex-1 font-medium">{{ region.name }}</span>
                <div class="flex items-center gap-1">
                  <!-- Select this level button - always visible -->
                  <Button
                    v-if="canSelectAtLevel"
                    @click.stop="selectAtThisLevel(region)"
                    size="sm"
                    variant="default"
                    class="h-7 px-3 text-xs"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="mr-1"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Select
                  </Button>
                  <!-- Drill down button -->
                  <Button
                    v-if="hasChildren(region)"
                    @click.stop="drillDown(region)"
                    size="sm"
                    variant="ghost"
                    class="h-7 w-7 p-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m9 18 6-6-6-6"></path>
                    </svg>
                  </Button>
                </div>
              </div>
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>

    <!-- No results message -->
    <div v-if="searchQuery && searchResults.length === 0" class="py-8 text-center text-sm text-muted-foreground">
      No regions found matching "{{ searchQuery }}"
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Input from './ui/input/Input.vue'
import Button from './ui/button/Button.vue'
import ScrollArea from './ui/scroll-area/ScrollArea.vue'

const props = defineProps({
  regionSource: {
    type: String,
    required: true // e.g., 'bcHealth'
  },
  index: {
    type: Object,
    required: true // The boundary index from useBoundaryData
  },
  selectedLevel: {
    type: String,
    default: null
  },
  selectedCode: {
    type: String,
    default: null
  },
  searchBoundaries: {
    type: Function,
    required: true
  },
  getChildBoundaries: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['update:selection'])

const searchQuery = ref('')
const currentPath = ref([])
const currentLevel = ref(0)

// Configuration for BC Health hierarchy
const bcHealthConfig = {
  levels: [
    { key: 'healthAuthority', label: 'Health Authority', indexKey: 'healthAuthorities' },
    { key: 'hsda', label: 'Health Service Delivery Area', indexKey: 'healthServiceDeliveryAreas', parentProp: 'healthAuthorityCode' },
    { key: 'lha', label: 'Local Health Area', indexKey: 'localHealthAreas', parentProp: 'hsdaCode' },
    { key: 'chsa', label: 'Community Health Service Area', indexKey: 'communityHealthServiceAreas', parentProp: 'lhaCode' }
  ]
}

// Get configuration based on region source
const config = computed(() => {
  if (props.regionSource === 'bcHealth') {
    return bcHealthConfig
  }
  // Future: add other configurations
  return bcHealthConfig
})

const currentLevelConfig = computed(() => {
  return config.value.levels[currentLevel.value]
})

const currentLevelLabel = computed(() => {
  if (currentPath.value.length === 0) {
    return 'Select ' + config.value.levels[0].label
  }
  const nextLevel = currentLevel.value + 1
  if (nextLevel < config.value.levels.length) {
    return 'Select ' + config.value.levels[nextLevel].label
  }
  return 'No sub-regions available'
})

const canSelectAtLevel = computed(() => {
  // Allow selection at any level
  return true
})

const currentLevelRegions = computed(() => {
  if (!props.index) return []

  if (currentPath.value.length === 0) {
    // Root level - add level property to each region
    const levelConfig = config.value.levels[0]
    const regions = props.index[levelConfig.indexKey] || []
    return regions.map(r => ({
      ...r,
      level: levelConfig.key
    }))
  }

  // Get children of current path
  const parent = currentPath.value[currentPath.value.length - 1]
  const children = props.getChildBoundaries(parent.level, parent.code)

  // Add level property to children
  const parentLevelIndex = config.value.levels.findIndex(l => l.key === parent.level)
  const childLevelIndex = parentLevelIndex + 1
  if (childLevelIndex < config.value.levels.length) {
    const childLevelKey = config.value.levels[childLevelIndex].key
    return children.map(c => ({
      ...c,
      level: childLevelKey
    }))
  }

  return children
})

const searchResults = computed(() => {
  if (!searchQuery.value) return []
  return props.searchBoundaries(searchQuery.value)
})

function getLevelLabel(level) {
  const levelConfig = config.value.levels.find(l => l.key === level)
  return levelConfig ? levelConfig.label : level
}

function hasChildren(region) {
  const levelIndex = config.value.levels.findIndex(l => l.key === region.level)
  return levelIndex < config.value.levels.length - 1
}

function isSelected(region) {
  return region.code === props.selectedCode
}

function isSelectedAtCurrentLevel(region) {
  return region.code === props.selectedCode
}

function selectRegion(region) {
  // If has children, drill down; otherwise select
  if (hasChildren(region)) {
    drillDown(region)
  } else {
    selectAtThisLevel(region)
  }
}

function selectAtThisLevel(region) {
  const levelIndex = config.value.levels.findIndex(l => l.key === region.level)
  const levelConfig = config.value.levels[levelIndex]

  emit('update:selection', {
    level: levelConfig.key,
    code: region.code,
    region: region
  })
}

function drillDown(region) {
  const levelIndex = config.value.levels.findIndex(l => l.key === region.level)
  currentPath.value.push({
    ...region,
    level: config.value.levels[levelIndex].key
  })
  currentLevel.value = levelIndex + 1
}

function navigateToLevel(index) {
  currentPath.value = currentPath.value.slice(0, index + 1)
  currentLevel.value = index + 1
}

function navigateToRoot() {
  currentPath.value = []
  currentLevel.value = 0
}

function selectFromSearch(result) {
  emit('update:selection', {
    level: result.level,
    code: result.code,
    region: result
  })
  searchQuery.value = ''
}

// Watch for external selection changes
watch(() => props.selectedCode, (newCode) => {
  if (!newCode) {
    navigateToRoot()
  }
})
</script>
