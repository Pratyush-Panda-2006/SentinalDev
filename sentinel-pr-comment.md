## 🛡️ SentinelDev Pipeline Report

> **CVE Advisory** — `CVE-2024-DEMO01` · Package: `crypto-utils` `<2.0.0`
> Completed: `2026-09-26T17:39:14.190Z`

### 🔴 Risk Assessment: **CRITICAL**

| Metric | Value |
|---|---|
| Blast Radius Score | 🔴 **CRITICAL** |
| Call Sites Patched | `0` |
| Files Impacted | `19` |
| Breaking Signatures | `49` |
| Endpoints Synced | `0` |

---

### 🔧 CVE Remediation — `CVE-2024-DEMO01`

**Package:** `crypto-utils` · **1.0.0** → **2.0.0**

**Method replacements:**

- ~~`encryptMD5()`~~ → `encryptSHA256()`

**0** call site(s) refactored across **0** file(s):


---

### 🔴 Blast Radius Analysis

**Score:** 🔴 `CRITICAL`

**Impacted files:**

- `api.ts`
- `userService.ts`
- `crypto-utils.ts`
- `reportService.ts`
- `orchestrator.ts`
- `autoRemediator.ts`
- `blastRadiusAuditor.ts`
- `docuSync.ts`
- `app.ts`
- `index.ts`
- `htmlReporter.ts`
- `prCommentReporter.ts`
- `seed.ts`
- `blastRadiusService.ts`
- `cveRemediationService.ts`
- `docuSyncService.ts`
- `gitService.ts`
- `repoIngestionService.ts`
- `index.ts`

<details>
<summary>⚠️ Breaking signatures (49)</summary>

| File | Function |
|---|---|
| `api.ts` | `post` |
| `api.ts` | `<module>` |
| `reportService.ts` | `<module>` |
| `reportService.ts` | `signReport` |
| `reportService.ts` | `buildReport` |
| `userService.ts` | `hashUserId` |
| `userService.ts` | `getUsers` |
| `autoRemediator.ts` | `runRemediation` |
| `orchestrator.ts` | `runPipeline` |
| `blastRadiusAuditor.ts` | `runBlastRadiusAudit` |
| `docuSync.ts` | `runDocuSync` |
| `app.ts` | `<module>` |
| `app.ts` | `server` |
| `index.ts` | `<module>` |
| `index.ts` | `main` |
| `orchestrator.ts` | `<module>` |
| `htmlReporter.ts` | `generateHtmlReport` |
| `prCommentReporter.ts` | `generatePrComment` |
| `seed.ts` | `seedMockTarget` |
| `blastRadiusService.ts` | `analyzeBlastRadius` |
| `cveRemediationService.ts` | `remediateCVE` |
| `docuSyncService.ts` | `syncDocs` |
| `gitService.ts` | `inspectRepoChanges` |
| `gitService.ts` | `<module>` |
| `repoIngestionService.ts` | `cleanupSandbox` |
| `repoIngestionService.ts` | `cloneRepository` |
| `repoIngestionService.ts` | `extractZip` |
| `repoIngestionService.ts` | `parseMultipartUpload` |
| `repoIngestionService.ts` | `<module>` |
| `app.ts` | `buildBlastTrigger` |
| `index.ts` | `<module>` |
| `autoRemediator.ts` | `<module>` |
| `app.ts` | `buildCveTrigger` |
| `index.ts` | `buildDemoTrigger` |
| `docuSyncService.ts` | `<module>` |
| `docuSync.ts` | `<module>` |
| `blastRadiusService.ts` | `<module>` |
| `blastRadiusService.ts` | `scoreFromCount` |
| `htmlReporter.ts` | `<module>` |
| `prCommentReporter.ts` | `<module>` |
| `prCommentReporter.ts` | `scoreEmoji` |
| `blastRadiusService.ts` | `buildCallTree` |
| `blastRadiusService.ts` | `collectImpactedFiles` |
| `blastRadiusService.ts` | `walk` |
| `blastRadiusService.ts` | `collectBreakingSignatures` |
| `htmlReporter.ts` | `buildMermaidGraph` |
| `htmlReporter.ts` | `walk` |
| `prCommentReporter.ts` | `renderCallGraphMd` |
| `htmlReporter.ts` | `renderBreakingSignatures` |

</details>

<details>
<summary>🌐 Call graph tree</summary>

- `api.ts` → `get` *(line 31)*
    - `api.ts` → `<module>` *(line 28)*
      - `api.ts` → `post` *(line 35)*
      - `api.ts` → `<module>` *(line 52)*
- `userService.ts` → `<module>` *(line 1)*
    - `crypto-utils.ts` → `encryptMD5` *(line 18)*
      - `reportService.ts` → `<module>` *(line 1)*
- `reportService.ts` → `buildReport` *(line 24)*
    - `reportService.ts` → `signReport` *(line 13)*
- `api.ts` → `<module>` *(line 2)*
    - `api.ts` → `<anonymous>` *(line 48)*
      - `reportService.ts` → `buildReport` *(line 20)*
- `userService.ts` → `getUsers` *(line 29)*
    - `userService.ts` → `hashUserId` *(line 13)*
- `api.ts` → `<module>` *(line 1)*
    - `api.ts` → `<anonymous>` *(line 41)*
      - `userService.ts` → `getUsers` *(line 20)*
- `orchestrator.ts` → `<module>` *(line 3)*
    - `orchestrator.ts` → `runPipeline` *(line 50)*
      - `autoRemediator.ts` → `runRemediation` *(line 15)*
- `orchestrator.ts` → `<module>` *(line 2)*
    - `orchestrator.ts` → `runPipeline` *(line 61)*
      - `orchestrator.ts` → `runPipeline` *(line 72)*
      - `blastRadiusAuditor.ts` → `runBlastRadiusAudit` *(line 15)*
- `orchestrator.ts` → `<module>` *(line 4)*
    - `orchestrator.ts` → `runPipeline` *(line 66)*
      - `orchestrator.ts` → `runPipeline` *(line 76)*
      - `docuSync.ts` → `runDocuSync` *(line 15)*
- `app.ts` → `<module>` *(line 378)*
    - `app.ts` → `<module>` *(line 154)*
      - `app.ts` → `<module>` *(line 379)*
      - `app.ts` → `<module>` *(line 380)*
      - `app.ts` → `<module>` *(line 382)*
      - `app.ts` → `<module>` *(line 386)*
- `app.ts` → `<module>` *(line 19)*
    - `app.ts` → `server` *(line 222)*
      - `app.ts` → `server` *(line 229)*
      - `app.ts` → `server` *(line 268)*
      - `app.ts` → `server` *(line 275)*
      - `app.ts` → `server` *(line 313)*
      - `app.ts` → `server` *(line 319)*
      - `app.ts` → `server` *(line 351)*
      - `orchestrator.ts` → `runPipeline` *(line 32)*
      - `index.ts` → `<module>` *(line 3)*
      - `index.ts` → `main` *(line 127)*
- `orchestrator.ts` → `runPipeline` *(line 36)*
    - `orchestrator.ts` → `<module>` *(line 15)*
- `orchestrator.ts` → `<module>` *(line 5)*
    - `orchestrator.ts` → `runPipeline` *(line 94)*
      - `htmlReporter.ts` → `generateHtmlReport` *(line 168)*
- `orchestrator.ts` → `<module>` *(line 6)*
    - `orchestrator.ts` → `runPipeline` *(line 96)*
      - `prCommentReporter.ts` → `generatePrComment` *(line 50)*
- `app.ts` → `<module>` *(line 20)*
    - `app.ts` → `server` *(line 226)*
      - `seed.ts` → `seedMockTarget` *(line 210)*
      - `index.ts` → `<module>` *(line 5)*
      - `index.ts` → `main` *(line 96)*
      - `index.ts` → `main` *(line 120)*
- `blastRadiusAuditor.ts` → `<module>` *(line 2)*
    - `blastRadiusAuditor.ts` → `runBlastRadiusAudit` *(line 39)*
      - `blastRadiusService.ts` → `analyzeBlastRadius` *(line 131)*
- `autoRemediator.ts` → `<module>` *(line 1)*
    - `autoRemediator.ts` → `runRemediation` *(line 23)*
      - `cveRemediationService.ts` → `remediateCVE` *(line 21)*
- `docuSync.ts` → `<module>` *(line 2)*
    - `docuSync.ts` → `runDocuSync` *(line 42)*
      - `docuSyncService.ts` → `syncDocs` *(line 182)*
- `app.ts` → `<module>` *(line 22)*
    - `app.ts` → `server` *(line 210)*
      - `app.ts` → `server` *(line 271)*
      - `app.ts` → `server` *(line 316)*
      - `app.ts` → `server` *(line 341)*
      - `gitService.ts` → `inspectRepoChanges` *(line 25)*
- `gitService.ts` → `inspectRepoChanges` *(line 28)*
    - `gitService.ts` → `<module>` *(line 6)*
- `app.ts` → `<module>` *(line 26)*
    - `app.ts` → `server` *(line 284)*
      - `app.ts` → `server` *(line 328)*
      - `repoIngestionService.ts` → `cleanupSandbox` *(line 41)*
- `repoIngestionService.ts` → `cloneRepository` *(line 83)*
    - `repoIngestionService.ts` → `isValidGitUrl` *(line 59)*
      - `app.ts` → `<module>` *(line 28)*
      - `app.ts` → `server` *(line 248)*
- `app.ts` → `<module>` *(line 24)*
    - `app.ts` → `server` *(line 254)*
      - `repoIngestionService.ts` → `cloneRepository` *(line 79)*
- `app.ts` → `<module>` *(line 25)*
    - `app.ts` → `server` *(line 302)*
      - `repoIngestionService.ts` → `extractZip` *(line 122)*
- `app.ts` → `<module>` *(line 27)*
    - `app.ts` → `server` *(line 294)*
      - `repoIngestionService.ts` → `parseMultipartUpload` *(line 164)*
- `repoIngestionService.ts` → `cloneRepository` *(line 82)*
    - `repoIngestionService.ts` → `<module>` *(line 68)*
- `repoIngestionService.ts` → `parseMultipartUpload` *(line 166)*
    - `repoIngestionService.ts` → `<module>` *(line 152)*
- `index.ts` → `<module>` *(line 31)*
    - `index.ts` → `<module>` *(line 5)*
      - `app.ts` → `<module>` *(line 21)*
      - `app.ts` → `buildBlastTrigger` *(line 92)*
- `cveRemediationService.ts` → `<module>` *(line 5)*
    - `cveRemediationService.ts` → `remediateCVE` *(line 22)*
      - `index.ts` → `<module>` *(line 13)*
      - `autoRemediator.ts` → `<module>` *(line 2)*
      - `autoRemediator.ts` → `runRemediation` *(line 16)*
      - `app.ts` → `buildCveTrigger` *(line 80)*
      - `app.ts` → `server` *(line 267)*
      - `app.ts` → `server` *(line 312)*
      - `index.ts` → `<module>` *(line 4)*
      - `index.ts` → `buildDemoTrigger` *(line 45)*
- `index.ts` → `<module>` *(line 96)*
    - `blastRadiusAuditor.ts` → `<module>` *(line 3)*
      - `blastRadiusAuditor.ts` → `runBlastRadiusAudit` *(line 16)*
      - `docuSyncService.ts` → `<module>` *(line 6)*
      - `docuSync.ts` → `<module>` *(line 3)*
      - `docuSync.ts` → `runDocuSync` *(line 16)*
      - `orchestrator.ts` → `<module>` *(line 8)*
      - `orchestrator.ts` → `runPipeline` *(line 33)*
      - `index.ts` → `main` *(line 73)*
      - `index.ts` → `main` *(line 113)*
- `index.ts` → `<module>` *(line 51)*
    - `index.ts` → `<module>` *(line 35)*
      - `blastRadiusService.ts` → `<module>` *(line 5)*
      - `blastRadiusService.ts` → `scoreFromCount` *(line 81)*
      - `htmlReporter.ts` → `<module>` *(line 6)*
      - `htmlReporter.ts` → `<module>` *(line 23)*
      - `htmlReporter.ts` → `generateHtmlReport` *(line 174)*
      - `prCommentReporter.ts` → `<module>` *(line 3)*
      - `prCommentReporter.ts` → `<module>` *(line 11)*
      - `prCommentReporter.ts` → `scoreEmoji` *(line 31)*
      - `prCommentReporter.ts` → `generatePrComment` *(line 56)*
- `index.ts` → `<module>` *(line 41)*
    - `index.ts` → `<module>` *(line 37)*
      - `index.ts` → `<module>` *(line 50)*
      - `blastRadiusService.ts` → `<module>` *(line 6)*
      - `blastRadiusService.ts` → `buildCallTree` *(line 44)*
      - `blastRadiusService.ts` → `buildCallTree` *(line 49)*
      - `blastRadiusService.ts` → `collectImpactedFiles` *(line 90)*
      - `blastRadiusService.ts` → `walk` *(line 93)*
      - `blastRadiusService.ts` → `collectBreakingSignatures` *(line 108)*
      - `blastRadiusService.ts` → `walk` *(line 111)*
      - `blastRadiusService.ts` → `analyzeBlastRadius` *(line 172)*
      - `htmlReporter.ts` → `<module>` *(line 5)*
      - `htmlReporter.ts` → `buildMermaidGraph` *(line 31)*
      - `htmlReporter.ts` → `walk` *(line 44)*
      - `prCommentReporter.ts` → `renderCallGraphMd` *(line 37)*
- `index.ts` → `<module>` *(line 97)*
    - `index.ts` → `<module>` *(line 44)*
      - `blastRadiusService.ts` → `<module>` *(line 4)*
      - `blastRadiusService.ts` → `analyzeBlastRadius` *(line 134)*
      - `blastRadiusAuditor.ts` → `runBlastRadiusAudit` *(line 18)*
      - `orchestrator.ts` → `<module>` *(line 10)*
      - `orchestrator.ts` → `runPipeline` *(line 43)*
- `index.ts` → `<module>` *(line 98)*
    - `index.ts` → `<module>` *(line 58)*
      - `cveRemediationService.ts` → `remediateCVE` *(line 23)*
      - `autoRemediator.ts` → `runRemediation` *(line 17)*
      - `orchestrator.ts` → `<module>` *(line 11)*
      - `orchestrator.ts` → `runPipeline` *(line 44)*
- `index.ts` → `<module>` *(line 78)*
    - `index.ts` → `<module>` *(line 73)*
- `index.ts` → `<module>` *(line 84)*
    - `index.ts` → `<module>` *(line 75)*
      - `docuSyncService.ts` → `syncDocs` *(line 250)*
- `index.ts` → `<module>` *(line 99)*
    - `index.ts` → `<module>` *(line 81)*
      - `docuSyncService.ts` → `syncDocs` *(line 185)*
      - `docuSync.ts` → `runDocuSync` *(line 19)*
      - `orchestrator.ts` → `<module>` *(line 12)*
      - `orchestrator.ts` → `runPipeline` *(line 45)*
- `htmlReporter.ts` → `<module>` *(line 4)*
    - `htmlReporter.ts` → `renderSpecTable` *(line 97)*
      - `htmlReporter.ts` → `renderBreakingSignatures` *(line 139)*
      - `index.ts` → `<module>` *(line 95)*
      - `orchestrator.ts` → `<module>` *(line 9)*
      - `orchestrator.ts` → `runPipeline` *(line 79)*

</details>

---

### 📋 OpenAPI Spec Sync

✅ `openapi.yaml` was already in sync — no changes required.

---

*Made with [IBM Bob](https://www.ibm.com/products/watsonx-code-assistant) · SentinelDev Autonomous Lifecycle Engine*