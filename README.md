# Carbon-Aware Planner (GB)

A small, sustainability-linked web app that helps you schedule energy-heavy tasks (renders, downloads, long coding sessions) for **lower‑carbon electricity** times in Great Britain.

It uses the **NESO Carbon Intensity API** (formerly National Grid ESO) to fetch half-hourly carbon intensity forecasts and then finds the **lowest-average window** for your chosen duration.

## Why this is “sustainability”
Electricity isn’t equally clean all day. If you can shift flexible tasks to times with lower carbon intensity, you can reduce associated emissions without changing what you do — just *when* you do it.

## Features
- National (GB), **region**, or **postcode** forecast modes
- Choose task duration (30m–4h) and search horizon (24h/48h)
- Optional “earliest start time” filter
- Simple sliding-window algorithm to suggest the cleanest slot
- Half-hourly table + mini sparkline chart

## Data source
- NESO Carbon Intensity API: `https://api.carbonintensity.org.uk/`
- National forecast endpoints: `/intensity/{from}/fw24h` and `/intensity/{from}/fw48h`
- Regional forecast endpoints: `/regional/intensity/{from}/fw24h/...` and `/regional/intensity/{from}/fw48h/...`

(See the official API definitions site for full details.)

## Run locally
Because browsers often block API calls from `file://`, run a tiny local server:

### Option 1: VS Code Live Server
- Install **Live Server**
- Right-click `src/index.html` → *Open with Live Server*

### Option 2: Python
```bash
cd src
python -m http.server 8000
```
Then open `http://localhost:8000`.

## Project structure
```
carbon-aware-planner/
  src/
    index.html
    style.css
    app.js
  docs/
    screenshots/
```

## Roadmap ideas (nice GitHub issues)
- “Saved tasks” + weekly report using LocalStorage
- A “device power” toggle (laptop/desktop) to estimate energy and emissions
- Add generation mix view (`/generation/...`)
- Export results to ICS calendar event

## License
MIT
