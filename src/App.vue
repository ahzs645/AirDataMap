<template>
  <div class="flex h-screen flex-col bg-background text-foreground">
    <!-- Unified Header -->
    <header class="flex items-center justify-between border-b bg-background px-4 py-3">
      <div class="flex items-center gap-6">
        <div>
          <h1 class="text-lg font-semibold tracking-tight text-foreground">
            Air Quality Coverage
          </h1>
          <p class="text-xs text-muted-foreground">
            Monitoring results for your area
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <div class="hidden items-center gap-3 text-xs text-muted-foreground 2xl:flex">
          <span v-if="summary.regionLabel" class="font-medium text-foreground">{{ summary.regionLabel }}</span>
          <span>Radius: {{ radiusKm.toFixed(0) }} km</span>
          <span v-if="summary.totals.points">Points: {{ summary.totals.points }}</span>
          <span v-if="summary.totals.satellite">Satellite: {{ summary.totals.satellite }}</span>
          <span v-if="summary.totals.grids">Grids: {{ summary.totals.grids }}</span>
        </div>
        <div class="flex items-center gap-2">
          <label for="radius-input" class="text-[11px] uppercase tracking-wide text-muted-foreground">
            Radius (km)
          </label>
          <Input
            id="radius-input"
            v-model.number="radiusKm"
            type="number"
            min="1"
            max="500"
            step="1"
            class="h-8 w-24 text-right [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div class="flex items-center gap-2">
          <Button @click="toggleDarkMode" size="sm" variant="ghost">
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
          <Button
            :aria-pressed="centerSelectionActive"
            :variant="centerSelectionActive ? 'default' : 'outline'"
            size="sm"
            @click="toggleCenterSelection"
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
          <Button @click="showDialog = true" size="sm">
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

    <!-- Main Content Area -->
    <div class="flex flex-1 overflow-hidden lg:flex-row">
      <aside class="flex w-full flex-col border-b border-r bg-muted/40 backdrop-blur-lg lg:max-w-md lg:border-b-0">
        <div class="flex h-full flex-col overflow-hidden p-6">
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
              <ScrollArea v-else class="flex-1">
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
              </ScrollArea>
            </div>
          </CardContent>
          </Card>
        </div>
      </aside>

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
          @update:center="handleMapCenterUpdate"
        />
      </main>
    </div>

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
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
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
import Dialog from './components/ui/dialog/Dialog.vue'
import { useMonitorData } from './composables/useMonitorData'
import { useDarkMode } from './composables/useDarkMode'

const { isDark, toggleDarkMode } = useDarkMode()

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

const { loading, error, pointMonitors, satelliteMatches, hexMatches, summary } = useMonitorData(
  center,
  radiusKm,
  categoriesRef
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
