# SentinelDev

> **Autonomous Lifecycle & Blast-Radius Engine** — IBM Bob 2.0 Hackathon

SentinelDev is a TypeScript/Node.js multi-agent backend that automates three critical developer workflows through deterministic static analysis — with a live web dashboard, GitHub Actions CI/CD integration, and NPX CLI.

| Agent | Workflow | Technique |
|---|---|---|
| **BlastRadiusAuditor** | Deep PR Review & Call-Graph Mapping | `ts-morph` AST reference traversal |
| **AutoRemediator** | CVE / Dependency Remediation | `ts-morph` in-place callee rewriting |
| **DocuSync** | OpenAPI & README Reconciliation | `ts-morph` route extraction + `js-yaml` |

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/sentineldev
cd sentineldev
npm install

# Launch the interactive dashboard
npm run ui
# → http://localhost:3000

# Run the full CVE demo pipeline (CLI)
npm run demo

# NPX global usage (after npm link or npm install -g sentineldev)
sentineldev ui
sentineldev audit ./my-project
sentineldev cve   ./my-project
```

---

## Architecture

```
Trigger (CVE_ADVISORY or GIT_DIFF)
        │
        ▼
  Orchestrator  ──► AutoRemediator  ──► BlastRadiusAuditor  ──► DocuSync
                         │                      │                    │
                CVERemediationPlan       BlastRadiusResult     SpecSyncResult
                         │                      │                    │
                         └──────────────────────┴────────────────────┘
                                                │
                                         PipelineReport (JSON)
                                                │
                              ┌─────────────────┴──────────────────┐
                              ▼                                     ▼
                    sentinel-report.html              sentinel-pr-comment.md
```

### Pipeline Sequencing

**CVE_ADVISORY trigger:**
1. `AutoRemediator` — locates all call sites of the deprecated method and rewrites them in-place
2. `BlastRadiusAuditor` — analyses the call graph of the now-mutated files
3. `DocuSync` — reconciles `openapi.yaml` against the current route definitions

**GIT_DIFF trigger:**
1. `BlastRadiusAuditor` — analyses the call graph of the changed files
2. `DocuSync` — reconciles `openapi.yaml` against current routes

---

## Project Structure

```
sentineldev/
├── bin/
│   └── sentineldev.js             # NPX/global CLI entry point
├── src/
│   ├── index.ts                   # CLI entry point
│   ├── app.ts                     # HTTP server (dashboard + API)
│   ├── orchestrator.ts            # Root orchestrator
│   ├── seed.ts                    # Idempotent mock-target reset
│   ├── types/index.ts             # All domain types & interfaces
│   ├── agents/
│   │   ├── blastRadiusAuditor.ts
│   │   ├── autoRemediator.ts
│   │   └── docuSync.ts
│   ├── services/
│   │   ├── blastRadiusService.ts
│   │   ├── cveRemediationService.ts
│   │   ├── docuSyncService.ts
│   │   ├── gitService.ts
│   │   └── repoIngestionService.ts
│   ├── reporters/
│   │   ├── htmlReporter.ts
│   │   └── prCommentReporter.ts
│   └── public/
│       ├── index.html             # Dashboard UI
│       └── app.js                 # Client-side controller
├── mock-target/                   # Demo testbed
│   ├── src/
│   │   ├── lib/crypto-utils.ts    # Shim: encryptMD5 (deprecated) → encryptSHA256
│   │   ├── userService.ts
│   │   ├── reportService.ts
│   │   └── api.ts
│   └── openapi.yaml
├── .github/
│   └── workflows/
│       └── sentineldev-audit.yml  # GitHub Actions CI/CD bot
├── triggers/
│   ├── cve-trigger.json
│   └── gitdiff-trigger.json
└── package.json
```

---

## Web Dashboard

```bash
npm run ui
# Opens http://localhost:3000
```

The dashboard provides:
- **Control Panel** — one-click CVE and blast-radius audit against local path
- **External Repo Audit** — GitHub URL clone or ZIP upload for any repository
- **Sample Scenarios** — pre-built demo flows with one click (no repo required)
- **Interactive Call Graph** — live Mermaid.js call tree from real AST data
- **Patch Diff Viewer** — syntax-coloured before/after unified diff
- **Spec Drift Tab** — OpenAPI endpoint change table + YAML diff
- **Live Terminal** — synthesised agent-by-agent pipeline logs

---

## GitHub Actions CI/CD Integration

SentinelDev ships a ready-to-use GitHub Actions workflow that **automatically audits every pull request** and posts the risk report as a PR comment.

### Add to Your Repository

**Option A — Copy the workflow file:**

```bash
mkdir -p .github/workflows
curl -o .github/workflows/sentineldev-audit.yml \
  https://raw.githubusercontent.com/your-org/sentineldev/main/.github/workflows/sentineldev-audit.yml
```

**Option B — Reference from npm:**

Add this workflow file to `.github/workflows/sentineldev-audit.yml` in your repository:

```yaml
name: SentinelDev Audit

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main, master]

permissions:
  contents: read
  pull-requests: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install SentinelDev
        run: npm install -g sentineldev

      - name: Run Audit
        run: sentineldev audit ${{ github.workspace }}
        env:
          SENTINELDEV_BASE_SHA: ${{ github.event.pull_request.base.sha }}

      - name: Post PR Comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('sentinel-pr-comment.md', 'utf8');
            const MARKER = '<!-- sentineldev-audit-comment -->';
            const { data: comments } = await github.rest.issues.listComments({
              ...context.repo, issue_number: context.issue.number, per_page: 100
            });
            const existing = comments.find(c => c.body?.includes(MARKER));
            const fullBody = `${MARKER}\n${body}`;
            if (existing) {
              await github.rest.issues.updateComment({
                ...context.repo, comment_id: existing.id, body: fullBody
              });
            } else {
              await github.rest.issues.createComment({
                ...context.repo, issue_number: context.issue.number, body: fullBody
              });
            }
```

### What the Bot Reports

Every PR comment includes:

| Section | Detail |
|---|---|
| 🟢/🟡/🔴 Risk Score | `LOW`, `MED`, or `CRITICAL` blast radius |
| Call Sites Patched | Number of deprecated API calls rewritten |
| Files Impacted | Transitive callers in the blast radius |
| Breaking Signatures | Functions at risk of breakage |
| OpenAPI Drift | Missing or changed endpoint documentation |
| Unified Diff | Exact before/after code changes |

---

## NPX / Global CLI

```bash
# Test locally
npm run build
npm link

sentineldev --help
sentineldev ui                    # Start dashboard → http://localhost:3000
sentineldev ui --port 8080        # Custom port
sentineldev audit ./my-project    # GIT_DIFF blast-radius audit
sentineldev cve   ./my-project    # CVE remediation pipeline

npm unlink sentineldev            # Remove global link

# Publish
npm publish                       # prepublishOnly runs build automatically
```

---

## Domain Types

| Type | Key Fields |
|---|---|
| `BlastRadiusResult` | `impactedFiles`, `callGraphTree`, `blastRadiusScore: LOW\|MED\|CRITICAL`, `breakingSignatures` |
| `CVERemediationPlan` | `packageName`, `currentVersion`, `targetVersion`, `deprecatedMethods`, `callSitesRefactored`, `patch` |
| `SpecSyncResult` | `updatedEndpoints`, `schemaDiff`, `specPath`, `readmePatch` |
| `PipelineReport` | `trigger`, `blastRadius`, `remediation`, `docSync`, `completedAt` |

---

## CVE Demo Scenario

The demo targets a fictional vulnerability in `crypto-utils@1.2.0`:

- **CVE-2024-DEMO01** — `encryptMD5()` uses MD5 which is cryptographically broken
- **Deprecated:** `encryptMD5(data: string): string`
- **Safe replacement:** `encryptSHA256(data: string): string`
- **Call sites affected:** `userService.ts`, `reportService.ts`
- **OpenAPI gap:** `POST /report` missing from `openapi.yaml`

After `npm run demo` (or clicking **Run CVE Pipeline** in the dashboard), all three issues are resolved and the `PipelineReport` shows the full audit trail. The `mock-target/` directory is automatically seeded fresh before each run — fully idempotent.

---

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Dashboard server port |
| `SENTINELDEV_CWD` | `process.cwd()` | Default project root when launched via `sentineldev ui` |
| `SENTINELDEV_BASE_SHA` | `HEAD~1` | Git base SHA for diff computation in CI |
| `DEBUG` | — | Set to any value to enable stack traces on error |

---

*Made with [IBM Bob](https://www.ibm.com/products/watsonx-code-assistant) · IBM Bob 2.0 Hackathon*
