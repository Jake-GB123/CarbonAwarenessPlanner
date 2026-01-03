/* Carbon-Aware Planner (Option A) - Vanilla JS
   Uses NESO Carbon Intensity API (Great Britain)
   Docs: https://api.carbonintensity.org.uk/ (see api-definitions)
*/

const $ = (id) => document.getElementById(id);

const state = {
  mode: "national",
  regionId: 13, // London (default)
  postcode: "",
  horizonHours: 24,
  durationMin: 60,
  earliestLocal: null,
  forecast: [],          // [{from: Date, to: Date, forecast: number, index: string}]
  sourceLabel: "National (GB)"
};

const REGIONS = [
  { id: 1,  name: "North Scotland" },
  { id: 2,  name: "South Scotland" },
  { id: 3,  name: "North West England" },
  { id: 4,  name: "North East England" },
  { id: 5,  name: "Yorkshire" },
  { id: 6,  name: "North Wales & Merseyside" },
  { id: 7,  name: "South Wales" },
  { id: 8,  name: "West Midlands" },
  { id: 9,  name: "East Midlands" },
  { id: 10, name: "East England" },
  { id: 11, name: "South West England" },
  { id: 12, name: "South England" },
  { id: 13, name: "London" },
  { id: 14, name: "South East England" },
  { id: 15, name: "England" },
  { id: 16, name: "Scotland" },
  { id: 17, name: "Wales" }
];

function isoUtcNowRoundedToHalfHour() {
  const now = new Date();
  // Convert to UTC components then round minutes to 0 or 30
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const mins = utc.getUTCMinutes();
  const rounded = mins < 30 ? 0 : 30;
  utc.setUTCMinutes(rounded, 0, 0);
  // Format: YYYY-MM-DDTHH:MMZ
  const pad = (n) => String(n).padStart(2, "0");
  const y = utc.getUTCFullYear();
  const m = pad(utc.getUTCMonth() + 1);
  const d = pad(utc.getUTCDate());
  const hh = pad(utc.getUTCHours());
  const mm = pad(utc.getUTCMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}Z`;
}

function parseLocalDateTime(inputValue) {
  // datetime-local gives "YYYY-MM-DDTHH:MM"
  if (!inputValue) return null;
  const d = new Date(inputValue);
  return isNaN(d.getTime()) ? null : d;
}

function outwardPostcode(raw) {
  if (!raw) return "";
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, " ");
  // If full postcode, outward is everything before the space
  const parts = cleaned.split(" ");
  return parts[0] || "";
}

function setStatus(msg) {
  $("status").textContent = msg || "";
}

function apiUrlForForecast() {
  const from = isoUtcNowRoundedToHalfHour();
  const horizon = state.horizonHours === 48 ? "fw48h" : "fw24h";

  if (state.mode === "national") {
    state.sourceLabel = "National (GB)";
    return `https://api.carbonintensity.org.uk/intensity/${from}/${horizon}`;
  }

  if (state.mode === "region") {
    const region = REGIONS.find(r => r.id === state.regionId);
    state.sourceLabel = region ? `Region: ${region.name}` : `Region ID: ${state.regionId}`;
    return `https://api.carbonintensity.org.uk/regional/intensity/${from}/${horizon}/regionid/${state.regionId}`;
  }

  // postcode mode
  const pc = outwardPostcode(state.postcode);
  state.sourceLabel = pc ? `Postcode: ${pc}` : "Postcode";
  return `https://api.carbonintensity.org.uk/regional/intensity/${from}/${horizon}/postcode/${encodeURIComponent(pc)}`;
}

function normaliseForecast(apiJson) {
  // National: { data: [ {from,to,intensity:{forecast,index}} ] }
  // Regional: { data: [ {data: [ {from,to,intensity:{forecast,index}} ... ], regionid, shortname ... } ] }
  if (!apiJson || !apiJson.data) return [];

  // Detect regional payload
  if (Array.isArray(apiJson.data) && apiJson.data.length && apiJson.data[0].data) {
    const inner = apiJson.data[0].data;
    return inner.map(x => ({
      from: new Date(x.from),
      to: new Date(x.to),
      forecast: x.intensity?.forecast ?? null,
      index: x.intensity?.index ?? "unknown"
    })).filter(x => typeof x.forecast === "number");
  }

  // National
  return apiJson.data.map(x => ({
    from: new Date(x.from),
    to: new Date(x.to),
    forecast: x.intensity?.forecast ?? null,
    index: x.intensity?.index ?? "unknown"
  })).filter(x => typeof x.forecast === "number");
}

function fmt(dt) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short", hour: "2-digit", minute: "2-digit",
    month: "short", day: "2-digit"
  }).format(dt);
}

function intensityDotColor(index) {
  // We intentionally don't use fixed “branding” colours beyond subtle semantic ones.
  if (!index) return "var(--muted)";
  const v = index.toLowerCase();
  if (v.includes("very low") || v === "low") return "var(--good)";
  if (v.includes("moderate")) return "var(--warn)";
  if (v.includes("high")) return "var(--bad)";
  return "var(--muted)";
}

function renderForecastTable(items) {
  const tbody = $("forecastTable").querySelector("tbody");
  tbody.innerHTML = "";
  const maxRows = 40; // keep page light
  const shown = items.slice(0, maxRows);

  for (const row of shown) {
    const tr = document.createElement("tr");

    const tdFrom = document.createElement("td");
    tdFrom.textContent = fmt(row.from);

    const tdTo = document.createElement("td");
    tdTo.textContent = fmt(row.to);

    const tdF = document.createElement("td");
    tdF.textContent = row.forecast;

    const tdI = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = intensityDotColor(row.index);
    const txt = document.createElement("span");
    txt.textContent = row.index;
    badge.appendChild(dot);
    badge.appendChild(txt);
    tdI.appendChild(badge);

    tr.appendChild(tdFrom);
    tr.appendChild(tdTo);
    tr.appendChild(tdF);
    tr.appendChild(tdI);

    tbody.appendChild(tr);
  }
}

function drawSparkline(items) {
  const canvas = $("spark");
  const ctx = canvas.getContext("2d");

  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!items.length) return;

  const vals = items.map(x => x.forecast);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = 18;

  // Background grid
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (h - 2*pad) * (i/4);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Line
  const xStep = (w - 2*pad) / (items.length - 1);
  const yFor = (v) => {
    if (max === min) return h/2;
    const t = (v - min) / (max - min);
    return (h - pad) - t * (h - 2*pad);
  };

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  items.forEach((it, i) => {
    const x = pad + i * xStep;
    const y = yFor(it.forecast);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Min/max labels
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(`min ${Math.round(min)}`, pad, 14);
  ctx.fillText(`max ${Math.round(max)}`, w - pad - 70, 14);
}

function average(arr) {
  return arr.reduce((a,b)=>a+b,0) / (arr.length || 1);
}

function computeBestWindow(items, durationMin, earliestStart) {
  const windowSize = Math.max(1, Math.round(durationMin / 30)); // half-hour steps
  if (items.length < windowSize) return null;

  // Ensure sorted
  const sorted = [...items].sort((a,b)=>a.from - b.from);

  let best = null;

  for (let i = 0; i <= sorted.length - windowSize; i++) {
    const slice = sorted.slice(i, i + windowSize);
    const start = slice[0].from;
    const end = slice[slice.length - 1].to;

    if (earliestStart && start < earliestStart) continue;

    // Only accept contiguous half-hours
    let ok = true;
    for (let j = 1; j < slice.length; j++) {
      if (slice[j].from.getTime() !== slice[j-1].to.getTime()) { ok = false; break; }
    }
    if (!ok) continue;

    const avg = average(slice.map(x => x.forecast));
    const min = Math.min(...slice.map(x => x.forecast));
    const max = Math.max(...slice.map(x => x.forecast));

    if (!best || avg < best.avg) {
      best = { start, end, avg, min, max, index: slice[0].index };
    }
  }

  return best;
}

function tipsForIndex(avgForecast) {
  // Rough ranges (gCO2/kWh) for friendly advice. This is not official categorisation.
  if (avgForecast <= 120) {
    return [
      "Good time to run heavier tasks (updates, renders, long coding sessions).",
      "If you can, batch tasks together so the device can fully power down afterwards."
    ];
  }
  if (avgForecast <= 200) {
    return [
      "Decent time. If you have flexibility, you might find an even cleaner slot later.",
      "Enable power saving on your PC/laptop during longer sessions."
    ];
  }
  if (avgForecast <= 280) {
    return [
      "Moderate intensity. Consider shifting heavy tasks to a cleaner window if possible.",
      "Close background apps and reduce screen brightness to cut demand."
    ];
  }
  return [
    "Higher intensity window. If you can, delay heavy tasks to a cleaner period.",
    "Prefer lighter tasks (planning, reading, writing) instead of GPU/CPU-heavy work."
  ];
}

function renderResult(best) {
  const el = $("result");
  if (!best) {
    el.className = "result";
    el.innerHTML = `
      <div class="badge"><span class="dot" style="background:var(--bad)"></span><span>No suitable window found</span></div>
      <p class="muted">Try a shorter duration, a wider search window, or remove the earliest start filter.</p>
    `;
    return;
  }

  const task = $("taskName").value.trim() || "Your task";
  const tips = tipsForIndex(best.avg).map(t => `<li>${t}</li>`).join("");

  el.className = "result";
  el.innerHTML = `
    <div class="badge"><span class="dot" style="background:${intensityDotColor(best.index)}"></span><span>${state.sourceLabel}</span></div>
    <div class="badge"><span class="dot" style="background:var(--accent)"></span><span>Suggested window</span></div>
    <h3 style="margin:10px 0 6px 0">${task}</h3>
    <p style="margin:0 0 8px 0"><b>${fmt(best.start)}</b> → <b>${fmt(best.end)}</b></p>

    <div class="kpis">
      <div class="kpi"><div class="v">${Math.round(best.avg)}</div><div class="l">Avg forecast (gCO₂/kWh)</div></div>
      <div class="kpi"><div class="v">${Math.round(best.min)}–${Math.round(best.max)}</div><div class="l">Range in window</div></div>
      <div class="kpi"><div class="v">${$("duration").selectedOptions[0].textContent}</div><div class="l">Duration</div></div>
    </div>

    <div class="tips">
      <p style="margin:12px 0 6px 0"><b>Energy tips</b></p>
      <ul>${tips}</ul>
      <ul>
        <li>Use sleep for short breaks; power down for long gaps.</li>
        <li>On desktop, turn off unused monitors/peripherals.</li>
        <li>For downloads, cap bandwidth overnight if you don't need it immediately.</li>
      </ul>
    </div>
  `;
}

async function fetchForecast() {
  setStatus("Fetching forecast…");
  $("sourceInfo").textContent = "";

  // Basic validation for postcode mode
  if (state.mode === "postcode") {
    const pc = outwardPostcode(state.postcode);
    if (!pc) {
      setStatus("Enter a postcode (outward part is enough).");
      return;
    }
  }

  const url = apiUrlForForecast();
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" }});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    state.forecast = normaliseForecast(data);
    if (!state.forecast.length) throw new Error("No forecast data returned.");

    renderForecastTable(state.forecast);
    drawSparkline(state.forecast.slice(0, 80));

    $("sourceInfo").textContent = `• ${state.sourceLabel} • ${state.forecast.length} points`;
    setStatus(`Updated: ${new Date().toLocaleString()}`);
  } catch (err) {
    console.error(err);
    setStatus(`Could not fetch forecast. (${String(err.message || err)})`);
  }
}

function bindUi() {
  // Populate regions
  const sel = $("regionId");
  sel.innerHTML = REGIONS.map(r => `<option value="${r.id}" ${r.id===state.regionId ? "selected":""}>${r.name}</option>`).join("");

  const mode = $("mode");
  mode.addEventListener("change", () => {
    state.mode = mode.value;
    $("regionRow").hidden = state.mode !== "region";
    $("postcodeRow").hidden = state.mode !== "postcode";
    $("sourceInfo").textContent = "";
    setStatus("");
  });

  $("regionId").addEventListener("change", (e) => {
    state.regionId = Number(e.target.value);
  });

  $("postcode").addEventListener("input", (e) => {
    state.postcode = e.target.value;
  });

  $("duration").addEventListener("change", (e) => {
    state.durationMin = Number(e.target.value);
  });

  $("horizon").addEventListener("change", (e) => {
    state.horizonHours = Number(e.target.value);
  });

  $("startAfter").addEventListener("change", (e) => {
    state.earliestLocal = parseLocalDateTime(e.target.value);
  });

  $("refreshBtn").addEventListener("click", fetchForecast);

  $("planBtn").addEventListener("click", async () => {
    // Make sure we have data (or refresh)
    if (!state.forecast.length) await fetchForecast();
    if (!state.forecast.length) return;

    const best = computeBestWindow(state.forecast, state.durationMin, state.earliestLocal);
    renderResult(best);
  });
}

(function init() {
  bindUi();
  // Pre-fetch on load for a nicer first impression
  fetchForecast();
})();
