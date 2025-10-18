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
      @toggle-dark-mode="toggleDarkMode"
      @update:view-mode="viewMode = $event"
      @update:radius-km="radiusKm = $event"
      @toggle-center-selection="toggleCenterSelection"
      @open-search="showDialog = true"
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
        @update:selected-networks="handleNetworkUpdate"
      >
        <template #results>
          <div class="space-y-4 px-6 py-4">
                  <section v-if="categories.points" class="space-y-3">
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-semibold text-foreground">Point Networks</h3>
                      <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ pointMonitors.length }} monitors</p>
                    </div>
                    <p v-if="!pointMonitors.length" class="text-sm text-muted-foreground">
                      No point networks in range.
                    </p>
                    <div v-else class="space-y-3">
                      <!-- Purple Air Monitors -->
                      <div v-if="purpleAirMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-purple-500"></div>
                          <h4 class="text-sm font-medium text-foreground">Purple Air</h4>
                          <span class="text-xs text-muted-foreground">({{ purpleAirMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in purpleAirMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                            </button>
                          </li>
                        </ul>
                        <p v-if="purpleAirMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ purpleAirMonitors.length - 5 }} more Purple Air monitors
                        </p>
                      </div>

                      <!-- FEM Monitors -->
                      <div v-if="femMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-green-500"></div>
                          <h4 class="text-sm font-medium text-foreground">FEM (Federal Equivalent Method)</h4>
                          <span class="text-xs text-muted-foreground">({{ femMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in femMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                            </button>
                          </li>
                        </ul>
                        <p v-if="femMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ femMonitors.length - 5 }} more FEM monitors
                        </p>
                      </div>

                      <!-- AQ Egg Monitors -->
                      <div v-if="eggMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-blue-500"></div>
                          <h4 class="text-sm font-medium text-foreground">AQ Egg</h4>
                          <span class="text-xs text-muted-foreground">({{ eggMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in eggMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                            </button>
                          </li>
                        </ul>
                        <p v-if="eggMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ eggMonitors.length - 5 }} more AQ Egg monitors
                        </p>
                      </div>

                      <!-- SPARTAN Network Monitors -->
                      <div v-if="spartanMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-amber-500"></div>
                          <h4 class="text-sm font-medium text-foreground">SPARTAN Network</h4>
                          <span class="text-xs text-muted-foreground">({{ spartanMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in spartanMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                            </button>
                          </li>
                        </ul>
                        <p v-if="spartanMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ spartanMonitors.length - 5 }} more SPARTAN monitors
                        </p>
                      </div>

                      <!-- BC Ministry of Environment Monitors -->
                      <div v-if="bcEnvMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-teal-500"></div>
                          <h4 class="text-sm font-medium text-foreground">BC Ministry of Environment</h4>
                          <span class="text-xs text-muted-foreground">({{ bcEnvMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in bcEnvMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                                <Badge
                                  v-if="monitor.status === 'inactive'"
                                  class="border-destructive bg-destructive/15 text-[10px] uppercase tracking-wide text-destructive-foreground"
                                  variant="outline"
                                >
                                  INACTIVE
                                </Badge>
                              </div>
                              <div class="text-xs text-muted-foreground">
                                {{ [monitor.city, monitor.category].filter(Boolean).join(' · ') }}
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                            </button>
                          </li>
                        </ul>
                        <p v-if="bcEnvMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ bcEnvMonitors.length - 5 }} more BC monitors
                        </p>
                      </div>

                      <!-- ASCENT Network Sites -->
                      <div v-if="ascentMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-cyan-500"></div>
                          <h4 class="text-sm font-medium text-foreground">ASCENT Network</h4>
                          <span class="text-xs text-muted-foreground">({{ ascentMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in ascentMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                                <Badge
                                  v-if="monitor.siteType"
                                  variant="secondary"
                                  class="text-[10px] uppercase tracking-wide"
                                >
                                  {{ monitor.siteType.toUpperCase() }}
                                </Badge>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                              <p v-if="monitor.comments" class="text-xs text-muted-foreground">
                                {{ monitor.comments }}
                              </p>
                            </button>
                          </li>
                        </ul>
                        <p v-if="ascentMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ ascentMonitors.length - 5 }} more ASCENT sites
                        </p>
                      </div>

                      <!-- EPA IMPROVE -->
                      <div v-if="improveMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-teal-500"></div>
                          <h4 class="text-sm font-medium text-foreground">EPA IMPROVE Network</h4>
                          <span class="text-xs text-muted-foreground">({{ improveMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in improveMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                                <Badge
                                  v-if="monitor.status === 'inactive'"
                                  class="border-destructive bg-destructive/15 text-[10px] uppercase tracking-wide text-destructive-foreground"
                                  variant="outline"
                                >
                                  INACTIVE
                                </Badge>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                              <p v-if="monitor.state || monitor.county" class="text-xs text-muted-foreground">
                                {{ [monitor.county, monitor.state].filter(Boolean).join(', ') }}
                              </p>
                            </button>
                          </li>
                        </ul>
                        <p v-if="improveMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ improveMonitors.length - 5 }} more IMPROVE sites
                        </p>
                      </div>

                      <!-- EPA NATTS -->
                      <div v-if="nattsMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-orange-500"></div>
                          <h4 class="text-sm font-medium text-foreground">EPA NATTS</h4>
                          <span class="text-xs text-muted-foreground">({{ nattsMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in nattsMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                                <Badge
                                  v-if="monitor.status === 'inactive'"
                                  class="border-destructive bg-destructive/15 text-[10px] uppercase tracking-wide text-destructive-foreground"
                                  variant="outline"
                                >
                                  INACTIVE
                                </Badge>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                              <p v-if="monitor.state || monitor.county" class="text-xs text-muted-foreground">
                                {{ [monitor.county, monitor.state].filter(Boolean).join(', ') }}
                              </p>
                            </button>
                          </li>
                        </ul>
                        <p v-if="nattsMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ nattsMonitors.length - 5 }} more NATTS sites
                        </p>
                      </div>

                      <!-- EPA Near Road -->
                      <div v-if="nearRoadMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-yellow-400"></div>
                          <h4 class="text-sm font-medium text-foreground">EPA Near-Road Network</h4>
                          <span class="text-xs text-muted-foreground">({{ nearRoadMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in nearRoadMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                                <Badge
                                  v-if="monitor.status === 'inactive'"
                                  class="border-destructive bg-destructive/15 text-[10px] uppercase tracking-wide text-destructive-foreground"
                                  variant="outline"
                                >
                                  INACTIVE
                                </Badge>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                              <p v-if="monitor.state || monitor.county" class="text-xs text-muted-foreground">
                                {{ [monitor.county, monitor.state].filter(Boolean).join(', ') }}
                              </p>
                            </button>
                          </li>
                        </ul>
                        <p v-if="nearRoadMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ nearRoadMonitors.length - 5 }} more near-road sites
                        </p>
                      </div>

                      <!-- EPA CSN (PM2.5 Speciation) -->
                      <div v-if="csnMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-purple-500"></div>
                          <h4 class="text-sm font-medium text-foreground">EPA PM2.5 Chemical Speciation</h4>
                          <span class="text-xs text-muted-foreground">({{ csnMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in csnMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                                <Badge
                                  v-if="monitor.status === 'inactive'"
                                  class="border-destructive bg-destructive/15 text-[10px] uppercase tracking-wide text-destructive-foreground"
                                  variant="outline"
                                >
                                  INACTIVE
                                </Badge>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                              <p v-if="monitor.state || monitor.county" class="text-xs text-muted-foreground">
                                {{ [monitor.county, monitor.state].filter(Boolean).join(', ') }}
                              </p>
                            </button>
                          </li>
                        </ul>
                        <p v-if="csnMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ csnMonitors.length - 5 }} more CSN sites
                        </p>
                      </div>

                      <!-- EPA NCore -->
                      <div v-if="ncoreMonitors.length" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="h-3 w-3 rounded-full bg-indigo-500"></div>
                          <h4 class="text-sm font-medium text-foreground">EPA NCore Multipollutant</h4>
                          <span class="text-xs text-muted-foreground">({{ ncoreMonitors.length }})</span>
                        </div>
                        <ul class="space-y-2">
                          <li v-for="monitor in ncoreMonitors.slice(0, 5)" :key="monitor.id" class="list-none">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-card/40 p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                              @click="focusOnPoint(monitor.latitude, monitor.longitude)"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold text-foreground">{{ monitor.name }}</div>
                                <Badge
                                  v-if="monitor.status === 'inactive'"
                                  class="border-destructive bg-destructive/15 text-[10px] uppercase tracking-wide text-destructive-foreground"
                                  variant="outline"
                                >
                                  INACTIVE
                                </Badge>
                              </div>
                              <div class="flex flex-wrap gap-1.5">
                                <Badge v-for="param in monitor.parameters" :key="param" variant="outline" class="text-xs">
                                  {{ param }}
                                </Badge>
                              </div>
                              <p v-if="monitor.state || monitor.county" class="text-xs text-muted-foreground">
                                {{ [monitor.county, monitor.state].filter(Boolean).join(', ') }}
                              </p>
                            </button>
                          </li>
                        </ul>
                        <p v-if="ncoreMonitors.length > 5" class="text-xs text-muted-foreground">
                          + {{ ncoreMonitors.length - 5 }} more NCore sites
                        </p>
                      </div>
                    </div>
                  </section>

                  <section v-if="categories.satellite" class="space-y-2">
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-semibold text-foreground">Satellite Products</h3>
                      <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ satelliteMatches.length }} datasets</p>
                    </div>
                    <p v-if="!satelliteMatches.length" class="text-sm text-muted-foreground">
                      No satellite coverage intersects the radius.
                    </p>
                    <ul v-else class="space-y-2">
                      <li v-for="product in satelliteMatches" :key="product.id" class="list-none">
                        <Card
                          class="cursor-pointer transition-all hover:shadow-md"
                          :class="visibleItems.satellites.has(product.id) ? 'border-primary bg-primary/5' : ''"
                        >
                          <CardContent class="p-3">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 text-left"
                              @click="toggleSatelliteVisibility(product.id)"
                            >
                              <div class="flex items-start justify-between gap-2">
                                <div class="flex-1">
                                  <div class="text-sm font-semibold text-foreground">{{ product.name }}</div>
                                  <span class="text-xs text-muted-foreground">{{ product.network }}</span>
                                </div>
                                <div
                                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                                  :class="visibleItems.satellites.has(product.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'"
                                >
                                  <svg
                                    v-if="visibleItems.satellites.has(product.id)"
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
                                  {{ product.temporal }}
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
                    </ul>
                  </section>

                  <section v-if="categories.grids" class="space-y-2">
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-semibold text-foreground">Hex Grid Products</h3>
                      <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ hexMatches.length }} datasets</p>
                    </div>
                    <p v-if="!hexMatches.length" class="text-sm text-muted-foreground">
                      No grid cells intersect the search area.
                    </p>
                    <ul v-else class="space-y-2">
                      <li v-for="product in hexMatches" :key="product.id" class="list-none">
                        <Card
                          class="cursor-pointer transition-all hover:shadow-md"
                          :class="visibleItems.hexProducts.has(product.id) ? 'border-primary bg-primary/5' : ''"
                        >
                          <CardContent class="p-3">
                            <button
                              type="button"
                              class="flex w-full flex-col gap-2 text-left"
                              @click="toggleHexVisibility(product.id)"
                            >
                              <div class="flex items-start justify-between gap-2">
                                <div class="flex-1">
                                  <div class="text-sm font-semibold text-foreground">{{ product.name }}</div>
                                  <span class="text-xs text-muted-foreground">{{ product.network }}</span>
                                </div>
                                <div
                                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                                  :class="visibleItems.hexProducts.has(product.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'"
                                >
                                  <svg
                                    v-if="visibleItems.hexProducts.has(product.id)"
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
                                  <template v-if="product.globalCoverage">
                                    Global coverage
                                  </template>
                                  <template v-else-if="product.cellsWithin.length">
                                    Cells: {{ product.cellsWithin.length }}
                                  </template>
                                  <template v-else-if="product.geometryIntersects">
                                    Intersects area
                                  </template>
                                  <template v-else>
                                    Local coverage
                                  </template>
                                  <template v-if="product.temporal"> • {{ product.temporal }}</template>
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
            </ul>
          </section>
        </div>
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
import { computed, reactive, ref, watch } from 'vue'
import MonitorMap from './components/MonitorMap.vue'
import AppHeader from './components/AppHeader.vue'
import ResultsSidebar from './components/ResultsSidebar.vue'
import MobileNetworkDrawer from './components/MobileNetworkDrawer.vue'
import FloatingActionButton from './components/FloatingActionButton.vue'
import Badge from './components/ui/badge/Badge.vue'
import Label from './components/ui/label/Label.vue'
import Input from './components/ui/input/Input.vue'
import Button from './components/ui/button/Button.vue'
import Separator from './components/ui/separator/Separator.vue'
import Dialog from './components/ui/dialog/Dialog.vue'
import Card from './components/ui/card/Card.vue'
import CardHeader from './components/ui/card/CardHeader.vue'
import CardContent from './components/ui/card/CardContent.vue'
import CardTitle from './components/ui/card/CardTitle.vue'
import CardDescription from './components/ui/card/CardDescription.vue'
import { useMonitorData } from './composables/useMonitorData'
import { useDarkMode } from './composables/useDarkMode'

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

// View mode: 'radius' or 'network'
// Mobile devices default to network mode
const isMobile = ref(window.innerWidth < 1024)
const viewMode = ref(isMobile.value ? 'network' : 'radius')
const selectedNetworks = reactive(new Set(['PA', 'FEM', 'EGG']))
const showMobileNetworkDrawer = ref(false)

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

const searchQuery = ref('')
const searching = ref(false)
const searchError = ref(null)
const mapComponent = ref(null)
const showDialog = ref(false)
const centerSelectionActive = ref(false)

const coordLat = ref(null)
const coordLon = ref(null)

// Track which items are visible on the map
const visibleItems = reactive({
  satellites: new Set(),
  hexProducts: new Set()
})

const categoriesRef = computed(() => categories)
const viewModeRef = computed(() => viewMode.value)
const selectedNetworksRef = computed(() => new Set(selectedNetworks))

const { loading, error, pointMonitors, satelliteMatches, hexMatches, summary } = useMonitorData(
  center,
  radiusKm,
  categoriesRef,
  viewModeRef,
  selectedNetworksRef
)

// Debug logging
watch(pointMonitors, (monitors) => {
  console.log('pointMonitors updated:', monitors.length, 'monitors')
  if (monitors.length > 0) {
    console.log('Sample monitor:', monitors[0])
  }
}, { immediate: true })

// Filter satellite and hex products to only show visible ones on map
const visibleSatelliteProducts = computed(() => {
  return satelliteMatches.value.filter(p => visibleItems.satellites.has(p.id))
})

const visibleHexProducts = computed(() => {
  return hexMatches.value.filter(p => visibleItems.hexProducts.has(p.id))
})

// Group monitors by network type
const purpleAirMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'PA')
})

const femMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'FEM')
})

const eggMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'EGG')
})

const spartanMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'SPARTAN')
})

const ascentMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'ASCENT')
})

const improveMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'EPA IMPROVE')
})

const nattsMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'EPA NATTS')
})

const ncoreMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'EPA NCORE')
})

const csnMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'EPA CSN STN')
})

const nearRoadMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'EPA NEAR ROAD')
})

const bcEnvMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'BC ENV')
})

const pamsMonitors = computed(() => {
  return pointMonitors.value.filter(m => m.network === 'EPA PAMS')
})

// Network counts for NetworkSelector component
const networkCounts = computed(() => ({
  PA: purpleAirMonitors.value.length,
  FEM: femMonitors.value.length,
  EGG: eggMonitors.value.length,
  SPARTAN: spartanMonitors.value.length,
  ASCENT: ascentMonitors.value.length,
  'EPA IMPROVE': improveMonitors.value.length,
  'EPA NATTS': nattsMonitors.value.length,
  'EPA NCORE': ncoreMonitors.value.length,
  'EPA CSN STN': csnMonitors.value.length,
  'EPA NEAR ROAD': nearRoadMonitors.value.length,
  'BC ENV': bcEnvMonitors.value.length,
  'EPA PAMS': pamsMonitors.value.length
}))

function handleNetworkUpdate(newSet) {
  selectedNetworks.clear()
  newSet.forEach(network => selectedNetworks.add(network))
}

function toggleCenterSelection() {
  centerSelectionActive.value = !centerSelectionActive.value
}

function handleMapCenterUpdate(newCenter) {
  if (!centerSelectionActive.value) return
  center.value = { ...newCenter }
  centerSelectionActive.value = false
}

function toggleSatelliteVisibility(productId) {
  if (visibleItems.satellites.has(productId)) {
    visibleItems.satellites.delete(productId)
  } else {
    visibleItems.satellites.add(productId)
  }
}

function toggleHexVisibility(productId) {
  if (visibleItems.hexProducts.has(productId)) {
    visibleItems.hexProducts.delete(productId)
  } else {
    visibleItems.hexProducts.add(productId)
  }
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
    showDialog.value = false
  } catch (err) {
    console.error('Geocoding error:', err)
    searchError.value = 'Failed to search address. Please try again.'
  } finally {
    searching.value = false
  }
}
</script>
