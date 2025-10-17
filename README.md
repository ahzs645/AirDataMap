# Air Data Map

A static Vue 3 application that helps users discover what air-quality monitoring resources are available around a selected location. The site loads pre-generated JSON datasets, renders them on a Leaflet map, and evaluates client-side spatial queries with Turf.js and H3.

## Features

- **Static data pipeline** – Run a local build script to export sample monitor metadata, satellite coverage, and H3 grid cells to `public/data`. The JSON files can be hosted on any CDN or object storage (e.g., S3).
- **Client-side spatial search** – Users select a search radius and map location; the browser filters point monitors, satellite polygons, and hex-grid products using Turf.js without a backend.
- **Lazy regional loading** – Point networks are partitioned into regional JSON files so only the relevant chunk is downloaded based on the map center.
- **Interactive visualization** – Leaflet renders the basemap, radius circle, available monitors, satellite footprints, and intersecting hex cells.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

> If you are in an offline environment, install the dependencies when you regain network connectivity. They are declared in `package.json`.

### 2. Generate the static datasets

```bash
npm run generate:data
```

This script populates `public/data` with illustrative JSON files:

- `public/data/monitors/*.json` – regional point-monitor metadata (PurpleAir, FEM, speciation, etc.).
- `public/data/satellite/coverage.json` – simplified satellite coverage polygons.
- `public/data/grids/tropomi.json` – H3 cell indices for satellite grids.
- `public/data/manifest.json` – manifest describing generated resources.

### 3. Run the development server

```bash
npm run dev
```

Open the printed URL in a browser. Click the map to change the center point, adjust the radius, and toggle dataset categories to explore which monitoring networks cover the selected area.

### 4. Build for production

```bash
npm run build
```

Deploy the contents of the `dist/` directory along with the `public/data` folder to static hosting (S3, CloudFront, Netlify, etc.).

## Project Structure

```
├── index.html
├── package.json
├── public/
│   └── data/
│       ├── grids/
│       ├── monitors/
│       └── satellite/
├── scripts/
│   └── build_monitor_data.mjs
├── src/
│   ├── App.vue
│   ├── assets/
│   ├── components/
│   │   └── MonitorMap.vue
│   ├── composables/
│   │   └── useMonitorData.js
│   └── utils/
│       └── regions.js
└── vite.config.js
```

## Notes

- The included datasets are small illustrative samples. Replace the generation script with your actual preprocessing pipeline to export full coverage datasets.
- The client expects GeoJSON polygon coordinates in `[longitude, latitude]` order for satellite coverage and will convert them to Leaflet-friendly `[latitude, longitude]` pairs on the fly.
- H3 cell boundaries are computed client-side only for the hex cells that intersect the active search radius, keeping rendering efficient even with large datasets.
