# SentinelDev

> **Autonomous Lifecycle & Blast-Radius Engine** — IBM Bob 2.0 Hackathon

SentinelDev is a TypeScript/Node.js multi-agent backend that automates three critical developer workflows through deterministic static analysis:

| Agent | Workflow | Technique |
|---|---|---|
| **BlastRadiusAuditor** | Deep PR Review & Call-Graph Mapping | `ts-morph` AST reference traversal |
| **AutoRemediator** | CVE / Dependency Remediation | `ts-morph` in-place callee rewriting |
| **DocuSync** | OpenAPI & README Reconciliation | `ts-morph` route extraction + `js-yaml` |

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
├── src/
│   ├── index.ts                   # CLI entry point
│   ├── orchestrator.ts            # Root orchestrator
│   ├── types/index.ts             # All domain types & interfaces
│   ├── agents/
│   │   ├── blastRadiusAuditor.ts
│   │   ├── autoRemediator.ts
│   │   └── docuSync.ts
│   └── services/
│       ├── blastRadiusService.ts
│       ├── cveRemediationService.ts
│       └── docuSyncService.ts
├── mock-target/                   # Demo testbed
│   ├── src/
│   │   ├── lib/crypto-utils.ts    # Shim: encryptMD5 (deprecated) → encryptSHA256
│   │   ├── userService.ts         # Calls encryptMD5
│   │   ├── reportService.ts       # Calls encryptMD5
│   │   └── api.ts                 # Express routes: GET /users, POST /report
│   └── openapi.yaml               # Intentionally missing POST /report
├── triggers/
│   ├── cve-trigger.json
│   └── gitdiff-trigger.json
└── package.json
```

---

## Quick Start

```bash
npm install

# Run the full CVE demo pipeline against mock-target/
npm run demo

# Run with a custom trigger file
npm run dev -- --trigger triggers/cve-trigger.json
npm run dev -- --trigger triggers/gitdiff-trigger.json

# Build to dist/
npm run build
npm start -- --demo
```

The `npm run demo` script seeds a clean copy of `mock-target/` before executing so the pipeline is **fully idempotent** — re-run as many times as needed.

---

## Domain Types

| Type | Key Fields |
|---|---|
| `BlastRadiusResult` | `impactedFiles`, `callGraphTree`, `blastRadiusScore: LOW\|MED\|CRITICAL`, `breakingSignatures` |
| `CVERemediationPlan` | `packageName`, `currentVersion`, `targetVersion`, `deprecatedMethods`, `callSitesRefactored`, `patch` |
| `SpecSyncResult` | `updatedEndpoints`, `schemaDiff`, `specPath`, `readmePatch` |
| `PipelineReport` | `trigger`, `blastRadius`, `remediation`, `docSync`, `completedAt` |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/users` | Returns user list with hashed IDs |
| `POST` | `/report` | Generates a signed report |

---

## CVE Demo Scenario

The demo targets a fictional vulnerability in `crypto-utils@1.2.0`:

- **CVE-2024-DEMO01** — `encryptMD5()` uses MD5 which is cryptographically broken
- **Deprecated:** `encryptMD5(data: string): string`
- **Safe replacement:** `encryptSHA256(data: string): string`
- **Call sites affected:** `userService.ts` (line ~8), `reportService.ts` (line ~7)
- **OpenAPI gap:** `POST /report` is missing from `openapi.yaml`

After `npm run demo`, all three issues are resolved and the `PipelineReport` shows the full audit trail.
