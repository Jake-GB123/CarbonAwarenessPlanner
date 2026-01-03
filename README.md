# 🌱 Carbon-Aware Study Planner

[![Made with Vanilla JS](https://img.shields.io/badge/Made%20with-Vanilla%20JS-informational)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-success)](./LICENSE)

A lightweight web app that helps you schedule computer‑intensive tasks at **lower‑carbon electricity times**, using live UK grid carbon‑intensity forecasts.

## Live demo
After enabling GitHub Pages, your app will be available here:

`https://YOUR_GITHUB_USERNAME.github.io/carbon-aware-planner/`

## Why this matters
Electricity isn’t equally clean throughout the day. By shifting heavy digital activity (coding sessions, renders, large downloads) to greener periods, you can reduce your **indirect carbon footprint** with minimal effort.

## Features
- Fetches live + forecast **UK carbon intensity**
- Suggests the **best time window** for your chosen duration (sliding‑window minimum average)
- Works with **National / Region / Postcode** forecasts
- No frameworks, no build step

## Tech
- HTML, CSS, JavaScript (vanilla)
- UK Carbon Intensity API

## Run locally
Because browsers can restrict network requests from `file://`, run a quick local server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy on GitHub Pages
1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, set:
   - **Source:** Deploy from a branch
   - **Branch:** `main` / **Folder:** `/ (root)`
4. Save — then replace `YOUR_GITHUB_USERNAME` in the demo link above

## Roadmap (nice-to-have)
- Save tasks (LocalStorage) + simple weekly “impact” summary
- Device profiles (laptop/desktop) for rough energy estimates
- Accessibility + dark mode polish
