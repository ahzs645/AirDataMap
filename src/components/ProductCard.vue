<template>
  <li class="list-none">
    <Card
      class="cursor-pointer transition-all hover:shadow-md"
      :class="isVisible ? 'border-primary bg-primary/5' : ''"
    >
      <CardContent class="p-3">
        <button
          type="button"
          class="flex w-full flex-col gap-2 text-left"
          @click="$emit('toggle')"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <div class="text-sm font-semibold text-foreground">{{ product.name }}</div>
              <span class="text-xs text-muted-foreground">{{ product.network }}</span>
            </div>
            <div
              class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
              :class="isVisible ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'"
            >
              <svg
                v-if="isVisible"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-2.5 w-2.5"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <Badge v-for="param in product.parameters" :key="param" variant="outline" class="text-xs">
              {{ param }}
            </Badge>
          </div>
          <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              <template v-if="isHex && product.globalCoverage">
                Global coverage
              </template>
              <template v-else-if="isHex && product.cellsWithin?.length">
                Cells: {{ product.cellsWithin.length }}
              </template>
              <template v-else-if="isHex && product.geometryIntersects">
                Intersects area
              </template>
              <template v-else-if="isHex">
                Local coverage
              </template>
              <template v-else-if="product.temporal">
                {{ product.temporal }}
              </template>
              <template v-if="product.frequency"> • {{ product.frequency }}</template>
            </span>
            <a
              v-if="product.sourceUrl"
              :href="product.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="shrink-0 text-primary hover:underline"
              @click.stop
            >
              Source →
            </a>
          </div>
        </button>
      </CardContent>
    </Card>
  </li>
</template>

<script setup>
import Card from './ui/card/Card.vue'
import CardContent from './ui/card/CardContent.vue'
import Badge from './ui/badge/Badge.vue'

defineProps({
  product: {
    type: Object,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: false
  },
  isHex: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])
</script>
