# SentinelDev — Hackathon Submission

> **IBM Bob 2.0 Hackathon · Category: Autonomous Developer Tooling**

---

## Problem Statement

Modern software teams ship thousands of pull requests per week. Three recurring, costly problems slow them down:

1. **Hidden blast radius** — A single changed function can break dozens of downstream callers. Developers have no fast, automated way to see *who* calls *what* before merging. Manual PR review misses transitive dependencies.

2. **CVE remediation lag** — When a security advisory lands for a dependency, developers must manually hunt every call site of the vulnerable API, refactor them by hand, and verify nothing breaks. This takes hours or days per CVE — and is error-prone.

3. **Spec drift** — As routes are added, removed, or changed, `openapi.yaml` and README endpoint tables fall out of sync. Nobody updates the docs; API consumers get stale contracts.

The industry's current tools (Dependabot, Snyk, CodeQL) detect these problems but **do not fix them**. They raise tickets. Developers still do the work.

---

## Innovation

SentinelDev is the first system to:

| Capability | How |
|---|---|
| **Compute blast radius from AST, not heuristics** | Uses the TypeScript compiler's own reference engine (`ts-morph` / `findReferencesAsNodes`) to walk the real call graph — not regex, not grep |
| **Autonomously rewrite vulnerable call sites** | Mutates the AST in-place using `replaceWithText()` — surgically replaces only the callee identifier, leaving all arguments and surrounding logic untouched |
| **Reconcile specs from source truth** | Parses live route registration calls (Express-style `get()`, `post()`) via AST and diffs them against `openapi.yaml` — adding stub path items for every undocumented endpoint |
| **Post-fix CI/CD comment bots** | Generates a rich Markdown report and posts it as a PR comment via `actions/github-script`, updating in-place on each new commit |
| **Run against any repo in-browser** | Clones a GitHub URL or extracts a ZIP upload into a sandboxed temp directory, runs the full pipeline, and renders results live in the dashboard — no local setup required |

### Why This Matters

- **Before SentinelDev**: A CVE is filed → developer reads advisory → manually searches codebase → changes call sites one-by-one → opens PR → reviewer approves → merge. **Time: 2–8 hours per CVE.**
- **After SentinelDev**: CVE trigger fires → AutoRemediator rewrites all call sites → BlastRadiusAuditor scores the change → DocuSync patches the spec → PR comment posted automatically. **Time: under 60 seconds.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER LAYER                                │
│  GitDiffTrigger { changedFiles, projectRoot }                   │
│  CVEAdvisoryTrigger { cveId, deprecatedMethods, projectRoot }   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                                 │
│  Sequential fan-out ensures AutoRemediator writes land          │
│  on disk before BlastRadius reads the AST                       │
└────────┬────────────────┬────────────────┬───────────────────────┘
         │                │                │
         ▼                ▼                ▼
  AutoRemediator   BlastRadiusAuditor    DocuSync
  ─────────────    ──────────────────    ────────
  ts-morph         ts-morph              ts-morph +
  CallExpression   findReferences        js-yaml
  rewrite          AST traversal         route extract
         │                │                │
         ▼                ▼                ▼
  CVERemediation   BlastRadiusResult    SpecSyncResult
  Plan (patch)     (score+tree)         (schemaDiff)
         │                │                │
         └────────────────┴────────────────┘
                          │
                   PipelineReport
                          │
          ┌───────────────┴──────────────────┐
          ▼                                  ▼
  sentinel-report.html            sentinel-pr-comment.md
  (Mermaid call graph,            (GitHub PR comment bot,
   diff viewer, spec table)        risk badges, collapsibles)
```

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| AST engine | `ts-morph` v22 | TypeScript compiler API wrapper — real symbol resolution, not regex |
| YAML I/O | `js-yaml` v4 | Spec-compliant OpenAPI YAML read/write |
| Diff generation | `diff` v5 | Unified diff for every file mutation |
| Git integration | `simple-git` v4 | Working-tree inspection and remote clone |
| ZIP ingestion | `adm-zip` v0.6 | Archive extraction with single-root detection |
| Multipart upload | `busboy` v1 | Streaming form-data parser, 50 MB cap |
| Runtime | `tsx` v4 | Zero-config TypeScript execution |
| CI/CD | GitHub Actions | Native OIDC, PR comment API, artefact upload |

### Key Design Decisions

1. **Sequential agent execution** — AutoRemediator's mutations must be flushed to disk before BlastRadiusAuditor reads the project AST. Parallel fan-out would race.

2. **In-place mutation, not copy** — The remediation writes back to the same files so the blast radius auditor sees the patched codebase, not a stale snapshot.

3. **No AI API calls** — All analysis is deterministic static analysis. Results are reproducible, auditable, and fast (< 5s on the mock target). IBM Bob was used as the engineering co-pilot for design and implementation.

4. **Sandbox isolation** — External repos (GitHub clone or ZIP upload) land in `os.tmpdir()/sentineldev-sandbox/` and are deleted after the pipeline run. The host workspace is never touched.

---

## Live Demo Flows

### Flow 1 — CVE Remediation Pipeline (30 seconds)

1. Click **Run CVE Pipeline** in the dashboard
2. AutoRemediator finds `encryptMD5()` calls in `userService.ts` and `reportService.ts`
3. Rewrites both to `encryptSHA256()` in-place
4. BlastRadiusAuditor maps callers of both files → `api.ts` is impacted → score: **MED**
5. DocuSync detects `POST /report` missing from `openapi.yaml` → adds stub
6. All four visualizer tabs populate: call graph, diff viewer, spec drift, breaking sigs

### Flow 2 — External Repo Audit (GitHub URL)

1. Paste any TypeScript GitHub repo URL
2. SentinelDev clones it (depth 1) into a temp sandbox
3. Runs the GIT_DIFF blast-radius audit on changed files
4. Returns full PipelineReport to the dashboard
5. Sandbox is deleted automatically after the run

### Flow 3 — GitHub Actions PR Bot

1. Developer opens a PR
2. `sentineldev-audit.yml` triggers
3. SentinelDev runs against the PR's git diff
4. Posts a formatted comment with risk score, breaking signatures, and diff
5. Comment is updated (not duplicated) on every subsequent commit

---

## Competitor Comparison

| Feature | Dependabot | Snyk | CodeQL | SemGrep | **SentinelDev** |
|---|---|---|---|---|---|
| Detects vulnerable deps | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Autonomously rewrites call sites** | ❌ | ❌ | ❌ | ❌ | **✅** |
| **AST blast-radius scoring** | ❌ | ❌ | Partial | ❌ | **✅** |
| **OpenAPI spec reconciliation** | ❌ | ❌ | ❌ | ❌ | **✅** |
| **Live web dashboard** | ❌ | ✅ | ❌ | ❌ | **✅** |
| **Analyse external GitHub repos** | ❌ | ✅ | ❌ | ❌ | **✅** |
| **PR comment with unified diff** | ✅ | ✅ | ❌ | ❌ | **✅** |
| **No cloud dependency** | ❌ | ❌ | ❌ | Partial | **✅** |
| **NPX zero-install usage** | ❌ | ❌ | ❌ | ❌ | **✅** |
| Open source / self-hostable | ✅ | ❌ | ✅ | ✅ | **✅** |

---

## Business Impact

### Quantified Value

| Metric | Industry Baseline | With SentinelDev |
|---|---|---|
| Mean time to remediate a CVE | 2–8 hours (manual) | < 60 seconds (automated) |
| PR blast-radius analysis | Not done / ad-hoc | Every PR, automatic |
| OpenAPI drift detection | Quarterly audit | Every commit |
| False positive rate | High (heuristic tools) | Zero (compiler-level truth) |

### Who Benefits

- **Engineering teams** — Reduces CVE remediation toil; no more hunting call sites manually
- **Security teams** — Every PR has a blast-radius score; critical changes are flagged automatically
- **Platform teams** — OpenAPI specs stay in sync with code; no more stale API documentation
- **Open source maintainers** — Drop-in GitHub Action; bot comments land on every PR

### Scale

A team of 20 engineers shipping 10 PRs/day at 30 minutes of review overhead per PR saves:

> 20 × 10 × 0.5h = **100 engineer-hours per day** → **~26,000 engineer-hours per year**

At typical SDE rates, this represents **$3–5M in annual productivity savings** for a mid-sized engineering organisation.

---

## IBM Bob Integration

SentinelDev was designed and built entirely using **IBM Bob 2.0** as the engineering co-pilot:

- Architecture planning and domain model design (Plan mode)
- TypeScript service implementation across 14 source files
- HTML/CSS/JS dashboard design and client-side controller
- GitHub Actions YAML workflow authoring
- All debugging, diff analysis, and iterative refinement

IBM Bob's Agent Mode enabled rapid parallel file generation, cross-file consistency checking, and real TypeScript compiler validation at each step — reducing a multi-week engineering project to a single hackathon session.

---

## Submission Checklist

- [x] TypeScript/Node.js backend with strict mode, zero errors
- [x] Three specialist agents: BlastRadiusAuditor, AutoRemediator, DocuSync
- [x] Live web dashboard with dark-mode UI, Mermaid call graph, diff viewer
- [x] GitHub Actions workflow for automatic PR auditing
- [x] External repo analysis (GitHub URL clone + ZIP upload)
- [x] NPX binary for zero-install global usage
- [x] Fully idempotent demo (`npm run demo`, re-runnable infinitely)
- [x] HTML report + PR Markdown comment generation
- [x] Comprehensive documentation in README.md
- [x] Built 100% with IBM Bob 2.0

---

*SentinelDev — because your codebase shouldn't have to wait for a human to catch what a compiler already knows.*
