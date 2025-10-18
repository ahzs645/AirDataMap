<template>
  <button
    @click="$emit('click')"
    class="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-95"
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
      class="h-6 w-6"
    >
      <path d="M3 6h18"></path>
      <path d="M3 12h18"></path>
      <path d="M3 18h18"></path>
    </svg>
  </button>
</template>

<script setup>
defineEmits(['click'])
</script>
