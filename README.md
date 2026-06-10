# 🚨 AI Slop Alert — aislopalert.com

Daily satirical bulletins from the **National Slop Service**: a deadpan, National-Weather-Service-style alert system for the AI-generated content washing over the internet. Each day brings a severity level, an advisory, a regional outlook (the LinkedIn Plateau, the Facebook Delta…), a field-guide **Specimen of the Day**, a spotter tip, and a forecast. The bulletin is itself generated daily by an AI. The irony is load-bearing.

## How it works

```
generate.mjs  →  content/YYYY-MM-DD.json   (calls the Claude API, structured output)
build.mjs     →  site/                     (static HTML: today + archive + RSS)
.github/workflows/daily.yml                (daily cron: generate → commit → deploy to Pages)
```

- **Content** lives as one JSON file per day in `content/` — that's the permanent archive.
- **Site** is rebuilt from scratch on every run; `site/` is not committed.
- The generator passes the last 10 bulletins back to the model so specimens and jokes don't repeat, and its system prompt enforces the editorial line: satirize content *patterns* and platform incentives, never people; no hate, no politics, no punching down.

## Local usage

```sh
npm install
node generate.mjs              # needs ANTHROPIC_API_KEY; writes today's bulletin
node generate.mjs 2026-06-10   # specific date; add --force to overwrite
node build.mjs                 # renders site/
npx serve site                 # preview at localhost:3000
```

## Deploying (one-time setup)

1. Create a GitHub repo and push this directory to `main`.
2. Repo **Settings → Secrets and variables → Actions** → add secret `ANTHROPIC_API_KEY`.
3. Repo **Settings → Pages** → Source: **GitHub Actions**.
4. Run the **Daily bulletin** workflow once manually (Actions tab → Run workflow) to verify generate + deploy.
5. Point DNS for `aislopalert.com` at GitHub Pages:
   - `A` records on the apex: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - optional `CNAME` for `www` → `<your-username>.github.io`
   - Repo **Settings → Pages** → Custom domain: `aislopalert.com` → enable **Enforce HTTPS** once the cert issues.
   - The build already emits a `CNAME` file, so the custom domain survives every deploy.

After that, the cron (11:00 UTC daily) issues a new bulletin, commits it to `content/`, and redeploys — no further action needed. Pushes to `main` redeploy the site without generating a new bulletin.

## Editorial standards of the National Slop Service

- Punch at patterns, never people. The audience is the resident, not the rube.
- No hate speech, bigotry, racism, sexism, violence, or demeaning content.
- No real individuals; no politics; clean enough to read aloud at work.
- Severity Level 5 (**TOTAL SLOPOUT**) is reserved for genuine emergencies, like a holiday.
