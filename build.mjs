#!/usr/bin/env node
// Renders content/*.json into the static site at site/.
// Usage: node build.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(ROOT, "content");
const SITE_DIR = join(ROOT, "site");
const SITE_URL = "https://aislopalert.com";

const SEVERITY = {
  1: { class: "sev-1", label: "LEVEL 1 — SLOP ADVISORY" },
  2: { class: "sev-2", label: "LEVEL 2 — SLOP WATCH" },
  3: { class: "sev-3", label: "LEVEL 3 — SLOP WARNING" },
  4: { class: "sev-4", label: "LEVEL 4 — SEVERE SLOP" },
  5: { class: "sev-5", label: "LEVEL 5 — TOTAL SLOPOUT" },
};

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDate = (iso) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });

function loadBulletins() {
  return readdirSync(CONTENT_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse()
    .map((f) => JSON.parse(readFileSync(join(CONTENT_DIR, f), "utf8")));
}

function gauge(level) {
  return [1, 2, 3, 4, 5]
    .map((n) => `<span class="tick ${n <= level ? "on lv" + level : ""}">${n <= level ? "█" : "░"}</span>`)
    .join("");
}

function renderBulletin(b, { number }) {
  const sev = SEVERITY[b.severity_level] ?? SEVERITY[3];
  return `
<article class="bulletin ${sev.class}">
  <div class="meta-line">
    <span>BULLETIN NO. ${number}</span>
    <span>${esc(fmtDate(b.date)).toUpperCase()}</span>
  </div>
  <div class="sev-banner">
    <span class="sev-label">⚠ ${esc(b.severity_name)}</span>
    <span class="sev-gauge" title="${esc(sev.label)}">${gauge(b.severity_level)}</span>
  </div>
  <h2 class="headline">${esc(b.headline)}</h2>
  <p class="advisory">${esc(b.advisory)}</p>

  <section>
    <h3>// REGIONAL OUTLOOK</h3>
    <dl class="outlook">
      ${b.regional_outlook.map((r) => `<dt>${esc(r.region)}</dt><dd>${esc(r.conditions)}</dd>`).join("\n      ")}
    </dl>
  </section>

  <section class="specimen">
    <h3>// SPECIMEN OF THE DAY</h3>
    <p class="specimen-name">${esc(b.specimen.common_name)} <em>(${esc(b.specimen.latin_name)})</em></p>
    <dl class="field-guide">
      <dt>Status</dt><dd>${esc(b.specimen.status)}</dd>
      <dt>Habitat</dt><dd>${esc(b.specimen.habitat)}</dd>
      <dt>Field marks</dt><dd>${esc(b.specimen.field_marks)}</dd>
      <dt>Call</dt><dd class="call">“${esc(b.specimen.call)}”</dd>
      <dt>Not to be confused with</dt><dd>${esc(b.specimen.confusion_species)}</dd>
    </dl>
  </section>

  <section>
    <h3>// SPOTTER TIP</h3>
    <p>${esc(b.spotter_tip)}</p>
  </section>

  <section>
    <h3>// TOMORROW</h3>
    <p>${esc(b.tomorrow)}</p>
  </section>
</article>`;
}

function page({ title, body, depth = 0 }) {
  const p = depth === 0 ? "" : "../".repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Daily satirical bulletins from the National Slop Service. Severity levels, regional outlooks, and a field guide to the AI-generated content drifting across your internet.">
<link rel="stylesheet" href="${p}style.css">
<link rel="alternate" type="application/rss+xml" title="AI Slop Alert" href="${p}feed.xml">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚨</text></svg>">
</head>
<body>
<header class="masthead">
  <a class="home" href="${p}index.html"><h1>AI SLOP ALERT</h1></a>
  <p class="tagline">A SERVICE OF THE NATIONAL SLOP SERVICE · MONITORING THE CONTENT SINCE 2026</p>
  <nav><a href="${p}index.html">TODAY'S BULLETIN</a> · <a href="${p}archive/index.html">ARCHIVE</a> · <a href="${p}feed.xml">RSS</a></nav>
</header>
${body}
<footer>
  <p>The National Slop Service is a fully automated bureau staffed by one (1) artificial intelligence.</p>
  <p>Yes, this bulletin is itself generated daily by an AI. We are aware. The irony is load-bearing — slop detection requires a slop-native informant.</p>
  <p>The Service satirizes patterns of content, not people. No grandmothers, real or phantom, were harmed.</p>
</footer>
</body>
</html>`;
}

// ---- build ----
const bulletins = loadBulletins();
if (bulletins.length === 0) {
  console.error("No bulletins found in content/");
  process.exit(1);
}
const numberOf = (b) => bulletins.length - bulletins.indexOf(b);

mkdirSync(join(SITE_DIR, "archive"), { recursive: true });

// index: latest bulletin
const latest = bulletins[0];
writeFileSync(
  join(SITE_DIR, "index.html"),
  page({
    title: `AI Slop Alert — ${latest.severity_name}, ${fmtDate(latest.date)}`,
    body: renderBulletin(latest, { number: numberOf(latest) }) +
      `\n<p class="archive-link"><a href="archive/index.html">→ BROWSE THE BULLETIN ARCHIVE</a></p>`,
  })
);

// per-bulletin archive pages
for (const b of bulletins) {
  writeFileSync(
    join(SITE_DIR, "archive", `${b.date}.html`),
    page({
      title: `AI Slop Alert — Bulletin No. ${numberOf(b)} (${b.date})`,
      body: renderBulletin(b, { number: numberOf(b) }),
      depth: 1,
    })
  );
}

// archive index
const rows = bulletins
  .map((b) => {
    const sev = SEVERITY[b.severity_level] ?? SEVERITY[3];
    return `<li class="${sev.class}"><a href="${b.date}.html"><span class="a-date">${b.date}</span> <span class="a-sev">${esc(b.severity_name)}</span> <span class="a-head">${esc(b.headline)}</span></a></li>`;
  })
  .join("\n");
writeFileSync(
  join(SITE_DIR, "archive", "index.html"),
  page({
    title: "AI Slop Alert — Bulletin Archive",
    body: `<h2 class="page-title">// BULLETIN ARCHIVE</h2>\n<p class="archive-note">A permanent record of conditions, for future historians of the slop era.</p>\n<ul class="archive-list">\n${rows}\n</ul>`,
    depth: 1,
  })
);

// RSS feed
const items = bulletins
  .slice(0, 30)
  .map(
    (b) => `  <item>
    <title>${esc(`${b.severity_name}: ${b.headline}`)}</title>
    <link>${SITE_URL}/archive/${b.date}.html</link>
    <guid>${SITE_URL}/archive/${b.date}.html</guid>
    <pubDate>${new Date(b.date + "T12:00:00Z").toUTCString()}</pubDate>
    <description>${esc(b.advisory)}</description>
  </item>`
  )
  .join("\n");
writeFileSync(
  join(SITE_DIR, "feed.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>AI Slop Alert</title>
  <link>${SITE_URL}</link>
  <description>Daily bulletins from the National Slop Service.</description>
${items}
</channel>
</rss>
`
);

copyFileSync(join(ROOT, "style.css"), join(SITE_DIR, "style.css"));
writeFileSync(join(SITE_DIR, "CNAME"), "aislopalert.com\n");
writeFileSync(join(SITE_DIR, ".nojekyll"), "");

console.log(`Built ${bulletins.length} bulletin(s) → site/ (latest: ${latest.date})`);
