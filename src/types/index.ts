// ─── Trigger Payloads ────────────────────────────────────────────────────────

export type TriggerKind = 'GIT_DIFF' | 'CVE_ADVISORY';

export interface GitDiffTrigger {
  kind: 'GIT_DIFF';
  /** Relative paths (from projectRoot) to files that changed */
  changedFiles: string[];
  /** Absolute path of the project under analysis */
  projectRoot: string;
}

export interface CVEAdvisoryTrigger {
  kind: 'CVE_ADVISORY';
  cveId: string;
  packageName: string;
  /** Semver range of affected versions, e.g. "<2.0.0" */
  affectedVersionRange: string;
  /** Mapping of deprecated method name → safe replacement name */
  deprecatedMethods: Record<string, string>;
  /** Absolute path of the project under analysis */
  projectRoot: string;
}

export type Trigger = GitDiffTrigger | CVEAdvisoryTrigger;

// ─── Blast Radius ─────────────────────────────────────────────────────────────

export type BlastRadiusScore = 'LOW' | 'MED' | 'CRITICAL';

export interface CallGraphNode {
  file: string;
  functionName: string;
  line: number;
  calledBy: CallGraphNode[];
}

export interface BlastRadiusResult {
  /** Files whose exports were changed / analysed */
  changedFiles: string[];
  /** All files that contain direct or transitive callers of the changed symbols */
  impactedFiles: string[];
  /** One root node per changed exported symbol */
  callGraphTree: CallGraphNode[];
  blastRadiusScore: BlastRadiusScore;
  /** "file:functionName" strings for callers considered at risk */
  breakingSignatures: string[];
}

// ─── CVE Remediation ─────────────────────────────────────────────────────────

export interface CVERemediationPlan {
  cveId: string;
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  /** Mapping of deprecated method → safe replacement (mirrors trigger input) */
  deprecatedMethods: Record<string, string>;
  callSitesRefactored: number;
  affectedFiles: string[];
  /** Unified diff of all source changes performed */
  patch: string;
}

// ─── Spec / Doc Sync ─────────────────────────────────────────────────────────

export type EndpointChangeKind = 'added' | 'modified' | 'removed';

export interface EndpointChange {
  method: string;
  path: string;
  changeKind: EndpointChangeKind;
}

export interface SpecSyncResult {
  /** "METHOD /path" strings for every endpoint touched */
  updatedEndpoints: string[];
  endpointChanges: EndpointChange[];
  /** Unified diff of openapi.yaml before vs after */
  schemaDiff: string;
  /** Absolute path to the openapi.yaml that was updated */
  specPath: string;
  /** Unified diff of README changes */
  readmePatch: string;
}

// ─── Pipeline Report ──────────────────────────────────────────────────────────

export interface PipelineReport {
  trigger: Trigger;
  blastRadius: BlastRadiusResult | null;
  remediation: CVERemediationPlan | null;
  docSync: SpecSyncResult | null;
  completedAt: string; // ISO 8601
}
