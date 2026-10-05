# 🛡️ SentinelDev

> **Autonomous Lifecycle & Blast-Radius Engine**  
> *Developed for the IBM Bob 2.0 Hackathon — Autonomous Developer Tooling Track*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.3-61dafb.svg?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-orange.svg?logo=google)](https://ai.google.dev/)
[![ts-morph](https://img.shields.io/badge/AST-ts--morph_v22-3178c6.svg)](https://ts-morph.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📑 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [The Core Problem & Innovation](#-the-core-problem--innovation)
3. [System Architecture](#-system-architecture)
4. [Multi-Agent Core Engine](#-multi-agent-core-engine)
   - [AutoRemediator (CVE Remediation)](#1-autoremediator--cve-remediation)
   - [BlastRadiusAuditor (Call-Graph & Risk Scoring)](#2-blastradiusauditor--ast-blast-radius-auditing)
   - [DocuSync (OpenAPI & Documentation Reconciliation)](#3-docusync--contract--documentation-synchronization)
5. [AI Executive Guardian (Google Gemini)](#-ai-executive-guardian-google-gemini)
6. [Repository Ingestion & Sandboxing](#-repository-ingestion--sandboxing-engine)
7. [Interactive Web Dashboard & UI](#-interactive-web-dashboard--ui)
8. [CLI & NPX Global Binary](#-cli--npx-global-binary)
9. [GitHub Actions CI/CD Integration](#-github-actions-cicd-integration)
10. [REST API Reference](#-rest-api-reference)
11. [Deterministic Mock Testbed (`mock-target`)](#-deterministic-mock-testbed-mock-target)
12. [Domain Models & TypeScript Interfaces](#-domain-models--typescript-interfaces)
13. [Project Directory Layout](#-project-directory-layout)
14. [Getting Started & Installation](#-getting-started--installation)
15. [Configuration & Environment Variables](#-configuration--environment-variables)
16. [NPM Scripts Cheatsheet](#-npm-scripts-cheatsheet)
17. [Verification & Walkthrough Guide](#-verification--walkthrough-guide)

---

## 🌟 Executive Summary

**SentinelDev** is an enterprise-grade autonomous developer lifecycle and blast-radius engine. Built natively in TypeScript, it combines **deterministic Abstract Syntax Tree (AST) static analysis** with **Google Gemini generative intelligence** to automatically triage, remediate, audit, and document codebase changes across the pull-request lifecycle.

Traditional developer tooling (e.g., Dependabot, Snyk, CodeQL) stops at detection: they create issues or PRs that bump version strings, leaving broken method calls, undocumented contract drift, and unmapped downstream breakages for human engineers to untangle. 

**SentinelDev closes the loop autonomously in seconds:**
- **Rewrites deprecated or vulnerable API calls in-place** without human intervention or breaking arguments.
- **Walks the real TypeScript compiler call graph** up to 3 levels deep to score downstream blast radius.
- **Introspects route handler registrations** to reconcile missing or altered endpoints against `openapi.yaml` and `README.md`.
- **Synthesizes executive risk summaries** using Google Gemini for automated PR comments and security triage.
- **Audits any repository** via local paths, GitHub HTTPS clones, or ZIP archive uploads inside ephemeral, isolated sandboxes.

---

## 💡 The Core Problem & Innovation

Modern engineering teams ship dozens of pull requests daily, constantly hitting three critical engineering bottlenecks:

| Bottleneck | Real-World Impact | How SentinelDev Solves It |
|---|---|---|
| **1. Hidden Blast Radius** | Changing a single function signature can break dozens of downstream microservices and modules. Manual PR reviews miss transitive caller chains. | Uses `ts-morph` compiler bindings (`findReferencesAsNodes`) to trace the true call hierarchy up to 3 levels deep, identifying every affected file and leaf-node breaking signature. |
| **2. CVE Remediation Lag** | When a library deprecates a function or issues a critical security advisory, engineers spend hours searching and refactoring call sites manually. | Surgically mutates AST `CallExpression` nodes in-place—swapping identifiers or property accesses while leaving arguments and logic intact. |
| **3. API Spec & Contract Drift** | Backend engineers add or alter routes, but forget to update OpenAPI specifications and documentation, leading to client breakages. | Statically parses Express/HTTP route registrations, detects unrecorded endpoints, generates OpenAPI 3.0.3 path schemas, and updates `README.md` endpoint tables. |

### Comparison: Traditional Tooling vs. SentinelDev

```
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│     Traditional CI/CD Tools     │      │        SentinelDev Engine       │
│    (Dependabot / Snyk / Linters)│      │   (Autonomous Lifecycle Engine) │
├─────────────────────────────────┤      ├─────────────────────────────────┤
│ ❌ Raises alert / opens bump PR │      │ ✅ Surgically rewrites callsite │
│ ❌ Fails build on missing method│      │ ✅ Reconciles caller signatures │
│ ❌ Ignores downstream callers   │      │ ✅ AST call graph mapped (depth)│
│ ❌ Stale documentation & specs  │      │ ✅ Auto-updates OpenAPI/README  │
│ ❌ Generic changelog text       │      │ ✅ AI PR Risk Executive Summary │
│ ⏱️ Resolution: 2–8 Hours/issue │      │ ⏱️ Resolution: < 30 Seconds    │
└─────────────────────────────────┘      └─────────────────────────────────┘
```

---

## 🏛️ System Architecture

SentinelDev follows a strictly decoupled, sequential multi-agent architecture to prevent race conditions during file mutations:

```
                          ┌──────────────────────────┐
                          │      Trigger Ingestion   │
                          │ (CVE Advisory / Git Diff)│
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │    Root Orchestrator     │
                          │   (src/orchestrator.ts)  │
                          └─────────────┬────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │ (If CVE_ADVISORY)        │                          │ (Always)
             ▼                          ▼                          ▼
   ┌────────────────────┐    ┌────────────────────┐     ┌────────────────────┐
   │   AutoRemediator   │    │ BlastRadiusAuditor │     │      DocuSync      │
   │  (In-place callee  ├───►│ (ts-morph AST call ├───► │ (Express router    │
   │   AST refactoring) │    │  graph traversal)  │     │  spec & doc sync)  │
   └─────────┬──────────┘    └─────────┬──────────┘     └─────────┬──────────┘
             │                         │                          │
      CVERemediationPlan        BlastRadiusResult             SpecSyncResult
             │                         │                          │
             └─────────────────────────┼──────────────────────────┘
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │   PipelineReport (JSON)  │
                          └────────────┬─────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│    Reporter Engine (Local)    │               │  Google Gemini AI Guardian    │
│  - sentinel-report.html       │               │  - Executive PR Briefing      │
│  - sentinel-pr-comment.md     │               │  - Contract Drift Triage      │
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │                                               │
                ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│   Interactive Web Dashboard   │               │   GitHub Actions CI/CD Bot    │
│   (Vite + React 19 + Mermaid) │               │   (Automated PR Markdown Bot) │
└───────────────────────────────┘               └───────────────────────────────┘
```

### Execution Sequencing Guarantee
1. **Stage 1 — AutoRemediator**: If triggered by a CVE advisory, the AST mutator updates the codebase on disk first.
2. **Stage 2 — BlastRadiusAuditor**: Operates against the newly mutated files or git diff files, building the exact call tree of changed symbols.
3. **Stage 3 — DocuSync**: Scans router definitions across the project, detecting newly introduced or altered endpoints and writing changes directly to `openapi.yaml` and `README.md`.
4. **Stage 4 — Report Generation**: Emits deterministic JSON, generates self-contained interactive HTML reports, builds CI-friendly Markdown comments, and queries Gemini for executive risk synthesis.

---

## 🤖 Multi-Agent Core Engine

### 1. AutoRemediator — CVE Remediation
- **Implementation**: [`src/agents/autoRemediator.ts`](file:///d:/SentinalDev/src/agents/autoRemediator.ts) & [`src/services/cveRemediationService.ts`](file:///d:/SentinalDev/src/services/cveRemediationService.ts)
- **Engine**: `ts-morph` AST manipulation.
- **Workflow**:
  1. Initializes a virtual `Project` with all `.ts`, `.tsx`, `.js`, and `.jsx` files under `projectRoot`, excluding `node_modules`.
  2. Traverses all `CallExpression` AST descendants.
  3. Checks both standalone identifiers (e.g. `encryptMD5(payload)`) and property access expressions (e.g. `cryptoUtils.encryptMD5(payload)`).
  4. Surgically replaces the callee identifier node using `replaceWithText(safeName)` without touching arguments, expressions, or formatting.
  5. Flushes all modifications back to disk with `project.save()`.
  6. Emits a unified diff (`createTwoFilesPatch` from `diff`) capturing all changes made.

### 2. BlastRadiusAuditor — AST Blast-Radius Auditing
- **Implementation**: [`src/agents/blastRadiusAuditor.ts`](file:///d:/SentinalDev/src/agents/blastRadiusAuditor.ts) & [`src/services/blastRadiusService.ts`](file:///d:/SentinalDev/src/services/blastRadiusService.ts)
- **Engine**: TypeScript Compiler API symbol reference resolution.
- **Workflow**:
  1. Identifies all changed files (or accepts remediation outputs).
  2. Caps max files analyzed at 50 (ignoring test/spec files) to prevent out-of-memory errors on massive enterprise codebases.
  3. Extracts all exported symbols using `sf.getExportedDeclarations()`.
  4. Traces caller hierarchies using `findReferencesAsNodes()` recursively up to `MAX_DEPTH = 3`.
  5. Employs a `visited` set (`file:functionName:line`) to break cycles and prevent infinite loops on recursive calls.
  6. Computes the **Blast Radius Risk Score**:
     - `LOW`: 0 downstream files impacted.
     - `MED`: 1 to 3 downstream files impacted.
     - `CRITICAL`: > 3 downstream files impacted.
  7. Extracts all leaf-node callers as **Breaking Signatures** (`file:functionName`), marking high-priority testing targets.

### 3. DocuSync — Contract & Documentation Synchronization
- **Implementation**: [`src/agents/docuSync.ts`](file:///d:/SentinalDev/src/agents/docuSync.ts) & [`src/services/docuSyncService.ts`](file:///d:/SentinalDev/src/services/docuSyncService.ts)
- **Engine**: AST pattern matching (`ts-morph`) + OpenAPI YAML processing (`js-yaml`).
- **Workflow**:
  1. Inspects source files for Express router patterns:
     - Property access calls: `app.get()`, `router.post()`, `api.delete()`, etc.
     - Standalone routing primitives: `get('/path', handler)`, `post('/path', handler)`.
  2. Resolves route string literals and HTTP methods.
  3. Loads `openapi.yaml` from the project root. If missing, dynamically synthesizes an OpenAPI 3.0.3 specification stub.
  4. Compares AST-extracted endpoints against OpenAPI `paths`.
  5. Adds missing path items with auto-generated `operationId`, summary, default tags, and 200 response contracts.
  6. Formats and writes updated YAML with `js-yaml.dump()`.
  7. Regex-scans the repository's `README.md` for a `## API Endpoints` section, updates or inserts a standardized Markdown table, and produces a unified diff.

---

## 🧠 AI Executive Guardian (Google Gemini)

SentinelDev integrates **Google Gemini** via `@google/genai` to transform raw technical diffs and AST numbers into actionable executive summaries.

- **File**: [`src/services/geminiService.ts`](file:///d:/SentinalDev/src/services/geminiService.ts)
- **Model Cascading Strategy**:
  SentinelDev executes a resilient multi-model fallback chain:
  `gemini-2.5-flash` ➡️ `gemini-flash-latest` ➡️ `gemini-3.8-flash`.
- **Zero-Dependency Fallback**:
  If no `GEMINI_API_KEY` is provided, SentinelDev automatically invokes a deterministic rule-based executive briefing synthesizer, ensuring zero broken builds or blocked CI pipelines in offline or air-gapped environments.
- **Executive PR Summary Structure**:
  1. **Cryptographic Remediation Integrity**: Concrete assessment of vulnerability neutralization and signature modernization.
  2. **Blast Radius & Contract Drift**: Downstream callers impacted and whether contract alterations demand caller migrations.
  3. **Merge Recommendation & Deployment Precautions**: CI/CD posture guidance (e.g. green light, migration checks, hash updates).

---

## 📦 Repository Ingestion & Sandboxing Engine

SentinelDev can audit **any codebase** without requiring users to install the project locally or risk host file modification.

- **Implementation**: [`src/services/repoIngestionService.ts`](file:///d:/SentinalDev/src/services/repoIngestionService.ts) & [`src/services/gitService.ts`](file:///d:/SentinalDev/src/services/gitService.ts)

### Supported Modes:
1. **GitHub / Git HTTPS Clone**:
   - Validates URLs against regex patterns (`https://` and `git://`).
   - Executes shallow clone via `simpleGit().clone(url, sandbox, ['--depth', '1', '--branch', branch])`.
2. **ZIP Archive Upload**:
   - Streams multipart form data with `busboy` enforcing a 50 MB file limit.
   - Extracts using `adm-zip`.
   - **Smart Wrapper Detection**: If an archive contains a single root folder (e.g. `repo-main/`), the engine unwraps it automatically to target the real codebase root.
3. **Local Working-Tree Git Inspection**:
   - Queries `git.status()` for modified, created, deleted, and staged files.
   - If clean, falls back to `git.diff(['main...HEAD'])`.
   - Filters results exclusively to TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`).

### Sandbox Isolation & Hygiene:
Every sandbox directory is created inside `os.tmpdir()/sentineldev-sandbox/<safe-name>_<timestamp>/`. A mandatory `finally` block invokes `cleanupSandbox()`, guaranteeing that temporary files are purged immediately after pipeline completion.

---

## 💻 Interactive Web Dashboard & UI

SentinelDev features a rich frontend that pairs aesthetic excellence with real-time technical observability:

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 (dark mode, glassmorphism, glowing telemetry badges)
- **Icons**: Lucide React
- **Diagrams**: Mermaid.js (client-side rendered AST caller trees)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🛡️ SentinelDev  [v1.0 • Bob 2.0]  ● MED / MOCK-TARGET  [Report ↗] [PR ↗]│
├────────────────────────────────────────────────────────────────────────┤
│ Target: [ https://github.com/org/repo             ] [▶ Run Demo] [Audit]│
├────────────────────────────────────────────────────────────────────────┤
│  [2 Patched Sites]  [1 Impacted File]  [1 New Endpoint]  [4 Signatures]│
├────────────────────────────────────────────────────────────────────────┤
│  TABS:  [ Call Graph ]  [ Unified Diff ]  [ Spec Drift ]  [ Terminal ] │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  (Interactive Mermaid AST Call Graph with clickable nodes)        │ │
│ │   api.ts ──► userService.ts ──► crypto-utils.ts (encryptSHA256)   │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ Node Inspector: src/lib/crypto-utils.ts (CRITICAL CVE Target)         │
│ Callers: userService.ts:10, reportService.ts:10 | Callees: node:crypto │
└────────────────────────────────────────────────────────────────────────┘
```

### Key UI Capabilities:
1. **Scroll-Scrubbed Video Hero (`ScrollVideo.tsx`)**: High-performance canvas-rendered background animations responsive to scroll position.
2. **MacBook Pro Showcase Frame (`EngineShowcase.tsx`)**: An interactive 3D-styled console preview embedded directly in the landing flow.
3. **Interactive Visualizer Tabs**:
   - **Call Graph**: Live Mermaid.js diagram with zoom controls and clickable node inspection detailing callers, callees, risk levels, and line numbers.
   - **Unified Diff Viewer**: Side-by-side / hunk-based syntax-colored code diffs across all mutated files.
   - **OpenAPI Drift**: Visual endpoint diff showing added, modified, or removed HTTP operations alongside YAML diffs.
   - **Live Terminal**: Streaming color-coded agent logs with timestamps.
   - **AI Executive Summary**: 1-click generation and clipboard copy of the Gemini PR risk review.

---

## ⌨️ CLI & NPX Global Binary

SentinelDev can be run directly from any terminal or integrated into shell scripts.

### Command Structure
```bash
sentineldev <command> [options]
```

| Command | Arguments / Flags | Description |
|---|---|---|
| `ui` | `--port <number>` | Starts the interactive web dashboard (defaults to port `3000`). |
| `audit` | `[path]` | Runs a `GIT_DIFF` blast-radius audit against the target repo (defaults to `process.cwd()`). |
| `cve` | `[path]` | Executes the full `CVE_ADVISORY` remediation pipeline against the target repo. |
| `--help` | `-h` | Displays usage instructions, flag descriptions, and examples. |

### Global Installation & NPX Usage
```bash
# Option 1: Global npm install
npm install -g sentineldev
sentineldev ui --port 8080

# Option 2: Test locally with npm link
npm run build
npm link
sentineldev audit ./my-microservice
npm unlink sentineldev
```

---

## 🚀 GitHub Actions CI/CD Integration

SentinelDev ships with a drop-in GitHub Actions workflow that automatically audits every pull request, computes the blast radius, reconciles API specs, and posts an interactive risk report as a PR comment.

### Workflow Configuration: `.github/workflows/sentineldev-audit.yml`

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
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full git history required for diff calculation

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install SentinelDev
        run: npm install -g sentineldev

      - name: Run Blast Radius Audit
        run: sentineldev audit ${{ github.workspace }}
        env:
          SENTINELDEV_BASE_SHA: ${{ github.event.pull_request.base.sha }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Post / Update PR Risk Report Comment
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            if (!fs.existsSync('sentinel-pr-comment.md')) return;
            const body = fs.readFileSync('sentinel-pr-comment.md', 'utf8');
            const MARKER = '<!-- sentineldev-audit-comment -->';
            
            const { data: comments } = await github.rest.issues.listComments({
              ...context.repo,
              issue_number: context.issue.number,
              per_page: 100
            });
            
            const existing = comments.find(c => c.body && c.body.includes(MARKER));
            const fullBody = `${MARKER}\n${body}`;
            
            if (existing) {
              await github.rest.issues.updateComment({
                ...context.repo,
                comment_id: existing.id,
                body: fullBody
              });
            } else {
              await github.rest.issues.createComment({
                ...context.repo,
                issue_number: context.issue.number,
                body: fullBody
              });
            }
```

### What the Bot Posts
- 🚦 **Blast Radius Score Badge** (`🟢 LOW`, `🟡 MED`, `🔴 CRITICAL`)
- 📊 **Summary Metrics Table** (Patched Call Sites, Impacted Files, Breaking Signatures, Synced Endpoints)
- 🔧 **CVE Remediation Details** with collapsibles showing unified file diffs
- 🌐 **Hierarchical Call Graph Tree**
- 📋 **OpenAPI Specification Drift** with added/removed methods and schema diffs

---

## 🌐 REST API Reference

The SentinelDev backend server runs natively on Node.js using native HTTP modules (with zero Express overhead) and exposes the following endpoints:

### 1. `GET /api/health`
Verifies server health and uptime status.
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "status": "healthy",
    "timestamp": "2026-10-05T13:00:00.000Z"
  }
  ```

### 2. `POST /api/run-pipeline`
Executes the full remediation or audit pipeline against a local path or `mock-target`.
- **Request Body**:
  ```json
  {
    "triggerKind": "CVE_ADVISORY", // or "GIT_DIFF"
    "repoPath": "/path/to/project" // optional; defaults to mock-target
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "report": { ...PipelineReport }
  }
  ```

### 3. `POST /api/ai-summary`
Generates a 3-bullet technical PR risk review via Google Gemini.
- **Request Body**:
  ```json
  {
    "repoName": "auth-service",
    "blastRadiusScore": "MED",
    "filesImpacted": 2,
    "breakingSignatures": ["userService.ts:hashUserId"],
    "callSitesPatched": 3,
    "exposedEndpoints": 1,
    "diffSnippet": "- encryptMD5()\n+ encryptSHA256()"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "summary": "* **Cryptographic Remediation Integrity:** ...\n* **Blast Radius & Contract Drift:** ...\n* **Merge Recommendation:** ..."
  }
  ```

### 4. `POST /api/clone-repo`
Shallow-clones an external Git repository into a secure sandbox, audits it, and cleans up.
- **Request Body**:
  ```json
  {
    "repoUrl": "https://github.com/expressjs/express",
    "branch": "master",
    "triggerKind": "GIT_DIFF"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "repoName": "express",
    "report": { ...PipelineReport },
    "sandboxPath": "/tmp/sentineldev-sandbox/express_1728133200"
  }
  ```

### 5. `POST /api/upload-zip`
Accepts a `multipart/form-data` ZIP archive upload (up to 50 MB) under the `zipfile` field, extracts it, executes the pipeline, and returns the report.

### 6. `GET /sentinel-report.html` & `GET /sentinel-pr-comment.md`
Directly serves the latest generated standalone HTML report and GitHub Markdown comment files from disk or serverless temporary storage.

---

## 🧪 Deterministic Mock Testbed (`mock-target`)

SentinelDev includes a self-contained, idempotent mock testbed located in [`mock-target/`](file:///d:/SentinalDev/mock-target) to demonstrate CVE remediation and blast radius calculation:

### Fictional Vulnerability Scenario: `CVE-2024-DEMO01`
- **Vulnerable Library**: `crypto-utils@1.2.0`
- **Deprecated Function**: `encryptMD5(data: string): string` (MD5 collision vulnerability)
- **Safe Replacement**: `encryptSHA256(data: string): string`

### File Structure of `mock-target/`:
1. `src/lib/crypto-utils.ts`: Shim library declaring both deprecated `encryptMD5()` and safe `encryptSHA256()`.
2. `src/userService.ts`: Directly calls `encryptMD5()` inside `hashUserId()`.
3. `src/reportService.ts`: Directly calls `encryptMD5()` inside `signReport()`.
4. `src/api.ts`: Express router exposing `GET /users` and `POST /report`.
5. `openapi.yaml`: Intentionally documents only `GET /users`, leaving `POST /report` missing.

### Idempotent Seeding (`src/seed.ts`)
Before every demo run, [`src/seed.ts`](file:///d:/SentinalDev/src/seed.ts) resets `mock-target/` back to its original vulnerable, un-synchronized state. This ensures that live demonstrations, unit tests, and CI pipelines are 100% reproducible.

---

## 📐 Domain Models & TypeScript Interfaces

All domain models are defined in [`src/types/index.ts`](file:///d:/SentinalDev/src/types/index.ts):

```typescript
// Trigger Payloads
export type TriggerKind = 'GIT_DIFF' | 'CVE_ADVISORY';

export interface GitDiffTrigger {
  kind: 'GIT_DIFF';
  changedFiles: string[];
  projectRoot: string;
}

export interface CVEAdvisoryTrigger {
  kind: 'CVE_ADVISORY';
  cveId: string;
  packageName: string;
  affectedVersionRange: string;
  deprecatedMethods: Record<string, string>; // { "encryptMD5": "encryptSHA256" }
  projectRoot: string;
  allSourceFiles?: string[];
}

// Blast Radius Result
export type BlastRadiusScore = 'LOW' | 'MED' | 'CRITICAL';

export interface CallGraphNode {
  file: string;
  functionName: string;
  line: number;
  calledBy: CallGraphNode[];
}

export interface BlastRadiusResult {
  changedFiles: string[];
  impactedFiles: string[];
  callGraphTree: CallGraphNode[];
  blastRadiusScore: BlastRadiusScore;
  breakingSignatures: string[];
}

// CVE Remediation Plan
export interface CVERemediationPlan {
  cveId: string;
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  deprecatedMethods: Record<string, string>;
  callSitesRefactored: number;
  affectedFiles: string[];
  patch: string;
}

// Spec Synchronization Result
export interface EndpointChange {
  method: string;
  path: string;
  changeKind: 'added' | 'modified' | 'removed';
}

export interface SpecSyncResult {
  updatedEndpoints: string[];
  endpointChanges: EndpointChange[];
  schemaDiff: string;
  specPath: string;
  readmePatch: string;
}

// Aggregated Pipeline Report
export interface PipelineReport {
  trigger: Trigger;
  blastRadius: BlastRadiusResult | null;
  remediation: CVERemediationPlan | null;
  docSync: SpecSyncResult | null;
  gitDiff?: string;
  completedAt: string;
}
```

---

## 📂 Project Directory Layout

```
sentineldev/
├── .github/
│   └── workflows/
│       └── sentineldev-audit.yml     # GitHub Actions PR audit workflow
├── api/                              # Vercel Serverless Function entry points
│   ├── [...path].ts                  # Wildcard route handler
│   └── index.ts                      # Root API handler
├── bin/
│   └── sentineldev.js                # Global CLI executable (sentineldev ui/audit/cve)
├── mock-target/                      # Fictional demo testbed
│   ├── openapi.yaml                  # Intentionally unsynced OpenAPI spec
│   ├── package.json
│   ├── README.md                     # Target API endpoints doc
│   └── src/
│       ├── api.ts                    # Express router handlers
│       ├── reportService.ts          # Downstream caller 2
│       ├── userService.ts            # Downstream caller 1
│       └── lib/
│           └── crypto-utils.ts       # Deprecated MD5 shim
├── public/                           # Static assets (video, icons, images)
├── src/
│   ├── app.ts                        # HTTP Server & API endpoints router
│   ├── index.ts                      # CLI entry point & argument parser
│   ├── orchestrator.ts               # Core sequential agent pipeline orchestrator
│   ├── seed.ts                       # Idempotent mock-target restoration engine
│   ├── agents/
│   │   ├── autoRemediator.ts         # Agent: In-place AST callee rewrites
│   │   ├── blastRadiusAuditor.ts     # Agent: AST reference crawler
│   │   └── docuSync.ts               # Agent: Route extractor & spec synchronizer
│   ├── client/                       # React 19 + Vite Frontend
│   │   ├── App.tsx                   # Main app router & layout
│   │   ├── index.css                 # Tailwind CSS directives
│   │   ├── main.tsx                  # React DOM mount point
│   │   ├── components/
│   │   │   ├── EngineShowcase.tsx    # 3D MacBook Pro frame showcase
│   │   │   ├── Footer.tsx            # Dark developer footer
│   │   │   ├── MarqueeBanner.tsx     # Infinite tech ribbon marquee
│   │   │   ├── Navbar.tsx            # Sticky glassmorphic navigation bar
│   │   │   ├── ScrollVideo.tsx       # Canvas-scrubbed interactive video hero
│   │   │   ├── SectionOne.tsx        # Hero headline & primary CTAs
│   │   │   ├── SectionTwo.tsx        # Feature showcase cards & stats
│   │   │   └── SentinelConsole.tsx   # Interactive audit modal & runner
│   │   └── pages/
│   │       └── DemoPage.tsx          # Full-screen interactive demo workspace
│   ├── reporters/
│   │   ├── htmlReporter.ts           # Standalone self-contained HTML report builder
│   │   └── prCommentReporter.ts      # GitHub Actions PR Markdown comment builder
│   ├── services/
│   │   ├── blastRadiusService.ts     # ts-morph AST reference traversal & risk scoring
│   │   ├── cveRemediationService.ts  # ts-morph CallExpression rewriter & patch diffs
│   │   ├── docuSyncService.ts        # Express router extractor & YAML/README reconciler
│   │   ├── geminiService.ts          # Google Gemini generative PR review engine
│   │   ├── gitService.ts             # simple-git working-tree & diff inspector
│   │   └── repoIngestionService.ts   # GitHub clone, busboy upload & sandbox manager
│   └── types/
│       └── index.ts                  # Canonical TypeScript domain interfaces
├── triggers/                         # Preconfigured JSON demo trigger payloads
│   ├── cve-trigger.json              # CVE-2024-DEMO01 advisory payload
│   └── gitdiff-trigger.json          # Git diff test payload
├── index.html                        # Vite HTML entry point
├── package.json                      # Project dependencies & scripts
├── tsconfig.json                     # Node/Backend TypeScript configuration
├── tsconfig.client.json              # Client React TypeScript configuration
├── vercel.json                       # Vercel deployment rewrites & build configuration
└── vite.config.ts                    # Vite client build & development proxy setup
```

---

## 🛠️ Getting Started & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**: Installed and configured on your system PATH

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-org/sentineldev.git
cd sentineldev

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional for Gemini AI)
cp .env.example .env
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the root directory:

```env
# Optional: Enables Google Gemini PR Risk Executive Briefings
# If omitted, SentinelDev uses a deterministic rule-based executive summary.
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Server port for the dashboard (defaults to 3000)
PORT=3000

# Optional: Set base SHA when running diffs inside CI environments
# SENTINELDEV_BASE_SHA=HEAD~1

# Optional: Set to 1 to enable verbose error stack traces
# DEBUG=1
```

---

## 📜 NPM Scripts Cheatsheet

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `tsx watch src/app.ts` | Runs the backend server with hot-reload on file changes. |
| `npm run ui` | `tsx src/app.ts` | Starts the backend server (serves built client from `src/public`). |
| `npm run dev:vite` | `vite --port 5199` | Runs the Vite client development server with HMR. |
| `npm run build:client` | `vite build` | Compiles the React 19 frontend into `src/public`. |
| `npm run build` | `tsc --project tsconfig.json` | Compiles backend TypeScript source into `dist/`. |
| `npm run demo` | `tsx src/index.ts --demo` | Runs the full built-in CVE demo pipeline via CLI. |
| `npm run demo:cve` | `tsx src/index.ts --trigger triggers/cve-trigger.json` | Runs pipeline with explicit CVE trigger JSON. |
| `npm run demo:gitdiff` | `tsx src/index.ts --trigger triggers/gitdiff-trigger.json` | Runs pipeline with explicit GitDiff trigger JSON. |
| `npm run report:open` | `start sentinel-report.html` | Opens the generated HTML report in your default browser. |

---

## 🔍 Verification & Walkthrough Guide

### Test Flow 1: Full CVE Remediation & Audit via CLI
Run the automated end-to-end demo:
```bash
npm run demo
```
**What occurs:**
1. `src/seed.ts` restores `mock-target/` to its initial vulnerable state.
2. `AutoRemediator` rewrites `encryptMD5` to `encryptSHA256` in `userService.ts` and `reportService.ts`.
3. `BlastRadiusAuditor` maps downstream callers into `api.ts`, scoring the risk as `MED`.
4. `DocuSync` detects `POST /report` missing from `openapi.yaml`, appends the operation stub, and updates `README.md`.
5. Outputs are written to `sentinel-report.html` and `sentinel-pr-comment.md`.

### Test Flow 2: Interactive Web Dashboard
1. Launch the server:
   ```bash
   npm run ui
   ```
2. Navigate to `http://localhost:3000` in your browser.
3. Click **[▶ Run Demo Console]** or **Launch Interactive Workspace**:
   - Watch the live execution terminal display real-time step progress.
   - Inspect the **AST Call Graph** rendered dynamically in Mermaid.js. Click on any node to view its caller/callee metadata and risk score.
   - Switch to **Unified Diff** to view before/after code patches.
   - Switch to **OpenAPI Drift** to view synced endpoints.
   - Click **Generate Executive Summary** to see Google Gemini's PR risk briefing.

### Test Flow 3: External GitHub Repo Audit
1. Open the dashboard at `http://localhost:3000/demo`.
2. Enter any public TypeScript GitHub repository URL into the repository input field (e.g. `https://github.com/expressjs/express`).
3. Click **[AST Audit]**.
4. SentinelDev shallow-clones the repository into an isolated OS temp directory, scans its TypeScript AST, computes the blast radius, displays the full report, and cleans up the sandbox directory automatically.

---

## 🏆 Hackathon Credits & Acknowledgments

- **Hackathon**: IBM Bob 2.0 Hackathon
- **Track**: Autonomous Developer Tooling
- **Engineering Co-Pilot**: Developed and architected with [IBM Bob](https://www.ibm.com/products/watsonx-code-assistant)
- **AI Model**: [Google Gemini 2.5 Flash](https://ai.google.dev/) via `@google/genai`
- **Compiler Infrastructure**: [ts-morph](https://ts-morph.com/) (TypeScript Compiler API)

---

<p align="center">
  <b>SentinelDev</b> — Built with precision for autonomous, reliable, and zero-drift developer workflows.
</p>
