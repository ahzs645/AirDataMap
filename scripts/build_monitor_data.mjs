import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

async function ensureDir(path) {
  await mkdir(path, { recursive: true })
}

const monitorRegions = {
  northeast: [
    {
      id: 'PA-12345',
      name: 'PurpleAir Station 12345',
      type: 'point',
      network: 'PurpleAir',
      parameters: ['PM2.5'],
      status: 'active',
      latitude: 40.7128,
      longitude: -74.006,
      started: '2021-04-15',
      updated: '2024-02-12'
    },
    {
      id: 'EPA-FEM-001',
      name: 'EPA FEM - Queens College',
      type: 'point',
      network: 'EPA FEM',
      parameters: ['PM2.5', 'PM10'],
      status: 'active',
      latitude: 40.7336,
      longitude: -73.8258,
      started: '2015-01-01',
      updated: '2023-11-20'
    },
    {
      id: 'CSN-0102',
      name: 'Speciation Trends Network - Bronx',
      type: 'point',
      network: 'EPA CSN',
      parameters: ['Speciated PM2.5'],
      status: 'historical',
      latitude: 40.8429,
      longitude: -73.8655,
      started: '2003-06-01',
      ended: '2019-08-01'
    }
  ],
  southeast: [
    {
      id: 'PA-67890',
      name: 'PurpleAir Station 67890',
      type: 'point',
      network: 'PurpleAir',
      parameters: ['PM2.5'],
      status: 'active',
      latitude: 33.7488,
      longitude: -84.3877,
      started: '2022-06-10'
    },
    {
      id: 'AQS-13-045-0004',
      name: 'AQS Jefferson County',
      type: 'point',
      network: 'EPA AQS',
      parameters: ['Ozone', 'PM2.5'],
      status: 'active',
      latitude: 33.5212,
      longitude: -86.8037,
      started: '2012-03-01'
    }
  ],
  midwest: [
    {
      id: 'PA-99881',
      name: 'PurpleAir Station 99881',
      type: 'point',
      network: 'PurpleAir',
      parameters: ['PM2.5'],
      status: 'active',
      latitude: 41.8781,
      longitude: -87.6298,
      started: '2023-08-20'
    },
    {
      id: 'NCore-CH-01',
      name: 'NCore Chicago Loop',
      type: 'point',
      network: 'EPA NCore',
      parameters: ['Ozone', 'SO2', 'NO2', 'CO'],
      status: 'active',
      latitude: 41.88,
      longitude: -87.63,
      started: '2010-01-01'
    }
  ],
  west: [
    {
      id: 'PA-33321',
      name: 'PurpleAir Station 33321',
      type: 'point',
      network: 'PurpleAir',
      parameters: ['PM2.5'],
      status: 'active',
      latitude: 34.0522,
      longitude: -118.2437,
      started: '2020-09-14'
    },
    {
      id: 'CARB-LA-07',
      name: 'CARB Speciation Network',
      type: 'point',
      network: 'CARB',
      parameters: ['Speciated PM2.5', 'Carbonyls'],
      status: 'active',
      latitude: 34.0522,
      longitude: -118.2537,
      started: '2016-02-01'
    }
  ],
  alaska: [
    {
      id: 'AQS-02-090-0032',
      name: 'Anchorage Gateway',
      type: 'point',
      network: 'EPA AQS',
      parameters: ['PM2.5', 'PM10'],
      status: 'active',
      latitude: 61.2181,
      longitude: -149.9003,
      started: '2018-05-10'
    }
  ]
}

const satelliteCoverage = [
  {
    id: 'MODIS-AOD-CONUS',
    name: 'MODIS Aerosol Optical Depth',
    type: 'polygon',
    network: 'NASA MODIS',
    parameters: ['AOD'],
    temporal: '2000-present',
    frequency: 'daily',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-125, 24],
          [-125, 50],
          [-66, 50],
          [-66, 24],
          [-125, 24]
        ]
      ]
    }
  },
  {
    id: 'GOES-16-AI',
    name: 'GOES-16 Aerosol Index',
    type: 'polygon',
    network: 'NOAA GOES',
    parameters: ['UV Aerosol Index'],
    temporal: '2017-present',
    frequency: 'hourly',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-140, 5],
          [-140, 60],
          [-30, 60],
          [-30, 5],
          [-140, 5]
        ]
      ]
    }
  }
]

const hexGrids = [
  {
    id: 'TROPOMI-NO2-NA',
    name: 'TROPOMI NO2 Column Density',
    type: 'hexgrid',
    network: 'ESA Sentinel-5P',
    parameters: ['NO2'],
    resolution: 'h3-4',
    temporal: '2018-present',
    frequency: 'daily',
    cells: [
      '8428c47ffffffff',
      '8428c4bffffffff',
      '8428c43ffffffff',
      '8428c57ffffffff'
    ]
  },
  {
    id: 'GEOS-CF-GLOBAL',
    name: 'GEOS-CF Global Composition Model',
    type: 'hexgrid',
    network: 'NASA GMAO',
    parameters: ['O3', 'PM2.5', 'NO2'],
    resolution: '0.25° grid',
    temporal: '2018-present',
    frequency: 'hourly',
    coverage: 'global',
    description:
      'Demonstration metadata showing a global atmospheric composition modeling product.',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-180, -90],
            [-180, 90],
            [0, 90],
            [0, -90],
            [-180, -90]
          ]
        ],
        [
          [
            [0, -90],
            [0, 90],
            [180, 90],
            [180, -90],
            [0, -90]
          ]
        ]
      ]
    }
  }
]

async function build() {
  await ensureDir(join(rootDir, 'public/data/monitors'))
  await ensureDir(join(rootDir, 'public/data/satellite'))
  await ensureDir(join(rootDir, 'public/data/grids'))

  for (const [region, records] of Object.entries(monitorRegions)) {
    const file = join(rootDir, `public/data/monitors/${region}.json`)
    await writeFile(file, JSON.stringify(records, null, 2))
  }

  await writeFile(
    join(rootDir, 'public/data/satellite/coverage.json'),
    JSON.stringify(satelliteCoverage, null, 2)
  )

  await writeFile(
    join(rootDir, 'public/data/grids/tropomi.json'),
    JSON.stringify(hexGrids, null, 2)
  )

  const summary = {
    generatedAt: new Date().toISOString(),
    regions: Object.keys(monitorRegions),
    totals: Object.fromEntries(
      Object.entries(monitorRegions).map(([region, records]) => [region, records.length])
    ),
    satelliteProducts: satelliteCoverage.map((product) => product.id),
    hexProducts: hexGrids.map((grid) => grid.id)
  }

  await writeFile(join(rootDir, 'public/data/manifest.json'), JSON.stringify(summary, null, 2))
}

build().catch((error) => {
  console.error(error)
  process.exit(1)
})
