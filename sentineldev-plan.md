# SentinelDev — Autonomous Lifecycle & Blast-Radius Engine
## Technical Specification & Implementation Plan

---

## Top-Level Overview

SentinelDev is a TypeScript/Node.js multi-agent backend that automates three critical developer workflows:

1. **Blast Radius Analysis** — Given a code diff or changed file set, traverse the project AST to build a call graph, identify all downstream callers, and emit a risk score.
2. **CVE / Dependency Remediation** — Given a security advisory for a package, locate all call sites of the deprecated/vulnerable API and rewrite them to the safe replacement, without breaking adjacent code.
3. **Spec & Docs Sync** — Given a set of modified route files, extract endpoint signatures and reconcile them against the project's `openapi.yaml` and README sequence diagrams.

A root **Orchestrator** receives a trigger payload (git diff or CVE advisory), fans work out to three specialist subagents (`BlastRadiusAuditor`, `AutoRemediator`, `DocuSync`), collects their results, and produces a unified pipeline report.

**Scope:** TypeScript/Node.js monorepo, no external AI API calls required for the demo, all processing is deterministic static analysis over a bundled `mock-target/` testbed.

**Non-goals:** Live git integration, IDE plugins, authentication, persistence layer.

---

## Domain Models & Interfaces

These types are the canonical data contracts flowing between every stage. They live in `src/types/index.ts`.

```typescript
// ── Trigger Payloads ────────────────────────────────────────────────────────

export type TriggerKind = 'GIT_DIFF' | 'CVE_ADVISORY';

export interface GitDiffTrigger {
  kind: 'GIT_DIFF';
  changedFiles: string[];           // relative paths to files that changed
  projectRoot: string;              // absolute path of the project under analysis
}

export interface CVEAdvisoryTrigger {
  kind: 'CVE_ADVISORY';
  cveId: string;
  packageName: string;
  affectedVersionRange: string;     // semver range, e.g. "<2.0.0"
  deprecatedMethods: Record<string, string>;  // old -> new method name
  projectRoot: string;
}

export type Trigger = GitDiffTrigger | CVEAdvisoryTrigger;

// ── Subagent Result Types ───────────────────────────────────────────────────

export type BlastRadiusScore = 'LOW' | 'MED' | 'CRITICAL';

export interface CallGraphNode {
  file: string;
  functionName: string;
  line: number;
  calledBy: CallGraphNode[];        // recursive callers
}

export interface BlastRadiusResult {
  changedFiles: string[];
  impactedFiles: string[];          // files with direct/transitive callers
  callGraphTree: CallGraphNode[];   // one root per changed exported symbol
  blastRadiusScore: BlastRadiusScore;
  breakingSignatures: string[];     // "file:function" strings for callers at risk
}

export interface CVERemediationPlan {
  cveId: string;
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  deprecatedMethods: Record<string, string>;   // old -> safe replacement
  callSitesRefactored: number;
  affectedFiles: string[];
  patch: string;                    // unified diff of all changes made
}

export interface EndpointChange {
  method: string;                   // HTTP verb
  path: string;
  changeKind: 'added' | 'modified' | 'removed';
}

export interface SpecSyncResult {
  updatedEndpoints: string[];       // "METHOD /path" strings
  endpointChanges: EndpointChange[];
  schemaDiff: string;               // unified diff of openapi.yaml before/after
  specPath: string;                 // absolute path to openapi.yaml
  readmePatch: string;              // unified diff of README changes
}

// ── Pipeline Report ─────────────────────────────────────────────────────────

export interface PipelineReport {
  trigger: Trigger;
  blastRadius: BlastRadiusResult | null;
  remediation: CVERemediationPlan | null;
  docSync: SpecSyncResult | null;
  completedAt: string;              // ISO timestamp
}
```

---

## Project Structure

```
sentineldev/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                        # CLI entry point
│   ├── orchestrator.ts                 # Root orchestrator
│   ├── types/
│   │   └── index.ts                    # All domain types/interfaces
│   ├── agents/
│   │   ├── blastRadiusAuditor.ts       # Subagent 1
│   │   ├── autoRemediator.ts           # Subagent 2
│   │   └── docuSync.ts                 # Subagent 3
│   └── services/
│       ├── blastRadiusService.ts       # AST traversal & call graph
│       ├── cveRemediationService.ts    # Deprecated call site rewriting
│       └── docuSyncService.ts          # OpenAPI & README reconciliation
├── mock-target/
│   ├── package.json                    # declares vulnerable dep version
│   ├── src/
│   │   ├── api.ts                      # Express routes (entry callers)
│   │   ├── userService.ts              # Calls the vulnerable library method
│   │   └── reportService.ts           # Also calls the vulnerable method
│   └── openapi.yaml                    # Existing spec to be reconciled
└── README.md
```

---

## Sub-Task 1 — Project Scaffolding

**Intent:** Establish the Node.js/TypeScript project with all dependencies, compiler config, and the `src/types/index.ts` domain model. Everything else builds on this foundation.

**Expected Outcomes:**
- `package.json` with `@typescript-eslint`, `ts-node`, `typescript`, `@types/node`, `ts-morph` (for AST), `js-yaml` (for OpenAPI), and `diff` (for patch generation) installed.
- `tsconfig.json` targeting ES2020, `strict: true`, `outDir: dist`.
- `src/types/index.ts` with all domain interfaces exactly as specified above.

**Todo List:**
- [ ] Create `package.json` with project metadata, scripts (`build`, `start`, `dev`), and all dependencies listed above.
- [ ] Create `tsconfig.json` with strict mode, ES2020 target, module resolution Node, paths set.
- [ ] Create `src/types/index.ts` with complete type definitions for all triggers, results, and the PipelineReport.
- [ ] Create root `README.md` with project overview, architecture diagram (text/ASCII), and quick-start instructions.

**Relevant Context:** Greenfield project. `ts-morph` wraps the TypeScript compiler API and is the right tool for AST traversal — it avoids the complexity of raw `ts.createProgram`. `js-yaml` for safe YAML read/write. `diff` library for unified diff generation.

**Status:** `[x] done`

---

## Sub-Task 2 — Mock Target Setup

**Intent:** Create a self-contained 3-file sample project (`mock-target/`) that acts as the demo testbed. It must feature a vulnerable dependency with a deprecated function signature so all three agents have something real to analyze.

**Expected Outcomes:**
- `mock-target/package.json` declaring `"crypto-utils": "1.2.0"` (fictional vulnerable package) and an inline `crypto-utils` shim in `mock-target/src/lib/crypto-utils.ts` simulating the deprecated `encryptMD5(data)` → safe `encryptSHA256(data)` transition.
- `mock-target/src/userService.ts` calling `encryptMD5` directly.
- `mock-target/src/reportService.ts` also calling `encryptMD5` via a wrapper.
- `mock-target/src/api.ts` as an Express-style router that calls both services, exposing `GET /users` and `POST /report`.
- `mock-target/openapi.yaml` describing only `GET /users` (missing `POST /report`) so DocuSync has a real gap to close.

**Todo List:**
- [ ] Create `mock-target/src/lib/crypto-utils.ts` with both `encryptMD5(data: string): string` (deprecated stub) and `encryptSHA256(data: string): string` (safe replacement).
- [ ] Create `mock-target/src/userService.ts` importing `encryptMD5` and using it in a `hashUserId` function.
- [ ] Create `mock-target/src/reportService.ts` importing `encryptMD5` and using it in a `signReport` function.
- [ ] Create `mock-target/src/api.ts` with `GET /users` calling `userService.hashUserId` and `POST /report` calling `reportService.signReport`.
- [ ] Create `mock-target/openapi.yaml` with only the `GET /users` endpoint defined (intentionally incomplete).
- [ ] Create `mock-target/package.json` as a minimal marker file.

**Relevant Context:** The mock library shim lives inside the repo so there is no real npm install needed. `encryptMD5` is the "vulnerable deprecated" method; `encryptSHA256` is the safe target. The gap in `openapi.yaml` (missing `POST /report`) is the DocuSync trigger.

**Status:** `[x] done`

---

## Sub-Task 3 — Blast Radius Service & Auditor Agent

**Intent:** Implement `blastRadiusService.ts` to perform AST-based call graph traversal across the mock target, then wrap it in `blastRadiusAuditor.ts` agent.

**Expected Outcomes:**
- `blastRadiusService.ts` accepts a list of changed files and a project root, builds a `ts-morph` Project over all `.ts` files, identifies every exported symbol in the changed files, then recursively finds all call sites referencing those symbols across the project. Returns a `BlastRadiusResult`.
- Score logic: 0 impacted files → `LOW`, 1-3 → `MED`, 4+ → `CRITICAL`.
- `blastRadiusAuditor.ts` accepts a `GitDiffTrigger` (or the changed-file list derived from a `CVEAdvisoryTrigger`) and delegates to the service.

**AST Traversal Strategy (blastRadiusService.ts):**
1. Instantiate a `ts-morph` `Project`, add all `.ts` files under `projectRoot` using `addSourceFilesAtPaths`.
2. For each changed file, collect all exported function/class declarations via `getExportedDeclarations()`.
3. For each exported symbol, call `findReferencesAsNodes()` on the `Project` to get every reference node across all source files.
4. Group references by containing source file — these are the `impactedFiles`.
5. For each reference, walk up the AST to the nearest enclosing function/method declaration to get the caller name.
6. Build `CallGraphNode` tree by recursively resolving callers-of-callers (depth-limited to 3 to avoid cycles).
7. `breakingSignatures` = any caller whose containing function has a mismatched parameter count compared to the changed symbol's new signature.

**Todo List:**
- [ ] Create `src/services/blastRadiusService.ts` with `analyzeBlastRadius(changedFiles: string[], projectRoot: string): BlastRadiusResult`.
- [ ] Implement AST traversal: Project setup, export discovery, `findReferencesAsNodes`, caller extraction, CallGraphNode tree construction.
- [ ] Implement score logic based on impacted file count.
- [ ] Create `src/agents/blastRadiusAuditor.ts` with `runBlastRadiusAudit(trigger: Trigger): Promise<BlastRadiusResult>`.

**Relevant Context:** `ts-morph` docs: `Project.addSourceFilesAtPaths(globs)`, `SourceFile.getExportedDeclarations()`, `Node.findReferencesAsNodes()`, `Node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration)`. The project root for the demo is `mock-target/`.

**Status:** `[x] done`

---

## Sub-Task 4 — CVE Remediation Service & AutoRemediator Agent

**Intent:** Implement `cveRemediationService.ts` to locate all call sites of deprecated methods and rewrite them in-place using the AST (no regex), then wrap it in `autoRemediator.ts` agent.

**Expected Outcomes:**
- `cveRemediationService.ts` accepts a `CVEAdvisoryTrigger`, traverses all `.ts` files, finds all `CallExpression` nodes whose callee matches a deprecated method name, rewrites the callee identifier to the safe replacement, and saves the file. Returns a `CVERemediationPlan` including a unified diff.
- The rewrite must only touch the callee identifier — not arguments, not surrounding logic.
- `autoRemediator.ts` accepts a `CVEAdvisoryTrigger` and returns a `CVERemediationPlan`.

**Replacement Logic (cveRemediationService.ts):**
1. Instantiate a `ts-morph` `Project` over `projectRoot`.
2. For each source file, get all `CallExpression` nodes via `getDescendantsOfKind(SyntaxKind.CallExpression)`.
3. For each call expression, resolve the callee: if it is a simple `Identifier`, compare its text to the deprecated method names in `trigger.deprecatedMethods`.
4. If matched, call `.setName(safeReplacement)` on the identifier to rewrite it in-place (ts-morph tracks positions).
5. Capture the file text before and after; generate a unified diff using the `diff` library.
6. Call `project.save()` to flush all changes.
7. Count total refactored call sites, collect affected file paths.

**Todo List:**
- [ ] Create `src/services/cveRemediationService.ts` with `remediateCVE(trigger: CVEAdvisoryTrigger): Promise<CVERemediationPlan>`.
- [ ] Implement call-expression discovery using `getDescendantsOfKind`.
- [ ] Implement callee identifier rewrite using `ts-morph` in-place mutation.
- [ ] Implement diff capture before/after save.
- [ ] Create `src/agents/autoRemediator.ts` with `runRemediation(trigger: CVEAdvisoryTrigger): Promise<CVERemediationPlan>`.

**Relevant Context:** `ts-morph` `Identifier.rename()` renames across the whole project; `Identifier.replaceWithText()` is scoped to the single node — use `replaceWithText` to avoid touching unrelated import declarations. Store original file text before mutation for diff generation.

**Status:** `[x] done`

---

## Sub-Task 5 — DocuSync Service & Agent

**Intent:** Implement `docuSyncService.ts` to scan modified route files, extract HTTP endpoint signatures, reconcile them against `openapi.yaml`, and patch the README. Wrap in `docuSync.ts` agent.

**Expected Outcomes:**
- `docuSyncService.ts` reads all Express-style route files in the changed set, extracts `router.METHOD('/path', ...)` patterns via AST (call expression on `app` or `router` with first string arg as path).
- Loads `openapi.yaml` using `js-yaml`, compares existing paths against discovered endpoints.
- For any endpoint not present in the spec, generates a minimal OpenAPI path item and merges it in.
- Writes the updated YAML back to disk.
- Scans README for a `## API Endpoints` section (or creates one) and appends any new endpoint lines.
- Returns a `SpecSyncResult` with diff of the YAML and patch of the README.

**Route Extraction Strategy (docuSyncService.ts):**
1. Instantiate a `ts-morph` `Project` over `projectRoot`.
2. For each file, get all `CallExpression` nodes.
3. Filter: callee is a `PropertyAccessExpression` where the property name is one of `get|post|put|patch|delete` and the first argument is a `StringLiteral`.
4. Record `{ method: prop.toUpperCase(), path: firstArg.getLiteralValue() }`.
5. Load `openapi.yaml` → parse with `js-yaml` → walk `spec.paths` to collect existing paths.
6. Diff discovered vs existing → produce `endpointChanges`.
7. For each missing endpoint, insert a stub path item with a `200` response under `spec.paths`.
8. Serialize back with `js-yaml.dump` and write file.
9. Generate unified diff of YAML before/after.
10. Patch README: find or create `## API Endpoints` section and update the endpoint table.

**Todo List:**
- [ ] Create `src/services/docuSyncService.ts` with `syncDocs(trigger: Trigger, projectRoot: string): Promise<SpecSyncResult>`.
- [ ] Implement route extraction via `ts-morph` CallExpression traversal.
- [ ] Implement OpenAPI YAML load → diff → patch → save using `js-yaml`.
- [ ] Implement README section update.
- [ ] Create `src/agents/docuSync.ts` with `runDocuSync(trigger: Trigger): Promise<SpecSyncResult>`.

**Relevant Context:** `js-yaml`'s `load` and `dump` functions. The mock target's `openapi.yaml` intentionally omits `POST /report` — this is the gap to close. README in `mock-target/` is optional; DocuSync should create it if absent.

**Status:** `[x] done`

---

## Sub-Task 6 — Root Orchestrator & CLI Entry Point

**Intent:** Wire all three agents behind a single `Orchestrator` that receives a `Trigger`, fans out to all applicable agents in the correct order, and assembles a `PipelineReport`. Expose it through a CLI `index.ts`.

**Expected Outcomes:**
- `orchestrator.ts` exports `runPipeline(trigger: Trigger): Promise<PipelineReport>`.
- For a `GIT_DIFF` trigger: runs BlastRadiusAuditor → DocuSync (in sequence; DocuSync depends on knowing which files changed, not on blast radius output).
- For a `CVE_ADVISORY` trigger: runs AutoRemediator → BlastRadiusAuditor (blast radius on the patched files) → DocuSync (in sequence).
- `index.ts` reads a trigger JSON from `--trigger <file>` CLI arg (or uses a hardcoded demo trigger), calls `runPipeline`, and pretty-prints the `PipelineReport` to stdout.
- A `demo` npm script runs the full pipeline against `mock-target/` with a pre-baked `CVE_ADVISORY` trigger for `encryptMD5`.

**Orchestration Flow:**

```
CVE_ADVISORY trigger
       │
       ▼
 AutoRemediator          ← rewrites encryptMD5 → encryptSHA256 in mock-target/
       │
       ▼
 BlastRadiusAuditor      ← analyzes call graph of now-changed files
       │
       ▼
 DocuSync                ← reconciles openapi.yaml with api.ts routes
       │
       ▼
 PipelineReport (stdout)
```

**Todo List:**
- [ ] Create `src/orchestrator.ts` with `runPipeline(trigger: Trigger): Promise<PipelineReport>`.
- [ ] Implement branching logic for `GIT_DIFF` vs `CVE_ADVISORY` trigger kinds.
- [ ] Create `src/index.ts` CLI entry point with `--trigger` arg parsing and pretty-print output.
- [ ] Add `demo` and `dev` npm scripts to `package.json`.
- [ ] Validate end-to-end run: `npm run demo` should produce a `PipelineReport` with all three fields populated.

**Relevant Context:** Agents run in sequence (not parallel) to allow AutoRemediator's file mutations to be visible to the subsequent BlastRadiusAuditor. The `projectRoot` for all agents in the demo is `path.resolve('mock-target')`.

**Status:** `[x] done`

---

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        TRIGGER INPUT                               │
│   GitDiffTrigger { changedFiles, projectRoot }                     │
│   CVEAdvisoryTrigger { cveId, packageName, deprecatedMethods, ... }│
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR                                   │
│  src/orchestrator.ts :: runPipeline(trigger)                       │
│  Routes to agents based on trigger.kind                            │
└────────┬────────────────────┬────────────────────┬─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ BlastRadius     │  │ AutoRemediator  │  │ DocuSync        │
│ Auditor         │  │                 │  │                 │
│ agents/         │  │ agents/         │  │ agents/         │
│ blastRadius     │  │ autoRemediator  │  │ docuSync.ts     │
│ Auditor.ts      │  │ .ts             │  │                 │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ blastRadius     │  │ cveRemediation  │  │ docuSync        │
│ Service.ts      │  │ Service.ts      │  │ Service.ts      │
│ ts-morph AST    │  │ ts-morph AST    │  │ ts-morph +      │
│ call graph      │  │ callee rewrite  │  │ js-yaml sync    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  BlastRadiusResult   CVERemediationPlan      SpecSyncResult
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │ PipelineReport│
                      │ (JSON stdout) │
                      └───────────────┘
```

---

## Dependency Reference

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5.4` | TypeScript compiler |
| `ts-node` | `^10.9` | Run TS directly (dev) |
| `ts-morph` | `^22` | TypeScript AST traversal & mutation |
| `js-yaml` | `^4.1` | YAML parse/serialize for OpenAPI |
| `diff` | `^5.2` | Unified diff generation |
| `@types/js-yaml` | `^4.0` | Type defs |
| `@types/diff` | `^5.2` | Type defs |
| `@types/node` | `^20` | Node.js type defs |

---

## Execution Sequence (Agent Mode)

Once this plan is approved, switch to Agent Mode and execute sub-tasks **in order**. Each sub-task is self-contained and reviewable before the next begins.

1. **Sub-Task 1** — Scaffold: `package.json`, `tsconfig.json`, `src/types/index.ts`, `README.md`
2. **Sub-Task 2** — Mock Target: all files under `mock-target/`
3. **Sub-Task 3** — Blast Radius Service + Auditor Agent
4. **Sub-Task 4** — CVE Remediation Service + AutoRemediator Agent
5. **Sub-Task 5** — DocuSync Service + Agent
6. **Sub-Task 6** — Orchestrator + CLI Entry Point + end-to-end validation
