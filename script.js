/* =====================================================
   Real Kiwi Results - script.js
   Handles loading data, switching screens, searching,
   filtering and submitting new results.
   ===================================================== */

/* ---------- 1. CONSTANTS ---------- */
// All 16 official New Zealand regions shown in dropdowns, north to south
const REGIONS = ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne (Tairāwhiti)",
                 "Hawke's Bay", "Taranaki", "Manawatū-Whanganui", "Wellington", "Tasman",
                 "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"];

// Key used to store user-submitted results in the browser
const STORAGE_KEY = "rkr-user-results";
// Provider detail requests made in this browser (list of result ids)
const REQUEST_KEY = "rkr-provider-requests";

/* ---------- 2. APP STATE ----------
   Variables that remember what the app is currently doing. */
let categories = [];       // list of category names (from JSON)
let allResults = [];       // every result (sample data + user submissions)
let previousScreen = "home"; // so the Back button knows where to go
const REGION_KEY = "rkr-selected-region";
let selectedRegion = localStorage.getItem(REGION_KEY);
if (selectedRegion === null || (selectedRegion && !REGIONS.includes(selectedRegion))) selectedRegion = "Waikato";

/* ---------- 3. SMALL HELPER FUNCTIONS ---------- */

// Shortcut: document.getElementById("x") becomes $("x")
const $ = (id) => document.getElementById(id);

// Turn a number like 4 into "★★★★☆"
function starsText(n) {
  const rounded = Math.round(n);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

// Format a number as New Zealand dollars, e.g. 4100 -> "$4,100"
function money(n) {
  return "$" + Math.round(n).toLocaleString("en-NZ");
}

// Safely insert user text into HTML (prevents malicious code injection)
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ---------- 4. LOADING DATA ---------- */
async function loadData() {
  // fetch() asks the browser to read our JSON file
  const response = await fetch("sample-data.json");
  const data = await response.json();
  categories = data.categories;

  // Get any results users have submitted before (saved in this browser)
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  // Combine sample data and saved results into one list
  allResults = [...data.results, ...saved];
}

/* ---------- 5. SWITCHING SCREENS ---------- */
function showScreen(name) {
  $("region-banner").classList.toggle("hidden", name === "insights");
  $("nav-insights").classList.toggle("active", name === "insights");
  $("nav-home").classList.toggle("active", name === "home");
  // Hide all screens first...
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  // ...then show the one we want
  $("screen-" + name).classList.remove("hidden");
  window.scrollTo(0, 0);
}

/* ---------- 6. FILLING DROPDOWNS ---------- */
// Adds <option> items to a <select>. includeAll adds an "All regions" choice.
function fillRegionSelect(select, includeAll) {
  select.innerHTML = "";
  if (includeAll) select.innerHTML = '<option value="">All regions</option>';
  REGIONS.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = r;
    select.appendChild(opt);
  });
}

/* ---------- 7. BUILDING CARDS ---------- */
// Creates the HTML for one result card
function cardHTML(r) {
  return `
    <div class="card" data-id="${r.id}">
      <span class="tag">${escapeHTML(r.category)}</span>
      <h3>${escapeHTML(r.problem)}</h3>
      <p>${escapeHTML(r.solution)}</p>
      <p class="meta">${escapeHTML(r.region)} · ${money(r.cost)}</p>
      <span class="stars">${starsText(r.rating)}</span>
    </div>`;
}

/* ---------- 8. DASHBOARD ---------- */
// Summary numbers for a list of results
function statsFor(list) {
  const n = list.length;
  if (!n) return { n: 0, cost: 0, rating: 0, pct: 0 };
  return {
    n,
    cost: list.reduce((s, r) => s + r.cost, 0) / n,
    rating: list.reduce((s, r) => s + r.rating, 0) / n,
    pct: Math.round(list.filter((r) => r.recommend).length / n * 100)
  };
}

function statCardsHTML(st, icons) {
  const cards = [
    [icons ? "💬" : "", st.n, "submissions"],
    [icons ? "💵" : "", st.n ? money(st.cost) : "–", "average cost"],
    [icons ? "⭐" : "", st.n ? st.rating.toFixed(1) + " ★" : "–", "average rating"],
    [icons ? "👍" : "", st.n ? st.pct + "%" : "–", "recommend"]
  ];
  return cards.map(([i, v, l]) =>
    `<div class="stat"><span class="stat-icon">${i}</span><strong>${v}</strong><span class="stat-label">${l}</span></div>`).join("");
}

// Best recommended result: highest rating, then newest
function bestOf(list) {
  return list.filter((r) => r.recommend)
    .sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date))[0];
}

function miniHTML(r) {
  return `<div class="card mini" data-id="${r.id}">
      <span class="tag">${escapeHTML(r.category)}</span>
      <h3>${escapeHTML(r.problem)}</h3>
      <p>${escapeHTML(r.solution)}</p>
      <p class="meta"><span class="stars">${starsText(r.rating)}</span> · ${money(r.cost)}</p>
    </div>`;
}

function regionLabel() { return selectedRegion || "All New Zealand"; }
function inRegion(r) { return !selectedRegion || r.region === selectedRegion; }

function renderBanner() {
  const list = allResults.filter(inRegion);
  const st = statsFor(list);
  $("banner-title").textContent = regionLabel();
  $("banner-region").value = selectedRegion;
  $("banner-sub").textContent = st.n
    ? `${st.n} real result${st.n === 1 ? "" : "s"} shared · ${st.pct}% would recommend their solution`
    : "No results shared here yet. Be the first!";
  $("search-scope").textContent = selectedRegion ? "in " + selectedRegion : "";
}

function renderWaikato() {
  const list = allResults.filter((r) => r.region === "Waikato");
  const st = statsFor(list);
  const rows = categories.map((c) => [c, list.filter((r) => r.category === c).length])
    .filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  const max = rows.length ? rows[0][1] : 1;
  const best = bestOf(list);
  $("waikato-switch").classList.toggle("hidden", selectedRegion === "Waikato");
  if (!list.length) {
    $("waikato-content").innerHTML = '<p class="muted">No Waikato results yet. Share the first one!</p>';
    return;
  }
  $("waikato-content").innerHTML = `
    <div>
      <h3 class="sub">What Waikato is talking about</h3>
      ${rows.map(([c, n]) => `<div class="bar-row"><span>${escapeHTML(c)}</span>
        <div class="bar"><div style="width:${Math.round(n / max * 100)}%"></div></div><b>${n}</b></div>`).join("")}
      <p class="muted">Average ${st.rating.toFixed(1)} ★ · ${st.pct}% recommend · ${money(st.cost)} average cost</p>
    </div>
    <div>
      <h3 class="sub">Top Waikato solution</h3>
      ${best ? miniHTML(best) : '<p class="muted">No recommended solutions yet.</p>'}
    </div>`;
}

function renderTopByRegion() {
  $("top-by-region").innerHTML = REGIONS.map((region) => {
    const list = allResults.filter((r) => r.region === region);
    const best = bestOf(list);
    const active = region === selectedRegion ? " active" : "";
    return `<div class="region-card${active}">
      <div class="region-head"><h3>${region}</h3><span class="muted">${list.length} result${list.length === 1 ? "" : "s"}</span></div>
      ${best ? miniHTML(best) : '<p class="muted">No recommended solutions yet.</p>'}
    </div>`;
  }).join("");
}

// Only public providers with 3+ recommendations; private/on-request are excluded
function renderTopProviders() {
  const groups = {};
  allResults.forEach((r) => {
    const name = (r.providerName || "").trim();
    if (r.providerConsent !== "public" || !name || !r.recommend) return;
    const key = name.toLowerCase() + "|" + r.region;
    (groups[key] = groups[key] || { name, region: r.region, list: [] }).list.push(r);
  });
  const rows = Object.values(groups)
    .filter((g) => g.list.length >= 3)
    .map((g) => ({
      ...g,
      avg: g.list.reduce((t, r) => t + r.rating, 0) / g.list.length,
      success: g.list.filter((r) => r.rating >= 4).length
    }))
    .sort((a, b) => b.list.length - a.list.length || b.avg - a.avg);
  $("top-providers").innerHTML = rows.length
    ? `<table class="provider-table"><thead><tr><th>Provider</th><th>Region</th><th>Recommendations</th><th>Avg rating</th><th>Successful outcomes</th></tr></thead><tbody>${rows.map((g) =>
        `<tr><td>${escapeHTML(g.name)}</td><td>${escapeHTML(g.region)}</td><td>${g.list.length}</td><td>${g.avg.toFixed(1)}</td><td>${g.success}</td></tr>`).join("")}</tbody></table>`
    : "<p class='muted'>No providers have 3 or more public recommendations yet.</p>";
}

/* ---------- 8b. HOME SCREEN ---------- */
function renderHome() {
  // Category buttons
  $("category-list").innerHTML = categories
    .map((c) => `<button class="category-btn" data-category="${c}">${c}</button>`)
    .join("");

  renderBanner();
  $("region-stats").innerHTML = statCardsHTML(statsFor(allResults.filter(inRegion)), true);
  renderWaikato();
  renderTopByRegion();
  renderTopProviders();
  $("recent-title").textContent = "Recent results · " + regionLabel();

  // Recent results: newest first, first 4
  const recent = allResults.filter(inRegion)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  $("recent-list").innerHTML = recent.length
    ? recent.map(cardHTML).join("")
    : "<p class='muted'>Nothing here yet. Be the first to share one!</p>";
}

/* ---------- 8c. NATIONAL INSIGHTS ---------- */
const MIN_N = 3; // minimum reports before a group is ranked
const isSuccess = (r) => r.recommend && r.rating >= 4;
const avgOf = (list, f) => list.reduce((s, r) => s + f(r), 0) / list.length;
const pctOf = (list, f) => Math.round(list.filter(f).length / list.length * 100);

function groupBy(list, keyFn) {
  const g = {};
  list.forEach((r) => { const k = keyFn(r); if (k) (g[k] = g[k] || []).push(r); });
  return Object.entries(g).map(([key, items]) => ({ key, items }));
}

// Horizontal bar list. rows: [{label, value, text, sub}]
function barsHTML(rows, opts = {}) {
  if (!rows.length) return "<p class='muted'>Not enough data yet.</p>";
  const max = Math.max(...rows.map((r) => r.value), 1);
  const ref = opts.ref ? `<span class="ref-line" style="left:${Math.min(opts.ref / max * 100, 100)}%" title="${opts.refLabel}"></span>` : "";
  return `<ol class="ibars">${rows.map((r, i) => `<li>
    <span class="ib-rank">${i + 1}</span>
    <div class="ib-main"><div class="ib-top"><span class="ib-label">${escapeHTML(r.label)}</span><strong>${r.text}</strong></div>
      <div class="ib-track"><div class="ib-fill" style="width:${Math.max(r.value / max * 100, 2)}%"></div>${ref}</div>
      ${r.sub ? `<span class="ib-sub">${r.sub}</span>` : ""}</div></li>`).join("")}</ol>
    ${opts.ref ? `<p class="muted legend"><span class="ref-key"></span>${opts.refLabel}</p>` : ""}`;
}

function renderInsights() {
  const all = allResults;
  if (!all.length) { $("ins-sub").textContent = "No data yet."; return; }
  const nat = { n: all.length, cost: avgOf(all, (r) => r.cost), rec: pctOf(all, (r) => r.recommend), succ: pctOf(all, isSuccess) };
  const latest = all.map((r) => r.date).sort().pop();
  const regions = new Set(all.map((r) => r.region)).size;
  $("ins-sub").textContent = `Aggregated from ${nat.n.toLocaleString("en-NZ")} community-reported outcomes across ${regions} regions. Use it to see what tends to work, what it costs, and where to start.`;
  $("ins-kpis").innerHTML = [
    ["📊", nat.n.toLocaleString("en-NZ"), "reported outcomes"],
    ["✅", nat.succ + "%", "successful outcomes"],
    ["👍", nat.rec + "%", "would recommend"],
    ["💵", money(nat.cost), "average cost"]
  ].map(([i, v, l]) => `<div class="stat"><span class="stat-icon">${i}</span><strong>${v}</strong><span class="stat-label">${l}</span></div>`).join("");

  const confidence = (n) => n >= 10 ? "High" : n >= 5 ? "Medium" : "Low";
  const basis = (n) => `${n} reports · ${confidence(n)} confidence`;

  // Solutions grouped by identical text
  const sols = groupBy(all, (r) => r.solution).filter((g) => g.items.length >= MIN_N)
    .map((g) => ({ ...g, n: g.items.length, succ: pctOf(g.items, isSuccess), cost: avgOf(g.items, (r) => r.cost), cat: g.items[0].category }));

  $("ins-success").innerHTML = barsHTML(sols.sort((a, b) => b.succ - a.succ || b.n - a.n).slice(0, 6)
    .map((s) => ({ label: s.key, value: s.succ, text: s.succ + "%", sub: `${escapeHTML(s.cat)} · ${basis(s.n)} · avg ${money(s.cost)}` })));

  const cats = groupBy(all, (r) => r.category).map((g) => ({ ...g, n: g.items.length }));
  $("ins-recommend").innerHTML = barsHTML(cats.map((g) => ({ label: g.key, rate: pctOf(g.items, (r) => r.recommend), n: g.n }))
    .sort((a, b) => b.rate - a.rate).slice(0, 6)
    .map((g) => ({ label: g.label, value: g.rate, text: g.rate + "%", sub: basis(g.n) })));

  $("ins-cost-cat").innerHTML = barsHTML(cats.map((g) => ({ label: g.key, avg: avgOf(g.items, (r) => r.cost), n: g.n }))
    .sort((a, b) => b.avg - a.avg).map((g) => ({ label: g.label, value: g.avg, text: money(g.avg), sub: `${g.n} reports` })),
    { ref: nat.cost, refLabel: "National average " + money(nat.cost) });

  const regs = groupBy(all, (r) => r.region).filter((g) => g.items.length >= 5);
  $("ins-cost-region").innerHTML = barsHTML(regs.map((g) => ({ label: g.key, avg: avgOf(g.items, (r) => r.cost), n: g.items.length }))
    .sort((a, b) => b.avg - a.avg).map((g) => ({ label: g.label, value: g.avg, text: money(g.avg), sub: `${g.n} reports` })),
    { ref: nat.cost, refLabel: "National average " + money(nat.cost) });

  const provs = groupBy(all.filter((r) => r.providerConsent === "public"), (r) => r.providerType)
    .map((g) => ({ ...g, n: g.items.length, rec: g.items.filter((r) => r.recommend).length }))
    .filter((g) => g.n >= MIN_N).sort((a, b) => b.rec - a.rec);
  $("ins-providers").innerHTML = barsHTML(provs.slice(0, 6).map((g) => ({
    label: g.key, value: g.rec, text: g.rec + " recommended",
    sub: `${Math.round(g.rec / g.n * 100)}% of ${g.n} reports recommend · avg ${avgOf(g.items, (r) => r.rating).toFixed(1)} ★` })));

  // Growth: last 90 days vs the 90 days before, relative to the newest report
  const day = 86400000, end = new Date(latest).getTime();
  const period = (r) => { const age = (end - new Date(r.date).getTime()) / day; return age < 90 ? "now" : age < 180 ? "prev" : null; };
  const growth = cats.map((g) => {
    const now = g.items.filter((r) => period(r) === "now").length, prev = g.items.filter((r) => period(r) === "prev").length;
    return { label: g.key, now, prev, change: prev ? Math.round((now - prev) / prev * 100) : null, diff: now - prev };
  }).filter((g) => g.now + g.prev >= 5 && g.diff > 0).sort((a, b) => b.diff - a.diff || b.now - a.now).slice(0, 6);
  $("ins-growth-note").textContent = "Problem areas reported more often in the latest 90 days than in the 90 days before. Bar shows extra reports.";
  $("ins-growth").innerHTML = barsHTML(growth.map((g) => ({ label: g.label, value: g.diff,
    text: (g.change === null ? "New" : "+" + g.change + "%"), sub: `${g.prev} → ${g.now} reports` })));

  const value = sols.filter((s) => s.succ >= 70)
    .map((s) => ({ ...s, cps: s.cost / (s.succ / 100) })).sort((a, b) => a.cps - b.cps).slice(0, 6);
  $("ins-value").innerHTML = barsHTML(value.map((s) => ({ label: s.key, value: s.cps, text: money(s.cps),
    sub: `${escapeHTML(s.cat)} · ${s.succ}% success · avg ${money(s.cost)} · ${basis(s.n)}` })));

  $("ins-method").textContent = `Based on community-submitted results up to ${latest}. Groups under ${MIN_N} reports are excluded; confidence reflects sample size. Community-shared, not professional advice.`;
}

/* ---------- 9. SEARCH RESULTS SCREEN ---------- */
let currentQuery = "";     // the text being searched
let currentCategory = "";  // the category being browsed (if any)

function runSearch(query, category) {
  currentQuery = query;
  currentCategory = category;
  renderResults();
  showScreen("results");
}

function renderResults() {
  const region = selectedRegion;
  const q = currentQuery.toLowerCase().trim();

  // filter() keeps only the results that match every condition
  const matches = allResults.filter((r) => {
    const text = (r.problem + " " + r.solution + " " + r.category).toLowerCase();
    return (!q || text.includes(q)) &&
           (!currentCategory || r.category === currentCategory) &&
           (!region || r.region === region);
  });

  // Title
  const label = currentCategory || (q ? `"${currentQuery}"` : "All results");
  $("results-title").textContent = `Results for ${label} · ${regionLabel()}`;

  // Summary stats
  if (matches.length === 0) {
    $("results-summary").innerHTML = "";
    $("results-list").innerHTML = "<p class='muted'>No results yet. Be the first to share one!</p>";
    return;
  }
  $("results-summary").innerHTML = statCardsHTML(statsFor(matches), false);

  $("results-list").innerHTML = matches.map(cardHTML).join("");
}

/* ---------- 10. DETAIL SCREEN ---------- */
function providerHTML(r) {
  const hasProvider = r.providerName || r.providerType;
  if (!hasProvider || !r.providerConsent || r.providerConsent === "private") return "";
  if (r.providerConsent === "public") {
    return `<h3>Provider</h3>
      <div class="provider-box">
        ${r.providerName ? `<p><strong>${escapeHTML(r.providerName)}</strong></p>` : ""}
        ${r.providerType ? `<p class="muted">${escapeHTML(r.providerType)}</p>` : ""}
      </div>`;
  }
  const requested = JSON.parse(localStorage.getItem(REQUEST_KEY) || "[]").includes(r.id);
  return `<h3>Provider</h3>
    <div class="provider-box">
      <p>The contributor will share provider details on request.</p>
      ${requested
        ? '<p class="badge-yes">✓ Request sent</p>'
        : `<button class="btn btn-ghost" type="button" data-request-provider="${escapeHTML(r.id)}">Request Provider Details</button>`}
    </div>`;
}


function showDetail(id) {
  const r = allResults.find((item) => item.id === id);
  if (!r) return;
  $("detail-content").innerHTML = `
    <span class="tag">${escapeHTML(r.category)}</span>
    <h2>${escapeHTML(r.problem)}</h2>
    <h3>Region</h3><p>${escapeHTML(r.region)}</p>
    <h3>Solution taken</h3><p>${escapeHTML(r.solution)}</p>
    <h3>Cost</h3><p>${money(r.cost)}</p>
    <h3>Result achieved</h3><p>${escapeHTML(r.outcome)}</p>
    <h3>Would recommend?</h3>
    <p>${r.recommend
        ? '<span class="badge-yes">Yes 👍</span>'
        : '<span class="badge-no">No 👎</span>'}</p>
    <h3>Rating</h3>
    <p class="stars">${starsText(r.rating)} (${r.rating}/5)</p>
    ${providerHTML(r)}`;
  showScreen("detail");
}

/* ---------- 11. SUBMIT FORM ---------- */
/* A 9-step conversational wizard. Each step is a <section class="wiz-step">
   in index.html; only the current one is visible. Progress is auto-saved
   to localStorage so contributors can leave and pick up where they left off. */
const WIZARD_KEY = "rkr-wizard-draft";
const WIZ_TOTAL = 9;
const WIZ_FIELDS = ["problem", "category", "region", "city", "solution", "cost",
                    "outcome", "providerName", "providerType", "tip"]; // simple fields by element id suffix
const WIZ_IDS = { problem: "f-problem", category: "f-category", region: "f-region", city: "f-city",
  solution: "f-solution", cost: "f-cost", outcome: "f-outcome",
  providerName: "f-provider-name", providerType: "f-provider-type", tip: "f-tip" };
let wizStep = 1;

// Per-step validation: returns an error message, or "" when the step is fine
function validateStep(step) {
  const val = (k) => $(WIZ_IDS[k]).value.trim();
  switch (step) {
    case 1: return val("problem").length < 3 ? "Tell us what you were trying to decide (a few words is fine)." : "";
    case 2: return !val("region") ? "Please choose your region."
                  : !val("city") ? "Please enter your city or town." : "";
    case 3: return val("solution").length < 3 ? "Tell us briefly what you did." : "";
    case 4: { const c = $("f-cost").value;
              return c === "" || Number(c) < 0 || !isFinite(Number(c)) ? "Enter an approximate cost in dollars (0 if it was free)." : ""; }
    case 5: return val("outcome").length < 3 ? "Tell us what happened afterwards." : "";
    case 6: return !document.querySelector('input[name="rating"]:checked') ? "Pick the option that fits best." : "";
    default: return ""; // steps 7-9 are optional
  }
}

// Read the whole form into one plain object (also used for auto-save)
function readWizard() {
  const data = { step: wizStep };
  WIZ_FIELDS.forEach((k) => { data[k] = $(WIZ_IDS[k]).value; });
  const rating = document.querySelector('input[name="rating"]:checked');
  data.rating = rating ? Number(rating.value) : null;
  data.consent = document.querySelector('input[name="consent"]:checked').value;
  return data;
}

function saveWizard() {
  try { localStorage.setItem(WIZARD_KEY, JSON.stringify(readWizard())); } catch (e) { /* storage full/blocked: ignore */ }
}

// Put saved answers back into the form and jump to the saved step
function restoreWizard() {
  let data;
  try { data = JSON.parse(localStorage.getItem(WIZARD_KEY) || "null"); } catch (e) { data = null; }
  if (!data) return;
  WIZ_FIELDS.forEach((k) => { if (data[k] != null) $(WIZ_IDS[k]).value = data[k]; });
  if (data.rating) { const r = document.querySelector(`input[name="rating"][value="${data.rating}"]`); if (r) r.checked = true; }
  const c = document.querySelector(`input[name="consent"][value="${data.consent}"]`);
  if (c) c.checked = true;
  wizStep = Math.min(Math.max(Number(data.step) || 1, 1), WIZ_TOTAL);
}

// Show one step, update progress, and animate the change
function goToStep(n, direction) {
  wizStep = n;
  document.querySelectorAll(".wiz-step").forEach((el) => {
    const active = Number(el.dataset.step) === n;
    el.hidden = !active;
    el.classList.remove("slide-fwd", "slide-back");
    if (active) {
      void el.offsetWidth; // restart the CSS animation
      el.classList.add(direction === "back" ? "slide-back" : "slide-fwd");
    }
  });
  const pct = Math.round(((n - 1) / WIZ_TOTAL) * 100); // % of steps already completed
  $("wiz-step-label").textContent = `Step ${n} of ${WIZ_TOTAL}`;
  $("wiz-percent").textContent = `${pct}%`;
  $("wiz-bar-fill").style.width = `${pct}%`;
  $("wiz-bar").setAttribute("aria-valuenow", pct);
  $("wiz-back").style.visibility = n === 1 ? "hidden" : "visible";
  $("wiz-next").textContent = n === WIZ_TOTAL ? "Submit" : (n === 7 && !$("f-provider-name").value.trim() ? "Skip" : "Next");
  document.querySelectorAll(".wiz-error").forEach((e) => (e.textContent = ""));
  saveWizard();
  const heading = document.querySelector(`.wiz-step[data-step="${n}"] h2`);
  if (direction) { window.scrollTo({ top: 0, behavior: "smooth" }); heading.focus({ preventScroll: true }); }
}

// Pick a category from the problem wording when the contributor typed their own
function guessCategory(problem) {
  const t = problem.toLowerCase();
  const rules = [
    [/damp|mould|roof|insulat|house|home|renovat|plumb|rent/, "Home & Property"],
    [/power|electric|solar|energy|gas|heat/, "Power & Utilities"],
    [/car|vehicle|ute|van|warrant|wof|mechanic/, "Cars"],
    [/internet|wifi|fibre|broadband|phone|computer/, "Internet & Technology"],
    [/insur/, "Insurance"], [/doctor|health|physio|dental|medical|gp\b/, "Health"],
    [/course|study|school|uni|learn|degree/, "Education"],
    [/job|career|work|employ/, "Work & Careers"], [/tax|money|loan|mortgage|saving|kiwisaver/, "Money & Tax"]
  ];
  const hit = rules.find(([re]) => re.test(t));
  return hit ? hit[1] : "Lifestyle & Travel";
}

function showWizardError(msg) {
  const el = document.querySelector(`.wiz-step[data-step="${wizStep}"] .wiz-error`);
  el.textContent = msg;
  const input = el.parentElement.querySelector("input:not([type=radio]), select, textarea, input[type=radio]");
  if (input) input.focus({ preventScroll: true });
}

function handleSubmit(event) {
  event.preventDefault(); // stop the page reloading

  // Validate the current step before moving on
  const error = validateStep(wizStep);
  if (error) { showWizardError(error); return; }

  if (wizStep < WIZ_TOTAL) {
    // Auto-pick a category the first time the problem is typed freely
    if (wizStep === 1 && !$("f-category").dataset.touched) $("f-category").value = guessCategory($("f-problem").value);
    goToStep(wizStep + 1, "fwd");
    return;
  }

  // Final step: make sure earlier steps are still valid, then save
  for (let s = 1; s < WIZ_TOTAL; s++) {
    const e = validateStep(s);
    if (e) { goToStep(s, "back"); showWizardError(e); return; }
  }
  const d = readWizard();
  const newResult = {
    id: "user-" + Date.now(),            // unique id from the current time
    region: d.region,
    city: d.city.trim(),
    category: d.category,
    problem: d.problem.trim(),
    solution: d.solution.trim(),
    cost: Number(d.cost),
    outcome: d.outcome.trim(),
    rating: d.rating,                     // 5 = Absolutely ... 1 = Never again
    recommend: d.rating >= 4,             // Absolutely / Probably
    tip: d.tip.trim(),
    providerName: d.providerName.trim(),
    providerType: d.providerType,
    providerConsent: d.consent,
    date: new Date().toISOString().slice(0, 10) // e.g. "2026-10-23"
  };

  // Save to localStorage so it is still there after a refresh
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  saved.push(newResult);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  allResults.push(newResult);

  // Clear the draft and show the thank-you screen
  localStorage.removeItem(WIZARD_KEY);
  $("submit-form").reset();
  $("wizard").classList.add("is-done");
  $("submit-form").hidden = true;
  $("wiz-progress").hidden = true;
  $("wiz-done").hidden = false;
  $("wiz-done").querySelector("h2").focus();
  renderHome();
  renderInsights();
}

// Start (or restart) the wizard whenever the screen is opened
function openWizard() {
  $("wizard").classList.remove("is-done");
  $("submit-form").hidden = false;
  $("wiz-progress").hidden = false;
  $("wiz-done").hidden = true;
  goToStep(wizStep);
}

function setupWizard() {
  restoreWizard();
  // Example chips fill in the problem and topic
  $("problem-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("f-problem").value = chip.dataset.problem;
    $("f-category").value = chip.dataset.category;
    $("f-category").dataset.touched = "1";
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c === chip));
    saveWizard();
  });
  $("f-category").addEventListener("change", () => ($("f-category").dataset.touched = "1"));
  $("wiz-back").addEventListener("click", () => { if (wizStep > 1) goToStep(wizStep - 1, "back"); });
  // Auto-save on every change; clear errors while typing
  $("submit-form").addEventListener("input", () => {
    saveWizard();
    document.querySelectorAll(".wiz-error").forEach((e) => (e.textContent = ""));
    if (wizStep === 7) $("wiz-next").textContent = $("f-provider-name").value.trim() ? "Next" : "Skip";
  });
  $("submit-form").addEventListener("change", saveWizard);
  // Choosing an emoji answer moves things along (feels like a conversation)
  document.querySelectorAll('input[name="rating"]').forEach((r) =>
    r.addEventListener("change", () => setTimeout(() => { if (wizStep === 6) $("submit-form").requestSubmit(); }, 250)));
}

function setRegion(region) {
  selectedRegion = region;
  localStorage.setItem(REGION_KEY, region);
  renderHome();
  if (!$("screen-results").classList.contains("hidden")) renderResults();
}

/* ---------- 12. EVENT LISTENERS ----------
   "Listen" for clicks and form submissions and react to them. */
function setupEvents() {
  // Home search form
  $("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch($("search-input").value, "");
  });

  // Global region selector in the banner
  $("banner-region").addEventListener("change", () => setRegion($("banner-region").value));
  $("waikato-switch").addEventListener("click", () => setRegion("Waikato"));

  // Submit form
  $("submit-form").addEventListener("submit", handleSubmit);

  // One listener for the whole page handles all clicks ("event delegation")
  document.addEventListener("click", (e) => {
    const req = e.target.closest("[data-request-provider]");
    if (req) {
      const id = req.dataset.requestProvider;
      const list = JSON.parse(localStorage.getItem(REQUEST_KEY) || "[]");
      if (!list.includes(id)) list.push(id);
      localStorage.setItem(REQUEST_KEY, JSON.stringify(list));
      showDetail(id);
      return;
    }

    // Navigation buttons (logo, "Share a result", Back)
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      const target = nav.dataset.nav;
      if (target === "insights") { renderInsights(); showScreen("insights"); }
      if (target === "home") { renderHome(); showScreen("home"); }
      if (target === "submit") { showScreen("submit"); openWizard(); }
      if (target === "back") { showScreen(previousScreen); }
      return;
    }

    // Category button
    const cat = e.target.closest("[data-category]");
    if (cat) {
      runSearch("", cat.dataset.category);
      return;
    }

    // Result card -> open detail
    const regionCard = e.target.closest(".region-card h3");
    if (regionCard) { setRegion(regionCard.textContent); return; }

    const card = e.target.closest(".card");
    if (card) {
      // Remember which screen we came from
      previousScreen = $("screen-results").classList.contains("hidden") ? "home" : "results";
      showDetail(card.dataset.id);
    }
  });
}

/* ---------- 13. START THE APP ---------- */
async function init() {
  await loadData();
  fillRegionSelect($("banner-region"), true);
  $("banner-region").options[0].textContent = "All New Zealand";
  fillRegionSelect($("f-region"), false);
  $("f-category").innerHTML = categories.map((c) => `<option>${c}</option>`).join("");
  setupWizard();
  setupEvents();
  renderHome();
  renderInsights();
  showScreen("insights");
}

init(); // run everything
