/* =====================================================
   Real Kiwi Results - script.js
   Handles loading data, switching screens, searching,
   filtering and submitting new results.
   ===================================================== */

/* ---------- 1. CONSTANTS ---------- */
// The ten regions shown in dropdowns
const REGIONS = ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Taranaki",
                 "Hawke's Bay", "Wellington", "Canterbury", "Otago", "Southland"];

// Key used to store user-submitted results in the browser
const STORAGE_KEY = "rkr-user-results";

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
    select.innerHTML += `<option value="${r}">${r}</option>`;
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
  $("recent-title").textContent = "Recent results · " + regionLabel();

  // Recent results: newest first, first 4
  const recent = allResults.filter(inRegion)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  $("recent-list").innerHTML = recent.length
    ? recent.map(cardHTML).join("")
    : "<p class='muted'>Nothing here yet. Be the first to share one!</p>";
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
    <p class="stars">${starsText(r.rating)} (${r.rating}/5)</p>`;
  showScreen("detail");
}

/* ---------- 11. SUBMIT FORM ---------- */
function handleSubmit(event) {
  event.preventDefault(); // stop the page reloading

  const newResult = {
    id: "user-" + Date.now(),            // unique id from the current time
    region: $("f-region").value,
    category: $("f-category").value,
    problem: $("f-problem").value.trim(),
    solution: $("f-solution").value.trim(),
    cost: Number($("f-cost").value),
    outcome: $("f-outcome").value.trim(),
    recommend: document.querySelector('input[name="recommend"]:checked').value === "yes",
    rating: Number($("f-rating").value),
    date: new Date().toISOString().slice(0, 10) // e.g. "2026-10-23"
  };

  // Save to localStorage so it is still there after a refresh
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  saved.push(newResult);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

  allResults.push(newResult);
  $("submit-form").reset();
  renderHome();
  alert("Thanks for sharing! Your result has been added.");
  showDetail(newResult.id);
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
    // Navigation buttons (logo, "Share a result", Back)
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      const target = nav.dataset.nav;
      if (target === "home") { renderHome(); showScreen("home"); }
      if (target === "submit") { showScreen("submit"); }
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
  setupEvents();
  renderHome();
  showScreen("home");
}

init(); // run everything
