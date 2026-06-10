#!/usr/bin/env node
// Generates today's bulletin via the Claude API and writes content/YYYY-MM-DD.json.
// Usage: node generate.mjs [YYYY-MM-DD] [--force]
// Requires ANTHROPIC_API_KEY in the environment.

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(ROOT, "content");

const args = process.argv.slice(2);
const force = args.includes("--force");
const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const today = dateArg ?? new Date().toISOString().slice(0, 10);
const outPath = join(CONTENT_DIR, `${today}.json`);

if (existsSync(outPath) && !force) {
  console.log(`Bulletin for ${today} already exists. Use --force to regenerate.`);
  process.exit(0);
}

// Recent bulletins, so the model avoids repeating itself.
const recent = readdirSync(CONTENT_DIR)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .slice(-10)
  .map((f) => JSON.parse(readFileSync(join(CONTENT_DIR, f), "utf8")));

const recentSummary = recent
  .map(
    (b) =>
      `- ${b.date} [L${b.severity_level} ${b.severity_name}] headline: "${b.headline}" | specimen: ${b.specimen.common_name} (${b.specimen.latin_name})`
  )
  .join("\n");

const BULLETIN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "severity_level", "severity_name", "headline", "advisory",
    "regional_outlook", "specimen", "spotter_tip", "tomorrow",
  ],
  properties: {
    severity_level: { type: "integer", enum: [1, 2, 3, 4, 5] },
    severity_name: {
      type: "string",
      description:
        "All-caps NWS-style severity name matching the level, e.g. SLOP ADVISORY (1), SLOP WATCH (2), HEAVY SLOP WARNING (3), SEVERE SLOP WARNING (4), TOTAL SLOPOUT EMERGENCY (5). May include a short flourish.",
    },
    headline: { type: "string", description: "All-caps wire-service headline, one sentence." },
    advisory: { type: "string", description: "2-4 sentences of deadpan bureaucratic advisory prose." },
    regional_outlook: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["region", "conditions"],
        properties: {
          region: { type: "string" },
          conditions: { type: "string", description: "1-2 sentences, weather-report register." },
        },
      },
    },
    specimen: {
      type: "object",
      additionalProperties: false,
      required: ["common_name", "latin_name", "status", "habitat", "field_marks", "call", "confusion_species"],
      properties: {
        common_name: { type: "string", description: "Field-guide common name of a slop species, e.g. 'The Phantom Grandmother'." },
        latin_name: { type: "string", description: "Mock Latin binomial." },
        status: { type: "string" },
        habitat: { type: "string" },
        field_marks: { type: "string" },
        call: { type: "string", description: "A verbatim example 'call' — a quote in the species' voice. No surrounding quote marks." },
        confusion_species: { type: "string", description: "The benign human-made thing it can be confused with, and how to tell them apart." },
      },
    },
    spotter_tip: { type: "string", description: "One practical, funny tip for identifying slop in the wild." },
    tomorrow: { type: "string", description: "One-line forecast for tomorrow's conditions." },
  },
};

const SYSTEM = `You are the sole staff writer of the National Slop Service, the bureau behind aislopalert.com. Every day you issue one bulletin about "AI slop" — the tide of low-effort AI-generated content washing over the internet — written as a pitch-perfect parody of a National Weather Service alert: deadpan, bureaucratic, officially calm in the face of absurdity.

VOICE
- Dry, precise, institutional. The comedy comes from treating ridiculous content phenomena with meteorological seriousness ("a slow-moving system of broetry", "listicle debris").
- Sharp wit, never mean. Punch at PATTERNS of content and platform incentives — never at individuals, groups, or ordinary people who fall for slop. Readers who got fooled are "residents" to be protected, not mocked.
- The Service is itself an AI and knows it. An occasional sly self-aware aside is welcome, but at most one per bulletin.

HARD RULES
- Never name real private individuals. Avoid real public figures entirely.
- No hate speech, bigotry, racism, sexism, violence, or demeaning content of any kind. No politics, religion-bashing, or tragedy-of-the-day material.
- Religious-themed slop (e.g. the crustacean-messiah genre) may be referenced as a content phenomenon; the joke targets the engagement farming, never the faith.
- Keep it clean enough to read aloud at work.

STRUCTURE NOTES
- regional_outlook: exactly 5 regions, drawn from (or in the spirit of) this atlas: The LinkedIn Plateau, The Facebook Delta, The Search Results Basin, The X Badlands, The YouTube Shorts Gorge, The Inbox Estuary, The Pinterest Shallows, The Spotify Lowlands, The Etsy Hollows, The App Store Flats, The Kindle Drifts. Vary the selection day to day; you may coin a new region if conditions warrant.
- specimen: one field-guide entry for a recognizable slop species (a content pattern, a cliché phrase, a fake-persona genre). Make it FRESH — never reuse or closely echo a specimen from the recent bulletins provided.
- severity_level: vary realistically across days (mostly 2-4; reserve 5 for special occasions and 1 for rare quiet days). Severity name must match the level.
- Headlines in all caps, wire-service style.
- Em dash jokes are permitted. The Service is aware of the optics.`;

const userPrompt = `Issue the bulletin for ${today} (${new Date(today + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}).

Recent bulletins — do NOT repeat these specimens, headlines, or central jokes:
${recentSummary || "(none yet)"}

Pick a fresh angle on the slop phenomenon of the day and write the full bulletin.`;

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  system: SYSTEM,
  messages: [{ role: "user", content: userPrompt }],
  output_config: { format: { type: "json_schema", schema: BULLETIN_SCHEMA } },
});

const text = response.content.find((b) => b.type === "text")?.text;
if (!text) {
  console.error("No text block in response:", JSON.stringify(response, null, 2));
  process.exit(1);
}

const bulletin = { date: today, ...JSON.parse(text) };
writeFileSync(outPath, JSON.stringify(bulletin, null, 2) + "\n");
console.log(`Wrote ${outPath} — L${bulletin.severity_level} ${bulletin.severity_name}: ${bulletin.headline}`);
