/* =====================================================
   Real Kiwi Results - insights.js
   Insights Dashboard: patterns and successful outcomes
   across all results. Charts are plain HTML/CSS bars.
   Relies on globals from script.js: allResults, REGIONS,
   $, money, escapeHTML, starsText.
   ===================================================== */

// Problems are free text, so we group them into themes by keyword (first match wins).
const PROBLEM_THEMES = [
  ["Damp & mould", /damp|mould|condensation|moisture/i],
  ["Leaky or damaged roof", /roof|leak|flashing|water stains/i],
  ["Septic & wastewater", /septic|toilet|effluent/i],
  ["Tank & drinking water", /tank|drinking water|running dry/i],
  ["Hot water cylinder failure", /cylinder|hot water/i],
  ["Cold home & poor insulation", /cold|freez|insulat|draught|frost|glazing|heating|heat pump/i],
  ["EV charging & range", /\bEV\b|wallbox|charg|hybrid|leaf/i],
  ["High power bills", /power (bill|price)|electricity|solar|retailer|legacy plan|fixed-term/i],
  ["Slow or patchy internet", /broadband|wifi|router|fibre|streaming|modem|internet|reception|coverage|phone barely/i],
  ["Car repairs, WOF & tyres", /WOF|tyre|brake|suspension|noise from the front|overheat|mechanic|ute|repairs|black ice|dust|grip|import wagon/i],
  ["Insurance cover & claims", /insurance|claim|hail|written off|agreed value/i],
  ["Tax & bookkeeping", /\btax\b|GST|bookkeeping|cashflow/i],
  ["Mortgage, KiwiSaver & saving", /mortgage|fixed rate|loan|bank|KiwiSaver|deposit|renting for years|save for|rates too high/i],
  ["GP access & waits", /\bGP\b|clinic|practice closed|enrol|specialist|scan|public wait/i],
  ["Aches, pain & injury", /pain|knee|shoulder|back|physio/i],
  ["Hearing & other health", /hearing|rash|sleep|sun damage|hay fever|anxiety|health/i],
  ["Study & school challenges", /school|study|student|reading|maths|teen|daughter|son\b|te reo|trades qualification|degree|polytechnic|stress/i],
  ["Career change & job search", /career|retrain|burnout|retail|apprentice|trade|job|role|work|employer|entry-level/i],
  ["Affordable travel & holidays", /holiday|weekend|trip|travel|campervan|accommodation|roam|tourist|break|anniversary|summer/i]
];

// Home improvement investments, matched on the solution text.
const INVESTMENT_THEMES = [
  ["Heat pump", /heat pump/i],
  ["Insulation (ceiling & underfloor)", /insulation|batts|underfloor|ceiling/i],
  ["Double glazing", /glazing/i],
  ["Roof repair & repaint", /roof|flashing|colorsteel|re-seal/i],
  ["Ventilation & dehumidifier", /ventilation|dehumidifier|moisture|extractor|rangehood/i],
  ["Water tank & filtration", /tank|filter|uv/i],
  ["Septic system upgrade", /septic|treatment unit|effluent/i],
  ["Hot water cylinder", /cylinder/i],
  ["Wood or log burner", /burner|wetback/i],
  ["Thermal curtains & draught-proofing", /curtain|draught/i]
];

function problemTheme(r) {
  const hit = PROBLEM_THEMES.find(([, re]) => re.test(r.problem));
  return hit ? hit[0] : "Other · " + r.category;
}

function investmentTheme(r) {
  if (r.category !== "Home & Property") return null;
  const hit = INVESTMENT_THEMES.find(([, re]) => re.test(r.solution));
  return hit ? hit[0] : null;
}

function groupBy(list, keyFn) {
  const map = new Map();
  list.forEach((r) => {
    const k = keyFn(r);
    if (k == null) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return map;
}

const avg = (list, f) => list.reduce((s, r) => s + f(r), 0) / (list.length || 1);
const recPct = (list) => Math.round(list.filter((r) => r.recommend).length / (list.length || 1) * 100);

// Horizontal bar chart. rows: [{label, value, text, sub}]
function barChart(rows, colour) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `<ol class="bar-chart">${rows.map((r) => `
    <li><div class="bar-label"><span>${escapeHTML(r.label)}</span><span class="bar-value">${escapeHTML(r.text)}</span></div>
      <div class="bar-track"><div class="bar-fill ${colour || ""}" style="width:${Math.max(r.value / max * 100, 2)}%"></div></div>
      ${r.sub ? `<small class="muted">${escapeHTML(r.sub)}</small>` : ""}</li>`).join("")}</ol>`;
}

function insightPanel(eyebrow, title, body) {
  return `<div class="panel"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><div class="insight-body">${body}</div></div>`;
}

function renderInsights() {
  const data = allResults;
  const byRegion = groupBy(data, (r) => r.region);
  const regions = REGIONS.filter((r) => byRegion.has(r));

  // Summary cards
  const problems = groupBy(data, problemTheme);
  const topRegionCost = regions.map((g) => [g, avg(byRegion.get(g), (r) => r.cost)]).sort((a, b) => a[1] - b[1])[0];
  const cards = [
    ["📊", data.length, "results analysed"],
    ["👍", recPct(data) + "%", "would recommend"],
    ["⭐", avg(data, (r) => r.rating).toFixed(1) + " ★", "average rating"],
    ["💵", money(avg(data, (r) => r.cost)), "average project cost"],
    ["🗺️", regions.length, "regions covered"],
    ["💡", topRegionCost[0], "lowest average cost (" + money(topRegionCost[1]) + ")"]
  ];
  $("insight-cards").innerHTML = cards.map(([i, v, l]) =>
    `<div class="stat"><span class="stat-icon">${i}</span><strong>${escapeHTML(String(v))}</strong><span class="stat-label">${escapeHTML(l)}</span></div>`).join("");

  // 1. Top 10 most common problems
  const topProblems = [...problems].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
  const p1 = barChart(topProblems.map(([k, l]) => ({
    label: k, value: l.length, text: l.length + " reports",
    sub: recPct(l) + "% found a solution they'd recommend"
  })));

  // 2. Top 10 highest-rated solutions (exact solution, at least 3 reports)
  const sols = [...groupBy(data, (r) => r.solution)].filter(([, l]) => l.length >= 3)
    .map(([k, l]) => ({ k, l, a: avg(l, (r) => r.rating) }))
    .sort((x, y) => y.a - x.a || y.l.length - x.l.length).slice(0, 10);
  const p2 = barChart(sols.map((s) => ({
    label: s.k, value: s.a, text: s.a.toFixed(2) + " ★",
    sub: s.l.length + " reports · avg " + money(avg(s.l, (r) => r.cost)) + " · " + recPct(s.l) + "% recommend"
  })), "gold");

  // 3. Most successful solution by region (best average rating; prefers 2+ reports)
  const p3 = `<div class="region-grid">${regions.map((g) => {
    const list = byRegion.get(g);
    const groups = [...groupBy(list, (r) => r.solution)].map(([k, l]) => ({ k, l, a: avg(l, (r) => r.rating), rec: recPct(l) }));
    const pool = groups.some((s) => s.l.length >= 2) ? groups.filter((s) => s.l.length >= 2) : groups;
    const best = pool.sort((x, y) => y.a - x.a || y.rec - x.rec || y.l.length - x.l.length)[0];
    return `<div class="insight-card"><div class="region-head"><h3>${escapeHTML(g)}</h3><span class="muted">${list.length} results</span></div>
      <p>${escapeHTML(best.k)}</p><p class="meta"><span class="stars">${starsText(best.a)}</span> ${best.a.toFixed(1)} · ${best.l.length} report${best.l.length === 1 ? "" : "s"}</p></div>`;
  }).join("")}</div>`;

  // 4. Average project cost by region
  const costs = regions.map((g) => ({ g, c: avg(byRegion.get(g), (r) => r.cost) })).sort((a, b) => b.c - a.c);
  const p4 = barChart(costs.map((x) => ({ label: x.g, value: x.c, text: money(x.c) })), "blue");

  // 5. Most recommended provider categories (public providers only, respecting consent)
  const provs = [...groupBy(data.filter((r) => r.providerConsent === "public" && r.providerType), (r) => r.providerType)]
    .map(([k, l]) => ({ k, n: l.filter((r) => r.recommend).length, total: l.length, a: avg(l, (r) => r.rating) }))
    .sort((a, b) => b.n - a.n);
  const p5 = barChart(provs.map((x) => ({
    label: x.k, value: x.n, text: x.n + " recommendations",
    sub: `${Math.round(x.n / x.total * 100)}% of ${x.total} public provider reports · avg ${x.a.toFixed(1)} ★`
  })), "gold");

  // 6. Top home improvement investments by recommendation rate
  const inv = [...groupBy(data, investmentTheme)].filter(([, l]) => l.length >= 4)
    .map(([k, l]) => ({ k, l, rate: recPct(l) }))
    .sort((a, b) => b.rate - a.rate || b.l.length - a.l.length).slice(0, 10);
  const p6 = barChart(inv.map((x) => ({
    label: x.k, value: x.rate, text: x.rate + "% recommend",
    sub: x.l.length + " reports · avg " + money(avg(x.l, (r) => r.cost)) + " · " + avg(x.l, (r) => r.rating).toFixed(1) + " ★"
  })));

  // 7. Most common problems by region (top 3 themes each)
  const p7 = `<div class="region-grid">${regions.map((g) => {
    const top = [...groupBy(byRegion.get(g), problemTheme)].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
    return `<div class="insight-card"><div class="region-head"><h3>${escapeHTML(g)}</h3></div>
      <ul class="chip-list">${top.map(([k, l]) => `<li><span>${escapeHTML(k)}</span><b>${l.length}</b></li>`).join("")}</ul></div>`;
  }).join("")}</div>`;

  $("insight-panels").innerHTML = [
    insightPanel("Patterns", "1. Top 10 most common problems across New Zealand", p1),
    insightPanel("Successful outcomes", "2. Top 10 highest-rated solutions", p2 + "<p class='muted'>Solutions with at least 3 reports.</p>"),
    insightPanel("Local wins", "3. Most successful solution by region", p3),
    insightPanel("Budgeting", "4. Average project cost by region", p4),
    insightPanel("Public providers only", "5. Most recommended provider categories", p5 + "<p class='muted'>Only results where the author chose to show the provider publicly.</p>"),
    insightPanel("Worth the spend", "6. Top home improvement investments by recommendation rate", p6 + "<p class='muted'>Home &amp; Property results, themes with at least 4 reports.</p>"),
    insightPanel("Local patterns", "7. Most common problems by region", p7)
  ].join("");
}
