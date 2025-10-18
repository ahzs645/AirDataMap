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
              <ScrollArea v-else class="flex-1">
                <slot name="results"></slot>
              </ScrollArea>
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
